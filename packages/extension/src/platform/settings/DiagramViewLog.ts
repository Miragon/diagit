import { SettingsStore } from './SettingsStore'

export const DIAGRAM_VIEWS_KEY = 'diagramViews'

export interface DiagramViews {
  pageCount: number
  lastPage: string
}

export class DiagramViewLog {
  constructor(private readonly store: SettingsStore = new SettingsStore()) {}

  async record(page: string): Promise<void> {
    try {
      await this.countPage(page)
    } catch (err) {
      console.error('[diagit] could not record the diagram view', err)
    }
  }

  private async countPage(page: string): Promise<void> {
    const views = await this.store.readRecord<DiagramViews>(DIAGRAM_VIEWS_KEY)
    if (views?.lastPage === page) return
    const pageCount = (views?.pageCount ?? 0) + 1
    await this.store.writeRecord<DiagramViews>(DIAGRAM_VIEWS_KEY, { pageCount, lastPage: page })
  }
}
