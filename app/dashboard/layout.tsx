import { DashboardSidebar, DashboardTopbar } from "./components/dashboard-navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full print:block print:h-auto">
      <DashboardSidebar />
      <div className="flex flex-col w-full print:block">
        <DashboardTopbar />
        <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:gap-8 md:p-6 print:block print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
