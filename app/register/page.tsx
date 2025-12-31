import { RegisterForm } from "@/components/register-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-900">
      <div className="p-4 md:p-8 relative z-10">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til forsiden
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 -mt-20">
        <RegisterForm />
      </div>
    </div>
  )
}
