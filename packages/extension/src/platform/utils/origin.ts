const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const CONCRETE_ORIGIN_PATTERN = /^(https?:\/\/[^/]+)\/\*$/
const WEB_PROTOCOLS = new Set(['http:', 'https:'])

export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const withProtocol = EXPLICIT_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`
  return webOrigin(withProtocol)
}

export function originToPattern(origin: string): string {
  return `${origin}/*`
}

export function patternToOrigin(pattern: string): string | null {
  return CONCRETE_ORIGIN_PATTERN.exec(pattern)?.[1] ?? null
}

export function webUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return WEB_PROTOCOLS.has(url.protocol) ? url : null
  } catch {
    return null
  }
}

export function webOrigin(url: string): string | null {
  return webUrl(url)?.origin ?? null
}
