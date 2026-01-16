'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Mangler e-post eller passord' }
  }

  // Pad logic - keeping this for backward compatibility with 4-digit users
  // If user types 4 digits, we add "00". If they type 6, we use as is.
  const passwordToUse = password.length === 4 ? password + "00" : password;

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordToUse,
  })

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
