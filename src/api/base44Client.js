import { createClient } from "@base44/sdk";

export const APP_ID =
  import.meta.env?.VITE_BASE44_APP_ID || "6af8bc0e216be36fdba4378c";

export const base44 = createClient({
  appId: APP_ID,
});
