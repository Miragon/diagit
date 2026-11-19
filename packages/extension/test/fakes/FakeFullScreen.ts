let fullScreenElement: Element | null = null
let pendingChange: Promise<void> = Promise.resolve()
const nativeShadowRootFullScreenElement = Object.getOwnPropertyDescriptor(
  ShadowRoot.prototype,
  'fullscreenElement',
)

function retargetedTo(root: Node): Element | null {
  let element = fullScreenElement
  while (element && element.getRootNode() !== root) {
    const elementRoot = element.getRootNode()
    element = elementRoot instanceof ShadowRoot ? elementRoot.host : null
  }
  return element
}

function changeInNextFrame(next: Element | null, announcedOn: Element): Promise<void> {
  let announced!: () => void
  pendingChange = new Promise<void>((resolve) => (announced = resolve))
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      fullScreenElement = next
      resolve()
      setTimeout(() => {
        announcedOn.dispatchEvent(new Event('fullscreenchange', { bubbles: true, composed: true }))
        announced()
      })
    })
  })
}

export class FakeFullScreen {
  static install(): void {
    fullScreenElement = null
    pendingChange = Promise.resolve()
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => retargetedTo(document),
    })
    Object.defineProperty(ShadowRoot.prototype, 'fullscreenElement', {
      configurable: true,
      get(this: ShadowRoot) {
        return retargetedTo(this)
      },
    })
    Element.prototype.requestFullscreen = function (this: Element) {
      return changeInNextFrame(this, this)
    }
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: () => FakeFullScreen.exit(),
    })
  }

  static refuse(): void {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new TypeError('Permissions check failed'))
  }

  static exit(): Promise<void> {
    if (!fullScreenElement) {
      return Promise.resolve()
    }
    void changeInNextFrame(null, fullScreenElement)
    return pendingChange
  }

  static settled(): Promise<void> {
    return pendingChange
  }

  static uninstall(): void {
    fullScreenElement = null
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'exitFullscreen')
    if (nativeShadowRootFullScreenElement) {
      Object.defineProperty(
        ShadowRoot.prototype,
        'fullscreenElement',
        nativeShadowRootFullScreenElement,
      )
    }
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
  }
}
