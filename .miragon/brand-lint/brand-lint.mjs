#!/usr/bin/env node
/**
 * brand-lint: prüft Texte und Code gegen die Miragon Corporate Identity.
 *
 * Findet die klaren Fälle automatisch: Siezen, Em-Dashes, Umlaut-Ersatz, Floskeln,
 * alte Claims, falsche Schreibweisen, AI-Muster (Anti-Slop), Farben außerhalb
 * der Tokens (Hex und rgb()) und einen Dark Mode, der nicht aus den Rollen kommt (C6).
 * Was Urteil braucht (Ton, Haltung, Bildsprache), bleibt dem Review.
 *
 * Aufruf:
 *   node brand-lint.mjs [--json] [--nur-hart] <dateien oder ordner …>
 *   node brand-lint.mjs --hook    als Claude-Code-Hook (PostToolUse, liest JSON von stdin)
 *
 * Exit-Code (CLI): 1 bei harten Verstößen, sonst 0.
 *
 * Aktivierung pro Repo: Der Hook prüft nur, wenn im Repo eine Datei
 * `.miragon/brand.json` liegt. So bleibt er in Kundenprojekten stumm.
 *   {
 *     "ignorieren": ["docs/archiv/", "*.min.css"],   Pfade oder einfache Muster
 *     "aus": ["S6"]                                   Regeln abschalten
 *   }
 *
 * Was geprüft wird:
 *   .md .mdx .markdown .txt   Text (mit YAML-Frontmatter)
 *   .astro                    Text im Template, in Textattributen und in Stringliteralen,
 *                             Farben überall, CSS-Muster im <style>
 *   .vue .html .htm           Text im Template, Farben überall, CSS-Muster im <style>
 *   .css .scss .sass .less    Farben und CSS-Muster
 *   .js .mjs .cjs .ts .tsx .jsx .svg   nur Farben
 * JSON-LD (<script type="application/ld+json">) zählt in .astro, .vue und .html als Text:
 * die String-Werte, nicht die Schlüssel.
 *
 * Dark Mode (C6):
 *   - CSS und <style>: Regeln unter .dark, html.dark, [data-cd-theme="dark"] (auch andere
 *     data-*theme), .vscode-dark, .vscode-high-contrast, @media (prefers-color-scheme: dark),
 *     @variant dark, auch verschachtelt. Ein heller Marker weiter rechts im Selektor
 *     ([data-cd-theme="light"]) macht die Regel wieder hell. Gemeldet werden -soft, Farben mit
 *     Deckkraft außer Schwarz, color-mix mit Farbe oder transparent, hsl() außerhalb der CI,
 *     ui.linie und ui.text-leise, Blau, blau-link und danger als Text, invert(), brightness(),
 *     hue-rotate(), mix-blend-mode. Überall: Host-Farben (var(--vscode-*), außer Schrift) und
 *     Grün als Button-Fläche.
 *   - Tailwind-Klassen in .astro, .vue, .html, .tsx, .jsx, .ts, .js und @apply: Palettenklassen
 *     (gray, slate, zinc, neutral, stone, blue-950 …), bg-black, prose-invert, unter dark: auch
 *     invert, brightness, hue-rotate, -soft und Blau als Text. Sichtbarer Text, <pre> und <code>
 *     bleiben ausgenommen.
 *   - Weiche Hinweise (nicht sicher erkennbar): Deckkraft-Modifikator an Tailwind-Farben
 *     (bg-tertiary/10), --cd-weiss oder --cd-grau als Fläche im Dunkel-Block.
 *
 * Ausnahmen im Text:
 *   - Code, Inline-Code, Links, HTML-Tags und alles in Anführungszeichen („…", "…")
 *   - im Frontmatter: Schlüssel, Pfade, URLs und Zitate echter Menschen
 *     (Werte unter quote, quotes, zitat, testimonial, feedback, stimmen …)
 *   - in .astro: Imports, Klassen, IDs, Pfade, URLs, Code, Code-Kommentare, <script>,
 *     <pre>, <code> und Strings in console.*(…) und Error(…)
 *   - Zeilen mit ✗ (bewusste Negativbeispiele)
 *   - <!-- brand-lint-disable --> … <!-- brand-lint-enable -->
 *   - <!-- brand-lint-disable-next-line -->
 *   - dieselben Anweisungen als JSX-Kommentar (MDX, .astro), etwa
 *     {/* brand-lint-disable-next-line *\/}, als Blockkommentar /* … *\/ (CSS, <style>,
 *     Code) und als Zeilenkommentar // … (JS/TS, <script>, Frontmatter von .astro,
 *     SCSS, Sass, Less). In reinem CSS ist // kein Kommentar.
 *   - im YAML-Frontmatter: # brand-lint-disable-next-line vor einem Schlüssel
 *   - generierte Abschnitte <!-- brand:NAME --> … <!-- /brand:NAME -->
 * Ein brand-lint-disable ohne brand-lint-enable meldet außerhalb von Markdown den
 * weichen Hinweis L1, weil es still den Rest der Datei abschaltet.
 *
 * Keine Abhängigkeiten, damit der Hook in jedem Repo läuft. Die Regeln kommen aus
 * brand-lint.generated.json (erzeugt aus brand/*.yaml im CI-Repo).
 */
import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs'
import { dirname, join, relative, resolve, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = JSON.parse(readFileSync(new URL('./brand-lint.generated.json', import.meta.url), 'utf8'))

const TEXT_EXT = new Set(['.md', '.mdx', '.markdown', '.txt'])
// Hinweise von brand-lint selbst, keine Regeln der Marke (die stehen in brand/regeln.yaml).
const LINT_REGELN = { L1: { titel: 'Offene Ausnahme', schwere: 'weich' } }
const MARKUP_EXT = new Set(['.vue', '.html', '.htm'])
const ASTRO_EXT = new Set(['.astro'])
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less'])
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.svg'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'cache', '.vitepress/cache', 'coverage'])

/* ------------------------------------------------------------------ */
/* Maskieren: Bereiche, die nicht geprüft werden, durch Leerzeichen    */
/* ersetzen. Zeilenumbrüche bleiben, damit Zeilen und Spalten stimmen. */
/* ------------------------------------------------------------------ */
function maskRanges(text, ranges) {
  if (!ranges.length) return text
  const chars = text.split('')
  for (const [from, to] of ranges) {
    for (let i = from; i < to && i < chars.length; i++) if (chars[i] !== '\n') chars[i] = ' '
  }
  return chars.join('')
}
function collect(text, re, ranges, group = 0) {
  for (const m of text.matchAll(re)) {
    const start = m.index + (group ? m[0].indexOf(m[group]) : 0)
    ranges.push([start, start + m[group].length])
  }
}
// Nacheinander maskieren, damit z. B. Anführungszeichen in Code-Blöcken nicht stören.
function maskSteps(text, patterns) {
  let out = text
  for (const re of patterns) {
    const ranges = []
    collect(out, re, ranges)
    out = maskRanges(out, ranges)
  }
  return out
}

const COMMON_TEXT_MASKS = [
  /<!--\s*brand:([a-z-]+)\s*-->[\s\S]*?<!--\s*\/brand:\1\s*-->/g,
  /<!--\s*brand-lint-disable\s*-->[\s\S]*?(<!--\s*brand-lint-enable\s*-->|$(?![\s\S]))/g,
  /<!--\s*brand-lint-disable-next-line\s*-->[^\n]*\n[^\n]*/g,
  /<!--[\s\S]*?-->/g,
  /^.*✗.*$/gm,
  /„[^„"“\n]*["“]/g,
  /"[^"\n]*"/g,
  /»[^«\n]*«/g,
  /https?:\/\/[^\s)>\]]+/g
]

// Tabellen-Spalten mit Negativbeispielen („✗ So nicht", „Statt", „Nicht" …) auslassen.
const NEG_HEADER = /✗|so nicht|^statt$|^nicht$|vorher|wir sind nicht|klingt so|^falsch$/i
function splitCells(line) {
  const cells = []
  let from = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|' && line[i - 1] !== '\\') {
      if (from >= 0) cells.push({ text: line.slice(from, i), from, to: i })
      from = i + 1
    }
  }
  return cells
}
function maskNegativeColumns(text) {
  const lines = text.split('\n')
  const starts = []
  let off = 0
  for (const l of lines) {
    starts.push(off)
    off += l.length + 1
  }
  const ranges = []
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue
    const neg = splitCells(lines[i])
      .map((c, idx) => (NEG_HEADER.test(c.text.replace(/[*_]/g, '').trim()) ? idx : -1))
      .filter((idx) => idx >= 0)
    if (!neg.length) continue
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const cells = splitCells(lines[j])
      for (const idx of neg) if (cells[idx]) ranges.push([starts[j] + cells[idx].from, starts[j] + cells[idx].to])
    }
  }
  return maskRanges(text, ranges)
}

// Sichtbarer Text in Komponenten-Attributen (z. B. <VoiceExample after="…" why="…">)
// wird geprüft. Negativbeispiele (before, nicht, bad) bleiben ausgenommen.
const POSITIVE_ATTR = /\b(after|why|ja|text|title|label|details|tagline|caption)="([^"\n]*)"/g
function keepRanges(text) {
  const ranges = []
  for (const m of text.matchAll(POSITIVE_ATTR)) {
    const start = m.index + m[0].indexOf('"') + 1
    ranges.push([start, start + m[2].length])
  }
  return ranges
}
function unmask(masked, original, ranges) {
  if (!ranges.length) return masked
  const chars = masked.split('')
  for (const [from, to] of ranges) for (let i = from; i < to; i++) chars[i] = original[i]
  return chars.join('')
}

// Schlüssel im YAML-Frontmatter (z. B. `loesung:`) sind Bezeichner, kein Text.
function maskFrontmatterKeys(text) {
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---/)
  if (!fm) return text
  const ranges = []
  for (const m of fm[0].matchAll(/^([ \t]*(?:-[ \t]*)?)([A-Za-z0-9_-]+)(?=:)/gm)) {
    const start = m.index + m[1].length
    ranges.push([start, start + m[2].length])
  }
  return maskRanges(text, ranges)
}

// Im Frontmatter sind Werte in "…" Inhalt (Astro- und VitePress-Seiten stehen oft
// komplett dort), keine Zitate. Ausgeblendet werden nur Schlüssel, Pfade, URLs,
// Farbwerte, deutsche Zitate und die YAML-Anführungszeichen selbst.
// Zitate echter Menschen (Kunden, Teilnehmende, Mitarbeitende) werden nicht auf
// Markenstimme umgeschrieben. Werte unter diesen Schlüsseln bleiben ausgenommen,
// inklusive eingerückter Listen darunter.
const QUOTE_WORDS = 'quote|quotes|zitat|zitate|testimonial|testimonials|feedback|stimme|stimmen'
const QUOTE_KEYS = new RegExp(`^([ \\t]*)(?:-[ \\t]*)?(${QUOTE_WORDS})[ \\t]*:`, 'i')
function maskQuoteValues(fm) {
  const lines = fm.split('\n')
  const ranges = []
  let off = 0
  let blockIndent = -1
  for (const line of lines) {
    const indent = line.match(/^[ \t]*/)[0].length
    if (blockIndent >= 0 && line.trim() && indent <= blockIndent && !/^[ \t]*-/.test(line.slice(blockIndent))) blockIndent = -1
    if (blockIndent >= 0 && line.trim() && indent > blockIndent) {
      ranges.push([off, off + line.length])
    } else {
      const m = line.match(QUOTE_KEYS)
      if (m) {
        const colon = line.indexOf(':', m[1].length)
        ranges.push([off + colon + 1, off + line.length])
        blockIndent = m[1].length
      }
    }
    off += line.length + 1
  }
  return maskRanges(fm, ranges)
}

