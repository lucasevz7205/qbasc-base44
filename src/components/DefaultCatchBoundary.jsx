import { useEffect } from "react";
import { ErrorComponent, Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const MODULE_IMPORT_ERROR_RE =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;

export function isModuleImportError(error) {
  const text = `${error?.name || ""} ${error?.message || ""} ${String(error || "")}`;
  return MODULE_IMPORT_ERROR_RE.test(text);
}

export function reloadOnceForModuleError() {
  if (typeof window === "undefined") return false;
  try {
    const key = "qb_module_reload_at";
    const last = Number(sessionStorage.getItem(key) || 0);
    const now = Date.now();
    if (now - last > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

export function DefaultCatchBoundary({ error }) {
  const router = useRouter();
  const isRoot = useMatch({ strict: false, select: (state) => state.id === rootRouteId });
  const moduleError = isModuleImportError(error);

  useEffect(() => {
    if (moduleError) reloadOnceForModuleError();
  }, [moduleError]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-24">
      <ErrorComponent error={error} />
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (moduleError) {
              window.location.reload();
            } else {
              router.invalidate();
            }
          }}
        >
          Try again
        </Button>
        <Button asChild>{isRoot ? <Link to="/">Home</Link> : <Link to="/" onClick={(e) => { e.preventDefault(); window.history.back(); }}>Go back</Link>}</Button>
      </div>
    </div>
  );
}