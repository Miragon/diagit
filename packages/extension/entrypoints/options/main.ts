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

const app = document.querySelector<HTMLElement>('#app')!

const environment = ExtensionEnvironment.current()
const pageChrome = new OptionsPageChrome(environment.extensionVersion, browser.runtime.id)
const hostAccess = HostAccess.forHosts(hostRegistry)

app.append(pageChrome.header())
new SelfHostedHostsSection(hostAccess, hostRegistry).mount(app)
new GithubAccessSection(new GithubDeviceFlow(), githubTokens).mount(app)
new HelpSection(new DebugInfo(environment), async () => ({
  selfHostedInstances: (await hostAccess.list()).length,
  githubConnected: Boolean(await githubTokens.token()),
})).mount(app)
app.append(pageChrome.supportCard(), pageChrome.footer())
