#!/usr/bin/env node
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(REPO_ROOT, '.miragon', 'vendored.json')
const INSTALLED_PLUGIN_VERSIONS = join(
  homedir(),
  '.claude/plugins/cache/miragon-agent-skills/miragon-brand',
)
const TOKENS_DIR = 'packages/extension/src/platform/theme'

const VENDORED_FILES = [
  { path: '.miragon/brand-lint/brand-lint.mjs', source: 'scripts/brand-lint.mjs' },
  {
    path: '.miragon/brand-lint/brand-lint.generated.json',
    source: 'scripts/brand-lint.generated.json',
  },
  {
    path: `${TOKENS_DIR}/cd-tokens.generated.css`,
    source: 'skills/modeler-tool-design/assets/cd-tokens.generated.css',
  },
  {
    path: `${TOKENS_DIR}/cd-tokens.generated.json`,
    source: 'skills/modeler-tool-design/assets/cd-tokens.generated.json',
  },
  {
    path: `${TOKENS_DIR}/cd-canvas.css`,
    source: 'skills/modeler-tool-design/assets/cd-canvas.css',
  },
]

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

function newestInstalledPlugin() {
  const byVersion = (a, b) => a.localeCompare(b, undefined, { numeric: true })
  const newest = readdirSync(INSTALLED_PLUGIN_VERSIONS).sort(byVersion).pop()
  return join(INSTALLED_PLUGIN_VERSIONS, newest)
}

function pluginVersion(pluginDir) {
  return JSON.parse(readFileSync(join(pluginDir, '.claude-plugin/plugin.json'), 'utf8')).version
}

function sync(pluginDir) {
  const files = VENDORED_FILES.map(({ path, source }) => {
    const target = join(REPO_ROOT, path)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(join(pluginDir, source), target)
    return { path, source, sha256: sha256(target) }
  })
  const version = pluginVersion(pluginDir)
  writeFileSync(MANIFEST, `${JSON.stringify({ version, files }, null, 2)}\n`)
  console.log(`Vendored miragon-brand ${version}: ${files.length} files.`)
}

function check() {
  const { version, files } = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const drifted = files.filter(({ path, sha256: expected }) => {
    const file = join(REPO_ROOT, path)
    return !existsSync(file) || sha256(file) !== expected
  })
  for (const { path } of drifted) {
    console.error(`${path} differs from miragon-brand ${version}. Run: node .miragon/sync.mjs`)
  }
  if (drifted.length) process.exitCode = 1
  else console.log(`miragon-brand ${version}: ${files.length} vendored files unchanged.`)
}

const [command = 'sync', pluginDir] = process.argv.slice(2)
if (command === 'check') check()
else if (command === 'sync') sync(pluginDir ?? newestInstalledPlugin())
else {
  console.error(
    `Usage: node ${relative(process.cwd(), fileURLToPath(import.meta.url))} [sync [<plugin dir>] | check]`,
  )
  process.exitCode = 64
}
