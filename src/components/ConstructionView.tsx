import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Eye,
  CircleCheck as CheckCircle,
  Circle as XCircle,
} from 'lucide-react';
import { useConstructions } from '../hooks/useConstructions';
import { useServicesCache } from '../hooks/useServicesCache';
import { useAuth } from '../hooks/useAuth';
import ClientDocumentManagementWizard from './ClientDocumentManagementWizard';
import ServiceStatusManagement from './ServiceStatusManagement';
import { ServiceIncidenceModal } from './ServiceIncidenceModal';
import ConstructionWizard from './ConstructionWizard';
import { DocumentUploadModalBlue } from './DocumentUploadModalBlue';
import { DatePickerDropdown } from './DatePickerDropdown';
import { supabase, Construction } from '../lib/supabase';
import { trackEvent } from '../lib/amplitude';

/**
 * Vista principal de obras de construcción y sus serviciosssssss.
 * Permite filtrar, buscar, expandir y gestionar servicios asociados a cada obra.
 */
export default function ConstructionView() {
  const navigate = useNavigate();
  // Opciones de estado para el filtro
  const statusOptions = [
    { label: 'Todos', value: '' },
    { label: 'En progreso', value: 'En progreso' },
    { label: 'Finalizada', value: 'Finalizada' },
    { label: 'Cancelada', value: 'Cancelada' }
  ];

  // Hooks personalizados para datos de obras y servicios
  const { isAdmin, companyId, loading: authLoading } = useAuth();
  const { constructions, loading, error, refetch } = useConstructions(
    isAdmin ? null : companyId, 
    authLoading
  );
  const { getServices, getServicesCacheState, clearCache } = useServicesCache();
  
  // Estados locales
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [expandedConstruction, setExpandedConstruction] = useState<
    number | null
  >(null);
  const [serviceTypeStatuses, setServiceTypeStatuses] = useState<any[]>([]);
  const [, setStatusesLoading] = useState<boolean>(false);
  // Usar useRef para evitar recargas cuando se cambia de pestaña
  const loadingServicesRef = useRef<Set<number>>(new Set());
  const lastLoadTimeRef = useRef<Map<number, number>>(new Map());
  const [clientManagementWizard, setClientManagementWizard] = useState<{
    isOpen: boolean;
    service: any;
  } | null>(null);
  const [statusManagementView, setStatusManagementView] = useState<{
    isOpen: boolean;
    construction: Construction;
  } | null>(null);
  const [showIncidenceModal, setShowIncidenceModal] = useState<{
    isOpen: boolean;
    service: any;
    construction?: { id: number; name: string };
  } | null>(null);

  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState<{
    isOpen: boolean;
    service: any;
  } | null>(null);
  const [modalServiceTypeStatuses, setModalServiceTypeStatuses] = useState<
    any[]
  >([]);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [openServiceMenu, setOpenServiceMenu] = useState<number | null>(null);

  // Track page view en Amplitude
  useEffect(() => {
    trackEvent('Page Viewed', {
      page_title: 'Tabla principal obras'
    })
  }, []);

  // Cargar los estados del tipo de servicio para el modal
  useEffect(() => {
    const fetchStatuses = async () => {
      if (showDocumentUploadModal?.service?.type_id) {
        const { data, error } = await supabase
          .from('service_type_status')
          .select('*, services_status (id, name)')
          .or(
            `service_type_id.is.null,service_type_id.eq.${showDocumentUploadModal.service.type_id}`
          )
          .order('orden');
        if (!error && data) setModalServiceTypeStatuses(data);
        else setModalServiceTypeStatuses([]);
      } else {
        setModalServiceTypeStatuses([]);
      }
    };
    if (showDocumentUploadModal?.isOpen) fetchStatuses();
  }, [showDocumentUploadModal]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isStatusDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setIsStatusDropdownOpen(false);
      }
    };

    // Pequeño delay para evitar que el click de apertura cierre inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

  // Cerrar menú de servicios al hacer click fuera
  useEffect(() => {
    if (openServiceMenu === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-service-menu]')) {
        setOpenServiceMenu(null);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openServiceMenu]);

  // ...existing code...

  // Renderizado principal
  // (el return principal está al final del archivo, no aquí)


  // Filtrado de obras según búsqueda y estado
  const filteredConstructions = constructions.filter((construction: any) => {
    const matchesSearch =
      construction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      construction.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      construction.responsible
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === '' ||
      construction.construction_status?.name === statusFilter;
    return matchesSearch && matchesStatus;
  });


  /**
   * Expande o colapsa la fila de servicios de una obra y carga los servicios si es necesario.
   */
  const toggleConstructionExpansion = async (constructionId: number) => {
    if (expandedConstruction === constructionId) {
      setExpandedConstruction(null);
      return;
    }

    setExpandedConstruction(constructionId);
    
    // Verificar si ya se cargaron recientemente (menos de 30 segundos)
    const lastLoadTime = lastLoadTimeRef.current.get(constructionId) || 0;
    const now = Date.now();
    const isRecentlyLoaded = now - lastLoadTime < 30000; // 30 segundos
    
    // Verificar si ya están en caché
    const cacheState = getServicesCacheState(constructionId);
    const hasValidCache = cacheState.loaded && cacheState.data.length >= 0;
    
    // Solo cargar si no están en caché, no se cargaron recientemente, y no están cargando
    if (!hasValidCache && !isRecentlyLoaded && !loadingServicesRef.current.has(constructionId)) {
      loadingServicesRef.current.add(constructionId);
      lastLoadTimeRef.current.set(constructionId, now);
      
      try {
        await getServices(constructionId);
      } finally {
        loadingServicesRef.current.delete(constructionId);
      }
    }

    // Track page view en Amplitude
    trackEvent('Open Details Button Pressed', {
      page_title: 'Tabla principal obras',
      new_construction_id: constructionId
    });
  };

  /**
   * Fila expandible que muestra los servicios asociados a una obra en formato tabla.
   */
  const ServiceRow = ({ constructionId, construction }: { constructionId: number; construction: any }) => {
    const statusesFetchedRef = useRef<Set<number>>(new Set());

    const cacheState = getServicesCacheState(constructionId);
    const {
      data: constructionServices,
      loading: servicesLoading,
      error: servicesError,
    } = cacheState;

    if (expandedConstruction !== constructionId) return null;

    // Cargar estados de servicio cuando se expande
    useEffect(() => {
      if (
        expandedConstruction === constructionId &&
        serviceTypeStatuses.length === 0
      ) {
        fetchServiceTypeStatuses();
      }
    }, [expandedConstruction, constructionId]);

    const fetchServiceTypeStatuses = async () => {
      if (statusesFetchedRef.current.has(constructionId)) return;
      try {
        setStatusesLoading(true);
        statusesFetchedRef.current.add(constructionId);
        const { data, error } = await supabase
          .from('service_type_status')
          .select(`*, services_status (id, name)`)
          .order('orden');
        if (error) throw error;
        setServiceTypeStatuses(data || []);
      } catch (err) {
        console.error('Error fetching service type statuses:', err);
      } finally {
        setStatusesLoading(false);
      }
    };

    /**
     * Obtener la información de seguimiento según el estado del servicio.
     */
    const getTrackingInfo = (service: any) => {
      if (service.services_status?.is_final === true) {
        return {
          icon: 'info',
          iconColor: 'text-zen-grey-400',
          title: 'Has eliminado este suministro',
          description: 'Para cualquier duda, escríbenos a atencion.cliente@zenovapro.com',
          bg: 'bg-zen-grey-100',
          border: 'border-zen-grey-200',
          hasBox: true,
        };
      }
      if (service.status_id === 1 || service.services_status?.requires_user_action) {
        return {
          icon: 'alert-triangle',
          iconColor: 'text-zen-warning-600',
          title: 'Documentación pendiente',
          description: 'Haz clic en el botón "Subir documentos"',
          bg: 'bg-zen-warning-50',
          border: 'border-zen-warning-300',
          hasBox: true,
        };
      }
      if (service.status_id === 19) {
        return {
          icon: 'info',
          iconColor: 'text-zen-blue-600',
          title: 'Documentos en revisión',
          description: 'Si son correctos, la gestión avanzará automáticamente.',
          bg: 'bg-zen-blue-50',
          border: 'border-zen-blue-200',
          hasBox: true,
        };
      }
      // Observaciones/comentario - SIN caja
      if (service.comment || service.services_status?.is_incidence) {
        return {
          icon: 'chat-dots',
          iconColor: 'text-zen-grey-500',
          title: 'Observaciones',
          description: service.comment || 'Hay una incidencia que requiere tu atención.',
          bg: '',
          border: '',
          hasBox: false,
        };
      }
      // Default sin observaciones
      return {
        icon: 'chat-dots',
        iconColor: 'text-zen-grey-400',
        title: 'Observaciones',
        description: 'Sin observaciones',
        bg: '',
        border: '',
        hasBox: false,
      };
    };

    /**
     * Obtener icono según el tipo de servicio.
     * Todos los iconos son azules con fondo verde según diseño Figma.
     */
    const getServiceIcon = (serviceName: string | undefined): string => {
      const name = serviceName?.toLowerCase() || '';
      
      // Luz
      if (name.includes('luz') && name.includes('obra')) return 'luz-obra';
      if (name.includes('luz') && name.includes('definitiva')) return 'luz-definitiva';
      // Agua
      if (name.includes('agua') && name.includes('obra')) return 'agua-obra';
      if (name.includes('agua') && name.includes('pci')) return 'shield';
      if (name.includes('agua') && name.includes('definitiva')) return 'agua-definitiva';
      // Gas
      if (name.includes('gas')) return 'gas';
      // Telecomunicaciones
      if (name.includes('telecomunicacion')) return 'telecom';
      
      return 'services';
    };

    /**
     * Estilo del badge de estado - siempre gris según diseño Figma.
     */
    const statusStyle = { text: 'text-zen-grey-600', bg: 'bg-zen-grey-50', border: 'border-zen-grey-200' };

    return (
      <tr className="w-full">
        <td colSpan={8} className="p-0 w-full flex">
          <div className="bg-white rounded-b-lg overflow-hidden mt-[-8px] mb-1 w-full flex flex-col border border-zen-grey-100">
            {servicesLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Cargando servicios...</span>
              </div>
            ) : servicesError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  <div>
                    <h5 className="text-sm font-medium text-red-800">Error al cargar servicios</h5>
                    <p className="text-sm text-red-700 mt-1">{servicesError}</p>
                  </div>
                </div>
              </div>
            ) : constructionServices.length > 0 ? (
              <>
                {/* Header de la tabla de servicios */}
                <div className="grid grid-cols-[2fr_1.5fr_3fr_2fr_2fr_40px] items-center py-4 px-4 border-b border-zen-grey-200 w-full bg-zen-grey-50 rounded-t-lg gap-4">
                  <span className="text-sm font-normal text-zen-grey-600">Tipo de suministro</span>
                  <span className="text-sm font-normal text-zen-grey-600">Estado actual</span>
                  <span className="text-sm font-normal text-zen-grey-600">Información de seguimiento</span>
                  <span className="text-sm font-normal text-zen-grey-600">Acción necesaria</span>
                  <span className="text-sm font-normal text-zen-grey-600 text-right">Detalle de suministro</span>
                  <span className="pl-6"></span>
                </div>

                {/* Filas de servicios */}
                {constructionServices.map((service) => {
                  const isFinal = service.services_status?.is_final === true;
                  const isIncidence = service.services_status?.is_incidence === true;
                  const trackingInfo = getTrackingInfo(service);
                  const isExpanded = expandedComments.has(service.id);
                  const serviceIcon = getServiceIcon(service.service_type?.name);

                  return (
                    <div
                      key={service.id}
                      className={`grid grid-cols-[2fr_1.5fr_3fr_2fr_2fr_40px] items-center py-6 px-4 border-b border-zen-grey-200 last:border-b-0 transition-colors hover:bg-zen-grey-50 w-full bg-white gap-4 ${isFinal ? 'opacity-60' : ''}`}
                    >
                      {/* Col 1: Tipo de suministro */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-zen-green-100 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-zen-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <use href={`/icons.svg#${serviceIcon}`} />
                          </svg>
                        </div>
                        <span className={`text-base font-medium ${isFinal ? 'text-zen-grey-400 line-through' : 'text-zen-grey-950'}`}>
                          {service.service_type?.name || `Servicio ${service.type_id}`}
                        </span>
                      </div>

                      {/* Col 2: Estado actual */}
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-normal border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {service.services_status?.name || 'Sin estado'}
                        </span>
                      </div>

                      {/* Col 3: Información de seguimiento */}
                      <div className="min-w-0">
                        {trackingInfo.hasBox ? (
                          <div className={`inline-flex items-start gap-2 p-3 rounded border ${trackingInfo.bg} ${trackingInfo.border}`}>
                            <svg className={`w-4 h-4 ${trackingInfo.iconColor} shrink-0`} viewBox="0 0 16 16" fill="currentColor">
                              <use href={`/icons.svg#${trackingInfo.icon}`} />
                            </svg>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-semibold leading-tight text-zen-grey-800">{trackingInfo.title}</p>
                              <p className="text-sm leading-tight text-zen-grey-600">{trackingInfo.description}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <svg className={`w-4 h-4 ${trackingInfo.iconColor} shrink-0`} viewBox="0 0 16 16" fill="currentColor">
                              <use href={`/icons.svg#${trackingInfo.icon}`} />
                            </svg>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-medium leading-tight text-zen-grey-700">{trackingInfo.title}</p>
                              <p className={`text-sm leading-tight text-zen-grey-500 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                {trackingInfo.description}
                              </p>
                              {trackingInfo.description && trackingInfo.description.length > 80 && (
                                <button
                                  onClick={() => {
                                    setExpandedComments(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(service.id)) newSet.delete(service.id);
                                      else newSet.add(service.id);
                                      return newSet;
                                    });
                                  }}
                                  className="text-xs text-zen-blue-500 font-medium mt-1 hover:text-zen-blue-600 inline-flex items-center gap-1"
                                >
                                  {isExpanded ? 'Leer menos' : 'Leer más'}
                                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                    <use href={`/icons.svg#arrow-small`} />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Col 4: Acción necesaria */}
                      <div>
                        {isFinal ? (
                          <span className="text-sm text-zen-grey-400 italic">—</span>
                        ) : isIncidence ? (
                          <button
                            onClick={() => {
                              setShowIncidenceModal({ 
                                isOpen: true, 
                                service,
                                construction: { id: construction.id, name: construction.name }
                              });
                              trackEvent('Solve Incidence Pressed', {
                                page_title: 'Tabla principal obras',
                                service_type: service.id,
                                new_construction_id: constructionId,
                                new_construction_state: service.services_status?.name || undefined
                              });
                            }}
                            className="px-4 py-2.5 flex items-center gap-2 bg-zen-error-deafult text-zen-error-900 rounded text-sm font-semibold hover:bg-zen-error-300 transition-colors whitespace-nowrap"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <use href="/icons.svg#wrench" />
                            </svg>
                            Resolver incidencia
                          </button>
                        ) : service.services_status?.requires_user_action ? (
                          <button
                            onClick={() => {
                              setShowDocumentUploadModal({ isOpen: true, service });
                              trackEvent('Document Upload Flow Opened', {
                                page_title: 'Tabla principal obras',
                                service_type: service.id,
                                new_construction_id: constructionId,
                                new_construction_state: service.services_status?.name || undefined
                              });
                            }}
                            className="px-4 py-2.5 flex items-center gap-2 bg-zen-blue-50 text-zen-blue-500 rounded text-sm font-semibold hover:bg-zen-blue-100 transition-colors whitespace-nowrap"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                              <use href="/icons.svg#plus" />
                            </svg>
                            Subir documentos
                          </button>
                        ) : service.status_id === 1 ? (
                          <button
                            onClick={() => {
                              navigate(`/servicios/${service.id}/documentos`);
                              trackEvent('Document Upload Flow Opened', {
                                page_title: 'Tabla principal obras',
                                type: service.id,
                                new_construction_id: constructionId
                              });
                            }}
                            className="px-4 py-2.5 flex items-center gap-2 bg-zen-blue-50 text-zen-blue-500 rounded text-sm font-semibold hover:bg-zen-blue-100 transition-colors whitespace-nowrap"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                              <use href="/icons.svg#plus" />
                            </svg>
                            Subir documentos
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-zen-grey-500 whitespace-nowrap">
                            <CheckCircle className="w-5 h-5 text-zen-green-600" />
                            Sin acciones
                          </span>
                        )}
                      </div>

                      {/* Col 5: Detalle suministro */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            navigate(`/detail/${service.id}`);
                            trackEvent('Service Detail Pressed', {
                              page_title: 'Tabla principal obras',
                              service_id: service.id,
                              new_construction_id: constructionId
                            });
                          }}
                          disabled={isFinal}
                          className={`px-4 py-2.5 flex items-center gap-2 rounded text-sm font-semibold border whitespace-nowrap transition-colors ${
                            isFinal
                              ? 'bg-zen-grey-50 border-zen-grey-200 text-zen-grey-400 cursor-not-allowed'
                              : 'bg-white border-zen-grey-300 text-zen-grey-700 hover:bg-zen-grey-100 hover:border-zen-grey-400'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          Detalle de suministro
                        </button>
                      </div>

                      {/* Col 6: Menú de opciones (3 puntos) */}
                      <div className="flex justify-center relative pl-6" data-service-menu>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenServiceMenu(openServiceMenu === service.id ? null : service.id);
                          }}
                          className="p-1 hover:bg-zen-grey-100 rounded transition-colors"
                        >
                          <svg className="w-6 h-6 text-zen-grey-600" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="3" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13" r="1.5" />
                          </svg>
                        </button>
                        {openServiceMenu === service.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-zen-grey-200 py-1 z-50 min-w-[200px]">
                            <button
                              onClick={() => {
                                console.log('Cliente realiza gestión para servicio:', service.id);
                                setOpenServiceMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-zen-grey-700 hover:bg-zen-grey-50 transition-colors"
                            >
                              Cliente realiza la gestión
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">No hay servicios registrados para esta obra.</p>
                <p className="text-xs text-gray-400 mt-1">ID de construcción: {constructionId}</p>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Renderizado principal
  if (loading) {
    console.log('🔄 ConstructionView: En estado LOADING ->', { authLoading, loading, companyId });
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4">Cargando obras...</div>
      </div>
    );
  }

  if (error) {
    console.log('❌ ConstructionView: En estado ERROR ->', { error, authLoading, loading, companyId });
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar las obras
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🏗️ ConstructionView: Before main render ->', {
    authLoading,
    loading,
    constructionsCount: constructions.length,
    error,
    isAdmin,
    companyId
  });

  console.log('✅ ConstructionView: Renderizando contenido principal');

  return (
    <div className="p-6 pt-20 bg-zen-grey-0">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-semibold text-zen-grey-950 leading-[1.12]">
            Obra de construcción
          </h2>
           <p className="text-[19px] font-normal text-zen-grey-700 leading-[1.35] w-[464.5px]">
            Gestiona y consulta todos tus proyectos de construcción
          </p>
        </div>
        <button
          onClick={() => {
            setShowWizard(true)
            trackEvent('New Construction Pressed', {page_title: 'Tabla principal obras'});
          }}
           className="flex items-center gap-2 px-4 py-[10px] bg-zen-grey-25 text-zen-grey-950 rounded border border-zen-grey-950 hover:bg-zen-grey-100 transition-colors text-sm font-semibold leading-[1.25]"
        >
         <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <use href="/icons.svg#plus" />
          </svg>
          Crear Nueva Obra
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex gap-4 items-center pb-6">
        <div className="flex flex-col gap-2 pr-6 shrink-0 w-[470px]">
          <div className="bg-gradient-to-r from-[rgba(176,189,255,0)] from-[-5.95%] to-[#85a3ff] px-[12px] py-[8px] rounded-lg">
            <div className="flex flex-col gap-1 w-full">
              <div className="flex gap-2 items-center w-full">
                <div className="flex gap-2 items-center px-4 py-3 bg-white rounded border-2 border-[#85a3ff] grow">
                  <input
                    type="text"
                    placeholder="Busca por nombre de obra o ubicación"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="grow text-[16px] font-normal text-zen-grey-600 leading-[1.47] outline-none border-none"
                  />
                  <svg className="w-6 h-6 shrink-0 text-zen-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <use href="/icons.svg#search" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-6 h-10 items-center shrink-0">
          <div className="flex gap-6 items-center shrink-0">
            <div className="flex items-center justify-center rounded shrink-0 relative" data-dropdown-container>
              <div className="flex gap-2 items-center shrink-0">
                <div className="flex flex-col font-semibold justify-center text-zen-grey-700 text-sm leading-[1.25]">
                  <p>Estado</p>
                </div>
                <div
                  className="flex gap-2 items-center justify-center p-2 bg-zen-green-100 rounded h-6 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                >
                  <span className="flex flex-col font-normal justify-center text-zen-green-950 text-sm leading-[1.25]">
                    {statusFilter || 'Todos'}
                  </span>
                </div>
              </div>
              <div
                className="flex gap-2 items-center justify-center overflow-clip px-4 py-[10px] rounded-[1000px] shrink-0 w-10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                }}
              >
                <svg className="w-5 h-5 shrink-0 text-zen-grey-500" viewBox="0 0 16 16" fill="currentColor">
                  <use href="/icons.svg#caret-down" />
                </svg>
              </div>

              {/* Dropdown Menu */}
              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-zen-grey-200 rounded-lg shadow-lg z-50 min-w-[-webkit-fill-available]">
                  {statusOptions.map((option) => (
                    <div
                      key={option.value}
                      className="px-4 py-2 text-sm text-zen-grey-950 hover:bg-zen-grey-50 cursor-pointer"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setIsStatusDropdownOpen(false);
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Construcciones */}
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex flex-col gap-2">
              {/* Headers */}
              <div className="bg-zen-grey-50 flex items-center rounded py-4 w-full">
                <div className="min-w-[32px] flex-shrink-0"></div>
                <div className="px-2 min-w-[124px] flex-shrink-0 text-sm font-medium text-zen-grey-950">ID de obra</div>
                <div className="px-2 min-w-[222px] flex-1 text-sm font-medium text-zen-grey-950">Nombre obra</div>
                <div className="px-2 min-w-[253px] flex-1 text-sm font-medium text-zen-grey-950">Ubicación</div>
                <div className="px-2 min-w-[193px] flex-1 text-sm font-medium text-zen-grey-950">Responsable</div>
                <div className="px-2 min-w-[134px] flex-1 text-sm font-medium text-zen-grey-950">Viviendas</div>
                <div className="px-2 min-w-[170px] flex-1 text-sm font-medium text-zen-grey-950">Fecha finalización</div>
                <div className="px-2 min-w-[150px] flex-1 text-sm font-medium text-zen-grey-950">Estado</div>
                <div className="px-2 max-w-[135px] flex-1 text-sm font-medium text-zen-grey-950">Detalle</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col gap-2">
                <table className="w-full">
                  <thead className="hidden">
                    <tr>
                      <th></th>
                      <th>ID de obra</th>
                      <th>Nombre obra</th>
                      <th>Ubicación</th>
                      <th>Responsable</th>
                      <th>Viviendas</th>
                      <th>Fecha finalización</th>
                      <th>Estado</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="flex flex-col gap-2">
              {filteredConstructions.map((construction) => (
                <React.Fragment key={construction.id}>
                  <tr className="bg-zen-grey-50 flex items-center rounded-lg py-3 w-full">
                    {/* Botón expandir */}
                    <td className="min-w-[32px] flex-shrink-0 flex justify-center items-center">
                      <button
                        onClick={() =>
                          toggleConstructionExpansion(construction.id)
                        }
                        className=""
                      >
                        <svg
                          className={`w-5 h-5 text-zen-grey-700 transition-transform ${expandedConstruction === construction.id ? '' : '-rotate-90'}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <use href="/icons.svg#chevron-table" />
                        </svg>
                      </button>
                    </td>

                    {/* ID de obra */}
                    <td className="px-2 min-w-[124px] flex-shrink-0 flex items-center">
                      <span className="text-sm text-zen-grey-700 leading-[1.25]">
                        {construction.id}
                      </span>
                    </td>

                    {/* Nombre obra */}
                    <td className="px-2 min-w-[222px] flex-1 flex items-center">
                      <span className="text-base text-zen-grey-700 leading-[1.47]">
                        {construction.name}
                      </span>
                    </td>

                    {/* Ubicación */}
                    <td className="px-2 min-w-[253px] flex-1 flex items-center">
                      <span className="text-base text-zen-grey-700 leading-[1.25]">
                        {construction.address || 'No especificada'}
                      </span>
                    </td>

                    {/* Responsable */}
                    <td className="px-2 min-w-[193px] flex-1 flex items-center">
                      <span className="text-base text-zen-grey-700 leading-[1.25]">
                        {construction.responsible || 'No asignado'}
                      </span>
                    </td>

                    {/* Viviendas */}
                    <td className="px-2 min-w-[134px] flex-1 flex items-center">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-zen-grey-700" viewBox="0 0 23 19" fill="currentColor">
                          <use href="/icons.svg#buildings" />
                        </svg>
                        <span className="text-base text-zen-grey-700">
                          {construction.number_homes || '0'}
                        </span>
                      </div>
                    </td>

                    {/* Fecha finalización */}
                    <td className="px-2 min-w-[170px] flex-1 flex items-center">
                      <DatePickerDropdown
                        value={construction.finish_date ? construction.finish_date.slice(0, 10) : null}
                        onChange={async (newDate) => {
                          await supabase
                            .from('construction')
                            .update({ finish_date: newDate })
                            .eq('id', construction.id);
                          refetch();
                        }}
                        constructionId={construction.id}
                      />
                    </td>

                    {/* Estado */}
                    <td className="px-2 min-w-[150px] flex-1 flex items-center">
                      <span className="text-sm text-zen-grey-700">
                        {construction.construction_status?.name || 'Sin estado'}
                      </span>
                    </td>

                    {/* Detalle */}
                    <td className="px-2 max-w-[135px] flex-1 flex items-center">
                      <button
                        onClick={() => toggleConstructionExpansion(construction.id)}
                        className="bg-zen-blue-50 text-zen-blue-500 px-3 py-2 rounded flex items-center gap-2 text-xs font-semibold min-w-[max-content]"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 11 13" fill="currentColor">
                          <use href="/icons.svg#plus" />
                        </svg>
                        Abrir detalle
                      </button>
                    </td>
                  </tr>
                  {/* Fila expandida de servicios, solo si está expandida */}
                  {expandedConstruction === construction.id && (
                    <ServiceRow constructionId={construction.id} construction={construction} />
                  )}
                </React.Fragment>
              ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {filteredConstructions.length === 0 && (
            <div className="text-center py-12 bg-zen-grey-50 rounded-lg">
              <Building2 className="w-12 h-12 text-zen-grey-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zen-grey-900 mb-2">
                No se encontraron obras
              </h3>
              <p className="text-zen-grey-600 mb-4">
                {searchTerm || statusFilter
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando tu primera obra de construcción'}
              </p>
              {!searchTerm && !statusFilter && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center px-4 py-2 bg-zen-blue-500 text-white rounded-lg hover:bg-zen-blue-600 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primera Obra
                </button>
              )}
            </div>
          )}
      </div>

      {/* Wizard para agregar nueva obra */}
      {showWizard && (
        <ConstructionWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(constructionId) => {
            setShowWizard(false);
            clearCache(constructionId);
            refetch();
          }}
        />
      )}

      {/* Client Management Wizard */}
      {clientManagementWizard && (
        <ClientDocumentManagementWizard
          service={clientManagementWizard.service}
          onClose={() => setClientManagementWizard(null)}
          onSuccess={(constructionId) => {
            setClientManagementWizard(null);
            clearCache(constructionId);
            refetch();
           
          }}
        />
      )}

      {/* Service Status Management */}
      {statusManagementView && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <ServiceStatusManagement
            construction={statusManagementView.construction}
            onBack={() => setStatusManagementView(null)}
          />
        </div>
      )}

      {/* Service Incidence Modal */}
      {showIncidenceModal && (
        <ServiceIncidenceModal
          isOpen={showIncidenceModal.isOpen}
          onClose={() => setShowIncidenceModal(null)}
          onSuccess={() => {
            setShowIncidenceModal(null);
            // Limpiar caché y recargar datos
            clearCache();
            refetch();
          }}
          service={showIncidenceModal.service}
          construction={showIncidenceModal.construction}
        />
      )}
      {/* Document Upload Modal Blue */}
      {showDocumentUploadModal && (
        <DocumentUploadModalBlue
          isOpen={showDocumentUploadModal.isOpen}
          onClose={() => setShowDocumentUploadModal(null)}
          onSuccess={() => {
            setShowDocumentUploadModal(null);
            clearCache();
            refetch();
          }}
          service={showDocumentUploadModal.service}
          serviceTypeStatuses={modalServiceTypeStatuses}
        />
      )}
    </div>
  );
}
