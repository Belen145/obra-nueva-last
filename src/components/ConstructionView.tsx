import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Calendar,
  User,
  Plus,
  Search,
  ListFilter as Filter,
  CreditCard as Edit,
  Eye,
  MoreVertical,
  CircleCheck as CheckCircle,
  Clock,
  CircleAlert as AlertCircle,
  Circle as XCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Check,
} from 'lucide-react';
import { useConstructions } from '../hooks/useConstructions';
import { useServicesCache } from '../hooks/useServicesCache';
import ClientDocumentManagementWizard from './ClientDocumentManagementWizard';
import ServiceStatusManagement from './ServiceStatusManagement';
import { ServiceIncidenceModal } from './ServiceIncidenceModal';
import ConstructionWizard from './ConstructionWizard';
import { DocumentUploadModalBlue } from './DocumentUploadModalBlue';
import { supabase, Construction } from '../lib/supabase';

/**
 * Vista principal de obras de construcción y sus servicios.
 * Permite filtrar, buscar, expandir y gestionar servicios asociados a cada obra.
 */
export default function ConstructionView() {
  const navigate = useNavigate();
  // Hooks personalizados para datos de obras y servicios
  const { constructions, loading, error, refetch } = useConstructions();
  const { getServices, getServicesCacheState, clearCache } = useServicesCache();
  // Estados locales
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [expandedConstruction, setExpandedConstruction] = useState<
    number | null
  >(null);
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
  } | null>(null);

  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState<{
    isOpen: boolean;
    service: any;
  } | null>(null);
  const [modalServiceTypeStatuses, setModalServiceTypeStatuses] = useState<
    any[]
  >([]);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

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

  // ...existing code...

  // Renderizado principal
  // (el return principal está al final del archivo, no aquí)

  // Helpers de estado visual para mostrar iconos y colores según el estado
  /**
   * Devuelve el icono correspondiente al estado de la obra.
   */
  const getStatusIcon = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'en progreso':
      case 'en proceso':
      case 'activo':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'planificado':
      case 'programado':
        return <Calendar className="w-5 h-5 text-yellow-500" />;
      case 'suspendido':
      case 'pausado':
      case 'detenido':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };
  /**
   * Devuelve la clase de color para el badge del estado.
   */
  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return 'bg-green-100 text-green-800';
      case 'en progreso':
      case 'en proceso':
      case 'activo':
        return 'bg-blue-100 text-blue-800';
      case 'planificado':
      case 'programado':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspendido':
      case 'pausado':
      case 'detenido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
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
   * Formatea una fecha a formato legible en español.
   */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Expande o colapsa la fila de servicios de una obra y carga los servicios si es necesario.
   */
  const toggleConstructionExpansion = async (constructionId: number) => {
    if (expandedConstruction === constructionId) {
      setExpandedConstruction(null);
    } else {
      setExpandedConstruction(constructionId);
      // Cargar servicios cuando se expande
      console.log(
        '🔄 Expanding construction and loading services for:',
        constructionId
      );
      const services = await getServices(constructionId);
      console.log(
        '📋 Services loaded for construction',
        constructionId,
        ':',
        services
      );
    }
  };

  /**
   * Fila expandible que muestra los servicios asociados a una obra.
   */
  const ServiceRow = ({ constructionId, construction }: { constructionId: number; construction: any }) => {
    // Estado para controlar el menú de acciones de cada servicio
    const [openMenuServiceId, setOpenMenuServiceId] = useState<number | null>(
      null
    );
    // Cerrar el menú si se hace click fuera
    useEffect(() => {
      const handleClick = () => setOpenMenuServiceId(null);
      if (openMenuServiceId !== null) {
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
      }
    }, [openMenuServiceId]);
    // Renderiza el bloque de comentarios según el status
    const renderServiceComments = (service: any) => {
      // Banner gris informativo para estados finales
      if (service.services_status?.is_final === true) {
        return (
          <div className="bg-zen-grey-100 border border-zen-grey-300 rounded p-3 flex gap-2">
            <svg className="w-4 h-4 text-zen-grey-400 shrink-0 mt-0.5" viewBox="0 0 13 13" fill="currentColor">
              <use href="/icons.svg#info" />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-zen-grey-700">
                Has eliminado este suministro
              </p>
              <p className="text-sm text-zen-grey-700">
                El suministro ya no está disponible y no podrás gestionarlo. Para cualquier duda, escríbenos a atencion.cliente@zenovapro.com
              </p>
            </div>
          </div>
        );
      }

      if (service.status_id === 1) {
        return (
          <div className="bg-zen-warning-50 border border-zen-warning-400 rounded p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-zen-warning-700 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-zen-warning-950">
                Para continuar con la gestión del suministro debes aportar toda la documentación necesaria.
              </p>
              <p className="text-sm text-zen-warning-950">
                Haz clic en el botón "Subir documentos" para cargar los archivos necesarios.
              </p>
            </div>
          </div>
        );
      } else if (service.status_id === 19) {
        return (
          <div className="bg-zen-blue-50 border border-zen-blue-200 rounded p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-zen-blue-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-zen-blue-900">
                Tus documentos están siendo revisados
              </p>
              <p className="text-sm text-zen-blue-700">
                Si todo es correcto, avanzaremos automáticamente con la gestión del suministro
              </p>
            </div>
          </div>
        );
      } else {
        const isExpanded = expandedComments.has(service.id);
        const commentRef = React.useRef<HTMLParagraphElement>(null);
        const [showReadMore, setShowReadMore] = React.useState(false);

        React.useEffect(() => {
          if (commentRef.current) {
            // Verificar si el contenido excede 72px de altura
            setShowReadMore(commentRef.current.scrollHeight > 72);
          }
        }, [service.comment]);

        const toggleCommentExpansion = () => {
          setExpandedComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(service.id)) {
              newSet.delete(service.id);
            } else {
              newSet.add(service.id);
            }
            return newSet;
          });
        };

        return (
          <div className="bg-zen-grey-100 rounded p-3">
            {service.comment ? (
              <div className="flex flex-col gap-2">
                {/* Header con icono ChatDots y título */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-zen-grey-600" viewBox="0 0 16 16" fill="currentColor">
                    <use href="/icons.svg#chat-dots" />
                  </svg>
                  <span className="text-sm font-semibold text-zen-grey-600">Observaciones</span>
                </div>

                {/* Texto del comentario truncado o expandido */}
                <p
                  ref={commentRef}
                  className="text-sm text-zen-grey-600 overflow-hidden"
                  style={{ maxHeight: isExpanded ? 'none' : '72px' }}
                >
                  {service.comment}
                </p>

                {/* Botón "Leer más/menos" alineado a la derecha - solo si el texto excede 72px */}
                {showReadMore && (
                  <div className="flex justify-end">
                    <button
                      onClick={toggleCommentExpansion}
                      className="text-sm text-zen-blue-500 font-semibold flex items-center gap-1 hover:text-zen-blue-600 transition-colors"
                    >
                      {isExpanded ? 'Leer menos' : 'Leer más'}
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <use href="/icons.svg#arrow-small" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zen-grey-500 italic">
                No hay observaciones para este servicio
              </p>
            )}
          </div>
        );
      }
    };

    // Renderiza el banner de estado (incidencia/finalizado)
    const renderStatusBanner = (service: any) => {
      const isFinalStatus = service.services_status?.is_final === true;
      if (isFinalStatus) {
        return (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Trámite Finalizado
            </h3>
            <p className="text-red-700 font-medium">
              {service.services_status?.name}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Este servicio ha finalizado
            </p>
          </div>
        );
      }
      return null;
    };
    const cacheState = getServicesCacheState(constructionId);
    const {
      data: constructionServices,
      loading: servicesLoading,
      error: servicesError,
    } = cacheState;
    const [serviceTypeStatuses, setServiceTypeStatuses] = useState<any[]>([]);
    const [statusesLoading, setStatusesLoading] = useState<boolean>(false);

    console.log('🔍 ServiceRow render for construction', constructionId, ':', {
      expanded: expandedConstruction === constructionId,
      servicesCount: constructionServices.length,
      loading: servicesLoading,
      error: servicesError,
      cacheLoaded: cacheState.loaded,
    });

    // Verificar si algún servicio está en estado de incidencia

    if (expandedConstruction !== constructionId) return null;

    // Si no hay caché cargado y no está cargando, forzar carga
    if (
      !cacheState.loaded &&
      !servicesLoading &&
      expandedConstruction === constructionId
    ) {
      console.log(
        '🔄 No cache loaded for expanded construction, forcing reload...'
      );
      getServices(constructionId);
    }

    // Cargar estados de servicio cuando se expande
    useEffect(() => {
      if (
        expandedConstruction === constructionId &&
        serviceTypeStatuses.length === 0
      ) {
        fetchServiceTypeStatuses();
      }
    }, [expandedConstruction, constructionId]);

    /**
     * Carga los posibles estados de los tipos de servicio desde la base de datos.
     */
    const fetchServiceTypeStatuses = async () => {
      try {
        setStatusesLoading(true);
        const { data, error } = await supabase
          .from('service_type_status')
          .select(
            `
            *,
            services_status (
              id,
              name
            )
          `
          )
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
     * Devuelve los estados posibles para un tipo de servicio.
     */
    const getServiceTypeStatusesForService = (serviceTypeId: number) => {
      // Incluir estados comunes (service_type_id = null) y específicos del service_type
      return serviceTypeStatuses
        .filter(
          (sts) =>
            sts.service_type_id === null ||
            sts.service_type_id === serviceTypeId
        )
        .sort((a, b) => a.orden - b.orden);
    };

    /**
     * Devuelve el índice del estado actual en la lista de estados posibles.
     */
    const getCurrentServiceTypeStatusIndex = (
      statusId: number,
      serviceTypeId: number
    ) => {
      const serviceStatuses = getServiceTypeStatusesForService(serviceTypeId);
      return serviceStatuses.findIndex(
        (sts: any) => sts.services_status.id === statusId
      );
    };

    return (
      <tr className="desplegable w-full">
        <div className="mt-[-20px]">
          <div className="bg-zen-grey-50 py-6 rounded-lg p-[18px] ">
            {/* <h4 className="text-sm font-medium text-zen-grey-950 flex items-center mb-4">
              <Settings className="w-4 h-4 mr-2" />
              Servicios de la Obra
            </h4> */}

            {servicesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Cargando servicios...
                </span>
              </div>
            ) : servicesError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  <div>
                    <h5 className="text-sm font-medium text-red-800">
                      Error al cargar servicios
                    </h5>
                    <p className="text-sm text-red-700 mt-1">{servicesError}</p>
                  </div>
                </div>
              </div>
            ) : constructionServices.length > 0 ? (
              <div className="space-y-4">
                {constructionServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-zen-grey-25 border border-zen-grey-300 rounded-lg overflow-hidden"
                  >
                    {/* Header de la card con ID de construcción */}
                    <div className="bg-zen-grey-25 border-b border-zen-grey-300 px-4 py-3 flex items-center justify-between">
                      <div className="flex flex-col gap-0">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-zen-grey-500" viewBox="0 0 12 13" fill="currentColor">
                            <use href="/icons.svg#services" />
                          </svg>
                          <span className="text-sm text-zen-grey-600">Obra Nueva</span>
                        </div>
                        <h3 className="text-[19px] font-semibold text-zen-grey-950 leading-[1.35]">
                          ID {construction.id}
                        </h3>
                      </div>
                      {/* Menú de acciones (tres puntos) */}
                      <div className="relative">
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuServiceId(service.id);
                          }}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuServiceId === service.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                              className={`block w-full text-left px-4 py-2 text-sm rounded-lg ${
                                service.status_id !== 1
                                  ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                if (service.status_id === 1) {
                                  setClientManagementWizard({
                                    isOpen: true,
                                    service,
                                  });
                                  setOpenMenuServiceId(null);
                                }
                              }}
                              disabled={service.status_id !== 1}
                            >
                              Cliente realiza la gestión
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contenido de la card con el servicio */}
                    <div className="bg-zen-grey-25 p-4 flex">
                      {/* Sección izquierda: Info del servicio */}
                      <div className="flex-1 px-2">
                        {/* Nombre del servicio */}
                        <div className="bg-zen-grey-50 rounded px-2 py-1 inline-flex items-center gap-1 mb-2">
                          <h4 className="text-base font-semibold text-zen-grey-950">
                            {service.service_type?.name || `Servicio ${service.type_id}`}
                          </h4>
                        </div>

                    {/* Timeline Progress */}
                    {!statusesLoading &&
                      serviceTypeStatuses.length > 0 &&
                      (() => {
                        // Debug logs
                        console.log('🔍 Service debug:', {
                          serviceId: service.id,
                          statusId: service.status_id,
                          statusName: service.services_status?.name,
                          isFinal: service.services_status?.is_final,
                          fullStatus: service.services_status,
                          isIncidence: service.services_status?.is_incidence,
                        });

                        // LOG COMPLETO DE DATOS DEL SERVICIO
                        console.log('📊 === DATOS COMPLETOS DEL SERVICIO ===');
                        console.log('🆔 Service ID:', service.id);
                        console.log(
                          '🏗️ Construction ID:',
                          service.construction_id
                        );
                        console.log('🔧 Type ID:', service.type_id);
                        console.log('📋 Status ID:', service.status_id);
                        console.log('💬 Comment:', service.comment);
                        console.log('🏷️ Service Type:', service.service_type);
                        console.log(
                          '📊 Services Status:',
                          service.services_status
                        );
                        console.log('🔍 Status Details:', {
                          id: service.services_status?.id,
                          name: service.services_status?.name,
                          is_final: service.services_status?.is_final,
                          is_incidence: service.services_status?.is_incidence,
                          requires_user_action:
                            service.services_status?.requires_user_action,
                        });
                        console.log(
                          '📦 Objeto completo del servicio:',
                          JSON.stringify(service, null, 2)
                        );
                        console.log('📊 === FIN DATOS DEL SERVICIO ===');
                        // Check if current status is final
                        const isFinalStatus =
                          service.services_status?.is_final === true;
                        if (isFinalStatus) {
                          return (
                            <div>
                              {/* Left Section: Service name + status tag */}
                              <div className="flex gap-2 items-start"></div>
                            </div>
                          );
                        }
                        // Si es incidencia, pintar el tracker en rojo pero el estado activo es el anterior
                        const isIncidence =
                          service.services_status?.is_incidence === true;
                        let trackerStatusId = service.status_id;
                        if (isIncidence) {
                          // Si existe previous_status_id y es válido, úsalo como estado activo en el tracker
                          if (service.previous_status_id) {
                            trackerStatusId = service.previous_status_id;
                          }
                        }
                        return (
                          <div>
                            {/* Timeline Section - Full Width */}
                            <div className="w-full py-2">
                              {/* Progress Bar - Diseño Figma */}
                              <div className="relative w-full">
                                {(() => {
                                  const allSteps = getServiceTypeStatusesForService(service.type_id);
                                  const currentIndex = getCurrentServiceTypeStatusIndex(
                                    trackerStatusId,
                                    service.type_id
                                  );
                                  const totalSteps = allSteps.length;

                                  // Determinar si mostrar barra de progreso y su color
                                  const isSinGestionar = service.services_status?.name === 'Sin Gestionar';
                                  const isEnRevision = service.services_status?.name === 'En Revisión';
                                  const isActivated = service.services_status?.name === 'Activado';
                                  const noActiveStep = currentIndex === -1;
                                  // const isActivated = service.services_status?.is_active === true;

                                  let showProgressBar = true;
                                  let progressBarColor = '#FEB55D'; // Naranja por defecto

                                  // Determinar color de la barra de progreso
                                  if (isSinGestionar) {
                                    progressBarColor = '#d0d3dd'; // Rosa para Sin gestionar
                                  } else if (isEnRevision || noActiveStep) {
                                    showProgressBar = false; // No mostrar barra para En Revisión o sin step activo
                                  } else if (isActivated) {
                                    progressBarColor = '#78EC95'; // Verde para activado
                                  } else if (isIncidence) {
                                    progressBarColor = '#F97066'; // Rojo para incidencia
                                  }

                                  // Calcular el porcentaje de progreso (hasta el step activo incluido)
                                  let progressPercentage = '0%';
                                  if (showProgressBar && totalSteps > 1) {
                                    if (currentIndex === 0) {
                                      // Si el primer step está activo, la barra solo rodea ese círculo
                                      progressPercentage = '16px';
                                    } else if (currentIndex === totalSteps - 1) {
                                      // Si el último step está activo, la barra llega al 100%
                                      progressPercentage = '100%';
                                    } else {
                                      // Para los demás casos, calcular para llegar hasta rodear el círculo activo
                                      const percentage = (currentIndex / (totalSteps - 1)) * 100;
                                      progressPercentage = `calc(${percentage}% + 12px)`;
                                    }
                                  }

                                  return (
                                    <>
                                      {/* Contenedor de la barra base y barra de progreso */}
                                      <div className="relative h-4 mb-1">
                                        {/* Barra base gris - rodea completamente los círculos */}
                                        <div
                                          className="absolute top-0 left-0 right-0 h-4 px-2"
                                          style={{
                                            backgroundColor: '#F2F3F7',
                                            borderRadius: '1000px',
                                          }}
                                        />

                                        {/* Barra de progreso de color */}
                                        {showProgressBar && (
                                          <div
                                            className="absolute top-0 h-4 transition-all duration-500"
                                            style={{
                                              width: progressPercentage,
                                              backgroundColor: progressBarColor,
                                              borderRadius: '50px',
                                            }}
                                          />
                                        )}

                                        {/* Círculos de los steps posicionados absolutamente */}
                                        <div className="absolute top-0 left-1 right-1 h-4 flex items-center justify-between">
                                          {allSteps.map((statusConfig, index) => {
                                            const status = statusConfig.services_status;
                                            const isActive = status.id === trackerStatusId;
                                            const isPassed = index < currentIndex;

                                            // Determinar si el círculo está activado (pasado o activo)
                                            const isActivatedCircle = isPassed || isActive;

                                            // Color del círculo
                                            let circleColor = '#D0D3DD'; // Gris claro para no activados
                                            if (isActivatedCircle && showProgressBar) {
                                              circleColor = progressBarColor;
                                            } else if (isActivatedCircle && !showProgressBar) {
                                              circleColor = '#D0D3DD';
                                            }

                                            return (
                                              <div
                                                key={status.id}
                                                className="rounded-full flex items-center justify-center shrink-0"
                                                style={{
                                                  width: '8px',
                                                  height: '8px',
                                                  backgroundColor: circleColor,
                                                }}
                                              >
                                                {/* Solo mostrar círculo blanco interior si está activado */}
                                                {isActivatedCircle && (
                                                  <div
                                                    className="rounded-full"
                                                    style={{
                                                      width: '8px',
                                                      height: '8px',
                                                      backgroundColor: '#FCFCFC'
                                                    }}
                                                  />
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Etiquetas de los estados alineadas con los círculos */}
                                      <div className="flex w-full justify-between">
                                        {allSteps.map((statusConfig, index) => {
                                          const status = statusConfig.services_status;
                                          const isActive = status.id === trackerStatusId;
                                          const isFirst = index === 0;
                                          const isLast = index === totalSteps - 1;

                                          return (
                                            <div
                                              key={status.id}
                                              className="flex items-center"
                                              style={{
                                                width: '16px',
                                                flexShrink: 0,
                                                justifyContent: isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center',
                                              }}
                                            >
                                              <p
                                                className={`text-xs leading-[1.35] whitespace-pre-line ${
                                                  isActive
                                                    ? 'font-semibold text-zen-grey-950'
                                                    : 'font-normal text-zen-grey-600'
                                                }`}
                                                style={{
                                                  textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                                                  minWidth: 'max-content',
                                        
                                                }}
                                              >
                                                {status.name}
                                              </p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                        {/* Current Status Badge */}
                        <div className={`bg-zen-grey-50 rounded px-2 py-1 inline-flex items-center gap-2 border border-zen-grey-200 ${service.services_status?.is_final ? 'mt-0' : 'mt-8'}`}>
                          <span className="text-xs text-zen-grey-600">
                            {service.services_status?.name || 'Sin estado'}
                          </span>
                        </div>
                      </div>

                      {/* Separador vertical */}
                      <div className="w-px bg-zen-grey-200 self-stretch"></div>

                      {/* Sección derecha - Comentarios y botones */}
                      <div className="w-[390px] px-4 flex flex-col justify-between">
                      <div className="flex-1">
                        {renderServiceComments(service)}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 items-end">
                        {/* Botón Subir documentos si requiere acción del usuario */}
                        {service.services_status?.requires_user_action &&
                          !service.services_status?.is_final && (
                            <button
                              onClick={() =>
                                setShowDocumentUploadModal({
                                  isOpen: true,
                                  service: service,
                                })
                              }
                              className="w-[177px] px-4 py-2.5 bg-zen-blue-50 text-zen-blue-500 text-sm font-semibold rounded flex items-center justify-center gap-2 hover:bg-zen-blue-100 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <use href="/icons.svg#plus" />
                              </svg>
                              Subir documentos
                            </button>
                          )}
                        {service.status_id === 1 && (
                            <button
                              onClick={() =>
                                navigate(`/servicios/${service.id}/documentos`)
                              }
                              className="w-[177px] px-4 py-2.5 bg-zen-blue-50 text-zen-blue-500 text-sm font-semibold rounded flex items-center justify-center gap-2 hover:bg-zen-blue-100 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <use href="/icons.svg#plus" />
                              </svg>
                              Subir documentos
                            </button>
                        )}

                        {/* Resolve Incidence Button - Only for incidence states */}
                        {service.services_status?.is_incidence && (
                            <button
                              onClick={() =>
                                setShowIncidenceModal({
                                  isOpen: true,
                                  service: service,
                                })
                              }
                              className="px-4 py-2 bg-zen-error-500 text-white text-sm font-semibold rounded hover:bg-zen-error-600 transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                              <AlertCircle className="w-4 h-4" />
                              Resolver Incidencia
                            </button>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  No hay servicios registrados para esta obra.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ID de construcción: {constructionId}
                </p>
              </div>
            )}
          </div>
        </div>
      </tr>
    );
  };

  // Renderizado principal
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="p-6 pt-20 bg-zen-grey-0">
      <div className="flex justify-between items-start pr-8 mb-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-semibold text-zen-grey-950 leading-[1.12]">
            Obra de construcción
          </h2>
           <p className="text-[19px] font-normal text-zen-grey-700 leading-[1.35] w-[464.5px]">
            Gestiona y consulta todos tus proyectos de construcción
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
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
                  <div
                    className="px-4 py-2 text-sm text-zen-grey-950 hover:bg-zen-grey-50 cursor-pointer"
                    onClick={() => {
                      setStatusFilter('');
                      setIsStatusDropdownOpen(false);
                    }}
                  >
                    Todos
                  </div>
                  {Array.from(
                    new Set(
                      constructions
                        .map((c) => c.construction_status?.name)
                        .filter(Boolean)
                    )
                  ).map((status) => (
                    <div
                      key={status}
                      className="px-4 py-2 text-sm text-zen-grey-950 hover:bg-zen-grey-50 cursor-pointer"
                      onClick={() => {
                        setStatusFilter(status);
                        setIsStatusDropdownOpen(false);
                      }}
                    >
                      {status}
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
                <div className="px-2 min-w-[222px] flex-1 text-sm font-medium text-zen-grey-950">Nombre obra</div>
                <div className="px-2 min-w-[253px] flex-1 text-sm font-medium text-zen-grey-950">Ubicación</div>
                <div className="px-2 min-w-[193px] flex-1 text-sm font-medium text-zen-grey-950">Responsable</div>
                <div className="px-2 min-w-[134px] flex-1 text-sm font-medium text-zen-grey-950">Viviendas</div>
                <div className="px-2 min-w-[170px] flex-1 text-sm font-medium text-zen-grey-950">Fecha finalización</div>
                <div className="px-2 min-w-[169px] flex-1 text-sm font-medium text-zen-grey-950">Estado</div>
                <div className="px-2 max-w-[120px] flex-1 text-sm font-medium text-zen-grey-950">Detalle</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col gap-2">
                <table className="w-full">
                  <thead className="hidden">
                    <tr>
                      <th></th>
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
                          {construction.num_viviendas || '0'}
                        </span>
                      </div>
                    </td>

                    {/* Fecha finalización */}
                    <td className="px-2 min-w-[170px] flex-1 flex items-center">
                      <div className="flex gap-1 items-center relative">
                        <div className="bg-white rounded px-2 py-2 min-w-[108px] flex items-center justify-center">
                          <span className="text-sm text-zen-grey-700">
                            {construction.finish_date
                              ? new Date(construction.finish_date).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : 'DD/MM/AAAA'}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => {
                              const dateInput = document.getElementById(`date-${construction.id}`) as HTMLInputElement;
                              dateInput?.showPicker?.();
                            }}
                            className="bg-zen-blue-50 rounded-full p-1 shrink-0 w-6 h-6 flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 text-zen-blue-500" viewBox="0 0 16 16" fill="currentColor">
                              <use href="/icons.svg#pencil" />
                            </svg>
                          </button>
                          <input
                            type="date"
                            id={`date-${construction.id}`}
                            className="absolute top-full left-0 mt-1 opacity-0 pointer-events-none"
                            style={{ width: '1px', height: '1px' }}
                            value={
                              construction.finish_date
                                ? construction.finish_date.slice(0, 10)
                                : ''
                            }
                            onChange={async (e) => {
                              const newDate = e.target.value;
                              await supabase
                                .from('construction')
                                .update({ finish_date: newDate })
                                .eq('id', construction.id);
                              refetch();
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-2 min-w-[169px] flex-1 flex items-center">
                      <span className="text-sm text-zen-grey-700">
                        {construction.construction_status?.name || 'Sin estado'}
                      </span>
                    </td>

                    {/* Detalle */}
                    <td className="px-2 max-w-[120px] flex-1 flex items-center">
                      <button
                        onClick={() => toggleConstructionExpansion(construction.id)}
                        className="bg-zen-blue-50 text-zen-blue-500 px-3 py-2 rounded flex items-center gap-2 text-xs font-semibold"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 11 13" fill="currentColor">
                          <use href="/icons.svg#document" />
                        </svg>
                        Acceder
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
            console.log(
              '🎯 ClientDocumentManagementWizard onSuccess called with constructionId:',
              constructionId
            );
            setClientManagementWizard(null);
            console.log('🧹 Clearing cache for construction:', constructionId);
            clearCache(constructionId);
            console.log('🔄 Calling refetch to reload constructions...');
            refetch();
            console.log('✅ Cache cleared and refetch called');
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
            console.log('✅ Incidencia resuelta exitosamente');
            setShowIncidenceModal(null);
            // Limpiar caché y recargar datos
            clearCache();
            refetch();
          }}
          service={showIncidenceModal.service}
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
