import * as amplitude from "@amplitude/analytics-browser";
import { supabase } from "./supabase";

const COOKIE_CONSENT_KEY = "cookie-consent";

const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) return false;

    const consent = JSON.parse(savedConsent);
    return consent.analytics === true;
  } catch {
    return false;
  }
};

export const trackEvent = async (
  eventName: string,
  eventProps?: Record<string, any>
) => {
  const hasConsent = hasAnalyticsConsent();

  if (!hasConsent) {
    return;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const allProps = {
      ...eventProps,
      email_address: user?.email || "",
      screen_resolution: window.screen.width + "x" + window.screen.height,
      device: navigator.userAgent,
    };

    const result = amplitude.track(eventName, allProps);
  } catch (error) {
    console.error("❌ Error in trackEvent:", error);
    throw error;
  }
};

export const setUserId = (userId: string) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  amplitude.setUserId(userId);
};