// `# brand-lint-disable-next-line` im YAML-Frontmatter nimmt den folgenden Schlüssel
// aus, samt seinem Wert über mehrere Zeilen (eingerückte Zeilen, Listen darunter).
const YAML_DISABLE = /^[ \t]*#[ \t]*brand-lint-disable-next-line[ \t]*\r?$/
function maskYamlDisabled(fm) {
  const lines = fm.split('\n')
  const starts = []
  let off = 0
  for (const l of lines) {
    starts.push(off)
    off += l.length + 1
  }
  const indentOf = (l) => l.match(/^[ \t]*/)[0].length
  const ranges = []
  for (let i = 0; i < lines.length - 1; i++) {
    if (!YAML_DISABLE.test(lines[i])) continue
    const target = lines[i + 1]
    const indent = indentOf(target)
    const block = /:[ \t]*(?:[|>][+-]?[ \t]*)?\r?$/.test(target)
    let j = i + 2
    for (; j < lines.length; j++) {
      const l = lines[j]
      if (!l.trim() || indentOf(l) > indent || (block && indentOf(l) === indent && /^[ \t]*-(?:[ \t]|$)/.test(l))) continue
      break
    }
    ranges.push([starts[i], starts[j - 1] + lines[j - 1].length])
  }
  return maskRanges(fm, ranges)
}

