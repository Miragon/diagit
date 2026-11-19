import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { browser } from '@wdio/globals'
import type { AxeResults, Result } from 'axe-core'

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
)

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export class AccessibilityAudit {
  static async violationsIn(selector: string): Promise<string[]> {
    await browser.execute(axeSource)
    const results = (await browser.execute(
      (scope: string, tags: string[]) =>
        (
          window as unknown as { axe: { run: (...args: unknown[]) => Promise<AxeResults> } }
        ).axe.run({ include: [[scope]] }, { runOnly: { type: 'tag', values: tags } }),
      selector,
      WCAG_AA,
    )) as AxeResults
    return results.violations.map(AccessibilityAudit.describe)
  }

  static async useTheme(hostSelector: string, theme: 'light' | 'dark'): Promise<void> {
    await browser.execute(
      async (host: string, mode: string) => {
        const shadow = document.querySelector(host)!.shadowRoot!
        shadow.querySelectorAll<HTMLElement>('[data-cd-theme]').forEach((themed) => {
          themed.dataset.cdTheme = mode
        })
        await Promise.allSettled(shadow.getAnimations().map((transition) => transition.finished))
      },
      hostSelector,
      theme,
    )
  }

  private static describe(violation: Result): string {
    const targets = violation.nodes.map((node) => JSON.stringify(node.target)).join(', ')
    return `${violation.impact} ${violation.id}: ${violation.help} -> ${targets}`
  }
}
