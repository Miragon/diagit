export type DeviceFlowFailure = 'expired' | 'denied' | 'cancelled' | 'failed'

export class DeviceFlowError extends Error {
  constructor(
    message: string,
    readonly reason: DeviceFlowFailure = 'failed',
  ) {
    super(message)
  }
}
