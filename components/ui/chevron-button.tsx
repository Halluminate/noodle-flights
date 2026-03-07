import { ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"

interface ChevronButtonProps {
    isExpanded: boolean
    onClick: (e?: React.MouseEvent) => void
    iconColor?: string
    hoverBackgroundColor?: string
    size?: "sm" | "md"
    withAnimation?: boolean
    disabled?: boolean
    className?: string
    dataChevron?: boolean
}

export function ChevronButton({
    isExpanded,
    onClick,
    iconColor = "text-gray-400",
    hoverBackgroundColor = "hover:bg-gray-700/50",
    size = "md",
    withAnimation = true,
    disabled = false,
    className = "",
    dataChevron = false
}: ChevronButtonProps) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-10 h-10"
    }
    
    const iconSizeClasses = {
        sm: "w-4 h-4",
        md: "w-5 h-5"
    }

    const buttonContent = (
        <div 
            className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-colors duration-200 ${disabled ? "cursor-not-allowed opacity-50" : `${hoverBackgroundColor} cursor-pointer`} ${className}`}
            onClick={disabled ? undefined : onClick}
            aria-disabled={disabled}
            {...(dataChevron && { 'data-chevron': true })}
        >
            {isExpanded ? (
                <ChevronUp 
                    className={`${iconSizeClasses[size]} ${iconColor} transition-transform duration-200`}
                />
            ) : (
                <ChevronDown 
                    className={`${iconSizeClasses[size]} ${iconColor} transition-transform duration-200`}
                />
            )}
        </div>
    )

    if (withAnimation) {
        return (
            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
            >
                {buttonContent}
            </motion.div>
        )
    }

    return buttonContent
}
