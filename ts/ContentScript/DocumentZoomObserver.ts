import { injectable } from "../Utils/DI";
import { ISettingsBus } from "../Settings/ISettingsBus";
import { IBaseSettingsManager } from "../Settings/BaseSettingsManager";
import { IWindowManager } from "../Utils/IWindowManager";

export abstract class IDocumentZoomObserver
{
    abstract get CurrentZoom(): number;
}

@injectable(IDocumentZoomObserver)
class DocumentZoomObserver implements IDocumentZoomObserver
{
    private lastZoom = 1;
    public get CurrentZoom() { return this.lastZoom }

    constructor(doc: Document,
        settingsBus: ISettingsBus,
        private readonly _settingsManager: IBaseSettingsManager,
        private readonly _windowManager: IWindowManager)
    {
        settingsBus.onZoomChanged.addListener((done, zoom) =>
        {
            this.lastZoom = zoom || 1;
            this.setDocumentZoom(doc);
            if (this._windowManager.isMainWindow())
            {
                done(true);
            }
        }, null);

        _settingsManager.onSettingsInitialized.addListener(_ => this.setDocumentZoom(doc), this);
        _settingsManager.onSettingsChanged.addListener(_ => this.setDocumentZoom(doc), this);
    }

    private setDocumentZoom(doc: Document)
    {
        if (this._settingsManager.isActive)
        {
            doc.documentElement!.style.setProperty("--ml-zoom", this.lastZoom.toString(), "important");
        }
    }
}