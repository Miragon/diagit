/** Why a file holds no model Diagit can draw, though Diagit itself worked as it should. */
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
}
