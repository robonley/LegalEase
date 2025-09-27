import { useState, useEffect, useRef, RefObject } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  disabled?: boolean
}

interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
}

export function usePullToRefresh(
  elementRef: RefObject<HTMLElement>,
  { onRefresh, threshold = 80, disabled = false }: PullToRefreshOptions
) {
  const isMobile = useIsMobile()
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  })
  
  const startY = useRef(0)
  const startScrollTop = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    if (!isMobile || disabled || !elementRef.current) return

    const element = elementRef.current

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY
        startScrollTop.current = element.scrollTop
        isDragging.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || element.scrollTop > 0) return

      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0 && element.scrollTop === 0) {
        e.preventDefault()
        const pullDistance = Math.min(diff * 0.5, threshold * 1.5)
        
        setState(prev => ({
          ...prev,
          isPulling: true,
          pullDistance,
        }))
      }
    }

    const handleTouchEnd = async () => {
      if (!isDragging.current) return

      isDragging.current = false
      const { pullDistance } = state

      if (pullDistance >= threshold) {
        setState(prev => ({
          ...prev,
          isRefreshing: true,
          pullDistance: threshold,
        }))

        try {
          await onRefresh()
        } finally {
          setState({
            isPulling: false,
            pullDistance: 0,
            isRefreshing: false,
          })
        }
      } else {
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        })
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, disabled, onRefresh, threshold, elementRef, state.pullDistance])

  return state
}