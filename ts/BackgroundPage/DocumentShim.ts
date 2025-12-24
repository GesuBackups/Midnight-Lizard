// Provide a runtime Document value for environments (service worker) where Document is not defined.
// This prevents decorator metadata (design:paramtypes) from referencing an undefined symbol.
if (typeof (globalThis as any).Document === 'undefined') {
    (globalThis as any).Document = class {
        location = { hostname: '' };
    } as any;
}