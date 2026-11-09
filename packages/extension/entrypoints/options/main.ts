import '../../src/platform/theme/cd-tokens.generated.css'
import './options.css'

import { githubTokens, hostRegistry } from '../../src/git-hosts/hosts'
import { GithubDeviceFlow } from '../../src/git-hosts/github/GithubDeviceFlow'
import { HostAccess } from '../../src/git-hosts/self-hosted/HostAccess'
import { GithubAccessSection } from '../../src/views/options/GithubAccessSection'
import { SelfHostedHostsSection } from '../../src/views/options/SelfHostedHostsSection'

const app = document.querySelector<HTMLElement>('#app')!

new SelfHostedHostsSection(HostAccess.forHosts(hostRegistry), hostRegistry).mount(app)
new GithubAccessSection(new GithubDeviceFlow(), githubTokens).mount(app)
