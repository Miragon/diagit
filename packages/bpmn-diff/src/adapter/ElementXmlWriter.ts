import { Writer } from 'moddle-xml'
import type { ModdleElement } from 'bpmn-moddle'
import { CHILDREN_DIFFED_AS_OWN_ELEMENTS, LAYOUT_PROPERTIES } from '../domain/elementContent'
import { ReferencedElements } from '../domain/ReferencedElements'
import type { BpmnDocument } from './BpmnParser'

const NOT_OWN_CONTENT = new Set<string>([...CHILDREN_DIFFED_AS_OWN_ELEMENTS, ...LAYOUT_PROPERTIES])
const TAG = /<[^>]+>/g
const NAMESPACE_DECLARATION = /\s+xmlns(?::[^\s=]+)?="[^"]*"/g
const BLOCK_SEPARATOR = '\n\n'

/**
 * Writes one element of a document as XML for reading: flat (without the children that are
 * elements of their own and without layout), followed by the elements without a shape that it
 * references, and without namespace declarations.
 */
export class ElementXmlWriter {
  private readonly xmlWriter = new Writer({ format: true, preamble: false })
  private readonly referencedElements = new ReferencedElements()

  constructor(private readonly document: BpmnDocument) {}

  write(id: string): string | null {
    const businessObject = this.document.model.get(id)?.businessObject
    if (!businessObject) {
      return null
    }
    const blocks = [businessObject, ...this.referencedElementsOf(businessObject)]
      .map((element) => this.writeFlat(element))
      .filter((block): block is string => block !== null)
    return blocks.length > 0 ? blocks.join(BLOCK_SEPARATOR) : null
  }

  private referencedElementsOf(businessObject: ModdleElement): ModdleElement[] {
    try {
      return this.referencedElements.of(businessObject, this.document.model)
    } catch {
      return []
    }
  }

  private writeFlat(element: ModdleElement): string | null {
    return this.tryWrite(() => this.flatCopyOf(element)) ?? this.tryWrite(() => element)
  }

  private tryWrite(elementToWrite: () => ModdleElement): string | null {
    try {
      return this.withoutNamespaceDeclarations(this.xmlWriter.toXML(elementToWrite()))
    } catch {
      return null
    }
  }

  private flatCopyOf(element: ModdleElement): ModdleElement {
    const copy = this.document.moddle.create(element.$type)
    for (const name of this.ownContentNamesOf(element)) {
      copy.set(name, element[name])
    }
    Object.assign(copy.$attrs, this.namespaceDeclarations(), element.$attrs)
    return copy
  }

  private ownContentNamesOf(element: ModdleElement): string[] {
    const propertyNames: string[] = (element.$descriptor?.properties ?? []).map(
      (property: any) => property.name,
    )
    return [...new Set([...Object.keys(element), ...propertyNames])].filter(
      (name) => !name.startsWith('$') && !NOT_OWN_CONTENT.has(name) && element[name] !== undefined,
    )
  }

  /** Declares the prefixes of the source document, so namespaces without a schema keep them. */
  private namespaceDeclarations(): Record<string, string> {
    const attributes: Record<string, string> = this.document.definitions.$attrs ?? {}
    return Object.fromEntries(
      Object.entries(attributes).filter(([name]) => name === 'xmlns' || name.startsWith('xmlns:')),
    )
  }

  private withoutNamespaceDeclarations(xml: string): string {
    return xml.replace(TAG, (tag) => tag.replace(NAMESPACE_DECLARATION, '')).trimEnd()
  }
}
