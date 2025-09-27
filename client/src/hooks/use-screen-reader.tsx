import { useEffect, useRef } from "react"

interface ScreenReaderOptions {
  priority?: 'polite' | 'assertive'
  id?: string
}

export function useScreenReader({
  priority = 'polite',
  id = 'screen-reader-live-region'
}: ScreenReaderOptions = {}) {
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create or find the live region
    let liveRegion = document.getElementById(id) as HTMLDivElement
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = id
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }
    
    liveRegionRef.current = liveRegion
  }, [id, priority])

  const announce = (message: string, immediateAnnounce = false) => {
    if (!liveRegionRef.current) return

    // Clear previous content
    liveRegionRef.current.textContent = ''
    
    // Add new content with a slight delay for better screen reader support
    if (immediateAnnounce) {
      liveRegionRef.current.textContent = message
    } else {
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message
        }
      }, 100)
    }
  }

  const announcePolite = (message: string) => announce(message, false)
  const announceAssertive = (message: string) => announce(message, true)

  const clear = () => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = ''
    }
  }

  return {
    announce,
    announcePolite,
    announceAssertive,
    clear,
  }
}