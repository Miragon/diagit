import { h } from '../../platform/utils/dom'
import type { CodeStart, CodeStartSetting } from '../../platform/settings/CodeStartSetting'

const INTRO =
  "Diagit shows the diagram above the file's code on GitHub and GitLab. The Code button in the panel toolbar shows or hides the code at any time. This sets how each diagram starts."

const CHOICES: readonly { start: CodeStart; title: string; detail: string }[] = [
  {
    start: 'shown',
    title: 'Start with the code shown',
    detail: 'The diagram and the code below it, on file pages, pull requests and commits.',
  },
  {
    start: 'hidden',
    title: 'Start with the diagram alone',
    detail:
      'The code is one click away. Files with review comments and links to a line still start with the code shown.',
  },
]

export class CodeStartSection {
  private readonly radios = CHOICES.map(({ start }) =>
    h('input', { type: 'radio', name: 'code-start', value: start }),
  )

  constructor(private readonly setting: CodeStartSetting) {}

  mount(app: HTMLElement): void {
    app.append(
      h('section', { class: 'card' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Code under diagrams' })]),
        h('p', { class: 'card-desc', text: INTRO }),
        h(
          'div',
          { class: 'card-rows', role: 'radiogroup', 'aria-label': 'Code under diagrams' },
          CHOICES.map((choice, index) => this.choiceRow(choice, this.radios[index]!)),
        ),
      ]),
    )
    for (const radio of this.radios) {
      radio.addEventListener('change', () => void this.setting.write(radio.value as CodeStart))
    }
    let changedWhileReading = false
    this.setting.onChange((start) => {
      changedWhileReading = true
      this.check(start)
    })
    void this.setting.read().then((start) => {
      if (!changedWhileReading) {
        this.check(start)
      }
    })
  }

  private choiceRow(choice: (typeof CHOICES)[number], radio: HTMLInputElement): HTMLLabelElement {
    return h('label', { class: 'card-row choice-row' }, [
      radio,
      h('span', { class: 'card-row-text' }, [
        h('span', { class: 'choice-title', text: choice.title }),
        h('span', { class: 'choice-detail', text: choice.detail }),
      ]),
    ])
  }

  private check(start: CodeStart): void {
    for (const radio of this.radios) {
      radio.checked = radio.value === start
    }
  }
}
