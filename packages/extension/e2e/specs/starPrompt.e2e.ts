import { browser, $, expect } from '@wdio/globals'

const PAGES_BEFORE_PROMPT = 5

async function openDiagramPage(page: number): Promise<void> {
  await browser.url(`/octo/flows/blob/main/order-${page}.bpmn`)
  await $('diagit-viewer').shadow$('.djs-element').waitForExist({ timeout: 20_000 })
}

describe('Star prompt', () => {
  it('asks for a star on the fifth page with a diagram and never again once closed', async () => {
    for (let page = 1; page < PAGES_BEFORE_PROMPT; page++) await openDiagramPage(page)
    await expect($('diagit-star-prompt')).not.toBeExisting()

    await openDiagramPage(PAGES_BEFORE_PROMPT)
    const prompt = $('diagit-star-prompt')
    await prompt.waitForExist({ timeout: 10_000 })
    await expect(prompt.shadow$('.diagit-toast-primary')).toHaveText('Star on GitHub')

    await prompt.shadow$('.diagit-toast-close').click()
    await expect($('diagit-star-prompt')).not.toBeExisting()

    await openDiagramPage(PAGES_BEFORE_PROMPT + 1)
    await browser.pause(1_000)
    await expect($('diagit-star-prompt')).not.toBeExisting()
  })
})
