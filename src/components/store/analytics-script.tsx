import Script from "next/script";
import { env } from "@/server/config/env";

/**
 * Loads the configured analytics provider after the page is interactive so
 * it never competes with LCP. Default provider is "none".
 */
export function AnalyticsScript() {
  const e = env();
  if (e.ANALYTICS_PROVIDER !== "plausible" || !e.PLAUSIBLE_DOMAIN) return null;
  return <Script src={e.PLAUSIBLE_SCRIPT_URL} data-domain={e.PLAUSIBLE_DOMAIN} strategy="lazyOnload" />;
}
