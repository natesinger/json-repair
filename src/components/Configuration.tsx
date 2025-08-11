import React from 'react'
import { Settings } from '../types'
import ToggleSwitch from './ToggleSwitch'

interface ConfigurationProps {
  settings: Settings
  onSettingsChange: (newSettings: Partial<Settings>) => void
}

const Configuration: React.FC<ConfigurationProps> = ({ settings, onSettingsChange }) => {
  return (
    <div className="configuration">
      <div className="config-section">
        <h3>Settings</h3>
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
        </div>
      </div>
      
      <div className="config-section">
        <h3>Editor</h3>
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
    </div>
  )
}

export default Configuration 