let fullScreenElement: Element | null = null

function announceChangeOn(element: Element): void {
  element.dispatchEvent(new Event('fullscreenchange', { bubbles: true, composed: true }))
}

function enter(element: Element): void {
  fullScreenElement = element
  announceChangeOn(element)
}

export class FakeFullScreen {
  static install(): void {
    fullScreenElement = null
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullScreenElement,
    })
    Element.prototype.requestFullscreen = async function (this: Element) {
      enter(this)
    }
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: async () => FakeFullScreen.exit(),
    })
  }

  static refuse(): void {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new TypeError('Permissions check failed'))
  }

  static exit(): void {
    const formerElement = fullScreenElement
    fullScreenElement = null
    if (formerElement) {
      announceChangeOn(formerElement)
    }
  }

  static uninstall(): void {
    fullScreenElement = null
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'exitFullscreen')
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
  }
}
