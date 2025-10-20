"use client";

import { useEffect, useRef } from "react";
import * as amplitude from "@amplitude/analytics-browser";

const COOKIE_CONSENT_KEY = 'cookie-consent';

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const initAttempted = useRef(false);

  useEffect(() => {

    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (savedConsent) {
      const consent = JSON.parse(savedConsent);

      if (consent.analytics === true && !initAttempted.current) {
        initAttempted.current = true;

        amplitude.init(import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY || '', {
          defaultTracking: true,
        });

      }
    }

    // Listen for consent changes
    const handleConsentChange = (event: CustomEvent) => {
      const consentState = event.detail;

      if (consentState.analytics === true && !initAttempted.current) {
        initAttempted.current = true;

        amplitude.init(import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY || '', {
          defaultTracking: true,
        });

      }
    };

    window.addEventListener('cookieConsentChanged', handleConsentChange as EventListener);

    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChange as EventListener);
    };
  }, []);

  return <>{children}</>;
}
