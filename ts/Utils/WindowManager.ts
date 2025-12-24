import { IWindowManager } from "./IWindowManager";

export class WindowManager implements IWindowManager
{
    constructor(protected readonly rootDocument: Document)
    {
    }

    public matchMedia(query: string): MediaQueryList
    {
        if (this.windowIsDefined())
        {
            return window.matchMedia(query);
        }

        const stub: MediaQueryList = {
            matches: false,
            media: "(prefers-color-scheme: dark)"
        } as any;
        return stub;
    }

    public setInterval(handler: TimerHandler, timeout?: number): number | undefined
    {
        if (!this.windowIsDefined()) return undefined;
        return window.setInterval(handler, timeout);
    }

    public getCurrentWindowUrl(): string
    {
        try
        {
            return window!.top!.location.href;
        }
        catch
        {
            return this.rootDocument.location!.href;
        }
    }

    public getCurrentWindowHostname(): string
    {
        try
        {
            return window!.top!.location.hostname;
        }
        catch
        {
            return this.rootDocument.location!.hostname;
        }
    }

    public hasAccessToMainFrame(): boolean
    {
        let hasAccessToMainFrame: boolean = true;
        try { const test = window!.top!.location.hostname }
        catch { hasAccessToMainFrame = false; }
        return hasAccessToMainFrame;
    }

    public setTimeout(handler: TimerHandler, timeout?: number): number | undefined
    {
        if (!this.windowIsDefined()) return undefined;
        return window.setTimeout(handler, timeout);
    }

    public windowIsDefined(): boolean
    {
        return typeof window === 'object';
    }

    /**
     * Returns true when running in the top/main window (not in an iframe).
     * If `window` is not defined this returns false.
     * Safely handles cross-origin frames which may throw on access to `window.top`.
     */
    public isMainWindow(): boolean
    {
        if (!this.windowIsDefined()) return false;

        try
        {
            return window.self === window.top;
        } catch
        {
            try
            {
                return window.frameElement == null;
            } catch
            {
                return false;
            }
        }
    }
}
