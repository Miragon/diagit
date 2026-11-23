export class FakeResizeObserver {
  static readonly instances: FakeResizeObserver[] = []
  readonly observed = new Set<Element>()

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  static resizeAll(): void {
    for (const observer of FakeResizeObserver.instances) {
      observer.callback([], observer as unknown as ResizeObserver)
    }
  }

  static reset(): void {
    FakeResizeObserver.instances.length = 0
  }

  observe(target: Element): void {
    this.observed.add(target)
  }

  unobserve(target: Element): void {
    this.observed.delete(target)
  }

  disconnect(): void {
    this.observed.clear()
  }
}
