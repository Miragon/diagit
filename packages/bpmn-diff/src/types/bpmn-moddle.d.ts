/**
 * Minimal ambient types for `bpmn-moddle` (the package ships no types of its own).
 * The moddle object graph is dynamic, so we type it loosely and rely on the
 * structural walk in the adapter.
 */
declare module 'bpmn-moddle' {
  export type ModdleElement = { $type: string; id?: string; [key: string]: any }

  export interface ParseResult {
    rootElement: ModdleElement
    elementsById: Record<string, ModdleElement>
    references: unknown[]
    warnings: unknown[]
  }

  export class BpmnModdle {
    constructor(packages?: any, options?: any)
    fromXML(xml: string, typeName?: string): Promise<ParseResult>
    fromXML(xml: string, options?: Record<string, unknown>): Promise<ParseResult>
  }
}
