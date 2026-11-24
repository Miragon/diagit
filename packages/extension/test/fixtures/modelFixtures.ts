import { readFileSync } from 'node:fs'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

export const e2eModel = (name: string) => read(`../../e2e/fixtures/${name}`)

export const unreadableModel = (name: string) => read(`unreadable/${name}`)
