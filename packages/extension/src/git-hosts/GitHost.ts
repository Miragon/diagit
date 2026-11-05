export type PageUrl = Pick<Location, 'hostname' | 'pathname'>

export interface PageView {
  readonly script: string
  rendersOn(url: PageUrl): boolean
}

export interface AuthPolicy {
  headersFor(url: string): Promise<HeadersInit | undefined>
  headersAfterUnauthorized(url: string, rejected: HeadersInit): Promise<HeadersInit | undefined>
}

export interface GitHost {
  readonly id: string
  readonly label: string
  readonly publicOrigin: string
  readonly views: readonly PageView[]
  readonly authPolicy: AuthPolicy | null
  recognizesSelfHosted(url: PageUrl): boolean
}
