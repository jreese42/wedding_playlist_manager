'use client'

import { useState } from 'react'

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
]

interface AvatarColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  displayName?: string
}

export function AvatarColorPicker({ value, onChange, label = 'Avatar Color', displayName = 'A' }: AvatarColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const firstLetter = displayName.charAt(0).toUpperCase() || 'A'

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white/20"
          style={{ backgroundColor: value }}
        >
          {firstLetter}
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onChange(color)
                setShowPicker(false)
              }}
              className={`w-8 h-8 rounded-full transition-all ${
                value === color ? 'ring-2 ring-offset-2 ring-white ring-offset-indigo-950' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
