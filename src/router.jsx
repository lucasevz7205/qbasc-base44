import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { DefaultCatchBoundary, isModuleImportError, reloadOnceForModuleError } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { createQueryClient } from "@/lib/query-client";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnceForModuleError();
  });
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isModuleImportError(event?.reason) && reloadOnceForModuleError()) {
        event.preventDefault();
      }
    },
    true,
  );
}

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  });
  // Provides QueryClientProvider and ships queries fetched during SSR to the browser cache.
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}