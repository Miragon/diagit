import { FetchError } from '../../platform/messaging/HttpClient'

const TOO_MANY_REQUESTS = 429

export function rateLimitHint(host: string, err: unknown): string | undefined {
  if (!(err instanceof FetchError)) return undefined
  const resetsAt = err.rateLimitResetsAt
  if (err.status !== TOO_MANY_REQUESTS && resetsAt === undefined) return undefined
  const reached = `${host}'s API rate limit is reached.`
  if (resetsAt === undefined || resetsAt <= Date.now()) return reached
  const resetTime = new Date(resetsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${reached} It resets at ${resetTime}.`
}
