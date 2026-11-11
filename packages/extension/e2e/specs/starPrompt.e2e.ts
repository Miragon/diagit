import { browser, $, expect } from '@wdio/globals'

const PAGES_BEFORE_PROMPT = 5

async function renderBlobDiagram(): Promise<void> {
  await browser.url('/octo/flows/blob/main/order.bpmn')
  await $('diagit-viewer').shadow$('.djs-element').waitForExist({ timeout: 20_000 })
}

describe('Star prompt', () => {
  it('asks for a star after the fifth diagram and never again once closed', async () => {
    for (let render = 1; render < PAGES_BEFORE_PROMPT; render++) await renderBlobDiagram()
    await expect($('diagit-star-prompt')).not.toBeExisting()

    await renderBlobDiagram()
    const prompt = $('diagit-star-prompt')
    await prompt.waitForExist({ timeout: 10_000 })
    await expect(prompt.shadow$('.diagit-toast-primary')).toHaveText('Star on GitHub')

    await prompt.shadow$('.diagit-toast-close').click()
    await expect($('diagit-star-prompt')).not.toBeExisting()

    await renderBlobDiagram()
    await browser.pause(1_000)
    await expect($('diagit-star-prompt')).not.toBeExisting()
  })
})
