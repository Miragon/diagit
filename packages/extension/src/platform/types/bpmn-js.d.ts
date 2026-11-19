/**
 * Minimal ambient types for the bpmn-js entry points we use. bpmn-js ships no
 * types of its own; the diagram-js service registry is dynamic, so we type the
 * surface loosely.
 */
declare module 'bpmn-js/lib/NavigatedViewer' {
  export interface ImportResult {
    warnings: unknown[]
  }
  export default class NavigatedViewer {
    constructor(options?: Record<string, unknown>)
    importXML(xml: string): Promise<ImportResult>
    get<T = any>(service: string): T
    getDefinitions(): any
    destroy(): void
    on(event: string, callback: (event: any) => void): void
  }
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '*.css?inline' {
  const content: string
  export default content
}

declare module 'camunda-transaction-boundaries/lib/index.js' {
  const transactionBoundariesModule: Record<string, unknown>
  export default transactionBoundariesModule
}
