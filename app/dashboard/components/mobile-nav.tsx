"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
        <Menu className="h-5 w-5" />
        <span className="sr-only sm:not-sr-only sm:inline-block">Meny</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-3/4 bg-background border-r p-6 shadow-lg sm:max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded-md" />
                 <span className="text-lg font-semibold">Halden Eiendom</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" />
                <span className="sr-only">Lukk meny</span>
              </Button>
            </div>
            <nav className="flex flex-col space-y-4">
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Dashboard
              </Link>
              <Link href="/dashboard/properties" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Eiendommer
              </Link>
              <Link href="/dashboard/contracts" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Kontrakter
              </Link>
              <Link href="/dashboard/maintenance" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Vedlikehold
              </Link>
              <Link href="/dashboard/messages" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Meldinger
              </Link>
              <Link href="/dashboard/inspections" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Overtakelse
              </Link>
              <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Innstillinger
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
