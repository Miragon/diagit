interface FittableViewer {
  fit(): void
  resized(): void
}

export class AutoFit {
  private viewMovedByUser = false
  private readonly resizeObserver = new ResizeObserver(() => this.followResize())
  private readonly listeners = new AbortController()

  constructor(
    area: HTMLElement,
    private readonly viewers: () => (FittableViewer | null)[],
  ) {
    area.addEventListener('pointerdown', (event) => this.pressedIn(event), {
      capture: true,
      signal: this.listeners.signal,
    })
    area.addEventListener('wheel', (event) => this.scrolledIn(event), {
      passive: true,
      signal: this.listeners.signal,
    })
    this.resizeObserver.observe(area)
  }

  fit(): void {
    this.viewMovedByUser = false
    for (const viewer of this.viewers()) {
      viewer?.fit()
    }
  }

  userMovedView(): void {
    this.viewMovedByUser = true
  }

  stop(): void {
    this.resizeObserver.disconnect()
    this.listeners.abort()
  }

  private pressedIn(event: Event): void {
    const pressedAButton = event.target instanceof Element && event.target.closest('button')
    if (!pressedAButton) {
      this.userMovedView()
    }
  }

  private scrolledIn(event: Event): void {
    const viewerHandledTheWheel = event.defaultPrevented
    if (viewerHandledTheWheel) {
      this.userMovedView()
    }
  }

  private followResize(): void {
    if (!this.viewMovedByUser) {
      this.fit()
      return
    }
    for (const viewer of this.viewers()) {
      viewer?.resized()
    }
  }
}
