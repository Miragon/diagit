/** Why a file holds no model Diagit can draw, though Diagit itself worked as it should. */
const HTML_PAGE = /^\s*<(!doctype\s+html|html)[\s>]/i

export type ModelRejection = 'no-layout' | 'no-content' | 'malformed' | 'unsupported'

/**
 * A notation rejects a model when the cause lies in the file. Any other error stays a
 * possible Diagit failure, which the user may report.
 */
export class ModelRejected extends Error {
  override readonly name = 'ModelRejected'

  constructor(
    readonly reason: ModelRejection,
    options?: ErrorOptions,
  ) {
    super(`The model was rejected: ${reason}`, options)
  }

  /**
   * Tells why an XML notation could not parse a source, or `null` when the cause may be
   * Diagit's: a host page served instead of the file, or a failure on a well-formed model
   * of the notation's own namespace.
   */
  static ofUnparsedXml(
    source: string,
    modelNamespace: string,
    cause: unknown,
  ): ModelRejected | null {
    if (HTML_PAGE.test(source)) {
      return null
    }
    const document = new DOMParser().parseFromString(source, 'application/xml')
    if (document.getElementsByTagName('parsererror').length > 0) {
      return new ModelRejected('malformed', { cause })
    }
    if (document.documentElement.namespaceURI !== modelNamespace) {
      return new ModelRejected('unsupported', { cause })
    }
    return null
  }
}
