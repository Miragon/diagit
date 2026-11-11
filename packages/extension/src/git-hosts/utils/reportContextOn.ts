import type { ReportContext } from '../../platform/DiagitRepository'
import type { ExtensionEnvironment } from '../../platform/ExtensionEnvironment'
import type { GitHost, PageUrl } from '../GitHost'

export function reportContextOn(
  host: GitHost,
  url: PageUrl,
  pageType: string,
  environment: ExtensionEnvironment,
): ReportContext {
  const isPublicHost = new URL(host.publicOrigin).hostname === url.hostname
  const hostKind = isPublicHost ? new URL(host.publicOrigin).hostname : `Self-hosted ${host.label}`
  return { where: `${hostKind}, ${pageType}`, environment: environment.describe() }
}
