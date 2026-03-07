"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Primitives exported for composability                                     */
/* -------------------------------------------------------------------------- */

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip        = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

/* -------------------------------------------------------------------------- */
/*  Content (with arrow)                                                      */
/* -------------------------------------------------------------------------- */

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(
  (
    {
      className,
      sideOffset = 4,          // distance from trigger
      align = "center",        // default alignment
      ...props
    },
    ref
  ) => {
    // Extract background color for arrow matching
    const isCustomBackground = className?.includes('bg-gray-800')
    const arrowClass = isCustomBackground ? "fill-gray-800" : "fill-popover"
    
    return (
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          // layout & theme
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5",
          "text-sm text-popover-foreground shadow-md",

          // shadcn animation utilities
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",

          className
        )}
        {...props}
      >
        {props.children}

        {/* arrow color matches tooltip background */}
        <TooltipPrimitive.Arrow className={arrowClass} width={12} height={6} />
      </TooltipPrimitive.Content>
    )
  }
)

TooltipContent.displayName = TooltipPrimitive.Content.displayName
