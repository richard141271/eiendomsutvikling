import { LoginForm } from "@/components/login-form"
import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-900">
      <div className="p-4 md:p-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til forsiden
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 -mt-20">
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Halden Eiendomsutvikling
          </h1>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          Har du ikke konto? <Link href="/register" className="font-semibold text-blue-600 hover:underline">Registrer deg her</Link>
        </p>
      </div>
    </div>
  )
}
