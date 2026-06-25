"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, FolderKanban, MapPin, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AsyncState } from "@/components/ui/async-state";
import { MobileNav } from "./mobile-nav";
import { UserNav } from "./user-nav";
import { logClientPerformance } from "@/lib/performance/client";

type NavigationState = {
  isAdmin: boolean;
  isTenant: boolean;
  unresolvedNotesCount: number;
  maintenanceCount: number;
};

const initialState: NavigationState = {
  isAdmin: false,
  isTenant: true,
  unresolvedNotesCount: 0,
  maintenanceCount: 0,
};

function useDashboardNavigationState() {
  const [state, setState] = useState<NavigationState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNavigation() {
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/dashboard/navigation", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();
        if (!cancelled) {
          logClientPerformance("dashboard-navigation", (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt, {
            success: true,
          });
          setState({
            isAdmin: Boolean(payload.isAdmin),
            isTenant: Boolean(payload.isTenant),
            unresolvedNotesCount: Number(payload.unresolvedNotesCount || 0),
            maintenanceCount: Number(payload.maintenanceCount || 0),
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          logClientPerformance("dashboard-navigation", (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt, {
            success: false,
          });
          setError(loadError instanceof Error ? loadError.message : "Kunne ikke laste meny");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNavigation();

    return () => {
      cancelled = true;
    };
  }, []);

  const desktopLinks = useMemo(() => {
    const links: Array<{
      href: string;
      label: string;
      icon?: React.ReactNode;
      badge?: number;
      adminOnly?: boolean;
      tenantOnly?: boolean;
    }> = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/properties", label: "Eiendommer", adminOnly: true },
      { href: "/projects", label: "Prosjekter", adminOnly: true, icon: <FolderKanban className="h-4 w-4" /> },
      { href: "/dashboard/cases", label: "Saker", adminOnly: true },
      { href: "/tasks", label: "Oppgaver", adminOnly: true, icon: <MapPin className="h-4 w-4" /> },
      { href: "/dashboard/contracts", label: "Kontrakter", adminOnly: true },
      { href: "/dashboard/interests", label: "Interessenter", adminOnly: true, icon: <UserPlus className="h-4 w-4" /> },
      { href: "/dashboard/users", label: "Brukere", adminOnly: true, icon: <Users className="h-4 w-4" /> },
      { href: "/dashboard/rydderen", label: "Rydder'n", icon: <Camera className="h-4 w-4" /> },
      { href: "/dashboard/maintenance", label: "Vedlikehold", badge: state.maintenanceCount },
      { href: "/dashboard/messages", label: "Meldinger" },
      { href: "/dashboard/inspections", label: "Overtakelse", adminOnly: true },
      { href: "/dashboard/contributions", label: "Bidrag", adminOnly: true },
      { href: "/dashboard/available", label: "Ledige boliger" },
      { href: "/dashboard/my-contracts", label: "Mine kontrakter", tenantOnly: true },
      { href: "/dashboard/certificate", label: "Leietakerbevis", tenantOnly: true },
      { href: "/dashboard/settings", label: "Innstillinger", badge: state.unresolvedNotesCount },
    ];

    return links.filter((link) => {
      if (link.adminOnly && !state.isAdmin) return false;
      if (link.tenantOnly && !state.isTenant) return false;
      return true;
    });
  }, [state.isAdmin, state.isTenant, state.maintenanceCount, state.unresolvedNotesCount]);

  return { state, loading, error, desktopLinks };
}

export function DashboardSidebar() {
  const { loading, error, desktopLinks } = useDashboardNavigationState();

  return (
    <div className="hidden w-64 flex-col border-r bg-gray-100/40 lg:flex dark:bg-gray-800/40 print:hidden">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
          <span>Eiendomssystem</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4">
        <div className="grid items-start gap-1 px-4 text-sm font-medium">
          {desktopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              <span className="flex items-center gap-3">
                {link.icon}
                {link.label}
              </span>
              {link.badge ? (
                <Badge variant="destructive" className="rounded-full px-2 h-5 min-w-5 flex items-center justify-center">
                  {link.badge}
                </Badge>
              ) : null}
            </Link>
          ))}
          {loading ? (
            <div className="px-3 pt-2">
              <AsyncState
                mode="loading"
                compact
                title="Laster meny"
                description="Ekstra snarveier og badge-tall kommer straks."
              />
            </div>
          ) : null}
          {!loading && error ? (
            <div className="px-3 pt-2">
              <AsyncState
                mode="error"
                compact
                title="Kunne ikke laste alt i menyen"
                description="Grunnmenyen virker fortsatt. Ekstra lenker og badge-tall kan mangle midlertidig."
              />
            </div>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

export function DashboardTopbar() {
  const { state, loading } = useDashboardNavigationState();

  return (
    <header className="flex h-14 w-full items-center gap-4 border-b bg-gray-100/40 px-4 md:px-6 dark:bg-gray-800/40 print:hidden">
      <MobileNav
        unresolvedNotesCount={state.unresolvedNotesCount}
        maintenanceCount={state.maintenanceCount}
        isAdmin={state.isAdmin}
        isTenant={state.isTenant}
        isLoading={loading}
      />
      <div className="min-w-0 flex-1" />
      <UserNav />
    </header>
  );
}
