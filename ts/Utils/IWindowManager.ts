
export abstract class IWindowManager
{
    abstract isMainWindow(): boolean;
    abstract setTimeout(handler: TimerHandler, timeout?: number): number | undefined;
    abstract setInterval(handler: TimerHandler, timeout?: number): number | undefined;
    abstract windowIsDefined(): boolean;
    abstract hasAccessToMainFrame(): boolean;
    abstract getCurrentWindowUrl(): string;
    abstract getCurrentWindowHostname(): string;
    abstract matchMedia(query: string): MediaQueryList;
}
