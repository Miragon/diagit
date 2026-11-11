import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from 'wxt/utils/content-script-ui/shadow-root'
import { SHADOW_CANVAS_CSS, SHADOW_TOKENS_CSS } from '../theme/brandTheme'

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
    this.ctx.addEventListener(this.win, 'wxt:locationchange', (event) => listener(event.newUrl))
  }

  onChange(delayMs: number, onChange: () => void): void {
    const schedule = this.onElementChange(this.document.body, BODY_CHANGES, delayMs, onChange)
    this.onNavigation(schedule)
  }

  onElementChange(
    target: Node,
    init: MutationObserverInit,
    delayMs: number,
    onChange: () => void,
  ): () => void {
    let pending: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (pending) return
      pending = setTimeout(() => {
        pending = null
        onChange()
      }, delayMs)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(target, init)
    this.ctx.onInvalidated(() => {
      observer.disconnect()
      if (pending) clearTimeout(pending)
    })
    return schedule
  }

  async mountPanel<Handle extends PanelHandle>(
    options: ShadowPanelOptions<Handle>,
  ): Promise<ShadowPanel<Handle>> {
    const ui = await createShadowRootUi<Handle>(this.ctx, {
      name: options.name,
      position: 'inline',
      anchor: options.anchor,
      append: options.append,
      onMount: (container, shadow) => {
        const style = this.document.createElement('style')
        style.textContent = [SHADOW_TOKENS_CSS, options.css, SHADOW_CANVAS_CSS].join('\n')
        shadow.append(style)
        return options.render(container)
      },
      onRemove: (handle) => handle?.destroy(),
    })
    ui.mount()
    return ui
  }
}
