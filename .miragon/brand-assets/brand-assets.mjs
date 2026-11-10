#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGIN_JSON = join(PLUGIN, '.claude-plugin', 'plugin.json')
const SOURCES_JSON = join(PLUGIN, 'scripts', 'brand-assets.sources.json')
const TEMPLATE = join(PLUGIN, 'scripts', 'brand-assets.template.yaml')
const CONFIG_PATH = join('.miragon', 'brand-assets.yaml')
const MARKER = 'miragon-brand/brand-assets'
const MARKER_LINE = `# ${MARKER}: neu kopieren mit brand-assets.mjs, die Kopien nie von Hand ändern`
const YAML_CACHE = join(homedir(), '.cache', 'miragon-brand-assets')
const SEMVER = /^\d+\.\d+\.\d+$/
const SHA256 = /^[0-9a-f]{64}$/
const USAGE = 'Aufruf: node brand-assets.mjs [repo] [--init] [--check] [--verify] [--add <source> <out>]'

const EXIT_OK = 0
const EXIT_SETUP = 1
const EXIT_FINDING = 2

class SetupError extends Error {}

const sha256Of = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const compareVersions = (a, b) => {
  const [x, y] = [a, b].map((version) => version.split('.').map(Number))
  return x.map((part, index) => part - y[index]).find((difference) => difference !== 0) ?? 0
}

function loadYaml() {
  const lookups = [join(process.cwd(), 'package.json'), fileURLToPath(import.meta.url), join(YAML_CACHE, 'package.json')].map(createRequire)
  for (const lookup of lookups) {
    try {
      return lookup('yaml')
    } catch {}
  }
  throw new SetupError('yaml fehlt. Einmalig: npm i --prefix ~/.cache/miragon-brand-assets yaml')
}

function parseArguments(argv) {
  const options = { check: false, verify: false, init: false, add: undefined, repo: process.cwd() }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--check') options.check = true
    else if (arg === '--verify') options.verify = true
    else if (arg === '--init') options.init = true
    else if (arg === '--add') options.add = { source: argv[++index], out: argv[++index] }
    else if (arg.startsWith('--')) throw new SetupError(`Unbekannte Option ${arg}. ${USAGE}`)
    else options.repo = resolve(arg)
  }
  if (options.add && !(options.add.source && options.add.out)) throw new SetupError(`--add braucht <source> und <out>. ${USAGE}`)
  if (options.add && options.check) throw new SetupError(`--check schreibt nichts, --add schon. Ruf sie einzeln auf. ${USAGE}`)
  if (options.verify && (options.add || options.check || options.init)) throw new SetupError(`--verify prüft nur die Prüfsummen und lässt sich nicht kombinieren. ${USAGE}`)
  return options
}

const isInsideRepo = (out) => typeof out === 'string' && out !== '' && !isAbsolute(out) && !normalize(out).split(sep).includes('..')

class BrandAssetsConfig {
  #path
  #document

