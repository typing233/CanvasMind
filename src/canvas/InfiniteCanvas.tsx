import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useCanvasStore } from '../core/data-model/store';
import { MIN_ZOOM, MAX_ZOOM, screenToCanvas } from '../core/viewport/ViewportManager';
import { NodesLayer } from './layers/NodesLayer';
import { EdgesLayer } from './layers/EdgesLayer';
import { eventBus } from '../core/event-bus/EventBus';

export const InfiniteCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const viewport = useCanvasStore(s => s.document.viewport);
  const setViewport = useCanvasStore(s => s.setViewport);
  const activePluginId = useCanvasStore(s => s.activePluginId);

  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);
  const isDrawing = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.08;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * (direction > 0 ? factor : 1 / factor)));

      const mousePointTo = {
        x: (pointer.x - viewport.x) / viewport.zoom,
        y: (pointer.y - viewport.y) / viewport.zoom,
      };

      setViewport({
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
        zoom: newZoom,
      });
    },
    [viewport, setViewport]
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (spacePressed || e.evt.button === 1) {
        isPanning.current = true;
        lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
        return;
      }

      // Only start freehand drawing on empty canvas area
      if (activePluginId === 'freehand' && e.evt.button === 0 && e.target === e.target.getStage()) {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          const canvasPoint = screenToCanvas(pointer, viewport);
          isDrawing.current = true;
          setDrawingPoints([canvasPoint.x, canvasPoint.y]);
          eventBus.emit('freehand:start', canvasPoint);
        }
        return;
      }

      // Click on empty canvas = deselect (only if not shift-clicking for multi-select)
      if (e.target === e.target.getStage() && !e.evt.shiftKey) {
        useCanvasStore.getState().setSelection([], []);
      }
    },
    [spacePressed, activePluginId, viewport]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (isPanning.current) {
        const dx = e.evt.clientX - lastPointer.current.x;
        const dy = e.evt.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
          zoom: viewport.zoom,
        });
        return;
      }

      if (isDrawing.current && activePluginId === 'freehand') {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          const canvasPoint = screenToCanvas(pointer, viewport);
          setDrawingPoints(prev => [...prev, canvasPoint.x, canvasPoint.y]);
        }
      }
    },
    [viewport, setViewport, activePluginId]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (isDrawing.current) {
      isDrawing.current = false;
      eventBus.emit('freehand:end', drawingPoints);
      setDrawingPoints([]);
    }
  }, [drawingPoints]);

  const getCursor = () => {
    if (spacePressed) return 'grab';
    if (activePluginId === 'freehand') return 'crosshair';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-100"
      style={{ cursor: getCursor() }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <EdgesLayer />
          <NodesLayer />
          {drawingPoints.length >= 4 && (
            <Line
              points={drawingPoints}
              stroke="#000000"
              strokeWidth={3}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation="source-over"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
