export class SerialLocks {
  private queue: Promise<unknown> = Promise.resolve()

  request<T>(_name: string, work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work)
    this.queue = result.catch(() => undefined)
    return result
  }
}
