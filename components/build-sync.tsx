"use client";

import { useEffect } from "react";

export function BuildSync() {
  useEffect(() => {
    const build = process.env.NEXT_PUBLIC_APP_COMMIT;
    if (!build || build === "local") {
      return;
    }

    const key = "app-build";
    const previous = window.localStorage.getItem(key);
    if (!previous) {
      window.localStorage.setItem(key, build);
      return;
    }

    if (previous !== build) {
      window.localStorage.setItem(key, build);
      window.location.reload();
    }
  }, []);

  return null;
}

