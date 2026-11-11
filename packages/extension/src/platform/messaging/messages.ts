export interface FetchTextRequest {
  type: 'fetchText'
  url: string
}

export interface InjectViewScriptRequest {
  type: 'injectViewScript'
  script: string
}

export interface OpenOptionsRequest {
  type: 'openOptions'
}

export type BackgroundRequest = FetchTextRequest | InjectViewScriptRequest | OpenOptionsRequest

export type FetchTextResponse =
  { ok: true; text: string } | { ok: false; error: string; status?: number }
