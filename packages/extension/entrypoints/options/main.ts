import '../../src/platform/ui/base.css'
import './options.css'

import { browser } from 'wxt/browser'
import { githubTokens, hostRegistry } from '../../src/git-hosts/hosts'
import { GithubDeviceFlow } from '../../src/git-hosts/github/GithubDeviceFlow'
import { HostAccess } from '../../src/git-hosts/self-hosted/HostAccess'
import { ExtensionEnvironment } from '../../src/platform/ExtensionEnvironment'
import { DebugInfo } from '../../src/views/options/DebugInfo'
import { GithubAccessSection } from '../../src/views/options/GithubAccessSection'
import { HelpSection } from '../../src/views/options/HelpSection'
import { SelfHostedHostsSection } from '../../src/views/options/SelfHostedHostsSection'
import { OptionsPageChrome } from '../../src/views/options/OptionsPageChrome'
import { h } from '../../src/platform/utils/dom'

const app = document.querySelector<HTMLElement>('#app')!
const content = h('main', { class: 'options' })

const environment = ExtensionEnvironment.current()
const pageChrome = new OptionsPageChrome(environment.extensionVersion, browser.runtime.id)
const hostAccess = HostAccess.forHosts(hostRegistry)

app.append(pageChrome.header(), content)
new SelfHostedHostsSection(hostAccess).mount(content)
new GithubAccessSection(new GithubDeviceFlow(), githubTokens, {
  where: 'Options page',
  environment: environment.describe(),
}).mount(content)
new HelpSection(new DebugInfo(environment), async () => ({
  selfHostedInstances: (await hostAccess.list()).length,
  githubConnected: Boolean(await githubTokens.token()),
})).mount(content)
content.append(pageChrome.supportCard(), pageChrome.footer())
