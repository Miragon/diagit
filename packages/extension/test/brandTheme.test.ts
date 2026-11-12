import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import brandTokens from '../src/platform/theme/cd-tokens.generated.json' with { type: 'json' }
import { diagramColors } from '../src/platform/utils/hostTheme'

const EXTENSION_ROOT = join(import.meta.dirname, '..')
const VENDORED_THEME = join(EXTENSION_ROOT, 'src/platform/theme')
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i

function ownStylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return path === VENDORED_THEME ? [] : ownStylesheets(path)
    }
    return entry.name.endsWith('.css') ? [path] : []
  })
}

describe('Miragon design tokens', () => {
  it('draws BPMN and DMN with the text and plot roles of the mode', () => {
    expect(diagramColors('light')).toEqual({
      stroke: brandTokens.hell['--cd-ui-text'],
      fill: brandTokens.hell['--cd-ui-plot'],
    })
    expect(diagramColors('dark')).toEqual({
      stroke: brandTokens.dunkel['--cd-ui-text'],
      fill: brandTokens.dunkel['--cd-ui-plot'],
    })
  })

  it('keeps raw colour values out of the extension stylesheets', () => {
    const stylesheets = ['src', 'entrypoints'].flatMap((dir) =>
      ownStylesheets(join(EXTENSION_ROOT, dir)),
    )
    const withRawColours = stylesheets
      .filter((path) => RAW_COLOUR.test(readFileSync(path, 'utf8')))
      .map((path) => relative(EXTENSION_ROOT, path))

    expect(stylesheets.length).toBeGreaterThan(0)
    expect(withRawColours).toEqual([])
  })
})
