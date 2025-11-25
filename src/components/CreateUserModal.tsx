import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';

interface Company {
  id: number;
  name: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (userId: string) => void;
}

export default function CreateUserModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const { showNotification } = useNotification();

  // Cargar compañías cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('company')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
      console.log('📋 Compañías cargadas:', data?.length);
    } catch (error: any) {
      console.error('❌ Error cargando compañías:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'No se pudieron cargar las compañías'
      });
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Filtrar compañías basado en la búsqueda
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleCompanySelect = (company: Company) => {
    setSelectedCompanyId(company.id);
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
  };

  const validateForm = () => {
    if (!email.trim()) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'El email es obligatorio'
      });
      return false;
    }

    if (!email.includes('@')) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'Ingrese un email válido'
      });
      return false;
    }

    if (!password || password.length < 6) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'La contraseña debe tener al menos 6 caracteres'
      });
      return false;
    }

    if (!selectedCompanyId) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'Debe seleccionar una compañía'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      console.log('👤 Creando usuario:', { email, companyId: selectedCompanyId });
      
      // Llamar a la función Netlify para crear el usuario
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          username: email.trim(), // Usar email como username por ahora
          companyId: selectedCompanyId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error creating user');
      }

      const result = await response.json();
      console.log('✅ Usuario creado exitosamente:', result);

      showNotification({
        type: 'success',
        title: 'Usuario creado',
        body: `El usuario "${email}" se ha creado correctamente y asignado a la compañía seleccionada`
      });

      // Resetear formulario
      setEmail('');
      setPassword('');
      setSelectedCompanyId(null);
      setCompanySearch('');
      setShowCompanyDropdown(false);
      
      // Llamar callback de éxito si existe
      onSuccess?.(result.user);
      
      // Cerrar modal
      onClose();

    } catch (error: any) {
      console.error('💥 Error creando usuario:', error);
      
      showNotification({
        type: 'error',
        title: 'Error al crear usuario',
        body: error.message || 'Ha ocurrido un error inesperado'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setPassword('');
      setSelectedCompanyId(null);
      setCompanySearch('');
      setShowCompanyDropdown(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            👤 Crear Nuevo Usuario
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Usuario) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              placeholder="usuario@empresa.com"
              autoFocus
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          {/* Selector de Compañía */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compañía <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setSelectedCompanyId(null);
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                disabled={loading || loadingCompanies}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                placeholder="Buscar compañía..."
              />
              
              {showCompanyDropdown && !loadingCompanies && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCompanies.length === 0 ? (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      {companySearch ? 'No se encontraron compañías' : 'No hay compañías disponibles'}
                    </div>
                  ) : (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => handleCompanySelect(company)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="text-sm font-medium">{company.name}</div>
                        <div className="text-xs text-gray-500">ID: {company.id}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              
              {loadingCompanies && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-3 py-2 text-gray-500 text-sm">
                    <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Cargando compañías...
                  </div>
                </div>
              )}
            </div>
            {selectedCompanyId && (
              <div className="text-xs text-green-600 mt-1">
                ✅ Compañía seleccionada (ID: {selectedCompanyId})
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCompanyId || !email || !password}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creando...
                </>
              ) : (
                '✅ Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}