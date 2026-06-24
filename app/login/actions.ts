'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getLoginPasswordCandidates } from '@/lib/auth-password'
import { createClient } from '@/lib/supabase-server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Mangler e-post eller passord' }
  }

  const supabase = createClient()
  let error: Error | null = null

  for (const candidate of getLoginPasswordCandidates(password)) {
    const result = await supabase.auth.signInWithPassword({
      email,
      password: candidate,
    })

    if (!result.error) {
      error = null
      break
    }

    error = result.error
  }

  if (error) {
    console.error("Login error:", error.message);
    if (error.message === "Invalid login credentials") {
      return { error: "Feil e-post eller passord" };
    } else if (error.message.includes("Email not confirmed")) {
      return { error: "Du må bekrefte e-postadressen din før du logger inn." };
    }
    return { error: `Feil ved innlogging: ${error.message}` }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
