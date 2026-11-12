const VIEWBOX_CHANGED = 'canvas.viewbox.changed'

export interface EventBus {
  on(event: string, listener: () => void): void
  off(event: string, listener: () => void): void
}

export function onViewboxChange(eventBus: EventBus, listener: () => void): () => void {
  eventBus.on(VIEWBOX_CHANGED, listener)
  return () => eventBus.off(VIEWBOX_CHANGED, listener)
}
