"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export function SessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const supabase = createClient();
  const isLoginPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    // Clear last active time on login pages so we start fresh after login
    if (isLoginPage) {
      localStorage.removeItem('lastActive');
      return;
    }

    // Check local storage for last active time (to support tab switching/background)
    const storedLastActive = localStorage.getItem('lastActive');
    if (storedLastActive) {
      lastActivityRef.current = parseInt(storedLastActive, 10);
    } else {
      // If no stored time, set it to now (assuming new session)
      localStorage.setItem('lastActive', Date.now().toString());
    }

    const checkActivity = async () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity > TIMEOUT_MS) {
        // Timeout exceeded
        console.log("Session timeout - logging out");
        await supabase.auth.signOut();
        localStorage.removeItem('lastActive');
        router.push('/login?reason=timeout');
      }
    };

    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('lastActive', now.toString());
    };

    // Initial check on mount
    checkActivity();

    // Set up interval to check periodically
    const intervalId = setInterval(checkActivity, 60000); // Check every minute

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    // Throttle the event listener to avoid excessive writes
    let throttleTimer: NodeJS.Timeout | null = null;
    
    const handleActivity = () => {
      if (!throttleTimer) {
        updateActivity();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000);
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      clearInterval(intervalId);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [router, supabase, isLoginPage]);

  return null;
}
