import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from 'wxt/utils/content-script-ui/shadow-root'
import { SHADOW_BASE_CSS, SHADOW_CANVAS_CSS } from '../theme/brandTheme'

export interface PanelHandle {
  destroy(): void
}

export interface ShadowPanelOptions<Handle extends PanelHandle> {
  name: string
  anchor: HTMLElement
  append: 'first' | 'last' | 'before' | 'after'
  css: string
  render: (container: HTMLElement) => Handle
}

export type ShadowPanel<Handle extends PanelHandle> = ShadowRootContentScriptUi<Handle>

const BODY_CHANGES: MutationObserverInit = { childList: true, subtree: true }

export class HostPage {
  constructor(
    private readonly ctx: ContentScriptContext,
    private readonly win: Window = window,
  ) {}

  get location(): Location {
    return this.win.location
  }

  get document(): Document {
    return this.win.document
  }

  onInvalidated(listener: () => void): void {
    this.ctx.onInvalidated(listener)
  }

  onNavigation(listener: (url: URL) => void): void {
    this.ctx.addEventListener(this.win, 'wxt:locationchange', (event) => {
      if (!this.ctx.isInvalid) {
        listener(event.newUrl)
      }
    })
  }

  onChange(delayMs: number, onChange: () => void): void {
    const { schedule } = this.watch(this.document.body, BODY_CHANGES, delayMs, onChange)
    this.onNavigation(schedule)
  }

  onElementChange(
    target: Node,
    init: MutationObserverInit,
    delayMs: number,
    onChange: () => void,
  ): () => void {
    return this.watch(target, init, delayMs, onChange).stop
  }

  async mountPanel<Handle extends PanelHandle>(
    options: ShadowPanelOptions<Handle>,
  ): Promise<ShadowPanel<Handle>> {
    const panelScope = this.panelScope()
    const ui = await createShadowRootUi<Handle>(panelScope.ctx, {
      name: options.name,
      position: 'inline',
      anchor: options.anchor,
      append: options.append,
      onMount: (container, shadow) => {
        const style = this.document.createElement('style')
        style.textContent = [SHADOW_BASE_CSS, options.css, SHADOW_CANVAS_CSS].join('\n')
        shadow.append(style)
        return options.render(container)
      },
      onRemove: (handle) => handle?.destroy(),
    })
    const removeUi = ui.remove
    ui.remove = () => {
      panelScope.release()
      removeUi()
    }
    ui.mount()
    return ui
  }

  private watch(
    target: Node,
    init: MutationObserverInit,
    delayMs: number,
    onChange: () => void,
  ): { schedule: () => void; stop: () => void } {
    let pending: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (pending || this.ctx.isInvalid) {
        return
      }
      pending = setTimeout(() => {
        pending = null
        onChange()
      }, delayMs)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(target, init)
    const disconnect = () => {
      observer.disconnect()
      if (pending) {
        clearTimeout(pending)
      }
      pending = null
    }
    const stopDisconnectingOnInvalidation = this.ctx.onInvalidated(disconnect)
    const stop = () => {
      stopDisconnectingOnInvalidation()
      disconnect()
    }
    return { schedule, stop }
  }

  private panelScope(): { ctx: ContentScriptContext; release: () => void } {
    const unsubscribes: Array<() => void> = []
    const ctx = Object.create(this.ctx, {
      onInvalidated: {
        value: (listener: () => void) => {
          const unsubscribe = this.ctx.onInvalidated(listener)
          unsubscribes.push(unsubscribe)
          return unsubscribe
        },
      },
    }) as ContentScriptContext
    return { ctx, release: () => unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe()) }
  }
}
