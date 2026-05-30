export interface ICommand {
  id: string;
  description: string;
  execute(): void;
  undo(): void;
}

export class CompositeCommand implements ICommand {
  id: string;
  description: string;
  private commands: ICommand[];

  constructor(id: string, description: string, commands: ICommand[]) {
    this.id = id;
    this.description = description;
    this.commands = commands;
  }

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    [...this.commands].reverse().forEach(cmd => cmd.undo());
  }
}
