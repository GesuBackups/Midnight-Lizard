import { IWindowManager } from "./IWindowManager";


export class WindowManagerStub implements IWindowManager
{
    constructor()
    {
    }

    public isMainWindow(): boolean
    {
        return false;
    }

    public setTimeout(handler: TimerHandler, timeout?: number): number | undefined
    {
        // Stub does not schedule timers (no window usage)
        return undefined;
    }

    public setInterval(handler: TimerHandler, timeout?: number): number | undefined
    {
        // Stub does not schedule timers (no window usage)
        return undefined;
    }

    public windowIsDefined(): boolean
    {
        // Stub never uses a global window
        return false;
    }

    public hasAccessToMainFrame(): boolean
    {
        return false;
    }

    public getCurrentWindowUrl(): string
    {
        return "";
    }

    public getCurrentWindowHostname(): string
    {
        return "";
    }

    public matchMedia(query: string): MediaQueryList
    {
        const stub: MediaQueryList = {
            matches: false,
            media: query
        } as any;
        return stub;
    }
}
