import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import CreateCompanyModal from './CreateCompanyModal';
import CreateUserModal from './CreateUserModal';

interface Construction {
  id: string;
  name: string;
  [key: string]: any; // Para permitir otras columnas que descubramos
}

interface Document {
  id: string;
  service_id: string;
  document_type_id: string;
  link: string | null;
  content_text: string | null;
  documentation_type: {
    name: string;
    category: string;
  };
  services: {
    id: string;
    service_type?: {
      name: string;
    };
  };
  isVirtual?: boolean; // Para documentos que no existen aún
}

export default function AdminDocumentManager() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [selectedConstruction, setSelectedConstruction] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [serviceDocuments, setServiceDocuments] = useState<Record<string, Document[]>>({});
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  useEffect(() => {
    console.log('🔄 useEffect ejecutado - isAdmin:', isAdmin, 'authLoading:', authLoading);
    if (isAdmin && !authLoading) {
      console.log('✅ Usuario es admin, cargando obras...');
      loadConstructions();
    } else if (!authLoading) {
      console.log('❌ Usuario no es admin o no está autenticado');
    }
  }, [isAdmin, authLoading]);

  // Función para filtrar construcciones según el término de búsqueda
  const filteredConstructions = constructions.filter(construction => {
    if (!searchTerm.trim()) return true; // Si no hay término de búsqueda, mostrar todas
    
    const searchLower = searchTerm.toLowerCase();
    const name = construction.name || '';
    
    // Buscar en el nombre y en cualquier otro campo de texto que pueda existir
    return (
      name.toLowerCase().includes(searchLower) ||
      (construction.address && construction.address.toLowerCase().includes(searchLower)) ||
      (construction.location && construction.location.toLowerCase().includes(searchLower)) ||
      (construction.id && construction.id.toString().toLowerCase().includes(searchLower))
    );
  });

  const loadConstructions = async () => {
    console.log('🔍 Iniciando carga de obras...');
    try {
      // Primero intentamos obtener todas las columnas disponibles
      console.log('📡 Haciendo consulta SELECT * para ver estructura...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('construction')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error en consulta de muestra:', sampleError);
        console.log('🔍 Intentando solo con id, name...');
      } else if (sampleData && sampleData.length > 0) {
        console.log('🔍 Columnas disponibles:', Object.keys(sampleData[0]));
        console.log('📋 Datos de muestra:', sampleData[0]);
      } else {
        console.log('⚠️ No hay datos en la tabla construction');
      }

      // Ahora cargamos solo las columnas básicas
      console.log('📡 Cargando lista completa de obras...');
      const { data: constructions, error: constructionError } = await supabase
        .from('construction')
        .select('id, name')
        .limit(50);

      console.log('📊 Resultado de la consulta:', { constructions, constructionError });

      if (constructionError) {
        console.error('❌ Error SQL:', constructionError);
        alert(`Error SQL: ${constructionError.message}\nCode: ${constructionError.code}\nDetails: ${constructionError.details}`);
        throw constructionError;
      }
      
      console.log('✅ Obras cargadas:', constructions?.length);
      console.log('📋 Lista de obras:', constructions);
      
      if (!constructions || constructions.length === 0) {
        console.log('⚠️ La consulta no devolvió ninguna obra');
        alert('No se encontraron obras en la base de datos. ¿Existe la tabla construction?');
      }
      
      setConstructions(constructions || []);
    } catch (error: any) {
      console.error('💥 Error cargando obras:', error);
      alert(`Error cargando obras: ${error.message || error}`);
    }
  };

  const loadDocuments = async (constructionId: string) => {
    setLoading(true);
    try {
      console.log('Cargando documentos para obra:', constructionId);
      
      // Obtener servicios de esta construcción con información del tipo
      const { data: servicesList, error: servicesError } = await supabase
        .from('services')
        .select(`
          id, 
          type_id,
          service_type!inner(name)
        `)
        .eq('construction_id', constructionId);

      if (servicesError) {
        console.error('Error cargando servicios:', servicesError);
        throw servicesError;
      }

      console.log('Servicios encontrados:', servicesList?.length);

      if (!servicesList?.length) {
        setServices([]);
        setServiceDocuments({});
        return;
      }

      setServices(servicesList);

      // Obtener todos los documentos requeridos para estos tipos de servicio
      const serviceTypeIds = servicesList.map(s => s.type_id);
      
      const { data: requiredDocs, error: reqError } = await supabase
        .from('service_required_document')
        .select(`
          id,
          service_type_id,
          document_type_id,
          documentation_type(
            name,
            category
          )
        `)
        .in('service_type_id', serviceTypeIds);

      if (reqError) {
        console.error('Error cargando documentos requeridos:', reqError);
        throw reqError;
      }

      console.log('Documentos requeridos encontrados:', requiredDocs?.length);
      console.log('Estructura de requiredDocs[0]:', requiredDocs?.[0]);
      console.log('Tipo de documentation_type:', typeof requiredDocs?.[0]?.documentation_type, requiredDocs?.[0]?.documentation_type);
      
      // Verificar si documentation_type viene como array o como objeto
      if (requiredDocs && requiredDocs.length > 0) {
        const firstDoc = requiredDocs[0];
        console.log('🔍 Análisis del documentation_type:');
        console.log('- Es array?', Array.isArray(firstDoc.documentation_type));
        console.log('- Contenido:', firstDoc.documentation_type);
        if (firstDoc.documentation_type) {
          const docType = Array.isArray(firstDoc.documentation_type) ? firstDoc.documentation_type[0] : firstDoc.documentation_type;
          console.log('- Name:', docType?.name);
        }
      }

      // Obtener documentos ya subidos
      const { data: uploadedDocs } = await supabase
        .from('documents')
        .select(`
          id,
          service_id,
          document_type_id,
          link,
          content_text
        `)
        .in('service_id', servicesList.map(s => s.id));

      // Crear un mapa de documentos subidos por service_id y document_type_id
      const uploadedDocsMap = new Map();
      uploadedDocs?.forEach(doc => {
        const key = `${doc.service_id}-${doc.document_type_id}`;
        uploadedDocsMap.set(key, doc);
      });

      // Organizar documentos por servicio
      const documentsByService: Record<string, Document[]> = {};
      
      servicesList.forEach(service => {
        const serviceDocuments: Document[] = [];
        
        requiredDocs?.forEach(reqDoc => {
          if (reqDoc.service_type_id === service.type_id) {
            const key = `${service.id}-${reqDoc.document_type_id}`;
            const uploadedDoc = uploadedDocsMap.get(key);
            
            // Extraer el documentation_type correctamente
            let docType = { name: 'Documento', category: 'General' };
            if (reqDoc.documentation_type) {
              if (Array.isArray(reqDoc.documentation_type)) {
                // Si es un array, tomar el primer elemento
                docType = reqDoc.documentation_type[0] || docType;
              } else {
                // Si es un objeto directo
                docType = reqDoc.documentation_type;
              }
            }
            
            serviceDocuments.push({
              id: uploadedDoc?.id || `virtual-${service.id}-${reqDoc.document_type_id}`,
              service_id: service.id,
              document_type_id: reqDoc.document_type_id,
              link: uploadedDoc?.link || null,
              content_text: uploadedDoc?.content_text || null,
              documentation_type: docType,
              services: { id: service.id },
              isVirtual: !uploadedDoc
            });
          }
        });

        // Agrupar documentos del servicio por categoría
        const groupedByCategory = serviceDocuments
          .filter(doc => doc.documentation_type && doc.documentation_type.category)
          .reduce((acc: Record<string, Document[]>, doc) => {
            const categoryName = doc.documentation_type.category;
            if (!acc[categoryName]) {
              acc[categoryName] = [];
            }
            acc[categoryName].push(doc);
            return acc;
          }, {});

        // Convertir a array con información de categoría
        const categorizedDocs: Document[] = [];
        Object.entries(groupedByCategory).forEach(([categoryName, docs]) => {
          docs.forEach(doc => {
            categorizedDocs.push({
              ...doc,
              categoryName // Añadir nombre de categoría para mostrar
            } as any);
          });
        });

        documentsByService[service.id] = categorizedDocs;
      });

      console.log('Documentos organizados por servicio:', documentsByService);
      setServiceDocuments(documentsByService);

    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocumentStatus = async (documentId: string, currentStatus: boolean) => {
    setSaving(true);
    let createdDocumentId: string | null = null;
    
    try {
      // Si es un documento virtual (que no existe), necesitamos crearlo
      if (documentId.startsWith('virtual-')) {
        const [, serviceId, documentTypeId] = documentId.split('-');
        
        if (currentStatus) {
          // No debería pasar, pero por seguridad
          return;
        }

        // Crear nuevo documento
        console.log('🆕 Creando nuevo documento:', {
          service_id: serviceId,
          document_type_id: documentTypeId,
          document_status_id: 3
        });
        
        const { data: newDocData, error } = await supabase
          .from('documents')
          .insert({
            service_id: serviceId,
            document_type_id: documentTypeId,
            link: 'DOCUMENTO_MARCADO_COMO_SUBIDO',
            document_status_id: 3, // Estado "aprobado/aportado"
            content_text: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select(); // Agregar select para ver el resultado

        if (error) {
          console.error('❌ Error creando documento:', error);
          throw error;
        }
        
        console.log('✅ Documento creado exitosamente:', newDocData);
        createdDocumentId = newDocData?.[0]?.id;
        
      } else {
        // Documento existente - actualizar o limpiar
        const newStatus = currentStatus ? null : 'DOCUMENTO_MARCADO_COMO_SUBIDO';
        const newDocumentStatusId = currentStatus ? null : 3; // Estado "aprobado/aportado"

        console.log('🔄 Actualizando documento existente:', {
          documentId,
          currentStatus,
          newStatus,
          newDocumentStatusId
        });

        const { data: updatedData, error } = await supabase
          .from('documents')
          .update({
            link: newStatus,
            document_status_id: newDocumentStatusId,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
          .select(); // Agregar select para ver el resultado

        if (error) {
          console.error('❌ Error actualizando documento:', error);
          throw error;
        }
        
        console.log('✅ Documento actualizado exitosamente:', updatedData);
      }
      
      console.log('✅ Documento actualizado:', documentId);
      
      // Verificar que el documento se guardó correctamente
      const finalDocumentId = documentId.startsWith('virtual-') ? createdDocumentId : documentId;
      
      if (finalDocumentId) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('documents')
          .select('id, document_type_id, document_status_id, link, service_id')
          .eq('id', finalDocumentId)
          .single();
          
        if (!verifyError && verifyData) {
          console.log('🔍 Verificación del documento guardado:', verifyData);
        } else {
          console.error('❌ Error verificando documento:', verifyError);
        }
      }
      
      if (selectedConstruction) {
        await loadDocuments(selectedConstruction);
      }

    } catch (error: any) {
      console.error('Error actualizando documento:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getFilteredDocuments = (docs: Document[]) => {
    switch (filter) {
      case 'uploaded':
        return docs.filter(doc => doc.link && doc.link.trim() !== '');
      case 'pending':
        return docs.filter(doc => !doc.link || doc.link.trim() === '');
      default:
        return docs;
    }
  };

  const toggleServiceExpanded = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const getTotalDocuments = () => {
    return Object.values(serviceDocuments).flat().length;
  };

  const getUploadedDocuments = () => {
    return Object.values(serviceDocuments).flat().filter(doc => doc.link && doc.link.trim() !== '').length;
  };

  // Verificar permisos
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Verificando permisos...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Debes iniciar sesión para acceder</div>
          <a href="/login" className="text-blue-600 hover:underline">Ir a Login</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">
            🚫 No tienes permisos de administrador
          </div>
          <div className="text-gray-600 mb-4">
            Usuario: {user.email}
          </div>
          <div className="text-xs text-gray-500 mb-4">
            Rol actual: {user.user_metadata?.role || 'user'}
          </div>
          <a href="/" className="text-blue-600 hover:underline">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">
            📋 Panel de Administración
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateCompanyModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              🏢 Crear Inmobiliaria
            </button>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              👤 Crear Usuario
            </button>
            <div className="text-sm text-gray-600">
              👤 Admin: {user.email}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800">
            <strong>⚠️ Panel de administrador:</strong> Puedes marcar documentos como "subidos" 
            sin subir archivos físicos.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Lista de obras */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Obras ({filteredConstructions.length} de {constructions.length})</h2>
            
            {/* Campo de búsqueda */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {constructions.length === 0 ? (
              <div className="text-center text-gray-500 py-8 border rounded-lg">
                <div className="mb-2">📋</div>
                <div>No se encontraron obras</div>
                <div className="text-xs mt-2">
                  Verifica la consola para más detalles
                </div>
              </div>
            ) : filteredConstructions.length === 0 ? (
              <div className="text-center text-gray-500 py-8 border rounded-lg">
                <div className="mb-2">🔍</div>
                <div>No se encontraron obras que coincidan</div>
                <div className="text-xs mt-2">
                  Intenta con otros términos de búsqueda
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredConstructions.map((construction) => (
                  <div
                    key={construction.id}
                    onClick={() => {
                      setSelectedConstruction(construction.id);
                      loadDocuments(construction.id);
                    }}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 text-sm ${
                      selectedConstruction === construction.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{construction.name}</div>
                    <div className="text-xs text-gray-600">
                      ID: {construction.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel de servicios y documentos */}
          <div className="lg:col-span-3">
            {selectedConstruction ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    Servicios y Documentos ({getUploadedDocuments()}/{getTotalDocuments()})
                  </h2>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilter('uploaded')}
                      className={`px-3 py-1 text-sm rounded ${filter === 'uploaded' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                    >
                      Subidos
                    </button>
                    <button
                      onClick={() => setFilter('pending')}
                      className={`px-3 py-1 text-sm rounded ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
                    >
                      Pendientes
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">Cargando documentos...</div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => {
                      const serviceDocs = serviceDocuments[service.id] || [];
                      const filteredDocs = getFilteredDocuments(serviceDocs);
                      
                      if (filteredDocs.length === 0 && filter !== 'all') return null;

                      const uploadedCount = serviceDocs.filter(doc => doc.link && doc.link.trim() !== '').length;
                      const totalCount = serviceDocs.length;
                      const isExpanded = expandedServices.has(service.id);

                      return (
                        <div key={service.id} className="border rounded-lg">
                          <div 
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleServiceExpanded(service.id)}
                          >
                            <div>
                              <h3 className="font-semibold text-lg flex items-center">
                                <span className="mr-2">
                                  {isExpanded ? '📂' : '📁'}
                                </span>
                                {service.service_type.name}
                              </h3>
                              <div className="text-sm text-gray-600">
                                {uploadedCount}/{totalCount} documentos marcados como subidos
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${
                                uploadedCount === totalCount ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {uploadedCount === totalCount ? '✅ Completo' : '📋 Pendiente'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isExpanded ? 'Ocultar' : 'Mostrar'} documentos
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t bg-gray-50 p-4">
                              <div className="space-y-2">
                                {(filter === 'all' ? serviceDocs : filteredDocs).map((doc) => {
                              const isUploaded = doc.link && doc.link.trim() !== '';
                              
                              // Validar que el documento tenga la información necesaria
                              if (!doc.documentation_type || !doc.documentation_type.name) {
                                console.warn('Documento sin tipo de documentación:', doc);
                                return null;
                              }
                              
                              return (
                                <div
                                  key={doc.id}
                                  className={`flex justify-between items-center p-3 border rounded ${
                                    isUploaded ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{doc.documentation_type.name}</div>
                                    <div className="text-xs text-gray-600">
                                      Servicio ID: {doc.service_id}
                                    </div>
                                    {isUploaded && (
                                      <div className="text-xs text-green-600 mt-1">
                                        ✅ Marcado como subido
                                      </div>
                                    )}
                                    {doc.isVirtual && (
                                      <div className="text-xs text-orange-600 mt-1">
                                        📋 Documento requerido (pendiente)
                                      </div>
                                    )}
                                  </div>
                                  
                                  <button
                                    onClick={() => toggleDocumentStatus(doc.id, Boolean(isUploaded))}
                                    disabled={saving}
                                    className={`px-4 py-2 text-sm rounded font-medium disabled:opacity-50 ${
                                      isUploaded
                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                        : 'bg-green-500 text-white hover:bg-green-600'
                                    }`}
                                  >
                                    {saving ? '⏳' : (isUploaded ? '❌ Marcar pendiente' : '✅ Marcar subido')}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {serviceDocs.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                              No hay documentos requeridos para este servicio
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {services.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No hay servicios en esta obra
                  </div>
                )}
              </div>
            )}
          </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                👈 Selecciona una obra para ver sus servicios y documentos
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal para crear inmobiliaria */}
      <CreateCompanyModal
        isOpen={showCreateCompanyModal}
        onClose={() => setShowCreateCompanyModal(false)}
        onSuccess={(companyId) => {
          console.log('✅ Nueva inmobiliaria creada con ID:', companyId);
        }}
      />
      
      {/* Modal para crear usuario */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={(userId) => {
          console.log('✅ Nuevo usuario creado con ID:', userId);
        }}
      />
    </div>
  );
}