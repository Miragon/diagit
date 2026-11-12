import type { HttpClient } from '../messaging/HttpClient'

const MAX_PAGES = 20
const PER_PAGE = 100

export async function fetchAllPages<T>(http: HttpClient, url: string): Promise<T[]> {
  const items: T[] = []
  const separator = url.includes('?') ? '&' : '?'
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await http.fetchJson<T[]>(`${url}${separator}per_page=${PER_PAGE}&page=${page}`)
    items.push(...batch)
    if (batch.length < PER_PAGE) {
      break
    }
  }
  return items
}
