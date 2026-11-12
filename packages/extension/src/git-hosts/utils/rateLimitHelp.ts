import { FetchError } from '../../platform/messaging/HttpClient'

const TOO_MANY_REQUESTS = 429

export interface RateLimitHelp {
  title: string
  body: string
}

export function rateLimitHelp(host: string, err: unknown): RateLimitHelp | undefined {
  if (!(err instanceof FetchError)) {
    return undefined
  }
  const resetsAt = err.rateLimitResetsAt
  if (err.status !== TOO_MANY_REQUESTS && resetsAt === undefined) {
    return undefined
  }
  const title = `${host} rate limit reached`
  if (resetsAt === undefined || resetsAt <= Date.now()) {
    return { title, body: 'Try again later.' }
  }
  const resetTime = new Date(resetsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return { title, body: `It resets at ${resetTime}.` }
}
