import { normalizeOrigin } from './origin'

const REPORTABLE_LENGTH = 1_000
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>()]+/g
const PUBLIC_HOST_ORIGINS = new Set([
  'https://github.com',
  'https://api.github.com',
  'https://gitlab.com',
])

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportableErrorMessage(err: unknown): string {
  const redacted = errorMessage(err).replace(URL_PATTERN, redactUrl)
  return redacted.length > REPORTABLE_LENGTH
    ? `${redacted.slice(0, REPORTABLE_LENGTH - 1)}…`
    : redacted
}

function redactUrl(url: string): string {
  const origin = normalizeOrigin(url)
  return origin && PUBLIC_HOST_ORIGINS.has(origin) ? origin : '<url>'
}

export function unreadableModelReason(err: unknown): string {
  const kind = err instanceof Error ? err.name : 'Error'
  return `${kind} while parsing the model (details withheld, they quote the model)`
}
