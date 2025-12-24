import { injectable } from "../Utils/DI";
import { IApplicationInstaller } from "../BackgroundPage/IApplicationInstaller";
import { IApplicationSettings, BrowserName } from "../Settings/IApplicationSettings";

@injectable(IApplicationInstaller)
export class ChromeApplicationInstaller implements IApplicationInstaller
{
    private readonly printError = (er: any) => this._app.isDebug && console.error(er.message || er);

    constructor(
        protected readonly _app: IApplicationSettings)
    {
        if (_app.browserName !== BrowserName.Firefox)
        {
            chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        }
    }

    protected onInstalled(e: chrome.runtime.InstalledDetails)
    {
        setTimeout(() =>
        {
            const mainInjection = chrome.runtime.getManifest().content_scripts![0];
            chrome.tabs
                .query({})
                .then(tabs =>
                {
                    for (const tab of tabs)
                    {
                        if (!tab.id || !tab.url || tab.url?.startsWith("chrome://")) { continue; }

                        chrome.scripting.insertCSS({
                            target: { tabId: tab.id!, allFrames: true },
                            files: mainInjection.css!
                        })
                        .catch(this.printError);

                        chrome.scripting.executeScript({
                            target: { tabId: tab.id!, allFrames: true },
                            files: [mainInjection.js![0]]
                        })
                        .catch(this.printError);
                    }
                })
                .catch(this.printError);
        }, this._app.isDebug ? 3000 : 100);
    }
}