export class FakeIntersectionObserver {
  static readonly instances: FakeIntersectionObserver[] = []
  readonly observed = new Set<Element>()

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeIntersectionObserver.instances.push(this)
  }

  static bringNear(): void {
    for (const observer of FakeIntersectionObserver.instances) {
      for (const element of observer.observed) {
        observer.report(element, true)
      }
    }
  }

  static reset(): void {
    FakeIntersectionObserver.instances.length = 0
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

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  report(target: Element, isIntersecting: boolean): void {
    const entry = { target, isIntersecting } as IntersectionObserverEntry
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}
