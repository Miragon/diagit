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

export interface OpenViewerRequest {
  type: 'openViewer'
  url: string
}

export type BackgroundRequest =
  FetchTextRequest | InjectViewScriptRequest | OpenOptionsRequest | OpenViewerRequest

export type FetchTextResponse =
  | { ok: true; text: string }
  | { ok: false; error: string; status?: number; rateLimitResetsAt?: number }
