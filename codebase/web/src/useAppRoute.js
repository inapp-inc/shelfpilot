import { useEffect, useState } from "react";
import { isAppRootPath, navigateTo, parseAppPath, pathForModule, stripBase, subscribeToPath } from "./routes.js";

/** Sync React state with browser URL (pushState + popstate). */
export function useAppRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => subscribeToPath(setPathname), []);

  useEffect(() => {
    if (isAppRootPath(pathname)) navigateTo(pathForModule("dashboard"), { replace: true });
    if (stripBase(pathname) === "/analytics") navigateTo(pathForModule("dashboard"), { replace: true });
  }, [pathname]);

  return {
    pathname,
    route: parseAppPath(pathname),
    navigate: navigateTo,
  };
}
