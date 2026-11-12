const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const CONCRETE_ORIGIN_PATTERN = /^(https?:\/\/[^/]+)\/\*$/

export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const withProtocol = EXPLICIT_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

export function originToPattern(origin: string): string {
  return `${origin}/*`
}

export function patternToOrigin(pattern: string): string | null {
  return CONCRETE_ORIGIN_PATTERN.exec(pattern)?.[1] ?? null
}

export function webOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.origin
  } catch {
    return null
  }
}
