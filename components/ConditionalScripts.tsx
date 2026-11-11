"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isSensitivePath } from "@/lib/sentry-scrub";

/**
 * Google Preferred Sources button library — never loaded on /quiz, /verify
 * or /thank-you. Those routes carry the single-use verification token in the
 * URL (ADR-0001: possession of it IS the authorization), and a third-party
 * script with full page JS execution can read window.location.
 */
export function ConditionalScripts() {
  const pathname = usePathname();
  if (isSensitivePath(pathname)) return null;
  return <Script src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />;
}
