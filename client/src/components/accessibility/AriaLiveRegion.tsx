import * as React from "react"

interface AriaLiveRegionProps {
  priority?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  busy?: boolean
  children?: React.ReactNode
  className?: string
  id?: string
}

export const AriaLiveRegion = React.forwardRef<HTMLDivElement, AriaLiveRegionProps>(
  ({ 
    priority = 'polite', 
    atomic = true, 
    relevant = 'all',
    busy = false,
    children, 
    className = '',
    id,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        aria-live={priority}
        aria-atomic={atomic}
        aria-relevant={relevant}
        aria-busy={busy}
        className={`sr-only ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

AriaLiveRegion.displayName = "AriaLiveRegion"

export function useAriaLiveRegion(id?: string) {
  const [message, setMessage] = React.useState('')
  const regionId = id || React.useId()

  const announce = React.useCallback((text: string) => {
    setMessage('')
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => setMessage(text), 100)
  }, [])

  const clear = React.useCallback(() => {
    setMessage('')
  }, [])

  return {
    regionId,
    message,
    announce,
    clear,
    AriaLiveRegion: (props: Omit<AriaLiveRegionProps, 'id' | 'children'>) => (
      <AriaLiveRegion id={regionId} {...props}>
        {message}
      </AriaLiveRegion>
    )
  }
}