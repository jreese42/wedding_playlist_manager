'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export interface TourStep {
  id: string
  title: string
  description: string
  targetSelector: string // CSS selector for the element to highlight (desktop)
  targetSelectorMobile?: string // CSS selector for mobile view (optional)
  position?: 'top' | 'bottom' | 'left' | 'right'
  highlightPadding?: number
  showHighlight?: boolean
  onEnter?: () => void | Promise<void> // Called when step enters
  onExit?: () => void | Promise<void> // Called when step exits
}

interface TourContextType {
  isActive: boolean
  currentStepIndex: number
  currentStep: TourStep | null
  steps: TourStep[]
  startTour: (steps: TourStep[]) => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  skipTour: () => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [steps, setSteps] = useState<TourStep[]>([])

  const currentStep = steps[currentStepIndex] || null

  // Call onEnter when step changes
  useEffect(() => {
    if (isActive && currentStep && currentStep.onEnter) {
      currentStep.onEnter()
    }
  }, [isActive, currentStep, currentStepIndex])

  const startTour = useCallback((tourSteps: TourStep[]) => {
    setSteps(tourSteps)
    setCurrentStepIndex(0)
    setIsActive(true)
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      // Call onExit for current step
      if (prev < steps.length && steps[prev]?.onExit) {
        steps[prev].onExit()
      }

      const next = prev + 1
      if (next >= steps.length) {
        setIsActive(false)
        return prev
      }
      return next
    })
  }, [steps])

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStepIndex(0)
  }, [])

  const skipTour = useCallback(() => {
    setIsActive(false)
    setCurrentStepIndex(0)
  }, [])

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        steps,
        startTour,
        nextStep,
        prevStep,
        endTour,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}
