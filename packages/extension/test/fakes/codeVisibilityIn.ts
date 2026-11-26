import { CodeStartSetting } from '../../src/platform/settings/CodeStartSetting'
import { SettingsStore } from '../../src/platform/settings/SettingsStore'
import { CodeVisibility } from '../../src/platform/ui/CodeVisibility'
import { MemoryStorageArea } from './MemoryStorageArea'

export function codeStartSettingIn(area: MemoryStorageArea): CodeStartSetting {
  return new CodeStartSetting(
    new SettingsStore(
      () => area,
      () => area.onChanged,
    ),
  )
}

export function codeVisibilityIn(area = new MemoryStorageArea()): CodeVisibility {
  return new CodeVisibility(codeStartSettingIn(area))
}
