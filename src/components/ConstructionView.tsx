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
  const ServiceRow = ({ constructionId }: { constructionId: number }) => {
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
      if (service.status_id === 1) {
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Para iniciar la gestión del suministro es obligatorio subir la
                documentación
              </h3>
              <p className="text-blue-700 mb-4">
                Haz clic en el botón "Subir documentos" para cargar los archivos
                necesarios
              </p>
            </div>
          </div>
        );
      } else if (service.status_id === 19) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                Tus documentos están siendo revisados
              </h3>
              <p className="text-yellow-700 mb-4">
                Si todo es correcto, avanzaremos automáticamente con la gestión
                del suministro
              </p>
            </div>
          </div>
        );
      } else {
        return (
          <>
            <div className="flex items-center mb-3">
              <h5 className="text-sm font-medium text-gray-700">
                Observaciones
              </h5>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 h-32 overflow-y-auto">
              {service.comment ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {service.comment}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No hay observaciones para este servicio
                </p>
              )}
            </div>
          </>
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
      <tr>
        <td colSpan={7} className="px-6 py-4 bg-gray-50">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Servicios de la Obra
            </h4>

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
              <div className="space-y-6">
                {constructionServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
                  >
                    {/* Service Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Settings className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {service.service_type?.name ||
                                `Servicio ${service.type_id}`}
                            </h4>
                            {service.comment && (
                              <p className="text-sm text-gray-500">
                                {service.comment}
                              </p>
                            )}
                          </div>
                        </div>
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
                            <div className="grid grid-cols-2 gap-6 mb-6">
                              {/* Banner - Left Half */}
                              <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-center">
                                {renderStatusBanner(service)}
                              </div>
                              {/* Comments Section - Right Half */}
                              <div>{renderServiceComments(service)}</div>
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
                          <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* Timeline Section - Left Half */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-700">
                                  Progreso del Servicio
                                </h5>
                                <span className="text-xs text-gray-500">
                                  {getCurrentServiceTypeStatusIndex(
                                    trackerStatusId,
                                    service.type_id
                                  ) + 1}{' '}
                                  de{' '}
                                  {
                                    getServiceTypeStatusesForService(
                                      service.type_id
                                    ).length
                                  }
                                </span>
                              </div>
                              {/* Responsive Horizontal Timeline */}
                              <div className="relative w-full pb-4">
                                {/* Progress Line */}
                                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"></div>
                                <div
                                  className={`absolute top-4 left-0 h-0.5 transition-all duration-500 ${
                                    isIncidence ? 'bg-red-500' : 'bg-blue-500'
                                  }`}
                                  style={{
                                    width: `${
                                      getServiceTypeStatusesForService(
                                        service.type_id
                                      ).length > 0
                                        ? (getCurrentServiceTypeStatusIndex(
                                            trackerStatusId,
                                            service.type_id
                                          ) /
                                            (getServiceTypeStatusesForService(
                                              service.type_id
                                            ).length -
                                              1)) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                                {/* Status Points - Responsive */}
                                <div className="relative flex justify-between w-full">
                                  {getServiceTypeStatusesForService(
                                    service.type_id
                                  ).map((statusConfig, index) => {
                                    const status = statusConfig.services_status;
                                    const isActive =
                                      status.id === trackerStatusId;
                                    const isPassed =
                                      index <
                                      getCurrentServiceTypeStatusIndex(
                                        trackerStatusId,
                                        service.type_id
                                      );
                                    return (
                                      <div
                                        key={status.id}
                                        className="flex flex-col items-center"
                                        style={{
                                          flex: '1',
                                          maxWidth: `${
                                            100 /
                                            getServiceTypeStatusesForService(
                                              service.type_id
                                            ).length
                                          }%`,
                                        }}
                                      >
                                        {/* Status Circle */}
                                        <div
                                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                            isIncidence
                                              ? isActive
                                                ? 'bg-red-500 border-red-500'
                                                : isPassed
                                                ? 'bg-red-300 border-red-300'
                                                : 'bg-white border-gray-300'
                                              : isActive
                                              ? 'bg-blue-500 border-blue-500'
                                              : isPassed
                                              ? 'bg-green-500 border-green-500'
                                              : 'bg-white border-gray-300'
                                          }`}
                                        >
                                          {isPassed ? (
                                            <Check
                                              className={`w-4 h-4 ${
                                                isIncidence
                                                  ? 'text-white'
                                                  : 'text-white'
                                              }`}
                                            />
                                          ) : isActive ? (
                                            <div
                                              className={`w-3 h-3 ${
                                                isIncidence
                                                  ? 'bg-white'
                                                  : 'bg-white'
                                              } rounded-full`}
                                            ></div>
                                          ) : (
                                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                                          )}
                                        </div>
                                        {/* Status Label */}
                                        <div className="mt-2 text-center w-full px-1">
                                          <p
                                            className={`text-xs font-medium ${
                                              isIncidence
                                                ? isActive
                                                  ? 'text-red-600'
                                                  : isPassed
                                                  ? 'text-red-400'
                                                  : 'text-gray-500'
                                                : isActive
                                                ? 'text-blue-600'
                                                : isPassed
                                                ? 'text-green-600'
                                                : 'text-gray-500'
                                            } break-words leading-tight`}
                                          >
                                            {status.name}
                                          </p>
                                          {statusConfig.requires_user_action && (
                                            <p className="text-xs text-orange-500 mt-1 break-words leading-tight">
                                              Acción requerida
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            {/* Comments Section - Right Half */}
                            <div>{renderServiceComments(service)}</div>
                          </div>
                        );
                      })()}

                    {/* Current Status Badge */}
                    <div className="flex items-center justify-start">
                      <div className="flex items-center mr-6">
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${
                            service.services_status?.is_final
                              ? 'bg-red-100 text-red-800'
                              : service.services_status?.name ===
                                'Recopilación De documentación'
                              ? 'bg-yellow-100 text-yellow-800'
                              : service.services_status?.name ===
                                'Cliente realiza la gestión'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {service.service_type?.name ||
                            `Servicio ${service.type_id}`}
                        </span>
                        <span className="ml-3 text-sm text-gray-600">
                          {service.services_status?.name || 'Sin estado'}
                        </span>
                      </div>

                      {/* Botón Subir documentos si requiere acción del usuario */}
                      {service.services_status?.requires_user_action &&
                        !service.services_status?.is_final && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                setShowDocumentUploadModal({
                                  isOpen: true,
                                  service: service,
                                })
                              }
                              className="ml-auto px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                              Subir documentos
                            </button>
                          </div>
                        )}
                      {/* Botón Subir documentos si requiere acción del usuario */}
                      {service.status_id === 1 && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              navigate(`/servicios/${service.id}/documentos`)
                            }
                            className="ml-auto px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            Subir documentos
                          </button>
                        </div>
                      )}

                      {/* Resolve Incidence Button - Only for incidence states */}
                      {service.services_status?.is_incidence && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              setShowIncidenceModal({
                                isOpen: true,
                                service: service,
                              })
                            }
                            className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                          >
                            <AlertCircle className="w-4 h-4 mr-2 inline" />
                            Resolver Incidencia
                          </button>
                        </div>
                      )}
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
        </td>
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Obras de Construcción
          </h2>
          <p className="text-gray-600 mt-1">
            Gestiona y supervisa todos los proyectos de construcción
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Obra
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, dirección o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              {Array.from(
                new Set(
                  constructions
                    .map((c) => c.construction_status?.name)
                    .filter(Boolean)
                )
              ).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <Filter className="w-4 h-4 mr-2" />
              Más Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Construcciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Proyectos ({filteredConstructions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre obra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha finalización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConstructions.map((construction) => (
                <React.Fragment key={construction.id}>
                  <tr className="hover:bg-gray-50 transition-colors duration-200">
                    {/* Nombre obra */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            toggleConstructionExpansion(construction.id)
                          }
                          className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors duration-200"
                        >
                          {expandedConstruction === construction.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <Building2 className="w-8 h-8 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {construction.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Ubicación */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {construction.address || 'No especificada'}
                        </span>
                      </div>
                    </td>
                    {/* Responsable */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {construction.responsible || 'No asignado'}
                        </span>
                      </div>
                    </td>
                    {/* Fecha finalización editable */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="date"
                          className="text-sm text-gray-900 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    </td>
                    {/* Estado */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(
                          construction.construction_status?.name || ''
                        )}
                        <span
                          className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            construction.construction_status?.name || ''
                          )}`}
                        >
                          {construction.construction_status?.name ||
                            'Sin estado'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Fila expandida de servicios, solo si está expandida */}
                  {expandedConstruction === construction.id && (
                    <tr>
                      <td colSpan={5} className="p-0 align-top">
                        <div style={{ width: '100%' }}>
                          <ServiceRow constructionId={construction.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredConstructions.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron obras
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primera obra de construcción'}
            </p>
            {!searchTerm && !statusFilter && (
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
