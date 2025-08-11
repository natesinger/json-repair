import React from 'react'


interface ToggleSwitchProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  dataTooltip?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  id, 
  checked, 
  onChange, 
  label, 
  dataTooltip 
}) => {
  return (
    <label className="switch" data-tooltip={dataTooltip}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export default ToggleSwitch 