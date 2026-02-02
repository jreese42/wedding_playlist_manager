'use client'

import { useEffect, useState } from 'react'
import { useTour, TourStep } from '@/lib/tour-context'
import { markTourAsCompleted, clearTourInProgress } from '@/lib/tour-service'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}

export function TourOverlay() {
  const { isActive, currentStep, currentStepIndex, steps, nextStep, prevStep, endTour, skipTour } = useTour()
  const [elementPosition, setElementPosition] = useState<ElementPosition | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isActive || !currentStep) return

    const updatePosition = () => {
      // Choose selector based on viewport size
      const selector = isMobile && currentStep.targetSelectorMobile 
        ? currentStep.targetSelectorMobile 
        : currentStep.targetSelector

      const element = document.querySelector(selector)
      if (element) {
        const rect = element.getBoundingClientRect()
        setElementPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      } else {
        // Element not found - set a default centered position
        console.warn(`Tour element not found: ${selector}`)
        setElementPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          width: 0,
          height: 0,
        })
      }
    }

    // Update immediately and on scroll/resize
    updatePosition()
    const timer = setTimeout(updatePosition, 100)
    window.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isActive, currentStep])

  if (!isActive || !currentStep) {
    return null
  }

  // Use centered position if element not found
  const position = elementPosition || {
    top: window.innerHeight / 2,
    left: window.innerWidth / 2,
    width: 0,
    height: 0,
  }

  const padding = currentStep.highlightPadding ?? 8
  const highlightTop = position.top - padding
  const highlightLeft = position.left - padding
  const highlightWidth = position.width + padding * 2
  const highlightHeight = position.height + padding * 2

  // Tooltip dimensions
  const tooltipWidth = 320
  const tooltipHeight = 300

  // Calculate tooltip position - center it on screen if element not found
  let tooltipTop = highlightTop + highlightHeight + 16
  let tooltipLeft = Math.max(16, highlightLeft - 100)

  // If element position was not found, center the tooltip on screen
  if (!elementPosition) {
    tooltipTop = (window.innerHeight - tooltipHeight) / 2
    tooltipLeft = (window.innerWidth - tooltipWidth) / 2
  } else {
    // Clamp tooltip to viewport bounds
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16))
    tooltipTop = Math.max(16, Math.min(tooltipTop, window.innerHeight - tooltipHeight - 16))
  }

  return (
    <>
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60]" 
        onClick={() => {
          markTourAsCompleted()
          skipTour()
        }} 
      />

      {/* Highlight Box */}
      {currentStep.showHighlight !== false && elementPosition && (
        <div
          className="fixed border-2 border-indigo-400 rounded-lg z-[60] pointer-events-none shadow-lg shadow-indigo-500/50"
          style={{
            top: `${highlightTop}px`,
            left: `${highlightLeft}px`,
            width: `${highlightWidth}px`,
            height: `${highlightHeight}px`,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed bg-white text-gray-900 rounded-lg shadow-2xl z-[70] p-4 w-80"
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            markTourAsCompleted()
            skipTour()
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>

        {/* Title */}
        <h3 className="font-bold text-lg mb-2 pr-6">{currentStep.title}</h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">{currentStep.description}</p>

        {/* Progress */}
        <div className="text-xs text-gray-500 mb-3">
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {currentStepIndex > 0 && (
            <button
              onClick={prevStep}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}
          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors ml-auto"
            >
              Next
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                markTourAsCompleted()
                endTour()
              }}
              className="px-3 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors ml-auto"
            >
              Done
            </button>
          )}
        </div>
      </div>
      
      {/* Handle skip/close - also mark completion to prevent restart */}
      {isActive && (
        <div
          onClick={() => {
            markTourAsCompleted()
            // skipTour is called via the overlay div onClick
          }}
          style={{ display: 'none' }}
        />
      )}
    </>
  )
}
