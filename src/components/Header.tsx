import React from 'react'
import { Settings } from '../types'

interface HeaderProps {
  settings: Settings
  onSettingsChange: (newSettings: Partial<Settings>) => void
}

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="header">
      <div className="title">
        JSON Repair & Beautifier 
        <small>— paste anything, get valid JSON</small>
      </div>
      <div className="attribution">
        <span>Made by <a href="https://www.linkedin.com/in/nathanielmsinger/" target="_blank" rel="noopener noreferrer">Nate Singer</a></span>
        <span>•</span>
        <span><a href="https://github.com/natesinger/json-repair" target="_blank" rel="noopener noreferrer">Open source on GitHub</a></span>
        <span>•</span>
        <span>Hosted by <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</a></span>
      </div>
    </header>
  )
}

export default Header 