import { useState, useEffect, useRef, RefObject } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

export interface SwipeAction {
  id: string
  label: string
  icon: string
  color: 'destructive' | 'primary' | 'secondary' | 'warning'
  onAction: () => void
}

interface SwipeActionsOptions {
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  threshold?: number
  disabled?: boolean
}

interface SwipeState {
  offset: number
  isSwipingLeft: boolean
  isSwipingRight: boolean
  isDragging: boolean
  visibleActions: 'none' | 'left' | 'right'
}

export function useSwipeActions(
  elementRef: RefObject<HTMLElement>,
  { leftActions = [], rightActions = [], threshold = 60, disabled = false }: SwipeActionsOptions
) {
  const isMobile = useIsMobile()
  const [state, setState] = useState<SwipeState>({
    offset: 0,
    isSwipingLeft: false,
    isSwipingRight: false,
    isDragging: false,
    visibleActions: 'none',
  })
  
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isDragging = useRef(false)
  const hasVerticalMovement = useRef(false)

  const resetState = () => {
    setState({
      offset: 0,
      isSwipingLeft: false,
      isSwipingRight: false,
      isDragging: false,
      visibleActions: 'none',
    })
  }

  useEffect(() => {
    if (!isMobile || disabled || !elementRef.current) return

    const element = elementRef.current

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      currentX.current = startX.current
      isDragging.current = true
      hasVerticalMovement.current = false
      
      setState(prev => ({ ...prev, isDragging: true }))
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return

      const currentTouchX = e.touches[0].clientX
      const currentTouchY = e.touches[0].clientY
      const diffX = currentTouchX - startX.current
      const diffY = Math.abs(currentTouchY - startY.current)

      // If vertical movement is too much, cancel the swipe
      if (diffY > 30 && Math.abs(diffX) < diffY) {
        hasVerticalMovement.current = true
        resetState()
        return
      }

      if (hasVerticalMovement.current) return

      // Prevent default only for horizontal swipes
      if (Math.abs(diffX) > 10) {
        e.preventDefault()
      }

      currentX.current = currentTouchX
      
      const maxLeftSwipe = leftActions.length > 0 ? -threshold * leftActions.length : 0
      const maxRightSwipe = rightActions.length > 0 ? threshold * rightActions.length : 0
      
      const constrainedOffset = Math.max(maxLeftSwipe, Math.min(maxRightSwipe, diffX))

      setState(prev => ({
        ...prev,
        offset: constrainedOffset,
        isSwipingLeft: diffX < -threshold,
        isSwipingRight: diffX > threshold,
        visibleActions: 
          diffX < -threshold ? 'left' : 
          diffX > threshold ? 'right' : 
          'none'
      }))
    }

    const handleTouchEnd = () => {
      if (!isDragging.current || hasVerticalMovement.current) {
        resetState()
        return
      }

      isDragging.current = false
      const finalOffset = currentX.current - startX.current

      // Determine if we should snap to show actions or reset
      if (Math.abs(finalOffset) > threshold) {
        if (finalOffset > 0 && rightActions.length > 0) {
          // Snap to show right actions
          setState(prev => ({
            ...prev,
            offset: threshold * rightActions.length,
            isDragging: false,
            visibleActions: 'right',
            isSwipingRight: true,
          }))
        } else if (finalOffset < 0 && leftActions.length > 0) {
          // Snap to show left actions
          setState(prev => ({
            ...prev,
            offset: -threshold * leftActions.length,
            isDragging: false,
            visibleActions: 'left',
            isSwipingLeft: true,
          }))
        } else {
          resetState()
        }
      } else {
        resetState()
      }
    }

    const handleTouchCancel = () => {
      resetState()
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [isMobile, disabled, threshold, leftActions.length, rightActions.length, elementRef])

  return {
    ...state,
    resetState,
    leftActions,
    rightActions,
  }
}