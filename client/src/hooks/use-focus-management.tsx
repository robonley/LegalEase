import { useEffect, useRef } from "react"

interface FocusManagerOptions {
  restoreFocus?: boolean
  trapFocus?: boolean
  initialFocus?: string | HTMLElement
}

export function useFocusManager({
  restoreFocus = true,
  trapFocus = false,
  initialFocus
}: FocusManagerOptions = {}) {
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLElement>(null)

  // Store the previously focused element when component mounts
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement
    
    // Set initial focus if specified
    if (initialFocus) {
      const focusElement = typeof initialFocus === 'string' 
        ? document.querySelector(initialFocus) as HTMLElement
        : initialFocus
      
      if (focusElement) {
        setTimeout(() => focusElement.focus(), 0)
      }
    }

    return () => {
      // Restore focus when component unmounts
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [restoreFocus, initialFocus])

  // Focus trap functionality
  useEffect(() => {
    if (!trapFocus || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusableElement = focusableElements[0] as HTMLElement
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus()
          e.preventDefault()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [trapFocus])

  const moveFocusTo = (selector: string | HTMLElement) => {
    const element = typeof selector === 'string' 
      ? document.querySelector(selector) as HTMLElement
      : selector
    
    if (element) {
      element.focus()
      return true
    }
    return false
  }

  const focusFirstElement = () => {
    if (!containerRef.current) return false
    
    const focusableElement = containerRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement
    
    if (focusableElement) {
      focusableElement.focus()
      return true
    }
    return false
  }

  return {
    containerRef,
    moveFocusTo,
    focusFirstElement,
  }
}