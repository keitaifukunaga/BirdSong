"use client"

import { useState } from "react"
import { cn } from "../../lib/utils"
import { i18n } from "../../util/commonfunc"

type MediaType = "image" | "video"

interface MediaToggleProps {
  value?: MediaType
  onChange?: (value: MediaType) => void
  className?: string
}

/**
 * 
 * @param value - 現在のメディアタイプ
 * @param onChange - メディアタイプが変更された時のコールバック
 * @param className - クラス名
 * @returns 
 */
export function MediaToggle({ value, onChange, className }: MediaToggleProps) {
  const [internalValue, setInternalValue] = useState<MediaType>("image")
  const currentValue = value ?? internalValue

  const handleToggle = (newValue: MediaType) => {
    if (onChange) {
      onChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  const toggleValue = () => {
    handleToggle(currentValue === "image" ? "video" : "image")
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        onClick={() => handleToggle("image")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors rounded-lg",
          currentValue === "image"
            ? "bg-blue-400 text-white"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
        )}
      >
        {i18n('mediaImage')}
      </button>
      <button
        onClick={toggleValue}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-100 transition-colors cursor-pointer hover:bg-blue-200"
        aria-label={i18n('mediaToggle')}
      >
        <div
          className={cn(
            "absolute h-5 w-5 rounded-full bg-blue-400 transition-transform duration-200",
            currentValue === "image" ? "translate-x-0.5" : "translate-x-5"
          )}
        />
      </button>
      <button
        onClick={() => handleToggle("video")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors rounded-lg",
          currentValue === "video"
            ? "bg-blue-400 text-white"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
        )}
      >
        {i18n('mediaVideo')}
      </button>
    </div>
  )
}
