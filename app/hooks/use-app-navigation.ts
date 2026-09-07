"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { groupForModule, moduleFromPath, modulePaths, pathFromModule } from "../lib/navigation";

export function useAppNavigation() {
  const pathname = usePathname();
  const active = moduleFromPath(pathname);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(() => groupForModule(active)?.id ?? null);

  function navigate(name: string) {
    setOpenNavGroup(groupForModule(name)?.id ?? null);
    const nextPath = pathFromModule(name);
    if (window.location.pathname !== nextPath) window.history.pushState(null, "", nextPath);
  }

  useEffect(() => {
    if (pathname === "/") window.history.replaceState(null, "", modulePaths.Dashboard);
    const syncNavigation = () => {
      const nextModule = moduleFromPath(window.location.pathname);
      setOpenNavGroup(groupForModule(nextModule)?.id ?? null);
      setMobileMenu(false);
    };
    window.addEventListener("popstate", syncNavigation);
    return () => window.removeEventListener("popstate", syncNavigation);
  }, [pathname]);

  return { active, mobileMenu, setMobileMenu, openNavGroup, setOpenNavGroup, navigate };
}