  constructor(repo, YAML) {
    this.#path = join(repo, CONFIG_PATH)
    if (!existsSync(this.#path)) throw new SetupError(`${this.#path} fehlt. Leg sie an mit: brand-assets.mjs ${repo} --init`)
    this.#document = YAML.parseDocument(readFileSync(this.#path, 'utf8'))
    if (this.#document.errors.length) this.#fail(this.#document.errors[0].message)
    const { skillVersion, files } = this.#document.toJS() ?? {}
    if (!SEMVER.test(skillVersion ?? '')) this.#fail('"skillVersion" fehlt oder ist keine Version wie 1.31.0.')
    if (!Array.isArray(files)) this.#fail('"files" fehlt oder ist keine Liste.')
    files.forEach(({ source, out, sha256 } = {}, index) => {
      if (typeof source !== 'string') this.#fail(`files[${index}]: "source" fehlt.`)
      if (!isInsideRepo(out)) this.#fail(`files[${index}]: "out" fehlt oder liegt nicht im Repo. Gemeint ist ein Pfad relativ zum Repo.`)
      if (sha256 !== undefined && !SHA256.test(sha256)) this.#fail(`files[${index}]: "sha256" ist keine Prüfsumme. brand-assets.mjs setzt sie selbst.`)
    })
    const outs = files.map(({ out }) => normalize(out))
    const duplicate = outs.find((out, index) => outs.indexOf(out) !== index)
    if (duplicate) this.#fail(`"out" ${duplicate} steht mehrfach in "files".`)
  }

  static init(repo, skillVersion) {
    const path = join(repo, CONFIG_PATH)
    if (existsSync(path)) throw new SetupError(`${path} gibt es schon.`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, readFileSync(TEMPLATE, 'utf8').replace(/^skillVersion: .*$/m, `skillVersion: ${skillVersion}`))
    return path
  }

  get path() {
    return this.#path
  }

  get skillVersion() {
    return this.#document.get('skillVersion')
  }

  get files() {
    return this.#document.toJS().files
  }

  add({ source, out }) {
    if (!isInsideRepo(out)) this.#fail(`"${out}" liegt nicht im Repo. Gemeint ist ein Pfad relativ zum Repo.`)
    if (this.files.some((file) => normalize(file.out) === normalize(out))) this.#fail(`"out" ${out} steht schon in "files".`)
    const files = this.#document.get('files')
    files.flow = false
    files.add(this.#document.createNode({ source, out }))
    this.#save()
  }

  recordCopies(skillVersion, sha256ByOut) {
    this.#document.set('skillVersion', skillVersion)
    for (const entry of this.#document.get('files').items) entry.set('sha256', sha256ByOut.get(entry.get('out')))
    this.#save()
  }

  #save() {
    const source = String(this.#document)
    writeFileSync(this.#path, source.includes(MARKER) ? source : `${MARKER_LINE}\n${source}`)
  }

  #fail(message) {
    throw new SetupError(`${this.#path}: ${message}`)
  }
}

function inspect({ source, out }, repo, copyableSources) {
  const target = join(repo, out)
  if (!copyableSources.includes(source)) {
    return { out, finding: `"${source}" ist keine kopierbare Datei von miragon-brand (umbenannt oder entfernt?). Erlaubt: ${copyableSources.join(', ')}.` }
  }
  const sourcePath = join(PLUGIN, source)
  const isCurrent = existsSync(target) && readFileSync(target).equals(readFileSync(sourcePath))
  return { out, sourcePath, target, finding: isCurrent ? undefined : existsSync(target) ? `weicht von ${source} ab.` : `fehlt, Quelle ${source}.` }
}

function run(options, installedVersion) {
  const copyableSources = JSON.parse(readFileSync(SOURCES_JSON, 'utf8')).sources
  const config = new BrandAssetsConfig(options.repo, loadYaml())
  if (compareVersions(config.skillVersion, installedVersion) > 0) {
    throw new SetupError(`${config.path}: nennt skillVersion ${config.skillVersion}, das Plugin ist erst ${installedVersion}. Aktualisiere das Plugin miragon-brand.`)
  }
  if (options.add) {
    if (!copyableSources.includes(options.add.source)) {
      throw new SetupError(`"${options.add.source}" ist keine kopierbare Datei von miragon-brand. Erlaubt: ${copyableSources.join(', ')}.`)
    }
    config.add(options.add)
  }
  if (config.files.length === 0) throw new SetupError(`${config.path}: "files" ist leer. Trag eine Datei ein mit: brand-assets.mjs --add <source> <out>`)

  const results = config.files.map((file) => inspect(file, options.repo, copyableSources))
  if (options.check) {
    const isOlder = compareVersions(config.skillVersion, installedVersion) < 0
    const hint = isOlder && results.every(({ finding }) => !finding)
      ? `Kopiert mit ${config.skillVersion}, das Plugin ist ${installedVersion}. Die Dateien sind gleich geblieben, beim nächsten Kopieren steigt die Version mit.`
      : undefined
    return { results, hint }
  }
  const copied = results.map((result) => {
    if (!result.sourcePath) return result
    mkdirSync(dirname(result.target), { recursive: true })
    copyFileSync(result.sourcePath, result.target)
    return { out: result.out, written: true, sha256: sha256Of(result.target) }
  })
  if (copied.every(({ finding }) => !finding)) config.recordCopies(installedVersion, new Map(copied.map(({ out, sha256 }) => [out, sha256])))
  return { results: copied }
}

function verify(options) {
  const config = new BrandAssetsConfig(options.repo, loadYaml())
  const results = config.files.map(({ out, sha256 }) => {
    const target = join(options.repo, out)
    if (!sha256) return { out, finding: 'hat keine Prüfsumme. Kopier einmal mit brand-assets.mjs, dann setzt es sie.' }
    if (!existsSync(target)) return { out, finding: 'fehlt.' }
    return { out, finding: sha256Of(target) === sha256 ? undefined : `wurde geändert, seit brand-assets.mjs sie mit miragon-brand ${config.skillVersion} kopiert hat. Kopier neu statt von Hand zu ändern.` }
  })
  return { results }
}

function print({ results, hint }) {
  if (hint) console.log(`HINWEIS: ${hint}`)
  for (const { out, finding, written } of results) {
    console.log(finding ? `BEFUND ${out}: ${finding}` : written ? `KOPIERT ${out}` : `OK ${out}`)
  }
}

function main(argv) {
  try {
    const options = parseArguments(argv)
    if (options.verify) {
      const result = verify(options)
      print(result)
      return result.results.some(({ finding }) => finding) ? EXIT_FINDING : EXIT_OK
    }
    const installedVersion = JSON.parse(readFileSync(PLUGIN_JSON, 'utf8')).version
    if (options.init) {
      const path = BrandAssetsConfig.init(options.repo, installedVersion)
      console.log(`Angelegt: ${relative(process.cwd(), path) || path}. Trag Dateien ein mit brand-assets.mjs --add <source> <out>.`)
      return EXIT_OK
    }
    const result = run(options, installedVersion)
    print(result)
    return result.results.some(({ finding }) => finding) ? EXIT_FINDING : EXIT_OK
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(error.message)
      return EXIT_SETUP
    }
    throw error
  }
}

process.exitCode = main(process.argv.slice(2))
