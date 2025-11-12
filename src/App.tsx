import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConstructionView from './components/ConstructionView';
import DocumentView from './components/DocumentView';
import UploadView from './components/UploadView';
import SearchView from './components/SearchView';
import ServiceDocumentsPage from './components/ServiceDocumentsPage';
import ServiceDocumentsCategoryPage from './components/ServiceDocumentsCategoryPage';
import { NotificationProvider } from './contexts/NotificationContext';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import { CookieConsent } from './components/CookieConsent';
import { AmplitudeProvider } from './providers/AmplitudeProvider';

function App() {
  const location = useLocation();

  // Determinar la vista activa basada en la ruta actual
  const getActiveView = () => {
    const path = location.pathname;
    if (path.includes('/constructions') || path === '/') return 'constructions';
    return 'constructions';
  };

  const [activeView, setActiveView] = useState(getActiveView());

  // Ocultar sidebar en rutas de servicios/documentos
  const shouldShowSidebar = !location.pathname.includes('/servicios/');

  const [user, setUser] = useState<any | null>(null);

  // chequear sesión y escuchar cambios
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        
        setUser(session?.user ?? null);
      }
    );
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // si no hay usuario → mostramos login
  if (!user) {
    return (
      <NotificationProvider>
        <Login />
      </NotificationProvider>
    );
  }

  return (
    <AmplitudeProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-gray-50">
          {shouldShowSidebar && <Sidebar activeView={activeView} onViewChange={setActiveView} />}
          <main className="flex-1 overflow-auto bg-white">
            <Routes>
              <Route path="/" element={<ConstructionView />} />
              <Route path="/constructions" element={<ConstructionView />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/servicios/:serviceId/documentos"
                element={<ServiceDocumentsPage />}
              />
              <Route
                path="/servicios/:serviceId/documentos/categoria/:category"
                element={<ServiceDocumentsCategoryPage />}
              />
              <Route path="*" element={<ConstructionView />} />
            </Routes>
          </main>
          <CookieConsent />
        </div>
      </NotificationProvider>
    </AmplitudeProvider>
  );
}


export default App;