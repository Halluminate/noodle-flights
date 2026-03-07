/**
 * Share Button Component
 * 
 * Provides functionality to share the current search state via URL
 * Similar to Google Flights' share functionality
 */

import React, { useState } from 'react'
import { Button } from './button'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'
import { Input } from './input'
import { Share2, Check, Copy } from 'lucide-react'
import { useShareUrl } from '@/hooks/use-url-state'
import { toast } from './use-toast'

interface ShareButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ShareButton({ 
  className, 
  variant = 'outline', 
  size = 'sm' 
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { shareCurrentPage } = useShareUrl()
  
  const handleShare = async () => {
    const success = await shareCurrentPage()
    if (success) {
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "The search URL has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive"
      })
    }
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          aria-label="Share search results"
        >
          <Share2 className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Share</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Share this search</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Copy this link to share your search results with others
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              value={currentUrl}
              readOnly
              className="text-xs"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              onClick={handleShare}
              className="shrink-0"
              disabled={copied}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {copied && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Copied to clipboard
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Simple Share Button (just icon, immediate copy action)
 */
export function SimpleShareButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)
  const { shareCurrentPage } = useShareUrl()

  const handleShare = async () => {
    const success = await shareCurrentPage()
    if (success) {
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "The search URL has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive"
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className={className}
      disabled={copied}
      aria-label="Copy link to search results"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </Button>
  )
}
