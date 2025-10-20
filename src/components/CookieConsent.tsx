"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface CookieConsentProps {}

type ConsentState = {
  necessary: boolean;
  analytics: boolean;
};

const COOKIE_CONSENT_KEY = 'cookie-consent';

export function CookieConsent({}: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      setIsVisible(true);
    }
  }, []);

  const saveConsent = (consentState: ConsentState) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentState));
    setIsVisible(false);
    setShowConfigModal(false);

    // Trigger custom event for amplitude integration
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
      detail: consentState
    }));
  };

  const handleAccept = () => {
    saveConsent({ necessary: true, analytics: true });
  };

  const handleDeny = () => {
    saveConsent({ necessary: true, analytics: false });
  };

  const handleSaveConfiguration = () => {
    saveConsent(consent);
  };

  const handleAcceptAll = () => {
    setConsent({ necessary: true, analytics: true });
    saveConsent({ necessary: true, analytics: true });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-[600px] ml-auto">
      {!showConfigModal ? (
        // Main consent banner
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#85a3ff] to-transparent p-8">
            <div className="space-y-4">
              <h2 className="text-[#0f1422] text-[21px] font-semibold leading-[1.25] ">
                Advertencia sobre el uso de cookies:
              </h2>
              <p className="text-[#0f1422] text-[16px] font-normal leading-[1.47] ">
                Utilizamos cookies propias y de terceros para el correcto funcionamiento del portal web y sus complementos, además de realizar analíticas de navegación.
                 Amplía más información sobre esta tecnología visitando nuestra <a href="https://www.zenovapro.com/politica-de-cookies" className="text-[#0033cc] underline">Política de Cookies</a>.
              </p>
            </div>
            <div className="flex items-center justify-between mt-8 gap-4">
              <button
                onClick={handleDeny}
                className="border border-[#0033cc] text-[#0033cc] px-4 py-2.5 rounded text-[14px] font-semibold  hover:bg-[#0033cc] hover:text-white transition-colors"
              >
                Denegar
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="border border-[#0033cc] text-[#0033cc] px-4 py-2.5 rounded text-[14px] font-semibold  hover:bg-[#0033cc] hover:text-white transition-colors"
              >
                Configurar cookies
              </button>
              <button
                onClick={handleAccept}
                className="bg-[#0033cc] text-white px-4 py-2.5 rounded text-[14px] font-semibold  hover:bg-[#0033cc]/90 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Configuration modal
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-h-[80vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-[#85a3ff] to-transparent p-8">
            <div className="space-y-6">
              <h2 className="text-[#0f1422] text-[21px] font-semibold leading-[1.25] ">
                Configurar cookies
              </h2>

              {/* Necessary cookies section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#0033cc] rounded p-1 w-8 h-8 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[#0f1422] text-[16px] font-semibold ">
                      Cookies necesarias
                    </span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-[#0f1422]" />
                </div>
                <p className="text-[#0f1422] text-[16px] font-normal leading-[1.47] ">
                  Utilizamos cookies propias y de terceros para el correcto funcionamiento del portal web y sus complementos, además de realizar analíticas de navegación. Amplía más información sobre esta tecnología visitando nuestra Política de Cookies.
                </p>
              </div>

              {/* Analytics cookies section */}
              <div className="space-y-4">
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded p-1 w-8 h-8 flex items-center justify-center border cursor-pointer ${
                        consent.analytics
                          ? 'bg-[#0033cc] border-[#0033cc]'
                          : 'bg-white border-[#d0d3dd]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConsent(prev => ({ ...prev, analytics: !prev.analytics }));
                      }}
                    >
                      {consent.analytics && <Check className="w-6 h-6 text-white" />}
                    </div>
                    <span className="text-[#0f1422] text-[16px] font-semibold ">
                      Cookies de analítica y rendimiento
                    </span>
                  </div>
                  {isAnalyticsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#0f1422]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#0f1422]" />
                  )}
                </div>
                {isAnalyticsExpanded && (
                  <p className="text-[#0f1422] text-[16px] font-normal leading-[1.47] ">
                    Estas cookies nos permiten contar las visitas y fuentes de tráfico para poder evaluar el rendimiento de nuestro sitio y mejorarlo. Nos ayudan a saber qué páginas son las más o menos visitadas, y cómo los visitantes navegan por el sitio. Toda la información que recogen estas cookies es agregada y, por lo tanto, es anónima.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 gap-4">
              <button
                onClick={handleSaveConfiguration}
                className="border border-[#0033cc] text-[#0033cc] px-4 py-2.5 rounded text-[14px] font-semibold  hover:bg-[#0033cc] hover:text-white transition-colors"
              >
                Guardar configuración
              </button>
              <button
                onClick={handleAcceptAll}
                className="bg-[#0033cc] text-white px-4 py-2.5 rounded text-[14px] font-semibold  hover:bg-[#0033cc]/90 transition-colors"
              >
                Aceptar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}