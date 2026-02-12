import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConstructionView from './components/ConstructionView';
import DocumentView from './components/DocumentView';
import UploadView from './components/UploadView';
import SearchView from './components/SearchView';
import ServiceDocumentsPage from './components/ServiceDocumentsPage';
import ServiceDocumentsCategoryPage from './components/ServiceDocumentsCategoryPage';
import ServiceDetailPage from './components/ServiceDetailPage';
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/Login';
import { CookieConsent } from './components/CookieConsent';
import { AmplitudeProvider } from './providers/AmplitudeProvider';
import AdminDocumentManager from './components/AdminDocumentManager';
import { useAuth } from './hooks/useAuth';

function App() {
  const location = useLocation();
  const { user, loading } = useAuth();

  console.log('App.tsx: Rendering with ->', { hasUser: !!user, loading, pathname: location.pathname });

  // Determinar la vista activa basada en la ruta actual
  const getActiveView = () => {
    const path = location.pathname;
    if (path.includes('/constructions') || path === '/') return 'constructions';
    return 'constructions';
  };

  const [activeView, setActiveView] = useState(getActiveView());

  // Ocultar sidebar en rutas de servicios/documentos y admin
  const shouldShowSidebar = !location.pathname.includes('/servicios/') && !location.pathname.includes('/admin');

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    console.log('App.tsx: Auth loading - showing loading state');
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  // si no hay usuario → mostramos login
  if (!user) {
    console.log('App.tsx: No user - showing login');
    return (
      <NotificationProvider>
        <Login />
      </NotificationProvider>
    );
  }

  console.log('App.tsx: Normal route - showing main layout with ConstructionView');
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
              <Route path="/admin" element={<AdminDocumentManager />} />
              <Route
                path="/detail/:serviceId"
                element={<ServiceDetailPage />}
              />
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