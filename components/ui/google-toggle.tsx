"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface GoogleToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function GoogleToggle({ checked, onCheckedChange, disabled = false, className }: GoogleToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[16px] w-[32px] items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
        checked 
          ? "bg-[#86B2F7]" 
          : "bg-white",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "h-5 w-5 transform rounded-full transition-transform duration-200 ease-in-out flex items-center justify-center",
          checked 
            ? "translate-x-4 bg-[#174EA6]" 
            : "translate-x-0.2 bg-slate-500 hover:bg-slate-500"
        )}
      >
        {checked ? (
          <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
        ) : (
          <X className="h-2.5 w-2.5 text-white stroke-[3]" />
        )}
      </span>
    </button>
  )
} 