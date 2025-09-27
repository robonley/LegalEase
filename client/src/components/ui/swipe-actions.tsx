import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSwipeActions, SwipeAction } from "@/hooks/use-swipe-actions"

interface SwipeActionsProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  className?: string
  threshold?: number
  disabled?: boolean
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  className,
  threshold = 60,
  disabled = false,
}: SwipeActionsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { 
    offset, 
    visibleActions, 
    isDragging,
    resetState,
    leftActions: activeLeftActions,
    rightActions: activeRightActions,
  } = useSwipeActions(containerRef, { leftActions, rightActions, threshold, disabled })

  const getActionColor = (color: SwipeAction['color']) => {
    switch (color) {
      case 'destructive':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      case 'primary':
        return 'bg-primary text-primary-foreground hover:bg-primary/90'
      case 'warning':
        return 'bg-yellow-500 text-white hover:bg-yellow-600'
      case 'secondary':
      default:
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    }
  }

  const handleActionClick = (action: SwipeAction) => {
    action.onAction()
    resetState()
  }

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (visibleActions !== 'none') {
          resetState()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visibleActions, resetState])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Left Actions */}
      {activeLeftActions.length > 0 && (
        <div 
          className="absolute left-0 top-0 h-full flex items-center"
          style={{
            transform: `translateX(${Math.min(0, offset + (threshold * activeLeftActions.length))}px)`,
          }}
        >
          {activeLeftActions.map((action, index) => (
            <Button
              key={action.id}
              size="sm"
              className={cn(
                "h-full rounded-none border-0 min-h-[44px]",
                getActionColor(action.color)
              )}
              style={{ width: threshold }}
              onClick={() => handleActionClick(action)}
              data-testid={`swipe-action-${action.id}`}
            >
              <div className="flex flex-col items-center gap-1">
                <i className={`${action.icon} text-sm`} />
                <span className="text-xs">{action.label}</span>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {activeRightActions.length > 0 && (
        <div 
          className="absolute right-0 top-0 h-full flex items-center"
          style={{
            transform: `translateX(${Math.max(0, offset - (threshold * activeRightActions.length))}px)`,
          }}
        >
          {activeRightActions.map((action, index) => (
            <Button
              key={action.id}
              size="sm"
              className={cn(
                "h-full rounded-none border-0 min-h-[44px]",
                getActionColor(action.color)
              )}
              style={{ width: threshold }}
              onClick={() => handleActionClick(action)}
              data-testid={`swipe-action-${action.id}`}
            >
              <div className="flex flex-col items-center gap-1">
                <i className={`${action.icon} text-sm`} />
                <span className="text-xs">{action.label}</span>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "transition-transform duration-200 ease-out",
          isDragging && "transition-none"
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}