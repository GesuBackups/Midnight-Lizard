import { Container } from "../Utils/DI";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { IPopupManager } from "./PopupManager";
import { WindowManager } from "../Utils/WindowManager";
import { IWindowManager } from "../Utils/IWindowManager";

Container.register(Document, class { constructor() { return document } });
Container.register(CurrentExtensionModule, class
{
    constructor()
    {
        return new CurrentExtensionModule(
            ExtensionModule.PopupWindow);
    }
});
Container.register(IWindowManager, class
{
    constructor()
    {
        return new WindowManager(document);
    }
});
export class PopupStarter
{
    constructor(...registerations: any[])
    {
        Container.resolve(IPopupManager);
    }
}