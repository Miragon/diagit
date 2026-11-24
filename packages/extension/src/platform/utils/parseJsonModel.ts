import { ModelRejected } from '../ModelRejected'

/** Parses a JSON source and turns it into a notation's model, rejecting a source the file is to blame for. */
export function parseJsonModel<Model>(source: string, toModel: (data: unknown) => Model): Model {
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch (err) {
    throw new ModelRejected('malformed', { cause: err })
  }
  try {
    return toModel(data)
  } catch (err) {
    throw new ModelRejected('unsupported', { cause: err })
  }
}
