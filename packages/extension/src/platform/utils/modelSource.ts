import { ModelRejected } from '../ModelRejected'

const HOST_PAGE = /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<(!doctype\s+html|html)[\s>]/i

/**
 * Tells why an XML notation could not parse a source, or `null` when the cause may be
 * Diagit's: a host page served instead of the file, or a failure on a well-formed model
 * of the notation's own namespace.
 */
export function rejectionOfUnparsedXml(
  source: string,
  modelNamespace: string,
  cause: unknown,
): ModelRejected | null {
  if (HOST_PAGE.test(source)) {
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

/**
 * Parses a JSON source and turns it into a notation's model. Rejects a source the file is
 * to blame for, but not a host page served instead of the file.
 */
export function parseJsonModel<Model>(source: string, toModel: (data: unknown) => Model): Model {
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch (err) {
    if (HOST_PAGE.test(source)) {
      throw err
    }
    throw new ModelRejected('malformed', { cause: err })
  }
  try {
    return toModel(data)
  } catch (err) {
    throw new ModelRejected('unsupported', { cause: err })
  }
}
