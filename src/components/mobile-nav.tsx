'use client'

import { Menu, X } from 'lucide-react'
import { useMobileMenu } from '@/lib/mobile-menu-context'
import { MobileSidebar } from './mobile-sidebar'

export function MobileNavButton() {
  const { isOpen, setIsOpen } = useMobileMenu()

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export function MobileSidebarWrapper() {
  return <MobileSidebar />
}
