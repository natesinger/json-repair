import { useState, useEffect } from 'react'
import { Settings } from '../types'

const SETTINGS_KEY = 'jrSettings:v5'
const defaultSettings: Settings = { live: true, visualize: false, tabSize: 4 }

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch {
      // Use defaults if parsing fails
    }
  }, [])

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  }

  return { settings, updateSettings }
} 