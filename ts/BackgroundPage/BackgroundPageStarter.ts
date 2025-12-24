import { Container } from "../Utils/DI";
import { CurrentExtensionModule, ExtensionModule } from "../Settings/ExtensionModule";
import { ICommandProcessor } from "./CommandProcessor";
import { IZoomService } from "./IZoomService";
import { IUninstallUrlSetter } from "./IUninstallUrlSetter";
import { IThemeProcessor } from "./IThemeProcessor";
import { IApplicationInstaller } from "./IApplicationInstaller";
import { IExternalMessageProcessor } from "./ExternalMessageProcessor";
import { ILocalMessageProcessor } from "./LocalMessageProcessor";
import { WindowManagerStub } from "../Utils/WindowManagerStub";
import { IWindowManager } from "../Utils/IWindowManager";

// Manifest V3: Service workers don't have access to document
// Provide a stub for compatibility
Container.register(Document, class {
    constructor() {
        return typeof document !== 'undefined' ? document : { location: { hostname: '' } } as Document;
    }
});
Container.register(CurrentExtensionModule, class
{
    constructor()
    {
        return new CurrentExtensionModule(
            ExtensionModule.BackgroundPage);
    }
});
Container.register(IWindowManager, class
{
    constructor()
    {
        return new WindowManagerStub();
    }
});

export class BackgroundPageStarter
{
    constructor(...registerations: any[])
    {
        Container.resolve(ICommandProcessor);
        Container.resolve(IZoomService);
        Container.resolve(IUninstallUrlSetter);
        Container.resolve(IThemeProcessor);
        Container.resolve(IApplicationInstaller);
        Container.resolve(IExternalMessageProcessor);
        Container.resolve(ILocalMessageProcessor);
    }
}