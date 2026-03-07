import { cn } from "@/lib/utils"

interface FilterToggleContainerProps {
  children: React.ReactNode
  className?: string
}

export function FilterToggleContainer({ children, className }: FilterToggleContainerProps) {
  return (
    <div className={cn("hover:bg-[#4D4E52] rounded-full p-2", className)}>
      {children}
    </div>
  )
}