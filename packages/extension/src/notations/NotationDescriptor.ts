export interface NotationDescriptor {
  readonly id: string
  readonly label: string
  readonly extensions: readonly string[]
  readonly diffable: boolean
  readonly showsBpmnIoLogo?: boolean
}
