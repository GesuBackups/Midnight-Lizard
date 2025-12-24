import { Container } from "../Utils/DI";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { ISettingsManager } from "./SettingsManager";
import { IDocumentProcessor } from "./DocumentProcessor";
import { IWindowManager } from "../Utils/IWindowManager";
import { WindowManager } from "../Utils/WindowManager";

Container.register(Document, class { constructor() { return document } });
Container.register(CurrentExtensionModule, class
{
    constructor()
    {
        return new CurrentExtensionModule(
            ExtensionModule.ContentScript);
    }
});
Container.register(IWindowManager, class
{
    constructor()
    {
        return new WindowManager(document);
    }
});

export class ContentScriptStarter
{
    constructor(...registerations: any[])
    {
        Container.resolve(ISettingsManager);
        Container.resolve(IDocumentProcessor);
    }
}