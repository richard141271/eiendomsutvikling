"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, FolderKanban, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"

interface MobileNavProps {
  unresolvedNotesCount?: number;
  maintenanceCount?: number;
  isAdmin?: boolean;
  isTenant?: boolean;
}

export function MobileNav({ unresolvedNotesCount = 0, maintenanceCount = 0, isAdmin = false, isTenant = false }: MobileNavProps) {
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
                 <Image 
                   src="/logo.png" 
                   alt="Logo" 
                   width={24}
                   height={24}
                   className="rounded-md" 
                 />
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
              
              {isAdmin && (
                <>
                  <Link href="/dashboard/properties" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Eiendommer
                  </Link>
                  <Link href="/projects" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Prosjekter
                  </Link>
                  <Link href="/tasks" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Oppgaver
                  </Link>
                  <Link href="/dashboard/contracts" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Kontrakter
                  </Link>
                  <Link href="/dashboard/interests" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Interessenter
                  </Link>
                  <Link href="/dashboard/users" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Brukere
                  </Link>
                </>
              )}

              <Link href="/dashboard/maintenance" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary flex items-center justify-between">
                <span>Vedlikehold</span>
                {maintenanceCount > 0 && (
                  <Badge variant="destructive" className="ml-2 rounded-full px-2">
                    {maintenanceCount}
                  </Badge>
                )}
              </Link>
              <Link href="/dashboard/messages" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Meldinger
              </Link>
              
              {isAdmin && (
                <Link href="/dashboard/inspections" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                  Overtakelse
                </Link>
              )}

              {isAdmin && (
                <Link href="/dashboard/contributions" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                  Bidrag
                </Link>
              )}

              <Link href="/dashboard/available" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                Ledige boliger
              </Link>

              {isTenant && (
                <>
                  <Link href="/dashboard/my-contracts" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Mine kontrakter
                  </Link>
                  <Link href="/dashboard/certificate" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary">
                    Leietakerbevis
                  </Link>
                </>
              )}

              <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="text-lg font-medium hover:text-primary flex items-center justify-between">
                <span>Innstillinger</span>
                {unresolvedNotesCount > 0 && (
                  <Badge variant="destructive" className="ml-2 rounded-full px-2">
                    {unresolvedNotesCount}
                  </Badge>
                )}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
