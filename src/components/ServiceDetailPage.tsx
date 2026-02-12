import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft } from 'lucide-react';
import { ServiceIncidenceModal } from './ServiceIncidenceModal';

interface ServiceTypeStatus {
  id: number;
  orden: number;
  services_status: {
    id: number;
    name: string;
  };
}

interface Service {
  id: number;
  status_id: number;
  previous_status_id?: number;
  type_id: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
  service_type: {
    id: number;
    name: string;
  };
  services_status: {
    id: number;
    name: string;
    is_final?: boolean;
    is_incidence?: boolean;
    requires_user_action?: boolean;
  };
  construction: {
    id: number;
    name: string;
  };
}

export default function ServiceDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  
  const [service, setService] = useState<Service | null>(null);
  const [serviceTypeStatuses, setServiceTypeStatuses] = useState<ServiceTypeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncidenceModal, setShowIncidenceModal] = useState(false);

  // Función para cargar datos del servicio
  const fetchServiceData = useCallback(async () => {
    if (!serviceId) return;
    
    setLoading(true);
    setError(null);
      
      try {
        // Obtener datos del servicio
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select(`
            id, 
            status_id, 
            previous_status_id,
            type_id, 
            comment,
            created_at,
            updated_at,
            service_type (id, name),
            services_status!services_status_id_fkey1 (id, name, is_final, is_incidence, requires_user_action),
            construction (id, name)
          `)
          .eq('id', serviceId)
          .single();

        if (serviceError) throw serviceError;
        
        // Normalizar datos (Supabase puede devolver arrays para relaciones)
        const normalizedService = {
          ...serviceData,
          service_type: Array.isArray(serviceData.service_type) 
            ? serviceData.service_type[0] 
            : serviceData.service_type,
          services_status: Array.isArray(serviceData.services_status) 
            ? serviceData.services_status[0] 
            : serviceData.services_status,
          construction: Array.isArray(serviceData.construction) 
            ? serviceData.construction[0] 
            : serviceData.construction,
        };
        setService(normalizedService);

        // Obtener estados del tipo de servicio para el progreso
        if (serviceData?.type_id) {
          const { data: statusesData, error: statusesError } = await supabase
            .from('service_type_status')
            .select(`*, services_status (id, name)`)
            .eq('service_type_id', serviceData.type_id)
            .order('orden');

          if (statusesError) throw statusesError;
          setServiceTypeStatuses(statusesData || []);
        }
      } catch (err) {
        console.error('Error fetching service data:', err);
        setError('Error al cargar los datos del servicio');
      } finally {
        setLoading(false);
    }
  }, [serviceId]);

  // Cargar datos al montar o cambiar serviceId
  useEffect(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  // Determinar el índice actual en el progreso
  const getCurrentStatusIndex = () => {
    if (!service || !serviceTypeStatuses.length) return -1;
    
    const isIncidence = service.services_status?.is_incidence;
    const trackerStatusId = isIncidence && service.previous_status_id 
      ? service.previous_status_id 
      : service.status_id;
    
    return serviceTypeStatuses.findIndex(
      (sts) => sts.services_status.id === trackerStatusId
    );
  };

  // Obtener icono del servicio
  const getServiceIcon = (serviceName?: string) => {
    if (!serviceName) return 'shield';
    const name = serviceName.toLowerCase();
    if (name.includes('gas')) return 'gas';
    if (name.includes('telecomunicaciones') || name.includes('telecom')) return 'telecom';
    if (name.includes('agua') && name.includes('obra')) return 'agua-obra';
    if (name.includes('agua') && name.includes('definitiv')) return 'agua-definitiva';
    if (name.includes('luz') && name.includes('obra')) return 'luz-obra';
    if (name.includes('luz') && name.includes('definitiv')) return 'luz-definitiva';
    return 'shield';
  };

  // Obtener información de seguimiento
  const getTrackingInfo = () => {
    if (!service) return null;
    
    if (service.services_status?.is_final) {
      return {
        hasBox: false,
        icon: 'check-circle',
        iconColor: 'text-zen-green-600',
        title: 'Suministro finalizado',
        description: 'Este suministro ha sido completado correctamente.'
      };
    }
    
    if (service.services_status?.is_incidence) {
      return {
        hasBox: true,
        bg: 'bg-zen-error-50',
        border: 'border-zen-error-200',
        icon: 'alert-circle',
        iconColor: 'text-zen-error-600',
        title: 'Incidencia detectada',
        description: service.comment || 'Se ha detectado una incidencia en este suministro.'
      };
    }

    if (service.status_id === 1 || service.services_status?.requires_user_action) {
      return {
        hasBox: true,
        bg: 'bg-zen-warning-50',
        border: 'border-zen-warning-300',
        icon: 'alert-triangle',
        iconColor: 'text-zen-warning-600',
        title: 'Documentación pendiente',
        description: 'Haz clic en el botón "Subir documentos"'
      };
    }

    if (service.comment) {
      return {
        hasBox: false,
        icon: 'info',
        iconColor: 'text-zen-blue-500',
        title: 'Información',
        description: service.comment
      };
    }

    return {
      hasBox: false,
      icon: 'clock',
      iconColor: 'text-zen-grey-500',
      title: 'En proceso',
      description: 'El servicio está siendo gestionado.'
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zen-blue-500"></div>
        <span className="ml-3 text-zen-grey-600">Cargando...</span>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zen-error-600 mb-4">{error || 'Servicio no encontrado'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-zen-blue-500 text-white rounded hover:bg-zen-blue-600"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentStatusIndex();
  const isIncidence = service.services_status?.is_incidence;
  const isFinal = service.services_status?.is_final;
  const trackingInfo = getTrackingInfo();
  const serviceIcon = getServiceIcon(service.service_type?.name);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumbs */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1 bg-zen-grey-200 rounded-full text-sm font-semibold text-zen-grey-950 hover:bg-zen-grey-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold text-zen-grey-950">Obra nueva</span>
            <span className="text-zen-grey-400">/</span>
            <span className="text-zen-grey-600">Detalle de suministro de {service.service_type?.name}</span>
          </div>
        </div>
      </div>

      <div className="px-10 flex gap-8">
        {/* Panel izquierdo - Tarjeta de información */}
        <div className="w-[375px] shrink-0">
          <div className="bg-zen-grey-50 border-2 border-white rounded-xl p-4 shadow-sm">
            {/* ID y nombre de obra */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="px-2">
                <span className="text-sm text-zen-grey-600">ID de obra </span>
                <span className="text-sm font-semibold text-zen-grey-950">{service.construction?.id}</span>
              </div>
              <div className="bg-zen-green-100 px-2 py-1 rounded flex items-center gap-1">
                <svg className="w-4 h-4 text-zen-grey-950" viewBox="0 0 20 18" fill="currentColor">
                  <use href="/icons.svg#obras" />
                </svg>
                <span className="text-sm text-zen-grey-950">{service.construction?.name}</span>
              </div>
            </div>

            {/* Card de progreso */}
            <div className="bg-white rounded-xl p-6">
              {/* Título del progreso */}
              <div className="mb-4">
                <div className="bg-zen-grey-50 px-2 py-1 rounded inline-flex items-center gap-1">
                  <svg className="w-4 h-4 text-zen-grey-950" viewBox="0 0 20 20" fill="currentColor">
                    <use href={`/icons.svg#${serviceIcon}`} />
                  </svg>
                  <span className="text-sm text-zen-grey-950">Progreso {service.service_type?.name}</span>
                </div>
              </div>

              {/* Progreso vertical */}
              <div className="relative">
                {/* Línea de progreso */}
                <div className="absolute left-2 top-2 bottom-2 w-[2px] bg-zen-grey-200" />
                {currentIndex > 0 && (
                  <div 
                    className="absolute left-2 top-2 w-[2px] bg-zen-green-400 transition-all"
                    style={{
                      height: `${(currentIndex / Math.max(serviceTypeStatuses.length - 1, 1)) * 100}%`
                    }}
                  />
                )}

                {/* Steps */}
                <div className="flex flex-col gap-8">
                  {serviceTypeStatuses.map((statusConfig, index) => {
                    const status = statusConfig.services_status;
                    const trackerStatusId = isIncidence && service.previous_status_id 
                      ? service.previous_status_id 
                      : service.status_id;
                    const isActive = status.id === trackerStatusId;
                    const isPassed = index < currentIndex;
                    const isCurrentStep = index === currentIndex;

                    return (
                      <div key={status.id} className="flex items-start gap-4">
                        {/* Círculo del step */}
                        <div 
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 relative z-10 ${
                            isPassed || isActive 
                              ? 'bg-zen-green-400' 
                              : 'bg-zen-grey-200'
                          }`}
                        >
                          {(isPassed) && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z"/>
                            </svg>
                          )}
                          {isCurrentStep && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>

                        {/* Contenido del step */}
                        <div className="flex-1">
                          {isCurrentStep ? (
                            <div>
                              <p className="text-xs text-zen-grey-600">Estado actual</p>
                              <p className="text-base font-semibold text-zen-grey-800">{status.name}</p>
                            </div>
                          ) : (
                            <p className={`text-sm ${
                              isPassed 
                                ? 'font-bold text-zen-grey-800' 
                                : 'font-medium text-zen-grey-500'
                            }`}>
                              {status.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho - Detalle del suministro */}
        <div className="flex-1 max-w-[604px]">
          {/* Título */}
          <h1 className="text-2xl font-semibold text-zen-grey-950 mb-6">Detalle del suministro</h1>

          {/* Tipo de suministro */}
          <div className="flex items-center gap-1 mb-10">
            <div className="bg-zen-green-100 p-1 rounded">
              <svg className="w-4 h-4 text-zen-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <use href={`/icons.svg#${serviceIcon}`} />
              </svg>
            </div>
            <span className="text-base font-medium text-zen-grey-800">{service.service_type?.name}</span>
          </div>

          {/* Estado actual */}
          <div className="mb-8">
            <p className="text-xs text-zen-grey-600 mb-2">Estado actual</p>
            <div className="bg-zen-grey-100 border border-zen-grey-300 rounded px-4 py-2 inline-block">
              <span className="text-base font-semibold text-zen-grey-800">
                {service.services_status?.name || 'Sin estado'}
              </span>
            </div>
          </div>

          {/* Información de seguimiento */}
          {trackingInfo && (
            <div className="mb-8">
              <p className="text-xs text-zen-grey-600 mb-2">Información de seguimiento</p>
              {trackingInfo.hasBox ? (
                <div className={`flex items-start gap-2 p-3 rounded border ${trackingInfo.bg} ${trackingInfo.border}`}>
                  <svg className={`w-4 h-4 ${trackingInfo.iconColor} shrink-0 mt-0.5`} viewBox="0 0 16 16" fill="currentColor">
                    <use href={`/icons.svg#${trackingInfo.icon}`} />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-zen-grey-800">{trackingInfo.title}</p>
                    <p className="text-sm text-zen-grey-600">{trackingInfo.description}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <svg className={`w-4 h-4 ${trackingInfo.iconColor} shrink-0 mt-0.5`} viewBox="0 0 16 16" fill="currentColor">
                    <use href={`/icons.svg#${trackingInfo.icon}`} />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-zen-grey-700">{trackingInfo.title}</p>
                    <p className="text-sm text-zen-grey-500">{trackingInfo.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acción necesaria */}
          <div>
            <p className="text-xs text-zen-grey-600 mb-2">Acción necesaria</p>
            {isFinal ? (
              <span className="text-sm text-zen-grey-400 italic">Sin acciones pendientes</span>
            ) : isIncidence ? (
              <button
                onClick={() => setShowIncidenceModal(true)}
                className="px-4 py-3 flex items-center gap-2 bg-zen-error-deafult text-zen-error-900 rounded text-base font-semibold hover:bg-zen-error-300 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <use href="/icons.svg#wrench" />
                </svg>
                Resolver incidencia
              </button>
            ) : service.services_status?.requires_user_action || service.status_id === 1 ? (
              <button
                onClick={() => navigate(`/servicios/${service.id}/documentos`)}
                className="px-4 py-3 flex items-center gap-2 bg-zen-blue-50 text-zen-blue-500 rounded text-base font-semibold hover:bg-zen-blue-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <use href="/icons.svg#plus" />
                </svg>
                Subir documentos
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-zen-grey-500">
                <svg className="w-5 h-5 text-zen-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <use href="/icons.svg#check-circle" />
                </svg>
                Sin acciones pendientes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal de resolución de incidencia */}
      {service && (
        <ServiceIncidenceModal
          isOpen={showIncidenceModal}
          onClose={() => setShowIncidenceModal(false)}
          onSuccess={() => {
            setShowIncidenceModal(false);
            fetchServiceData();
          }}
          service={service}
          construction={service.construction}
        />
      )}
    </div>
  );
}