function maskFrontmatter(fm) {
  const out = maskSteps(maskFrontmatterKeys(maskQuoteValues(maskYamlDisabled(fm))), [
    /"(?:\/|\.\/|https?:\/\/|#)[^"\n]*"/g,
    /„[^„"“\n]*["“]/g,
    /»[^«\n]*«/g,
    /https?:\/\/[^\s"]+/g,
    /^---.*$/gm
  ])
  return out.replace(/"/g, ' ')
}

function maskMarkdown(text) {
  let out = unmask(maskMarkdownRaw(text), text, keepRanges(text))
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---/)
  if (fm) out = maskFrontmatter(fm[0]) + out.slice(fm[0].length)
  // Zitate innerhalb der wieder sichtbaren Attribute bleiben ausgenommen.
  return maskSteps(out, [/„[^„"“\n]*["“]/g, /»[^«\n]*«/g])
}
// MDX kennt keine HTML-Kommentare. Dort stehen Ausnahmen und Kommentare in {/* … */}.
const MDX_MASKS = [
  /\{\/\*\s*brand-lint-disable\s*\*\/\}[\s\S]*?(\{\/\*\s*brand-lint-enable\s*\*\/\}|$(?![\s\S]))/g,
  /\{\/\*\s*brand-lint-disable-next-line\s*\*\/\}[^\n]*\n[^\n]*/g,
  /\{\/\*[\s\S]*?\*\/\}/g
]
function maskMarkdownRaw(text) {
  return maskSteps(maskNegativeColumns(maskFrontmatterKeys(text)), [
    /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm,
    /`[^`\n]+`/g,
    ...MDX_MASKS,
    ...COMMON_TEXT_MASKS,
    /\]\([^)\n]*\)/g,
    /<\/?[A-Za-z][^>]*>/g
  ])
}
function maskMarkup(text) {
  const out = maskSteps(text, [
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /\{\{[\s\S]*?\}\}/g,
    /<!--[\s\S]*?-->/g,
    /<\/?[A-Za-z][^>]*>/g,
    ...COMMON_TEXT_MASKS
  ])
  if (!/application\/ld\+json/i.test(text)) return out
  // JSON-LD zählt wie in .astro als Text. Die Strings liegen im maskierten <script>.
  const ld = maskAstro(text, true)
  const chars = out.split('')
  for (let i = 0; i < chars.length; i++) if (chars[i] === ' ' && ld[i] !== ' ') chars[i] = ld[i]
  return chars.join('')
}
function maskCodeComments(text) {
  return maskSteps(text, [/\/\*[\s\S]*?\*\//g, /(^|[^:"'\\])\/\/[^\n]*/gm, /<!--[\s\S]*?-->/g])
}

// Ausnahmen in Markup, Astro und Code. Die Bereiche werden auf dem Original
// bestimmt, bevor Kommentare maskiert sind, und gelten für alle Regeln (auch Farben).
// Erlaubt sind <!-- … -->, {/* … */}, /* … */ und // … mit brand-lint-disable,
// brand-lint-enable oder brand-lint-disable-next-line. offen ist die Position eines
// disable ohne enable (sonst -1), das bis zum Dateiende gilt.
const DIRECTIVE =
  /<!--\s*brand-lint-(disable-next-line|disable|enable)\s*-->|\{?\/\*\s*brand-lint-(disable-next-line|disable|enable)\s*\*\/\}?|\/\/[ \t]*brand-lint-(disable-next-line|disable|enable)[ \t]*(?=\r?\n|$)/g
function disabledRanges(text) {
  const ranges = []
  let open = -1
  for (const m of text.matchAll(DIRECTIVE)) {
    const art = m[1] ?? m[2] ?? m[3]
    if (art === 'disable-next-line') {
      const eol = text.indexOf('\n', m.index + m[0].length)
      const next = eol < 0 ? -1 : text.indexOf('\n', eol + 1)
      ranges.push([m.index, eol < 0 || next < 0 ? text.length : next])
    } else if (art === 'disable') {
      if (open < 0) open = m.index
    } else if (open >= 0) {
      ranges.push([open, m.index + m[0].length])
      open = -1
    }
  }
  if (open >= 0) ranges.push([open, text.length])
  for (const m of text.matchAll(/<!--\s*brand:([a-z-]+)\s*-->[\s\S]*?<!--\s*\/brand:\1\s*-->/g)) {
    ranges.push([m.index, m.index + m[0].length])
  }
  return { ranges, offen: open }
}

/* ------------------------------------------------------------------ */
/* Astro: sichtbaren Text finden                                       */
/* ------------------------------------------------------------------ */
// Eine .astro-Datei hat einen Frontmatter-Zaun (--- … ---, TypeScript) und ein
// Template (HTML mit {…}-Ausdrücken, darin auch JSX). Der Scanner sammelt die
// Bereiche, die Menschen lesen: Textknoten, Werte von Textattributen und
// Stringliterale, die nach Text aussehen. Alles andere wird maskiert: Imports,
// Klassen, IDs, Pfade, Code, Kommentare, <script>, <style>.

// Attribute und Schlüssel mit sichtbarem Text, auch als Endung (imageAlt, ctaLabel, meta_title).
const TEXT_NAMES = new Set([
  'alt', 'title', 'placeholder', 'label', 'description', 'text', 'eyebrow', 'subtitle', 'subline',
  'heading', 'headline', 'caption', 'tagline', 'summary', 'cta', 'aria-label',
  'aria-description', 'aria-roledescription', 'aria-placeholder', 'aria-valuetext'
])
// Attribute ohne Text: Klassen, IDs, Pfade, Stile, SVG-Geometrie, Formular-Technik.
const CODE_ATTRS = new Set([
  'class', 'classname', 'class:list', 'style', 'id', 'for', 'htmlfor', 'href', 'src', 'srcset', 'sizes',
  'd', 'viewbox', 'points', 'transform', 'xmlns', 'rel', 'target', 'type', 'name', 'slot', 'role',
  'lang', 'dir', 'key', 'ref', 'method', 'action', 'pattern', 'autocomplete', 'inputmode', 'loading',
  'decoding', 'fill', 'stroke', 'width', 'height', 'value', 'define:vars', 'http-equiv', 'charset',
  'property', 'media', 'as', 'crossorigin', 'integrity', 'referrerpolicy'
])
// Endungen von Attributen und Schlüsseln ohne Text (accentClass, iconTint, ctaHref …).
const CODE_ENDINGS = new Set([
  'class', 'classes', 'classname', 'style', 'styles', 'id', 'href', 'url', 'src', 'path', 'slug',
  'icon', 'variant', 'color', 'tint', 'code'
])
// Zitate echter Menschen bleiben unangetastet, wie im Frontmatter (QUOTE_KEYS).
const QUOTE_NAME = new RegExp(`^(?:${QUOTE_WORDS})$`, 'i')
const QUOTE_BEFORE = new RegExp(`["']?(?:${QUOTE_WORDS})["']?\\s*[:=]\\s*$`, 'i')
// 'text': sichtbarer Text. 'aus': kein Text oder Zitat. 'andere': entscheidet der Inhalt.
function nameKind(name, isAttr) {
  const lower = name.toLowerCase()
  if (TEXT_NAMES.has(lower)) return 'text'
  if (QUOTE_NAME.test(name) || CODE_ENDINGS.has(lower)) return 'aus'
  if (isAttr && (CODE_ATTRS.has(lower) || /^(?:on[a-z]+|data-|aria-|client:|is:|server:|transition:)/.test(lower))) return 'aus'
  const last = name.split(/[-_:]|(?<=[a-z0-9])(?=[A-Z])/).pop().toLowerCase()
  if (CODE_ENDINGS.has(last)) return 'aus'
  if (TEXT_NAMES.has(last)) return 'text'
  return 'andere'
}

function looksLikePath(s) {
  const t = s.trim()
  return (
    /^(?:[a-z][\w+.-]*:\/\/|mailto:|tel:|data:|\/|\.{1,2}\/|#|@\/|~\/)/i.test(t) ||
    (!/\s/.test(t) && /[/\\]/.test(t)) ||
    /^[\w.-]+\.(?:astro|[cm]?[jt]sx?|css|scss|json|md|mdx|png|jpe?g|gif|svg|webp|avif|pdf|woff2?)$/i.test(t)
  )
}
// Klassenlisten (Tailwind und Co.): nur Kleinbuchstaben, Ziffern und Klassen-Zeichen,
// mindestens eine Klasse mit Bindestrich, Doppelpunkt, Schrägstrich, Klammer oder Ziffer.
// Arbitrary Values in eckigen Klammern dürfen alles enthalten, auch Großbuchstaben:
// text-[#335DE5], bg-[url('/images/Hero.png')], font-[Geist], [&_A]:underline.
const ARBITRARY = /-\[[^\]\s]*\]|^!?\[[^\]\s]*\](?=:)/g
function looksLikeClasses(s) {
  const tokens = s.trim().split(/\s+/)
  return (
    tokens.every((t) => /^[a-z0-9!@&_>*:.\/%#()[\]+~=,'"-]+$/.test(t.replace(ARBITRARY, (m) => m.replace(/\[.*\]/, '[]')))) &&
    tokens.some((t) => /[-:/[\]\d]/.test(t))
  )
}
// Text: Buchstaben und Leerzeichen zwischen Wörtern, ein Umlaut oder ein großgeschriebenes
// Kompositum mit Bindestrich (KI-Integration). Kein Pfad, keine Klassen.
function looksLikeText(s) {
  const t = s.trim()
  const textig = /\S\s+\S/.test(t) || /[äöüÄÖÜß]/.test(t) || /^\p{Lu}[\p{L}\p{N}]*(?:-[\p{L}\p{N}]+)+$/u.test(t)
  return /\p{L}/u.test(t) && textig && !looksLikePath(t) && !looksLikeClasses(t)
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const RAW_TAGS = new Set(['script', 'style', 'pre', 'code'])
const JS_KEYWORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'])
// JSON-LD (name, description …) erscheint in Suchergebnissen und zählt deshalb als Text,
// egal ob im Rumpf von <script type="application/ld+json">, über set:html oder aus dem
// Frontmatter. Im Rumpf zählen nur Werte, keine Schlüssel.
const LD_JSON_TAG = /^<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json\b/i
// Meldungen für Entwickler: Strings in console.*(…), Error(…) und new …Error(…) liest
// kein Mensch auf der Seite.
const DEV_CALL = /(?:\bconsole\s*\.\s*[A-Za-z]+|\b(?:[A-Z]\w*)?Error)\s*$/

function astroFrontmatter(text) {
  const open = text.match(/^\s*---[ \t]*\r?\n/)
  if (!open) return null
  const close = text.slice(open[0].length).match(/^---[ \t]*\r?$/m)
  if (!close) return null
  const to = open[0].length + close.index
  return { from: open[0].length, to, end: to + close[0].length }
}

// nurJsonLd: nur die Rümpfe von <script type="application/ld+json"> prüfen (für .vue und .html).
function maskAstro(text, nurJsonLd = false) {
  const n = text.length
  const keep = []
  const keepText = (a, b) => {
    if (b > a) keep.push([a, Math.min(b, n)])
  }
  // Attributwerte und Strings stehen für sich, wie ein Absatz. An ihren Anführungszeichen
  // steht in der maskierten Fassung ein Zeilenumbruch, damit Regeln für den Absatzanfang
  // (etwa S5) greifen und nichts über die Grenze hinweg zusammenläuft.
  const breaks = []
  const keepUnit = (open, a, b, close) => {
    keepText(a, b)
    breaks.push(open, close)
  }
  const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

  // Ist ein Stringliteral (Inhalt value, Anführungszeichen bei at) sichtbarer Text?
  // ctx.kind kommt vom Attribut oder Schlüssel davor, ctx.quote ist in einem Zitat-Block.
  function isVisible(value, at, ctx) {
    if (ctx.kind === 'aus' || ctx.quote || !/\p{L}/u.test(value) || looksLikePath(value)) return false
    const before = text.slice(Math.max(0, at - 160), at)
    if (/(?:\bfrom|\bimport|\brequire\s*\(|\bimport\s*\()\s*$/.test(before)) return false
    const key = before.match(/["']?([A-Za-z_$][\w$-]*)["']?\s*[:=]\s*$/)?.[1]
    const kind = key ? nameKind(key, false) : ctx.kind
    if (kind === 'aus') return false
    if (kind === 'text' || ctx.kind === 'text') return true
    return looksLikeText(value)
  }

  function str(i, end, ctx) {
    const q = text[i]
    let j = i + 1
    while (j < end && text[j] !== q && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1
    j = Math.min(j, end)
    let k = j + 1
    while (ctx.json && k < end && isWs(text[k])) k++
    const key = ctx.json && text[k] === ':' // Schlüssel in JSON
    if (!key && isVisible(text.slice(i + 1, j), i, ctx)) keepUnit(i, i + 1, j, j)
    return Math.min(j + 1, end)
  }

  function tpl(i, end, ctx) {
    const parts = []
    let j = i + 1
    let from = j
    while (j < end && text[j] !== '`') {
      if (text[j] === '\\') j += 2
      else if (text[j] === '$' && text[j + 1] === '{') {
        parts.push([from, j])
        j = js(j + 2, end, { ...ctx, brace: true }) + 1
        from = j
      } else j++
    }
    j = Math.min(j, end)
    parts.push([from, j])
    if (isVisible(parts.map(([a, b]) => text.slice(a, b)).join(' '), i, ctx)) {
      parts.forEach(([a, b]) => keepText(a, b))
      breaks.push(i, j)
    }
    return Math.min(j + 1, end)
  }

  function regex(i, end) {
    let j = i + 1
    let inClass = false
    while (j < end && text[j] !== '\n') {
      const c = text[j]
      if (c === '\\') j++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) {
        j++
        while (j < end && /[a-z]/i.test(text[j])) j++
        return j
      }
      j++
    }
    return j
  }

  // JavaScript/TypeScript bis zum schließenden } (ctx.brace) oder bis end.
  // Nur Stringliterale können sichtbar sein, im Template auch JSX darin.
  // ctx.json: JSON (Rumpf von JSON-LD), dort sind Strings vor einem : Schlüssel.
  function js(i, end, ctx) {
    // Je offene Klammer: Ist alles darin ausgenommen? Das gilt für Zitat-Blöcke
    // (quotes: [ … ]) und die Argumente von console.*(…) und Error(…).
    const open = []
    let prev = ''
    while (i < end) {
      const inner = open.includes(true) && !ctx.quote ? { ...ctx, quote: true } : ctx
      const c = text[i]
      if (isWs(c)) {
        i++
        continue
      }
      if (c === '/' && text[i + 1] === '/') {
        const e = text.indexOf('\n', i)
        i = e < 0 || e > end ? end : e
        continue
      }
      if (c === '/' && text[i + 1] === '*') {
        const e = text.indexOf('*/', i + 2)
        i = e < 0 || e > end ? end : e + 2
        continue
      }
      if (c === '"' || c === "'") {
        i = str(i, end, inner)
        prev = 'wert'
        continue
      }
      if (c === '`') {
        i = tpl(i, end, inner)
        prev = 'wert'
        continue
      }
      const operand = !prev || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || JS_KEYWORDS.has(prev)
      if (c === '/' && operand) {
        i = regex(i, end)
        prev = 'wert'
        continue
      }
      if (c === '<' && ctx.jsx && operand && prev !== '<' && /[A-Za-z>]/.test(text[i + 1] ?? '')) {
        i = markup(i, end, true, inner.quote)
        prev = 'wert'
        continue
      }
      if (c === '{' || c === '[' || c === '(') {
        const before = text.slice(Math.max(0, i - 40), i)
        open.push(QUOTE_BEFORE.test(before) || (c === '(' && DEV_CALL.test(before)))
      } else if (c === '}' || c === ']' || c === ')') {
        if (c === '}' && !open.length && ctx.brace) return i
        open.pop()
      }
      if (/[\w$]/.test(c)) {
        let j = i
        while (j < end && /[\w$]/.test(text[j])) j++
        prev = text.slice(i, j)
        i = j
        continue
      }
      prev = c
      i++
    }
    return end
  }

  // Ende eines Rohtext-Elements (<script>, <style> …): [Beginn des schließenden Tags, Ende].
  function rawClose(name, i, end) {
    const re = new RegExp(`</${name}\\s*>`, 'gi')
    re.lastIndex = i
    const m = re.exec(text)
    return m && m.index < end ? [m.index, m.index + m[0].length] : [end, end]
  }
  const jsonLd = (a, b) => js(a, b, { kind: 'andere', jsx: false, brace: false, json: true })

  // Ein Tag ab text[i] === '<'. Prüft die Werte von Textattributen.
  function tag(i, end, quote) {
    let j = i + 1
    const closing = text[j] === '/'
    if (closing) j++
    const name = (text.slice(j, j + 80).match(/^[A-Za-z][\w:.-]*/) ?? [''])[0]
    j += name.length
    const lower = name.toLowerCase()
    while (j < end) {
      const c = text[j]
      if (isWs(c)) {
        j++
        continue
      }
      if (c === '>') return { end: j + 1, closing, open: !closing && !VOID_TAGS.has(lower), raw: !closing && RAW_TAGS.has(lower), lower }
      if (c === '/' && text[j + 1] === '>') return { end: j + 2, closing, open: false }
      if (c === '{') {
        j = js(j + 1, end, { kind: 'andere', quote, jsx: true, brace: true }) + 1
        continue
      }
      const attr = text.slice(j, j + 200).match(/^[^\s=>/{}"'`]+/)?.[0]
      if (!attr) {
        j++
        continue
      }
      j += attr.length
      let k = j
      while (k < end && isWs(text[k])) k++
      if (text[k] !== '=') continue
      j = k + 1
      while (j < end && isWs(text[j])) j++
      const kind = quote ? 'aus' : nameKind(attr, true)
      // JSX in einem Zitat-Attribut (quote={<>…</>}) bleibt ebenfalls aus.
      const inQuote = quote || QUOTE_NAME.test(attr)
      const q = text[j]
      if (q === '"' || q === "'") {
        const e = text.indexOf(q, j + 1)
        const stop = e < 0 || e > end ? end : e
        const value = text.slice(j + 1, stop)
        if (kind === 'text' ? /\p{L}/u.test(value) && !looksLikePath(value) : kind === 'andere' && looksLikeText(value)) keepUnit(j, j + 1, stop, stop)
        j = stop + 1
      } else if (q === '{') {
        j = js(j + 1, end, { kind, quote: inQuote, jsx: true, brace: true }) + 1
      } else if (q === '`') {
        j = tpl(j, end, { kind, quote: inQuote, jsx: true })
      } else {
        while (j < end && !isWs(text[j]) && text[j] !== '>') j++
      }
    }
    return { end, closing, open: false }
  }

  // Template ab i. Mit jsx = true (JSX in einem Ausdruck) endet es, sobald das
  // äußerste Element geschlossen ist. In einem Zitat-Block (quote) bleibt alles aus.
  function markup(i, end, jsx, quote = false) {
    let depth = 0
    let from = i
    while (i < end) {
      const c = text[i]
      if (c === '{') {
        if (!quote) keepText(from, i)
        i = js(i + 1, end, { kind: 'andere', quote, jsx: true, brace: true }) + 1
        from = i
        continue
      }
      if (c === '<' && text.startsWith('<!', i)) {
        if (!quote) keepText(from, i)
        const close = text.startsWith('<!--', i) ? '-->' : '>'
        const e = text.indexOf(close, i + 2)
        i = e < 0 || e > end ? end : e + close.length
        from = i
        continue
      }
      if (c === '<' && /[A-Za-z>/]/.test(text[i + 1] ?? '')) {
        if (!quote) keepText(from, i)
        const t = tag(i, end, quote)
        if (t.raw) {
          const [body, after] = rawClose(t.lower, t.end, end)
          if (!quote && t.lower === 'script' && LD_JSON_TAG.test(text.slice(i, t.end))) jsonLd(t.end, body)
          i = after
        } else i = t.end
        from = i
        if (jsx) {
          if (t.closing) depth--
          else if (t.open && !t.raw) depth++
          if (depth <= 0) return i
        }
        continue
      }
      i++
    }
    if (!quote) keepText(from, end)
    return end
  }

  if (nurJsonLd) {
    const comments = [...text.matchAll(/<!--[\s\S]*?-->/g)].map((m) => [m.index, m.index + m[0].length])
    for (const m of text.matchAll(/<script\b[^>]*>/gi)) {
      if (!LD_JSON_TAG.test(m[0]) || comments.some(([a, b]) => m.index > a && m.index < b)) continue
      const from = m.index + m[0].length
      jsonLd(from, rawClose('script', from, n)[0])
    }
  } else {
    const fm = astroFrontmatter(text)
    if (fm) js(fm.from, fm.to, { kind: 'andere', jsx: false, brace: false })
    markup(fm ? fm.end : 0, n, false)
  }

  const chars = text.split('').map((c) => (c === '\n' ? c : ' '))
  for (const [a, b] of keep) for (let i = a; i < b; i++) chars[i] = text[i]
  for (const b of breaks) if (b < n && chars[b] === ' ') chars[b] = '\n'
  // Wie in Markdown: Zitate in Anführungszeichen, URLs und ✗-Zeilen bleiben ausgenommen.
  return maskSteps(chars.join(''), [/^.*✗.*$/gm, /„[^„"“\n]*["“]/g, /"[^"\n]*"/g, /»[^«\n]*«/g, /https?:\/\/[^\s)>\]]+/g])
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */
const L = '\\p{L}\\p{N}_'
// Ganzes Wort, Unicode-fähig (\b kennt keine Umlaute).
const wordRe = (src, flags = 'gu') => new RegExp(`(?<![${L}])(?:${src})(?![${L}])`, flags)
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function lineIndex(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return (pos) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= pos) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, col: pos - starts[lo] + 1 }
  }
}
const countWords = (text) => (text.match(/\p{L}+/gu) ?? []).length

/* ------------------------------------------------------------------ */
/* Text-Prüfungen                                                      */
/* ------------------------------------------------------------------ */
const UMLAUT_WOERTER = [
  'fuer', 'ueber', 'koennen', 'koennte', 'koennten', 'muessen', 'muesste', 'moechte', 'moechten',
  'waere', 'waeren', 'haette', 'haetten', 'wuerde', 'wuerden', 'loesung', 'loesungen', 'aenderung', 'aenderungen',
  'aendern', 'pruefen', 'pruefung', 'spaeter', 'frueh', 'frueher', 'zurueck', 'naechste', 'naechsten', 'qualitaet',
  'moeglich', 'moeglichkeit', 'moeglichkeiten', 'unterstuetzung', 'unterstuetzen', 'groesse', 'groesser', 'gross',
  'grosse', 'grossen', 'strasse', 'heisst', 'gemaess', 'schoen', 'buero', 'oeffnen', 'gespraech', 'faehigkeit',
  'faehigkeiten', 'taeglich', 'erklaeren', 'erzaehlen', 'schluessel', 'ausserdem', 'massnahme', 'massnahmen',
  'fuehrung', 'fuehren', 'ueberblick', 'uebersicht', 'natuerlich', 'hoeher', 'kuerzer', 'laenger', 'staerken',
  'schliessen', 'waehrend', 'gruende', 'moeglichst', 'ueberall', 'Aenderung', 'Loesung'
]
const UMLAUT_RE = wordRe(`(?:${[...new Set(UMLAUT_WOERTER.map((w) => w.toLowerCase()))].join('|')})`, 'giu')
const SIE_RE = /(?<![\p{L}\p{N}_])(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)(?![\p{L}\p{N}_])/gu
const MAN_RE = wordRe('[Mm]an')
// Platzhalter-Adressen in Sie-Form: ihre@email.de, ihr.name@firma.de, name@ihre-firma.de
const SIE_MAIL_RE = /(?<![\p{L}\p{N}_.+-])(?:ihre?[nmrs]?|sie)(?:[._-][\p{L}\p{N}]+)*@[\p{L}\p{N}._-]*|(?<![\p{L}\p{N}_.+-])[\p{L}\p{N}._+-]*@ihre?[-_]?(?:firma|unternehmen|domain|company)[\p{L}\p{N}._-]*/giu
// Wert eines Platzhalters (placeholder="…", placeholder: "…"). Dort ist „Ihre" auch am
// Anfang Siezen, ein Platzhalter beginnt keinen Satz über Dritte.
const PLACEHOLDER_RE = /\b(?:aria-)?placeholder["']?[ \t]*[:=][ \t]*\{?[ \t]*["'`]?[ \t]*/gi
function placeholderStarts(original, masked) {
  const starts = new Set()
  if (!original) return starts
  for (const m of original.matchAll(PLACEHOLDER_RE)) {
    const pos = m.index + m[0].length
    if (masked[pos] && masked[pos] === original[pos] && /\S/.test(masked[pos])) starts.add(pos)
  }
  return starts
}

// Steht die Fundstelle am Satzanfang? Dann ist „Sie"/„Ihr" mehrdeutig und wird übersprungen.
function atSentenceStart(text, pos) {
  let i = pos - 1
  while (i >= 0 && /[ \t*_(\[]/.test(text[i])) i--
  if (i < 0) return true
  const c = text[i]
  if ('.!?:…|>#\n'.includes(c)) return true
  // Listenpunkt oder Tabellenanfang: „- ", „1. " am Zeilenanfang
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  // Nicht /^\s*(…)?\s*$/: Zwei \s* um ein optionales Stück brauchen auf langem Leerraum quadratische Zeit.
  return /^\s*(?:(?:[-*+]|\d+\.)\s*)?$/.test(text.slice(lineStart, pos))
}

// original: der ungekürzte Dateiinhalt, damit Platzhalter erkannt werden.
function checkText(masked, add, off, original) {
  const on = (id) => !off.has(id)

  if (on('A1')) {
    const placeholders = placeholderStarts(original, masked)
    for (const m of masked.matchAll(SIE_RE)) {
      if (atSentenceStart(masked, m.index) && !placeholders.has(m.index)) continue
      add('A1', m.index, `„${m[0]}" als Höflichkeitsform. Miragon duzt: „du", „dir", „dein".`)
    }
    for (const m of masked.matchAll(MAN_RE)) {
      add('A1', m.index, `Unpersönliches „${m[0]}". Sprich die Person direkt an oder sag, wer handelt.`)
    }
    for (const m of masked.matchAll(SIE_MAIL_RE)) {
      add('A1', m.index, `Platzhalter „${m[0].replace(/\.+$/, '')}" in Sie-Form. Miragon duzt, etwa „deine@email.de".`)
    }
  }
  if (on('A2')) {
    // Halbgeviertstrich mit Leerzeichen davor, dahinter Leerzeichen, Satzzeichen („ –,") oder Zeilenende.
    for (const m of masked.matchAll(/—| –(?=[\s,;.:!?)]|$)/g)) {
      // Ein Strich als einziger Inhalt einer Tabellenzelle („| – |") ist ein Leerzeichen-Ersatz, kein Verbinder.
      const before = masked.slice(masked.lastIndexOf('\n', m.index) + 1, m.index)
      const after = masked.slice(m.index + m[0].length, masked.indexOf('\n', m.index) >>> 0)
      if (/\|\s*$/.test(before) && /^\s*\|/.test(after)) continue
      add('A2', m.index, 'Gedankenstrich als Verbinder. Ersetze ihn durch Punkt, Komma oder Doppelpunkt.')
    }
  }
  if (on('A3')) {
    for (const m of masked.matchAll(UMLAUT_RE)) {
      add('A3', m.index, `„${m[0]}" mit Umlaut-Ersatz. Schreib ä, ö, ü, ß.`)
    }
  }
  if (on('A5')) {
    for (const v of DATA.vokabular) {
      const re = wordRe(v.muster ?? escapeRe(v.begriff), 'giu')
      for (const m of masked.matchAll(re)) add('A5', m.index, `Floskel „${m[0]}". Sag konkret, was du meinst.`)
    }
  }
  if (on('A7')) {
    // Auch abgewandelt erkennen: anderes Possessivpronomen (Sie-Form „Ihrer", „eurer")
    // und ohne das einleitende „Wir".
    const PRONOMEN = '(?:dein|ihr|euer|eur|unser)(?:e|er|en|em|es)?'
    for (const old of DATA.claim.veraltet) {
      const muster = escapeRe(old.replace(/\.$/, '').replace(/^Wir /, ''))
        .replace(/\bdein(?:e|er|en|em|es)?\b/gi, PRONOMEN)
      for (const m of masked.matchAll(new RegExp(muster, 'gi'))) {
        add('A7', m.index, `Veralteter Claim. Aktuell: „${DATA.claim.aktuell}"`)
      }
    }
  }
  if (on('A11')) {
    // Kurzformen mit Doppelpunkt, Sternchen, Unterstrich, Binnen-I. Das generische
    // Maskulinum ist nicht sicher erkennbar und bleibt dem Review überlassen.
    const GENDER_RE = /(?<![\p{L}\p{N}_])\p{L}+(?:[:*_]innen|[:*_]in|\p{Ll}Innen)(?![\p{L}\p{N}_])/gu
    for (const m of masked.matchAll(GENDER_RE)) {
      add('A11', m.index, `„${m[0]}". Nimm die Paarform (etwa Entwicklerinnen und Entwickler) oder formuliere neutral.`)
    }
  }
  if (on('A10')) {
    for (const s of DATA.schreibweisen) {
      for (const f of s.falsch) {
        for (const m of masked.matchAll(wordRe(escapeRe(f)))) add('A10', m.index, `„${m[0]}" schreibt sich „${s.richtig}".`)
      }
    }
  }

  // Anti-Slop (Text)
  const words = countWords(masked)
  for (const rule of DATA.slopText) {
    if (!on(rule.id) || !on('A8')) continue
    const res = (rule.muster ?? []).map((src) => new RegExp(src, 'giu'))
    if (rule.art === 'dichte') {
      const hits = res.flatMap((re) => [...masked.matchAll(re)])
      const allowed = Math.max(1, Math.floor((words * rule.pro_1000_woerter) / 1000))
      if (hits.length > allowed) {
        for (const m of hits) {
          add(rule.id, m.index, `${hits.length}× bei ${words} Wörtern, Richtwert höchstens ${allowed}. „${m[0].trim().slice(0, 60)}"`)
        }
      }
    } else if (rule.art === 'muster') {
      for (const re of res) {
        for (const m of masked.matchAll(re)) {
          // Leerraum und Satzzeichen vorn sind Kontext (S4: „…. Das Ergebnis:"). Die
          // Fundstelle beginnt danach, sonst landet sie bei einem Absatz davor in der Zeile davor.
          const lead = Math.max(0, m[0].search(/[^\s.!?]/))
          add(rule.id, m.index + lead, `„${m[0].slice(lead).trim().slice(0, 60)}"`)
        }
      }
    } else if (rule.art === 'fett-liste') {
      const hits = [...masked.matchAll(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+\*\*[^*\n]+\*\*/gm)]
      if (hits.length > rule.max_pro_datei) {
        add(rule.id, hits[0].index, `${hits.length} Listenpunkte beginnen mit fettem Stichwort (Richtwert höchstens ${rule.max_pro_datei} pro Datei).`)
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Farb- und CSS-Prüfungen                                             */
/* ------------------------------------------------------------------ */
const ERLAUBT = new Set(DATA.farben.erlaubt)
function normHex(h) {
  let x = h.toUpperCase()
  if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split('').map((c) => c + c).join('')
  return `#${x.slice(0, 6)}`
}
// Deckkraft aus 8- oder 4-stelligem Hex, sonst 1.
function hexAlpha(h) {
  if (h.length === 8) return parseInt(h.slice(6), 16) / 255
  if (h.length === 4) return parseInt(h[3] + h[3], 16) / 255
  return 1
}
const zuHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
const kanaele = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const istNeutral = (hex) => {
  const [r, g, b] = kanaele(hex)
  return r === g && g === b
}
const alphaWert = (s) => (s == null ? 1 : s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))

// rgb() und rgba() mit ganzen Zahlen, Komma- oder Leerzeichen-Schreibweise. Prozentwerte und
// var() bleiben ungeprüft.
const RGB_ARGS = /^\s*(\d{1,3})(?![.\d%])\s*,?\s*(\d{1,3})(?![.\d%])\s*,?\s*(\d{1,3})(?![.\d%])\s*(?:[,/]\s*([\d.]+%?)\s*)?$/
// hsl() und hsla(), Farbton in Grad.
const HSL_ARGS = /^\s*(-?[\d.]+)(deg|turn|rad|grad)?\s*,?\s*([\d.]+)%?\s*,?\s*([\d.]+)%?\s*(?:[,/]\s*([\d.]+%?)\s*)?$/i
function hslZuRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
  }
  return [f(0), f(8), f(4)]
}
// oklch(), oklab(), lch() und lab() wie in CSS Color 4: drei Werte (Zahl, Prozent oder none),
// der Farbton von oklch() und lch() in Grad, optional / Deckkraft.
const ZAHL_ARG = '(none|-?[\\d.]+(?:e-?\\d+)?%?)'
const DREI_ARGS = new RegExp(`^\\s*${ZAHL_ARG}\\s+${ZAHL_ARG}\\s+${ZAHL_ARG}(deg|turn|rad|grad)?\\s*(?:\\/\\s*([\\d.]+%?|none)\\s*)?$`, 'i')
const zahl = (s, prozentVon = 1) => (/^none$/i.test(s) ? 0 : s.endsWith('%') ? (parseFloat(s) / 100) * prozentVon : parseFloat(s))
const gamma = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const linearZuRgb = (r, g, b) => [r, g, b].map((c) => gamma(Math.max(0, Math.min(1, c))))
function oklabZuRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return linearZuRgb(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  )
}
// CIE Lab (D50) über XYZ und Bradford nach sRGB (D65).
function labZuRgb(L, a, b) {
  const f1 = (L + 16) / 116
  const f = [f1 + a / 500, f1, f1 - b / 200]
  const e = 216 / 24389
  const k = 24389 / 27
  const [x, y, z] = [
    f[0] ** 3 > e ? f[0] ** 3 : (116 * f[0] - 16) / k,
    L > k * e ? ((L + 16) / 116) ** 3 : L / k,
    f[2] ** 3 > e ? f[2] ** 3 : (116 * f[2] - 16) / k
  ].map((v, i) => v * [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585][i])
  const X = 0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z
  const Y = -0.028369706963208136 * x + 1.0099954580058226 * y + 0.021041398966943008 * z
  const Z = 0.012314001688319899 * x - 0.020507696433309865 * y + 1.3303659366080753 * z
  return linearZuRgb(
    3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z,
    -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z,
    0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z
  )
}
function cssColor4ZuRgb(fn, a) {
  const einheit = { turn: 360, rad: 180 / Math.PI, grad: 0.9 }[a[4]?.toLowerCase()] ?? 1
  const winkel = () => (zahl(a[3]) * einheit * Math.PI) / 180
  switch (fn) {
    case 'oklab': return oklabZuRgb(zahl(a[1]), zahl(a[2], 0.4), zahl(a[3], 0.4))
    case 'oklch': return oklabZuRgb(zahl(a[1]), zahl(a[2], 0.4) * Math.cos(winkel()), zahl(a[2], 0.4) * Math.sin(winkel()))
    case 'lab': return labZuRgb(zahl(a[1], 100), zahl(a[2], 125), zahl(a[3], 125))
    default: return labZuRgb(zahl(a[1], 100), zahl(a[2], 150) * Math.cos(winkel()), zahl(a[2], 150) * Math.sin(winkel()))
  }
}
// Alle Farbangaben in einem Stück Code: Hex, rgb(), rgba(), hsl(), hsla(), oklch(), oklab(),
// lch() und lab(). Ergebnis je Fund: index, text, hex (sechsstellig), alpha, art ('hex', 'rgb',
// 'hsl' oder der Name der Funktion aus CSS Color 4).
const FARB_LITERAL = /(?<![\w&#])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|(?<![\w-])(rgba?|hsla?|oklch|oklab|lch|lab)\(([^()]*)\)/gi
function farbLiterale(code) {
  const out = []
  for (const m of code.matchAll(FARB_LITERAL)) {
    if (m[1]) {
      out.push({ index: m.index, text: m[0], hex: normHex(m[1]), alpha: hexAlpha(m[1]), art: 'hex' })
      continue
    }
    const fn = m[2].toLowerCase()
    if (fn.startsWith('rgb')) {
      const a = m[3].match(RGB_ARGS)
      if (!a) continue
      out.push({ index: m.index, text: m[0], hex: zuHex([a[1], a[2], a[3]].map(Number)), alpha: alphaWert(a[4]), art: 'rgb' })
    } else if (fn.startsWith('hsl')) {
      const a = m[3].match(HSL_ARGS)
      if (!a) continue
      out.push({ index: m.index, text: m[0], hex: hslHex(a[1], a[2], a[3], a[4]), alpha: alphaWert(a[5]), art: 'hsl' })
    } else {
      const a = m[3].match(DREI_ARGS)
      if (!a) continue
      out.push({ index: m.index, text: m[0], hex: zuHex(cssColor4ZuRgb(fn, a)), alpha: /^none$/i.test(a[5] ?? '') ? 1 : alphaWert(a[5]), art: fn })
    }
  }
  return out
}
function hslHex(h, einheitText, s, l) {
  const einheit = { turn: 360, rad: 180 / Math.PI, grad: 0.9 }[einheitText?.toLowerCase()] ?? 1
  const grad = (((parseFloat(h) * einheit) % 360) + 360) % 360
  return zuHex(hslZuRgb(grad, Math.min(100, parseFloat(s)) / 100, Math.min(100, parseFloat(l)) / 100))
}
// Nacktes HSL-Tripel in einer Custom Property im Stil von shadcn (--background: 222.2 84% 4.9%),
// das erst hsl(var(--background)) zur Farbe macht.
const HSL_TRIPEL = /^\s*(-?[\d.]+)(deg|turn|rad|grad)?\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+%?)\s*)?$/i
// Farben in Funktionsschreibweise, die brand-lint umrechnet: B1 außerhalb, C6 im Dunkel-Block.
const UMGERECHNET = new Set(['hsl', 'oklch', 'oklab', 'lch', 'lab'])

// C1: Für einen Hex-Wert die Variable oder, bei mehrdeutigen dunklen Neutralen, die Kandidaten.
const tokenFuer = (hex) => DATA.farben.tokens[hex] ?? null
const kandidatenFuer = (hex) => DATA.farben.kandidaten?.[hex] ?? null

function checkColors(code, add, off, { isStyle }) {
  const tokenHits = []
  for (const f of farbLiterale(code)) {
    if (UMGERECHNET.has(f.art)) continue // hsl() und oklch() prüft pruefeDeklaration: B1 außerhalb, C6 im Dunkel-Block
    if (f.art === 'hex') {
      const rest = code.slice(f.index + f.text.length, code.indexOf('\n', f.index) >>> 0)
      if (/^\s*[{,]/.test(rest)) continue // CSS-ID-Selektor wie #abc {
    }
    if (!ERLAUBT.has(f.hex)) {
      // Ganz durchsichtig (Deckkraft 0) ist keine Farbe.
      if (f.art === 'rgb' && f.alpha === 0) continue
      const wert = f.art === 'rgb' ? `${f.text} (${f.hex})` : f.text
      if (!off.has('B1')) add('B1', f.index, `${wert} steht nicht in brand/tokens.json. Nimm eine Palettenfarbe oder ein --cd-* Token.`)
    } else if (isStyle && (f.art === 'hex' || f.alpha === 1) && (tokenFuer(f.hex) || kandidatenFuer(f.hex))) {
      tokenHits.push([f.index, f.hex, f.text])
    }
  }
  if (isStyle && tokenHits.length && !off.has('C1')) {
    const [pos, hex, text] = tokenHits[0]
    const anzahl = `${tokenHits.length} rohe Marken-${tokenHits.length === 1 ? 'Farbe' : 'Farben'}.`
    const token = tokenFuer(hex)
    add(
      'C1',
      pos,
      token
        ? `${anzahl} Nutze die Tokens, z. B. var(${token}) statt ${text}.`
        : `${anzahl} ${text} tragen im Dark Mode mehrere Rollen: ${kandidatenFuer(hex).map((v) => `var(${v})`).join(', ')}. Nimm die passende.`
    )
  }
  if (isStyle) {
    for (const rule of DATA.slopCss) {
      if (off.has(rule.id) || off.has('B11')) continue
      for (const src of rule.muster) {
        for (const m of code.matchAll(new RegExp(src, 'gi'))) add(rule.id, m.index, `„${m[0]}". ${DATA.regeln[rule.id].stattdessen ?? ''}`.trim())
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* C6: Dark Mode aus den Rollen                                        */
/* ------------------------------------------------------------------ */
// Dunkel-Block: Regeln unter .dark, html.dark, [data-cd-theme="dark"] (auch data-theme und
// andere data-*theme), .vscode-dark, .vscode-high-contrast, @media (prefers-color-scheme: dark)
// und Tailwinds @variant dark. Ein heller Marker weiter rechts im Selektor ([data-cd-theme="light"])
// macht die Regel wieder hell, so bleiben helle Bühnen auf der dunklen Seite erlaubt.
// [data-cd-theme="system"] allein ist hell, unter der Media Query dunkel.
const V = DATA.farben.variablen ?? {}
const SCHWARZ = DATA.farben.schwarz
const GRUEN = V['--cd-gruen']?.hell
const WEISS = V['--cd-weiss']?.hell
const DUNKEL_MARKER = /\.(?:dark|dark-mode|dark-theme|theme-dark|vscode-dark|vscode-high-contrast)(?![\w-])|\[\s*data-[\w-]*theme\s*[~|^$*]?=\s*(["']?)dark\1\s*(?:[is]\s*)?\]/gi
const HELL_MARKER = /\.(?:light|light-mode|light-theme|theme-light|vscode-light|vscode-high-contrast-light)(?![\w-])|\[\s*data-[\w-]*theme\s*[~|^$*]?=\s*(["']?)light\1\s*(?:[is]\s*)?\]/gi
const NOT_RE = /:not\((?:[^()]|\([^()]*\))*\)/g

// An Kommas auf oberster Ebene trennen (nicht in :is(…), [..]).
function oberstesKomma(s) {
  const teile = []
  let tiefe = 0
  let von = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(' || c === '[') tiefe++
    else if (c === ')' || c === ']') tiefe = Math.max(0, tiefe - 1)
    else if (c === ',' && !tiefe) {
      teile.push({ text: s.slice(von, i), von })
      von = i + 1
    }
  }
  teile.push({ text: s.slice(von), von })
  return teile
}
// 'dunkel', 'hell' oder null (erbt): der Marker, der im Selektor am weitesten rechts steht.
function selektorModus(sel) {
  const s = sel.replace(NOT_RE, (m) => ' '.repeat(m.length))
  let pos = -1
  let modus = null
  for (const m of s.matchAll(DUNKEL_MARKER)) if (m.index > pos) [pos, modus] = [m.index, 'dunkel']
  for (const m of s.matchAll(HELL_MARKER)) if (m.index > pos) [pos, modus] = [m.index, 'hell']
  return modus
}
function blockDunkel(prelude, eltern) {
  const p = prelude.trim()
  if (p.startsWith('@')) {
    if (/^@variant\s+dark\b/i.test(p)) return true
    if (/^@scope\b/i.test(p)) {
      const modus = selektorModus(p.match(/^@scope\s*\(([^)]*)\)/i)?.[1] ?? '')
      return modus ? modus === 'dunkel' : eltern
    }
    if (/^@media\b/i.test(p)) {
      // Je Query der Liste: Ein not vor der ganzen Query macht sie unbekannt, ein not direkt vor der
      // Bedingung zum Farbschema hebt nur diese auf. not vor anderen Bedingungen
      // ((not (prefers-contrast: more))) ändert am Farbschema nichts.
      let dunkel = false
      let hell = false
      for (const { text } of oberstesKomma(p.replace(/^@media\s*/i, ''))) {
        const q = text.trim()
        if (/^not\b/i.test(q)) continue
        const ohneNegation = q.replace(/\bnot\s*\(\s*prefers-color-scheme\s*:\s*[\w-]+\s*\)/gi, ' ')
        if (/prefers-color-scheme\s*:\s*dark/i.test(ohneNegation)) dunkel = true
        else if (/prefers-color-scheme\s*:\s*light/i.test(ohneNegation)) hell = true
      }
      if (dunkel) return true
      if (hell) return false
    }
    return eltern
  }
  const modi = oberstesKomma(p).map((t) => selektorModus(t.text))
  if (modi.includes('dunkel')) return true
  return eltern && modi.includes(null)
}

// Kommentare durch Leerzeichen ersetzen, Strings bleiben. // gilt nur außerhalb von Klammern
// nach Leerraum (SCSS, Less), damit url(//cdn…) erhalten bleibt.
function cssOhneKommentare(code) {
  const chars = code.split('')
  let quote = null
  let klammer = 0
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote || c === '\n') quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '(') klammer++
    else if (c === ')') klammer = Math.max(0, klammer - 1)
    else if (c === '/' && chars[i + 1] === '*') {
      const e = code.indexOf('*/', i + 2)
      const bis = e < 0 ? chars.length : e + 2
      for (let j = i; j < bis; j++) if (chars[j] !== '\n') chars[j] = ' '
      i = bis - 1
    } else if (c === '/' && chars[i + 1] === '/' && !klammer && (i === 0 || /[\s;{}]/.test(chars[i - 1]))) {
      let j = i
      while (j < chars.length && chars[j] !== '\n') chars[j++] = ' '
      i = j - 1
    }
  }
  return chars.join('')
}

// Ruft besuche(deklaration, offset, block) für jede Deklaration auf. block: { dunkel, selektor }.
function cssDeklarationen(code, besuche) {
  const stack = []
  let start = 0
  let klammer = 0
  let quote = null
  for (let i = 0; i < code.length; i++) {
    const c = code[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote || c === '\n') quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '(') klammer++
    else if (c === ')') klammer = Math.max(0, klammer - 1)
    else if (klammer) continue
    else if (c === '{') {
      const prelude = code.slice(start, i)
      const eltern = stack.at(-1)
      const at = prelude.trim().startsWith('@')
      stack.push({ dunkel: blockDunkel(prelude, eltern?.dunkel ?? false), selektor: at ? eltern?.selektor ?? '' : prelude.trim() })
      start = i + 1
    } else if (c === ';' || c === '}') {
      if (stack.length) besuche(code.slice(start, i), start, stack.at(-1))
      if (c === '}') stack.pop()
      start = i + 1
    }
  }
}

// var(--x) am Anfang eines Arguments (mit Rückfallwert).
const VAR_RE = /var\(\s*(--[\w-]+)/g
// Wert einer Variable im dunklen Modus: feste Variablen haben einen Wert, Rollen ihren Dunkel-Wert.
const dunkelWert = (name) => V[name]?.dunkel ?? null
const istSchwarzVar = (name) => dunkelWert(name) === SCHWARZ
// Rolle als Ersatz für -soft: --cd-success-soft wird --cd-ui-success-flaeche.
function softErsatz(name) {
  const status = name.match(/^--cd-([\w]+)-soft$/)?.[1]
  return status && V[`--cd-ui-${status}-flaeche`] ? `--cd-ui-${status}-flaeche` : '--cd-ui-flaeche'
}
const SOFT_HEX = new Set(Object.entries(V).filter(([k]) => /^--cd-[\w-]+-soft$/.test(k)).map(([, v]) => v.hell))
const NUR_HELL_HEX = new Map(Object.entries(V).filter(([, v]) => v.nurHell).map(([k, v]) => [v.hell, [k, v.nurHell]]))
const KEIN_TEXT_HEX = new Set(Object.values(V).filter((v) => v.keinTextAufDunkel && !v.nurHell).map((v) => v.hell))
const undListe = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} und ${xs.at(-1)}` : xs.join(''))
// Ersatz für Text, der auf Dunkel zu dunkel ist: die Rolle gleichen Namens, sonst Link und Text.
// Darf die Status-Rolle dunkel nicht auf jeder Fläche Text sein, nennt die Meldung die Flächen.
function textErsatz(name) {
  const rolle = name?.replace(/^--cd-/, '--cd-ui-')
  if (!rolle || !V[rolle]?.rolle) return 'var(--cd-ui-link) für Links oder var(--cd-ui-text)'
  const auf = V[rolle].textAufDunkel
  return auf?.length ? `var(${rolle}), als Text aber nur auf ${undListe(auf)}, sonst var(--cd-ui-text)` : `var(${rolle})`
}
// Hinweis zu einer Farbe außerhalb der CI, je nachdem, ob sie Text oder Fläche färbt.
const TEXT_PROP = /^(?:color|-webkit-text-fill-color)$/
const ausserhalbHinweis = (prop) =>
  TEXT_PROP.test(prop) ? 'Text kommt aus --cd-ui-text oder --cd-ui-link.' : 'Dunkle Flächen sind Schwarz oder eine neutrale Stufe aus den Rollen.'
const blaeulich = (hex) => {
  const [r, g, b] = kanaele(hex)
  return b > r && b >= g && Math.max(r, g, b) - Math.min(r, g, b) <= 48
}
// Selektor eines Buttons: Element button, Submit-Input, .btn, .button, .knopf, .VPButton, role=button.
const BUTTON_SEL = /(?:^|[\s>+~,(])(?:button(?![\w-])|input\[type=["']?(?:submit|button|reset)["']?\])|\.(?:btn|button|knopf|vpbutton)(?![a-z])|\[role=["']?button["']?\]/i
const istGruen = (f) => f.hex === GRUEN && f.alpha > 0
// Farbnamen im Dunkel-Block, die dunkle oder bläuliche Töne außerhalb der CI ergeben.
const FARBNAME_RE = /(?<![\w-])(navy|midnightblue|darkblue|mediumblue|darkslateblue|(?:dark|light)?slategr[ae]y|dimgr[ae]y|darkgr[ae]y|gr[ae]y|black|steelblue)(?![\w.-])/gi
// Feste helle Flächen: im Dunkel-Block nur als helle Bühne richtig (weicher Hinweis).
const HELLE_FLAECHE = new Set(['--cd-weiss', '--cd-grau'])

// Argumente von color-mix(…) ab Position i (auf der öffnenden Klammer): Text und Ende.
function klammerInhalt(text, i) {
  let tiefe = 0
  for (let j = i; j < text.length; j++) {
    if (text[j] === '(') tiefe++
    else if (text[j] === ')' && --tiefe === 0) return { inhalt: text.slice(i + 1, j), ende: j + 1 }
  }
  return { inhalt: text.slice(i + 1), ende: text.length }
}

function pruefeDeklaration(dekl, offset, block, add) {
  const m = dekl.match(/^(\s*)([$@]?-{0,2}[A-Za-z_][\w-]*)\s*:/)
  if (!m || m[2].startsWith('@')) return
  const prop = m[2].toLowerCase()
  const wertStart = m[0].length
  const wert = dekl.slice(wertStart)
  const at = (i) => offset + wertStart + i
  const eigen = prop.startsWith('--') || prop.startsWith('$')

  // Überall: Host-Farben und Grün als Button-Fläche.
  for (const v of wert.matchAll(/var\(\s*(--vscode-[\w-]+)/g)) {
    if (/font/.test(v[1])) continue
    add('C6', at(v.index), `var(${v[1]}) ist eine Farbe des Hosts. Vom Host kommt nur der Modus, die Farben kommen aus den Rollen (--cd-ui-*).`)
  }
  const buttonFlaeche = eigen
    ? /(?:button|btn)/.test(prop) && /(?:bg|background)/.test(prop)
    : /^background(?:-color)?$/.test(prop) && BUTTON_SEL.test(block.selektor)
  if (buttonFlaeche) {
    const gruen = [...wert.matchAll(VAR_RE)].find((v) => V[v[1]] && (V[v[1]].hell === GRUEN || V[v[1]].dunkel === GRUEN))
    const lit = farbLiterale(wert).find(istGruen)
    const fund = gruen ? { index: gruen.index, text: `var(${gruen[1]})` } : lit
    if (fund) add('C6', at(fund.index), `Grün als Button-Fläche (${fund.text}). Buttons sind Blau mit weißer Schrift, Hover blau-link.`)
  }
  if (!block.dunkel) {
    // hsl(), oklch() und Co. außerhalb der Dunkel-Blöcke: B1, wie Hex und rgb() in checkColors.
    for (const f of farbLiterale(wert)) {
      if (!UMGERECHNET.has(f.art) || f.alpha === 0 || ERLAUBT.has(f.hex)) continue
      add('B1', at(f.index), `${f.text} ergibt ${f.hex} und steht nicht in brand/tokens.json. Nimm eine Palettenfarbe oder ein --cd-* Token.`)
    }
    return
  }
  // Nacktes HSL-Tripel in einer Custom Property (shadcn): als Farbe werten.
  const tripel = eigen && wert.match(HSL_TRIPEL)
  if (tripel) {
    const hex = hslHex(tripel[1], tripel[2], tripel[3], tripel[4])
    if (!ERLAUBT.has(hex)) {
      add('C6', at(wert.search(/\S/)), `${wert.trim()} ist ein HSL-Wert und ergibt ${hex}${blaeulich(hex) ? ', einen bläulichen Grauton' : ''} und keinen Wert der CI. Flächen und Text kommen im Dark Mode aus den Rollen (--cd-ui-*).`)
    }
  }

  // -soft und feste helle Variablen
  for (const v of wert.matchAll(VAR_RE)) {
    const name = v[1]
    if (/^--cd-[\w-]+-soft$/.test(name)) {
      add('C6', at(v.index), `var(${name}) ist eine Tönung für helle Flächen und steht nie auf Dunkel. Nimm var(${softErsatz(name)}).`)
    } else if (V[name]?.nurHell) {
      add('C6', at(v.index), `var(${name}) ist fest für helle Bühnen. Auf Dunkel nimm var(${V[name].nurHell}).`)
    } else if (!eigen && TEXT_PROP.test(prop) && V[name]?.keinTextAufDunkel) {
      add('C6', at(v.index), `var(${name}) ist als Text auf dunklem Grund unter 4,5:1. Nimm ${textErsatz(name)}.`)
    }
  }
  // Farbangaben: Tönungen, Deckkraft, hsl außerhalb der CI, Blau als Text
  for (const f of farbLiterale(wert)) {
    if (SOFT_HEX.has(f.hex)) {
      add('C6', at(f.index), `${f.text} ist eine Tönung für helle Flächen und steht nie auf Dunkel. Nimm eine neutrale Rolle (var(--cd-ui-flaeche)).`)
    } else if (!ERLAUBT.has(f.hex)) {
      if (!UMGERECHNET.has(f.art)) continue // Hex und rgb() meldet B1
      add('C6', at(f.index), `${f.text} ergibt ${f.hex}${blaeulich(f.hex) ? ', einen bläulichen Grauton' : ''} und keinen Wert der CI. ${ausserhalbHinweis(prop)}`)
    } else if (f.alpha < 1 && f.alpha > 0 && f.hex !== SCHWARZ) {
      add(
        'C6',
        at(f.index),
        istNeutral(f.hex)
          ? `${f.text} ist ${f.hex === WEISS ? 'Weiß' : 'ein Grau'} mit Deckkraft auf dunklem Grund und ergibt einen Grauton außerhalb der Stufen. Nimm eine deckende Rolle (var(--cd-ui-linie), var(--cd-ui-hover)).`
          : `${f.text} ist eine Farbe mit Deckkraft auf dunklem Grund und ergibt einen getönten Ton. Nimm eine deckende Rolle (var(--cd-ui-hover)).`
      )
    } else if (NUR_HELL_HEX.has(f.hex)) {
      add('C6', at(f.index), `${f.text} ist fest für helle Bühnen. Auf Dunkel nimm var(${NUR_HELL_HEX.get(f.hex)[1]}).`)
    } else if (!eigen && TEXT_PROP.test(prop) && KEIN_TEXT_HEX.has(f.hex)) {
      add('C6', at(f.index), `${f.text} ist als Text auf dunklem Grund unter 4,5:1. Nimm ${textErsatz(tokenFuer(f.hex))}.`)
    }
  }
  // Farbnamen: Navy, Slate und Co. sind die typischen Töne eines bläulichen Dark Mode.
  for (const n of wert.matchAll(FARBNAME_RE)) {
    const name = n[1].toLowerCase()
    add(
      'C6',
      at(n.index),
      name === 'black'
        ? 'black ist reines Schwarz und keine CI-Farbe. Nimm var(--cd-schwarz) oder eine Rolle (--cd-ui-*).'
        : `${n[1]} ist ein Farbname außerhalb der CI${/blue|slate/.test(name) ? ', bläulich' : ''}. ${ausserhalbHinweis(prop)}`
    )
  }
  // color-mix: farbige Anteile tönen, transparent ist Deckkraft (erlaubt nur mit Schwarz)
  for (const cm of wert.matchAll(/color-mix\(/gi)) {
    const { inhalt } = klammerInhalt(wert, cm.index + cm[0].length - 1)
    const args = oberstesKomma(inhalt).slice(1).map((t) => t.text.trim())
    const farbig = args.find((a) => {
      const name = a.match(/^var\(\s*(--[\w-]+)/)?.[1]
      if (name) return dunkelWert(name) ? !istNeutral(dunkelWert(name)) : false
      const lit = farbLiterale(a)[0]
      return lit ? !istNeutral(lit.hex) : false
    })
    const durchsichtig = args.some((a) => /^transparent\b/i.test(a))
    const deckend = args.some((a) => /var\(\s*--cd-ui-chrome-deckkraft\s*\)|\b100%/.test(a))
    const schwarz = args.every((a) => {
      if (/^transparent\b/i.test(a)) return true
      const name = a.match(/^var\(\s*(--[\w-]+)/)?.[1]
      if (name) return istSchwarzVar(name)
      return farbLiterale(a)[0]?.hex === SCHWARZ
    })
    if (farbig) {
      add('C6', at(cm.index), `color-mix mit ${farbig.split(/\s+\d/)[0]} auf dunklem Grund ergibt einen getönten Ton. Nimm eine Rolle (--cd-ui-*).`)
    } else if (durchsichtig && !deckend && !schwarz) {
      add('C6', at(cm.index), 'color-mix mit transparent ist Deckkraft auf dunklem Grund und ergibt einen neuen Ton. Erlaubt ist nur Schwarz, sonst eine deckende Rolle.')
    }
  }
  if (eigen) return
  // Filter, die Farben verfälschen
  if (/^(?:-webkit-)?filter$/.test(prop)) {
    for (const f of wert.matchAll(/\b(invert|brightness|hue-rotate)\(/g)) {
      add('C6', at(f.index), `${f[1]}() verfälscht Farben im Dark Mode. Flächen kommen aus den Rollen, Bilder bekommen eine Variante für Dunkel.`)
    }
  }
  if (prop === 'mix-blend-mode' && !/^\s*normal\b/.test(wert)) {
    add('C6', at(wert.search(/\S/)), 'mix-blend-mode verfälscht Farben im Dark Mode. Bilder bekommen eine Variante für Dunkel oder eine helle Fläche.')
  }
  // Weicher Hinweis: helle feste Fläche im Dunkel-Block
  if (/^background(?:-color)?$/.test(prop)) {
    const hell = [...wert.matchAll(VAR_RE)].find((v) => HELLE_FLAECHE.has(v[1]))
    if (hell) {
      add('C6', at(hell.index), `var(${hell[1]}) ist eine helle Fläche im Dunkel-Block. Ist das eine helle Bühne, setz data-cd-theme="light", sonst nimm eine Rolle (var(--cd-ui-flaeche)).`, 'weich')
    }
  }
}

// Außer C6 meldet pruefeDeklaration B1 für hsl() und oklch() außerhalb der Dunkel-Blöcke.
const ohneAus = (add, off) => (id, ...rest) => (off.has(id) ? null : add(id, ...rest))
function checkDarkCss(code, add, off) {
  if (off.has('C6') && off.has('B1')) return
  cssDeklarationen(cssOhneKommentare(code), (dekl, offset, block) => pruefeDeklaration(dekl, offset, block, ohneAus(add, off)))
}

/* --- C6 in Tailwind-Klassen --- */
// Eine Klasse beginnt nach Leerraum, Anführungszeichen oder Klammer und endet vor Leerraum,
// Anführungszeichen, Komma, Semikolon oder Klammer. Varianten (dark:, md:, hover: …) davor.
const TW_VOR = '(?<=^|[\\s"\'`{(,\\[>=])'
const TW_NACH = '(?=[\\s"\'`,;)}\\]]|$)'
const TW_VARIANTEN = '((?:[^\\s"\'`:]+:)*)'
const TW_PRAEFIX = 'bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|from|via|to|fill|stroke|shadow|inset-shadow|inset-ring|drop-shadow|decoration|accent|caret|placeholder'
const TW_PALETTE = 'slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const TW_GRAU = /^(?:slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe)$/
const TW_KLASSE = new RegExp(`${TW_VOR}${TW_VARIANTEN}(!?-?(?:${TW_PRAEFIX})-[\\w\\[\\]().#%-]+(?:\\/[\\w.%\\[\\]()-]+)?!?|!?prose-invert|!?(?:invert|brightness-[\\w.\\[\\]-]+|hue-rotate-[\\w.\\[\\]-]+))${TW_NACH}`, 'g')
const TW_FARBE = new RegExp(`^!?-?(${TW_PRAEFIX})-(.+?)(?:\\/(.+?))?!?$`)
// Größen, keine Farben: text-sm/6 ist Schriftgröße mit Zeilenhöhe, shadow-lg/20 Schattengröße.
const TW_GROESSE = /^(?:xs|sm|base|md|lg|xl|\d?xl|2xs|inner|none|\[\d[^\]]*\])$/
// Farbnamen der CI (Tokens und Rollen ohne Präfix, wie in der Vorlage des Design-Manuals 8.11) und
// Weiß aus Tailwind. Mit dark: davor sind Grund und Farbe sicher, Deckkraft ist dann ein harter Befund.
const TW_CI_NAMEN = new Set([...Object.keys(V).map((k) => k.replace(/^--cd-(?:ui-)?/, '')), 'white'])

function checkTailwind(code, add, off) {
  if (off.has('C6')) return
  for (const m of code.matchAll(TW_KLASSE)) {
    const varianten = m[1].split(':').filter(Boolean)
    const dunkel = varianten.includes('dark')
    const klasse = m[2]
    const pos = m.index
    if (/prose-invert$/.test(klasse)) {
      add('C6', pos, `„${m[0]}" bringt die Grautöne der Tailwind-Palette. Die Variablen --tw-prose-* zeigen auf die Rollen.`)
      continue
    }
    if (/^!?(?:invert|brightness-|hue-rotate-)/.test(klasse)) {
      if (dunkel) add('C6', pos, `„${m[0]}" verfälscht Farben im Dark Mode. Flächen kommen aus den Rollen, Bilder bekommen eine Variante für Dunkel.`)
      continue
    }
    const f = klasse.match(TW_FARBE)
    if (!f) continue
    const [, praefix, name, deckkraft] = f
    const palette = name.match(new RegExp(`^(${TW_PALETTE})-(?:50|[1-9]00|950)$`))
    if (palette) {
      add('C6', pos, `Tailwind-Palettenklasse „${m[0]}" liegt außerhalb der CI${TW_GRAU.test(palette[1]) ? ' (Grautöne aus Tailwind sind bläulich oder fremd)' : ''}. Nimm Theme-Farben auf den Rollen (--cd-ui-*).`)
      continue
    }
    if (name === 'black') {
      add('C6', pos, `„${m[0]}" ist reines Schwarz und keine CI-Farbe. Schwarz ist --cd-schwarz, dunkle Flächen kommen aus den Rollen.`)
      continue
    }
    if (dunkel && /-soft$/.test(name)) {
      add('C6', pos, `„${m[0]}": -soft ist eine Tönung für helle Flächen und steht nie auf Dunkel.`)
      continue
    }
    if (dunkel && praefix === 'text' && /^(?:blau|blau-link)$/.test(name)) {
      add('C6', pos, `„${m[0]}" ist als Text auf dunklem Grund unter 4,5:1. Nimm die Rolle für Links (Grün) oder Text.`)
      continue
    }
    // info und danger sind in der Vorlage Rollen. Ob sie dort fest oder Rolle sind, sieht brand-lint nicht.
    if (dunkel && praefix === 'text' && /^(?:info|danger)$/.test(name)) {
      const auf = V[`--cd-ui-${name}`]?.textAufDunkel
      add(
        'C6',
        pos,
        `„${m[0]}": Zeigt ${name} auf die Rolle --cd-ui-${name}, ist es dunkel als Text nur ${auf?.length ? `auf ${undListe(auf)}` : 'nach der Statustext-Tabelle'} erlaubt, sonst Text in --cd-ui-text. Der feste Wert --cd-${name} ist auf Dunkel unter 4,5:1.`,
        'weich'
      )
      continue
    }
    // Schwarz mit Deckkraft ist als Fläche (Backdrop, Schatten) erlaubt, als Text nicht.
    const schwarzeFlaeche = name === 'schwarz' && /^(?:bg|shadow|inset-shadow|drop-shadow)$/.test(praefix)
    if (deckkraft && !TW_GROESSE.test(name) && !schwarzeFlaeche && !/^(?:transparent|current|inherit)$/.test(name) && !/^\[(?:\d|length:)/.test(name)) {
      // Hart nur, wenn dark: davor steht und der Name eine Farbe der CI ist. Sonst ist Grund oder Farbe unsicher.
      const sicher = dunkel && TW_CI_NAMEN.has(name)
      add('C6', pos, `„${m[0]}" ist eine Farbe mit Deckkraft und ergibt auf dunklem Grund einen Ton außerhalb der Stufen. Nimm eine deckende Rolle (hover, text-leise, linie).`, sicher ? undefined : 'weich')
    }
  }
}

// Farben in .vue, .html und .astro: überall (Attribute, Skript, Frontmatter, Style),
// CSS-Muster und rohe Marken-Hex (C1) nur im <style>-Block.
// sichtbar: die maskierte Fassung für die Textprüfung (Textknoten bleiben stehen). Klassen werden
// ohne sichtbaren Text, <pre> und <code> gesucht, damit Beispiele in Fließtext („nie
// dark:bg-…") keine Befunde ergeben.
function checkMarkupColors(text, add, off, sichtbar) {
  const noComments = maskCodeComments(text)
  checkColors(noComments, add, off, { isStyle: false })
  const ohneText = []
  if (sichtbar) {
    for (let i = 0; i < sichtbar.length; i++) {
      if (!/\s/.test(sichtbar[i])) {
        const von = i
        while (i < sichtbar.length && !/\s/.test(sichtbar[i])) i++
        ohneText.push([von, i])
      }
    }
  }
  for (const m of text.matchAll(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)) ohneText.push([m.index, m.index + m[0].length])
  checkTailwind(maskRanges(noComments, ohneText), add, off)
  for (const s of text.matchAll(/<style[\s\S]*?<\/style>/gi)) {
    const onlyStyle = maskRanges(noComments, [[0, s.index], [s.index + s[0].length, text.length]])
    checkColors(onlyStyle, (id, i, msg, schwere) => (id === 'B1' ? null : add(id, i, msg, schwere)), off, { isStyle: true })
    // Für C6 nur der Inhalt zwischen <style …> und </style>, mit eigenen Kommentar-Regeln.
    const von = s.index + s[0].indexOf('>') + 1
    const bis = s.index + s[0].lastIndexOf('</')
    checkDarkCss(maskRanges(text, [[0, von], [bis, text.length]]), add, off)
  }
  // Inline-Stile (style="…") prüft C6 nur auf Host-Farben, ein Modus ist dort nicht erkennbar.
  // Dazu B1 für hsl() und oklch().
  if (off.has('C6') && off.has('B1')) return
  for (const s of noComments.matchAll(/\sstyle\s*=\s*(["'])([^"']*)\1/gi)) {
    let start = s.index + s[0].indexOf(s[1]) + 1
    for (const dekl of s[2].split(';')) {
      pruefeDeklaration(dekl, start, { dunkel: false, selektor: '' }, ohneAus(add, off))
      start += dekl.length + 1
    }
  }
}

/* ------------------------------------------------------------------ */
/* Eine Datei prüfen                                                   */
/* ------------------------------------------------------------------ */
function lintFile(path, off) {
  const ext = extname(path).toLowerCase()
  const name = basename(path)
  if (name.includes('.generated.') || name.endsWith('.min.css') || name.endsWith('.min.js')) return []
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return []
  }
  if (text.slice(0, 400).includes('AUTOMATISCH GENERIERT')) return []

  const findings = []
  const pos = lineIndex(text)
  // schwere: Ein Befund einer harten Regel, den brand-lint nicht sicher erkennt, kommt als weicher Hinweis.
  const push = (id, index, msg, schwere) => {
    const r = DATA.regeln[id] ?? LINT_REGELN[id] ?? { titel: id, schwere: 'weich' }
    findings.push({ id, schwere: schwere ?? r.schwere, titel: r.titel, ...pos(index), msg })
  }
  // Markdown nimmt Ausnahmen beim Maskieren aus (nach Code-Blöcken, damit Beispiele
  // dort nicht greifen). Alle anderen Typen filtern die Befunde nach Position.
  const { ranges: disabled, offen } = TEXT_EXT.has(ext) ? { ranges: [], offen: -1 } : disabledRanges(text)
  const add = (id, index, msg, schwere) => {
    if (disabled.some(([from, to]) => index >= from && index < to)) return
    push(id, index, msg, schwere)
  }
  // Ein disable ohne enable schaltet still den Rest der Datei ab, auch die Farben.
  // Das passiert leicht aus Versehen, etwa wenn die Anweisung in einem String steht.
  if (offen >= 0 && !off.has('L1')) {
    push('L1', offen, 'brand-lint-disable ohne brand-lint-enable. Die Ausnahme gilt bis zum Dateiende, auch für Farben. Schließ sie mit brand-lint-enable.')
  }

  if (TEXT_EXT.has(ext)) checkText(maskMarkdown(text), add, off, text)
  if (MARKUP_EXT.has(ext)) {
    const sichtbar = maskMarkup(text)
    checkText(maskRanges(sichtbar, disabled), add, off, text)
    checkMarkupColors(text, add, off, sichtbar)
  }
  if (ASTRO_EXT.has(ext)) {
    const sichtbar = maskAstro(text)
    checkText(maskRanges(sichtbar, disabled), add, off, text)
    checkMarkupColors(text, add, off, sichtbar)
  }
  if (STYLE_EXT.has(ext)) {
    checkColors(maskCodeComments(text), add, off, { isStyle: true })
    checkDarkCss(text, add, off)
    checkTailwind(maskCodeComments(text), add, off)
  }
  if (CODE_EXT.has(ext)) {
    checkColors(maskCodeComments(text), add, off, { isStyle: false })
    if (ext !== '.svg') checkTailwind(maskCodeComments(text), add, off)
  }

  const seen = new Set()
  return findings
    .filter((f) => {
      const key = `${f.id}:${f.line}:${f.col}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.line - b.line || a.col - b.col)
}

/* ------------------------------------------------------------------ */
/* Konfiguration (.miragon/brand.json)                                 */
/* ------------------------------------------------------------------ */
function findConfig(start) {
  let dir = resolve(start)
  if (existsSync(dir) && statSync(dir).isFile()) dir = dirname(dir)
  for (;;) {
    const p = join(dir, '.miragon', 'brand.json')
    if (existsSync(p)) {
      let cfg = {}
      try {
        cfg = JSON.parse(readFileSync(p, 'utf8'))
      } catch {
        cfg = {}
      }
      return { root: dir, cfg }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
function ignored(file, conf) {
  if (!conf) return false
  const r = relative(conf.root, resolve(file)).split('\\').join('/')
  return (conf.cfg.ignorieren ?? []).some((pat) => {
    if (!pat.includes('*')) return r.startsWith(pat.replace(/^\.\//, ''))
    const re = new RegExp('^' + pat.split('*').map(escapeRe).join('.*') + '$')
    return re.test(r) || re.test(basename(r))
  })
}
const offSet = (conf) => new Set(conf?.cfg?.aus ?? [])

/* ------------------------------------------------------------------ */
/* Dateien einsammeln                                                  */
/* ------------------------------------------------------------------ */
const LINTABLE = new Set([...TEXT_EXT, ...MARKUP_EXT, ...ASTRO_EXT, ...STYLE_EXT, ...CODE_EXT])
function walk(p, out = []) {
  const st = statSync(p)
  if (st.isFile()) {
    if (LINTABLE.has(extname(p).toLowerCase())) out.push(p)
    return out
  }
  for (const entry of readdirSync(p)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.') && entry !== '.vitepress') continue
    const child = join(p, entry)
    if ([...SKIP_DIRS].some((d) => d.includes('/') && child.endsWith(d))) continue
    walk(child, out)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Ausgabe                                                             */
/* ------------------------------------------------------------------ */
function format(file, findings, base) {
  const lines = [relative(base, file) || file]
  for (const f of findings) {
    lines.push(`  ${String(f.line).padStart(4)}:${String(f.col).padEnd(3)} ${f.schwere.padEnd(5)} ${f.id.padEnd(4)} ${f.titel}: ${f.msg}`)
  }
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Hook-Modus                                                          */
/* ------------------------------------------------------------------ */
async function runHook() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  // Kein process.exit(): Bei Pipes würde das die Ausgabe abschneiden.
  // Stattdessen exitCode setzen und zurückkehren.
  let input = {}
  try {
    input = JSON.parse(raw || '{}')
  } catch {
    return
  }
  const file = input?.tool_input?.file_path
  if (!file || !existsSync(file)) return
  const conf = findConfig(file)
  if (!conf || ignored(file, conf)) return

  const findings = lintFile(file, offSet(conf))
  if (!findings.length) return

  const hart = findings.filter((f) => f.schwere === 'hart')
  const shown = findings.slice(0, 25)
  const body = [
    `brand-lint (Miragon CI) meldet ${hart.length} harte und ${findings.length - hart.length} weiche Befunde:`,
    format(file, shown, conf.root),
    findings.length > shown.length ? `  … und ${findings.length - shown.length} weitere.` : '',
    hart.length
      ? 'Behebe die harten Verstöße jetzt. Weiche Hinweise nach Ermessen, sie sind Richtwerte.'
      : 'Nur weiche Hinweise. Prüfe sie, bevor du weitermachst; sie sind Richtwerte, keine Pflicht.'
  ]
    .filter(Boolean)
    .join('\n')

  if (hart.length) {
    process.stderr.write(body + '\n')
    process.exitCode = 2
    return
  }
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: body } }) + '\n'
  )
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */
function runCli(args) {
  const asJson = args.includes('--json')
  const onlyHard = args.includes('--nur-hart')
  const targets = args.filter((a) => !a.startsWith('--'))
  if (!targets.length) {
    console.error('Aufruf: brand-lint.mjs [--json] [--nur-hart] <dateien oder ordner …> | --hook')
    process.exitCode = 64
    return
  }
  const cwd = process.cwd()
  const conf = findConfig(cwd)
  const off = offSet(conf)
  const results = []
  for (const t of targets) {
    if (!existsSync(t)) {
      console.error(`Nicht gefunden: ${t}`)
      continue
    }
    for (const file of walk(t)) {
      if (ignored(file, conf)) continue
      let findings = lintFile(file, off)
      if (onlyHard) findings = findings.filter((f) => f.schwere === 'hart')
      if (findings.length) results.push({ file: relative(cwd, file), findings })
    }
  }
  const hart = results.reduce((n, r) => n + r.findings.filter((f) => f.schwere === 'hart').length, 0)
  const alle = results.reduce((n, r) => n + r.findings.length, 0)
  if (asJson) {
    console.log(JSON.stringify({ hart, weich: alle - hart, dateien: results }, null, 2))
  } else {
    for (const r of results) console.log(format(join(cwd, r.file), r.findings, cwd) + '\n')
    console.log(`${hart} harte, ${alle - hart} weiche Befunde in ${results.length} Dateien.`)
  }
  process.exitCode = hart ? 1 : 0
}

/* ------------------------------------------------------------------ */
/* Als Modul: Textregeln für reinen Text                               */
/* ------------------------------------------------------------------ */
/**
 * Prüft reinen Text (keine Datei, keine Maskierung) mit den Textregeln von brand-lint, etwa die
 * Felder einer Kachel (skills/social-post/scripts/kachel.mjs). regeln: IDs, die laufen sollen, alle
 * anderen sind aus (auch S1 bis S7 und A8). Ergebnis: [{ id, titel, schwere, meldung, index }].
 */
export function textBefunde(text, { regeln = ['A1', 'A2', 'A3', 'A5', 'A7'] } = {}) {
  const an = new Set(regeln)
  const off = { has: (id) => !an.has(id) }
  const befunde = []
  const add = (id, index, meldung, schwere) => {
    const r = DATA.regeln[id] ?? { titel: id, schwere: 'weich' }
    befunde.push({ id, titel: r.titel, schwere: schwere ?? r.schwere, meldung, index })
  }
  checkText(String(text), add, off, String(text))
  return befunde.sort((a, b) => a.index - b.index)
}

// Nur als Befehl: Ein Import (etwa aus kachel.mjs) schreibt nichts und setzt keinen Exit-Code.
// Über einen Symlink ist argv[1] der Link, import.meta.url der echte Pfad.
const alsBefehl = () => {
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}
if (process.argv[1] && alsBefehl()) {
  const argv = process.argv.slice(2)
  if (argv.includes('--hook')) runHook()
  else runCli(argv)
}
