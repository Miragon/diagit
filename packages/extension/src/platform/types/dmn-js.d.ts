/**
 * Minimal ambient types for the dmn-js entry point we use. dmn-js ships no types
 * of its own. A DMN manager hosts several sub-viewers (DRD, decision table, …);
 * `getActiveViewer()` returns the currently open one, whose diagram-js service
 * registry we type loosely.
 */
declare module 'dmn-js/lib/NavigatedViewer' {
  export interface ImportResult {
    warnings: unknown[]
  }
  export interface ActiveViewer {
    get<T = any>(service: string): T
  }
  export default class NavigatedViewer {
    constructor(options?: Record<string, unknown>)
    importXML(xml: string): Promise<ImportResult>
    getActiveViewer(): ActiveViewer | undefined
    on(event: string, callback: () => void): void
    off(event: string, callback: () => void): void
    destroy(): void
  }
}
