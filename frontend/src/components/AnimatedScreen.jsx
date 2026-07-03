import { useEffect, useRef } from 'react'

export function AnimatedScreen({ children }) {
  const screenRef = useRef(null)

  useEffect(() => {
    // Trigger animation when component mounts by adding the animation class
    if (screenRef.current) {
      screenRef.current.classList.add('screen-enter')
    }
  }, [])

  return <div ref={screenRef}>{children}</div>
}
