import React from 'react'
import { useLocation } from 'react-router-dom'

type PageTransitionProps = {
  children: React.ReactNode
}

/**
 * Smooth, subtle fade & slight slide-up transition on route change.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
      className="animate-page-enter"
    >
      {children}
    </div>
  )
}
