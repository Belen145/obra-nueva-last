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

function App() {
  const location = useLocation();

  // Determinar la vista activa basada en la ruta actual
  const getActiveView = () => {
    const path = location.pathname;
    if (path.includes('/constructions') || path === '/') return 'constructions';
    return 'constructions';
  };

  const [activeView, setActiveView] = useState(getActiveView());

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<ConstructionView />} />
          <Route path="/constructions" element={<ConstructionView />} />
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
    </div>
  );
}

export default App;
