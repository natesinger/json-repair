import React from 'react'
import { Settings } from '../types'
import ToggleSwitch from './ToggleSwitch'

interface ConfigurationFooterProps {
  settings: Settings
  onSettingsChange: (newSettings: Partial<Settings>) => void
}

const ConfigurationFooter: React.FC<ConfigurationFooterProps> = ({ settings, onSettingsChange }) => {
  return (
    <div className="configuration-footer">
      <div className="config-controls">
        <ToggleSwitch
          id="liveMode"
          checked={settings.live}
          onChange={(checked) => onSettingsChange({ live: checked })}
          label="Live update"
          dataTooltip={settings.live ? "Live update on - changes are processed automatically" : "Live update off - use Shift+Enter to process manually"}
        />
        <ToggleSwitch
          id="visualize"
          checked={settings.visualize}
          onChange={(checked) => onSettingsChange({ visualize: checked })}
          label="Visual tree"
        />
        <ToggleSwitch
          id="minify"
          checked={settings.minify}
          onChange={(checked) => onSettingsChange({ minify: checked })}
          label="Minify"
          dataTooltip="Output minified JSON on a single line"
        />
      </div>
      <div className="config-controls">
        <div className="config-item">
          <label htmlFor="tabSize">Tab size:</label>
          <select
            id="tabSize"
            value={settings.tabSize}
            onChange={(e) => onSettingsChange({ tabSize: Number(e.target.value) as 2 | 4 })}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default ConfigurationFooter 