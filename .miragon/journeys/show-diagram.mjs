const QUIET_GITHUB =
  '*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }'
const GAP_BELOW_DIAGRAM = 16

export default async function showDiagram(page) {
  const viewer = page.locator('diagit-viewer').first()
  await viewer.waitFor({ state: 'attached', timeout: 30_000 })
  await page.addStyleTag({ content: QUIET_GITHUB })
  await page.evaluate(() => {
    const removeStarPrompt = () => document.querySelector('diagit-star-prompt')?.remove()
    removeStarPrompt()
    new MutationObserver(removeStarPrompt).observe(document.body, { childList: true })
  })
  await page.waitForTimeout(2500)
  await page.evaluate((gap) => {
    const bottom = document.querySelector('diagit-viewer').getBoundingClientRect().bottom
    scrollBy(0, Math.max(0, bottom + gap - innerHeight))
  }, GAP_BELOW_DIAGRAM)
  await page.waitForTimeout(500)
}
