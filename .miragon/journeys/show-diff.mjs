const QUIET_GITHUB =
  '*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }'
const SPACE_ABOVE_PANEL = 150

export default async function showDiff(page, { click, pause }) {
  const panel = page.locator('diagit-diff').first()
  await panel.waitFor({ state: 'attached', timeout: 30_000 })
  await page.addStyleTag({ content: QUIET_GITHUB })
  await page.evaluate((space) => {
    scrollBy(0, document.querySelector('diagit-diff').getBoundingClientRect().top - space)
  }, SPACE_ABOVE_PANEL)
  await pause(2500)
  await click(panel.getByRole('button', { name: 'Diff' }))
  await pause(2500)
}
