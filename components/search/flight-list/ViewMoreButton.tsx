import { Loader2 } from "lucide-react"
import { ChevronButton } from "@/components/ui/chevron-button"

interface ViewMoreButtonProps {
    isLoading: boolean
    isExpanded: boolean
    onClick: () => void
}

export function ViewMoreButton({ isLoading, isExpanded, onClick }: ViewMoreButtonProps) {
    return (
        <div className="border-t border-l border-r border-b border-gray-600 rounded-b-lg">
            <div className="p-4 px-2 py-3">
                <div className="flex justify-start ml-3">
                    <button
                        onClick={onClick}
                        className="flex items-center gap-6 transition-colors duration-200 pr-4"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-10 h-10 flex items-center justify-center hover:bg-gray-700/50 rounded-full transition-colors duration-200">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <ChevronButton
                                isExpanded={isExpanded}
                                onClick={() => {}} // No-op since parent button handles the click
                                iconColor="text-white/80"
                                hoverBackgroundColor="hover:bg-gray-700/50"
                                withAnimation={false}
                            />
                        )}
                        <span className="text-white/80 text-sm">
                            {isExpanded ? 'View fewer flights' : 'View more flights'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}