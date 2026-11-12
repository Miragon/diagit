const HERO_VIEWPORT = { width: 1440, height: 1000 }
const GAP_BELOW_DIAGRAM = 16

export default class DiagitRecipe {
  #gallery
  #hero
  #resolve

  constructor({ gallery = [], hero }, { resolve }) {
    if (!hero?.path) {
      throw new Error('Das Diagit-Rezept braucht "shots.hero.path".')
    }
    this.#gallery = gallery
    this.#hero = hero
    this.#resolve = resolve
  }

  async capture(window) {
    for (const shot of this.#gallery) {
      await this.#prepare(window, shot)
      await window.shot(shot.name, { title: shot.title })
    }
    await window.page.setViewportSize(HERO_VIEWPORT)
    await this.#prepare(window, this.#hero)
    await window.hero(await this.#githubDownToDiagram(window.page))
  }

  async #prepare(window, { path, journey }) {
    await window.goto(path)
    if (journey) {
      await window.journey(this.#resolve(journey))
    }
    await window.restPointer()
    await window.pause(300)
  }

  async #githubDownToDiagram(page) {
    const diagramBottom = await page.evaluate(
      () => document.querySelector('diagit-viewer').getBoundingClientRect().bottom,
    )
    return {
      x: 0,
      y: 0,
      width: HERO_VIEWPORT.width,
      height: Math.round(diagramBottom + GAP_BELOW_DIAGRAM),
    }
  }
}
