export type PageUrl = Pick<Location, 'origin' | 'hostname' | 'pathname' | 'search'>

export interface PageView {
  readonly script: string
  rendersOn(url: PageUrl): boolean
}

export interface AuthPolicy {
  headersFor(url: string): Promise<HeadersInit | undefined>
  headersAfterUnauthorized(url: string, rejected: HeadersInit): Promise<HeadersInit | undefined>
}

export interface FetchRules {
  readonly pageOrigin: string
  readonly authenticatedApiOrigin: string
  readonly redirectTargetOrigin: string
  readonly rawFilePath: RegExp
}

export interface GitHost {
  readonly id: string
  readonly label: string
  readonly publicOrigin: string
  readonly views: readonly PageView[]
  readonly authPolicy: AuthPolicy | null
  readonly fetchRules: FetchRules | null
  recognizesSelfHosted(url: PageUrl): boolean
}
