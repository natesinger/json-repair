import React, { useState, useRef, useEffect } from 'react'
import { allGenerators, CodeGenerator } from '../utils/codeGenerators'

interface CopyAsCodeDropdownProps {
  onCopy: (generator: CodeGenerator) => void
  disabled?: boolean
}

const CopyAsCodeDropdown: React.FC<CopyAsCodeDropdownProps> = ({ onCopy, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopy = (generator: CodeGenerator) => {
    onCopy(generator)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="copy-as-code-dropdown" ref={dropdownRef}>
      <button
        className={`btn dropdown-toggle ${disabled ? 'disabled' : ''}`}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Copy as Code
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {allGenerators.map((generator) => (
            <button
              key={generator.name}
              className="dropdown-item"
              onClick={() => handleCopy(generator)}
              title={`Copy as ${generator.name} code`}
            >
              <span className="language-name">{generator.name}</span>
              <span className="language-extension">{generator.extension}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CopyAsCodeDropdown 