import * as React from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  className?: string
  threshold?: number
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(
    containerRef,
    { onRefresh, threshold, disabled }
  )

  const shouldShowIndicator = isPulling || isRefreshing
  const progress = Math.min(pullDistance / threshold, 1)
  const shouldTrigger = pullDistance >= threshold

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ 
        transform: isPulling ? `translateY(${Math.min(pullDistance, threshold)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      {shouldShowIndicator && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center justify-center text-muted-foreground"
          style={{
            transform: `translateX(-50%) translateY(${-40 + (pullDistance * 0.5)}px)`,
            opacity: Math.min(progress * 2, 1)
          }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border">
            <RefreshCw 
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isRefreshing && "animate-spin",
                shouldTrigger && !isRefreshing && "text-primary"
              )}
              style={{
                transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`
              }}
            />
          </div>
          <div className="text-xs mt-1 whitespace-nowrap">
            {isRefreshing 
              ? "Refreshing..." 
              : shouldTrigger 
                ? "Release to refresh" 
                : "Pull to refresh"
            }
          </div>
        </div>
      )}
      
      {children}
    </div>
  )
}