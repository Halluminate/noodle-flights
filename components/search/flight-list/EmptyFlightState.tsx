import { Button } from "@/components/ui/button"

interface EmptyFlightStateProps {
    onResetFilters: () => void
}

export function EmptyFlightState({ onResetFilters }: EmptyFlightStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-white text-xl mb-4">
                No flights found
            </div>
            <div className="text-gray-400 text-base mb-8">
                Try changing your dates or filters
            </div>
            <Button
                onClick={onResetFilters}
                variant="google-blue"
                size="rounded-full"
                className="text-sm"
            >
                Clear all filters
            </Button>
        </div>
    )
}