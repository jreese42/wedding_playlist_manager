'use client'

import { Info } from 'lucide-react'
import { disableDemoMode, checkDemoExpiration, registerDemoActivity } from '@/app/demo/actions'
import { useEffect, useRef } from 'react'

const DEMO_TIMEOUT_MINUTES = 4
const POLLING_INTERVAL_SECONDS = 30
const GRACE_PERIOD_MS = 5000 

export function DemoBanner() {
  const lastActivityRef = useRef(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 1. Listen for user activity to update the timestamp
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      // Also update the server-side activity timestamp
      registerDemoActivity()
    }
    const activityEvents: (keyof WindowEventMap)[] = ['keydown', 'click', 'scroll']
    activityEvents.forEach(event => window.addEventListener(event, handleActivity))

    // 2. Set up a polling interval to check for inactivity
    intervalRef.current = setInterval(async () => {
      const idleTime = Date.now() - lastActivityRef.current
      
      // If client has been idle for longer than the timeout period + grace period
      if (idleTime > (DEMO_TIMEOUT_MINUTES * 60 * 1000) + GRACE_PERIOD_MS) {
        const isExpired = await checkDemoExpiration()
        
        if (isExpired) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          
          // Use the form to trigger a full page navigation on logout
          const disableForm = document.getElementById('disable-demo-form') as HTMLFormElement | null;
          if (disableForm) {
            disableForm.requestSubmit();
          } else {
             await disableDemoMode()
          }
        }
      }
    }, POLLING_INTERVAL_SECONDS * 1000)

    // 3. Cleanup on unmount
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity))
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 relative">
        <Info className="w-4 h-4" />
        <span>You are currently in Demo Mode. All changes reset periodically.</span>
        <form action={disableDemoMode} className="ml-4" id="disable-demo-form">
             <button type="submit" className="underline hover:text-white">Exit Demo</button>
        </form>
    </div>
  )
}
