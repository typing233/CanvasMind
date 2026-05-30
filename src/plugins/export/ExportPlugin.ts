import { IPlugin, PluginContext, PluginMetadata, ToolbarContribution } from '../../core/plugin-system/types';

export class ExportPlugin implements IPlugin {
  id = 'export';
  name = 'Export PNG/SVG';
  version = '1.0.0';
  metadata: PluginMetadata = {
    description: 'Export canvas as PNG or SVG',
    author: 'CanvasMind',
    icon: '📤',
    category: 'export',
  };

  private ctx!: PluginContext;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [
      {
        id: 'export-png',
        label: '📤 PNG',
        icon: '📤',
        group: 'export',
        onClick: () => this.exportPNG(),
      },
      {
        id: 'export-svg',
        label: '📤 SVG',
        icon: '📤',
        group: 'export',
        onClick: () => this.exportSVG(),
      },
    ];
  }

  exportPNG(): void {
    const stage = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
    if (!stage) return;

    const nodes = Object.values(this.ctx.store.document.nodes);
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.size.width);
      maxY = Math.max(maxY, n.position.y + n.size.height);
    });

    const konvaStage = (window as any).Konva?.stages?.[0];
    if (konvaStage) {
      const dataURL = konvaStage.toDataURL({
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2,
      });
      this.downloadFile(dataURL, 'canvasmind-export.png');
    } else {
      const dataURL = stage.toDataURL('image/png');
      this.downloadFile(dataURL, 'canvasmind-export.png');
    }
  }

  exportSVG(): void {
    const nodes = Object.values(this.ctx.store.document.nodes);
    const edges = Object.values(this.ctx.store.document.edges);
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.size.width);
      maxY = Math.max(maxY, n.position.y + n.size.height);
    });

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = minX - padding;
    const offsetY = minY - padding;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>\n`;

    edges.forEach(edge => {
      const source = this.ctx.store.getNode(edge.sourceId);
      const target = this.ctx.store.getNode(edge.targetId);
      if (!source || !target) return;

      const sx = source.position.x + source.size.width - offsetX;
      const sy = source.position.y + source.size.height / 2 - offsetY;
      const tx = target.position.x - offsetX;
      const ty = target.position.y + target.size.height / 2 - offsetY;

      svg += `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="${edge.style.stroke}" stroke-width="${edge.style.strokeWidth}"/>\n`;
    });

    nodes.forEach(n => {
      const x = n.position.x - offsetX;
      const y = n.position.y - offsetY;
      const text = (n.data.text as string) || '';

      if (n.type === 'flowchart-diamond') {
        const cx = x + n.size.width / 2;
        const cy = y + n.size.height / 2;
        const pts = `${cx},${y} ${x + n.size.width},${cy} ${cx},${y + n.size.height} ${x},${cy}`;
        svg += `<polygon points="${pts}" fill="${n.style.fill}" stroke="${n.style.stroke}" stroke-width="${n.style.strokeWidth}"/>\n`;
      } else {
        svg += `<rect x="${x}" y="${y}" width="${n.size.width}" height="${n.size.height}" rx="${n.style.borderRadius}" fill="${n.style.fill}" stroke="${n.style.stroke}" stroke-width="${n.style.strokeWidth}"/>\n`;
      }

      if (text) {
        svg += `<text x="${x + n.size.width / 2}" y="${y + n.size.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${n.style.fontSize}" fill="${n.style.fontColor}">${this.escapeXml(text)}</text>\n`;
      }
    });

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, 'canvasmind-export.svg');
    URL.revokeObjectURL(url);
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private downloadFile(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
