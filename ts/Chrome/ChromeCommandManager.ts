import { injectable } from "../Utils/DI";
import { ICommandManager } from "../Popup/ICommandManager";

@injectable(ICommandManager)
export class ChromeCommandManager implements ICommandManager
{
    constructor() { }

    getCommands(): Promise<chrome.commands.Command[]>
    {
        return chrome.commands.getAll();
    }
}