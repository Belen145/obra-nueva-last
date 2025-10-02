import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  User,
  FileText,
  ChevronRight,
  Play,
  Pause,
  Square,
  Flag,
  Edit3,
  Upload,
  Eye,
} from 'lucide-react';
import {
  useServiceStatusManagement,
  ServiceWithStatuses,
} from '../hooks/useServiceStatusManagement';
import { Construction } from '../lib/supabase';

// ---------------------------------------------
// ServiceStatusManagement
// Management UI for service status transitions and configuration
// ---------------------------------------------

interface ServiceStatusManagementProps {
  construction: Construction;
  onBack: () => void;
}

// Main management component

export default function ServiceStatusManagement({
  construction,
  onBack,
}: ServiceStatusManagementProps) {
  // --------------------
  // State Management
  // --------------------

  const {
    services,
    loading,
    error,
    fetchServicesWithStatuses,
    updateServiceStatus,
  } = useServiceStatusManagement();
  const [selectedService, setSelectedService] =
    useState<ServiceWithStatuses | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // --------------------
  // Effects
  // --------------------

  useEffect(() => {
    fetchServicesWithStatuses(construction.id);
  }, [construction.id]);

  // --------------------
  // Helpers for status display and actions
  // --------------------

  const getStatusIcon = (
    statusName: string,
    requiresUserAction: boolean,
    isFinal: boolean
  ) => {
    if (isFinal) {
      return <Flag className="w-5 h-5 text-red-500" />;
    }

    if (requiresUserAction) {
      return <User className="w-5 h-5 text-orange-500" />;
    }

    switch (statusName?.toLowerCase()) {
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'en progreso':
      case 'en proceso':
      case 'activo':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'pausado':
      case 'suspendido':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case 'cancelado':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (
    statusName: string,
    requiresUserAction: boolean,
    isFinal: boolean,
    isActive: boolean = false
  ) => {
    if (isFinal) {
      return isActive
        ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-red-50 text-red-600';
    }

    if (requiresUserAction) {
      return isActive
        ? 'bg-orange-100 text-orange-800 border-orange-300'
        : 'bg-orange-50 text-orange-600';
    }

    switch (statusName?.toLowerCase()) {
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return isActive
          ? 'bg-green-100 text-green-800 border-green-300'
          : 'bg-green-50 text-green-600';
      case 'en progreso':
      case 'en proceso':
      case 'activo':
        return isActive
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : 'bg-blue-50 text-blue-600';
      case 'pausado':
      case 'suspendido':
        return isActive
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
          : 'bg-yellow-50 text-yellow-600';
      case 'cancelado':
        return isActive
          ? 'bg-red-100 text-red-800 border-red-300'
          : 'bg-red-50 text-red-600';
      default:
        return isActive
          ? 'bg-gray-100 text-gray-800 border-gray-300'
          : 'bg-gray-50 text-gray-600';
    }
  };

  const handleStatusChange = async (serviceId: number, newStatusId: number) => {
    setUpdatingStatus(serviceId);
    const result = await updateServiceStatus(serviceId, newStatusId);
    setUpdatingStatus(null);

    if (!result.success) {
      alert(`Error actualizando estado: ${result.error}`);
    }
  };

  // Render the progress bar and actions for a single service

  const renderServiceProgress = (service: ServiceWithStatuses) => {
    const currentStatusConfig = service.current_status_config;

    // If current status is final, show completion message
    if (currentStatusConfig?.is_final) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Flag className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Trámite Finalizado
          </h3>
          <p className="text-red-700">
            Estado final: <strong>{service.services_status?.name}</strong>
          </p>
          <p className="text-sm text-red-600 mt-2">
            Este servicio ha llegado a un estado final y no continuará
            procesándose.
          </p>
        </div>
      );
    }

    // Regular progress view
    const currentIndex = service.available_statuses.findIndex(
      (s) => s.services_status_id === service.status_id
    );

    return (
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"></div>
          <div
            className="absolute top-4 left-0 h-0.5 bg-blue-500 transition-all duration-500"
            style={{
              width: `${
                service.available_statuses.length > 0
                  ? (currentIndex / (service.available_statuses.length - 1)) *
                    100
                  : 0
              }%`,
            }}
          ></div>

          {/* Status Points */}
          <div className="relative flex justify-between">
            {service.available_statuses.map((statusConfig, index) => {
              const isActive =
                statusConfig.services_status_id === service.status_id;
              const isPassed = index < currentIndex;

              return (
                <div
                  key={statusConfig.id}
                  className="flex flex-col items-center"
                >
                  {/* Status Circle */}
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? statusConfig.is_final
                          ? 'bg-red-500 border-red-500'
                          : statusConfig.requires_user_action
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-blue-500 border-blue-500'
                        : isPassed
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {getStatusIcon(
                      statusConfig.services_status?.name || '',
                      statusConfig.requires_user_action,
                      statusConfig.is_final
                    )}
                  </div>

                  {/* Status Label */}
                  <div className="mt-2 text-center max-w-20">
                    <p
                      className={`text-xs font-medium ${
                        isActive
                          ? statusConfig.is_final
                            ? 'text-red-600'
                            : statusConfig.requires_user_action
                            ? 'text-orange-600'
                            : 'text-blue-600'
                          : isPassed
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {statusConfig.services_status?.name}
                    </p>
                    {statusConfig.requires_user_action && (
                      <p className="text-xs text-orange-500 mt-1">
                        Acción requerida
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status Actions */}
        {currentStatusConfig?.requires_user_action &&
          !currentStatusConfig.is_final && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-orange-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900">
                      Acción del Usuario Requerida
                    </h4>
                    <p className="text-sm text-orange-700">
                      Este estado requiere que proporciones información o
                      documentación.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors duration-200">
                    <FileText className="w-4 h-4 mr-2 inline" />
                    Aportar Documentos
                  </button>
                  <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    <Edit3 className="w-4 h-4 mr-2 inline" />
                    Proporcionar Info
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Cargando gestión de estados...</span>
      </div>
    );
  }

  // Error state

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar la gestión de estados
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => fetchServicesWithStatuses(construction.id)}
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

  // Main management UI

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gestión de Estados de Servicios
          </h2>
          <p className="text-gray-600">
            {construction.name} • {services.length} servicio(s)
          </p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-6">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            {/* Service Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {service.service_type?.name ||
                        `Servicio ${service.type_id}`}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>ID: {service.id}</span>
                      {service.comment && <span>• {service.comment}</span>}
                      <span>
                        • {service.available_statuses.length} estado(s)
                        disponible(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Status Badge */}
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                      service.services_status?.name || '',
                      service.current_status_config?.requires_user_action ||
                        false,
                      service.current_status_config?.is_final || false,
                      true
                    )}`}
                  >
                    {service.services_status?.name || 'Sin estado'}
                  </span>

                  {/* Status Change Dropdown */}
                  <select
                    value={service.status_id}
                    onChange={(e) =>
                      handleStatusChange(service.id, parseInt(e.target.value))
                    }
                    disabled={updatingStatus === service.id}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    {service.available_statuses.map((statusConfig) => (
                      <option
                        key={statusConfig.id}
                        value={statusConfig.services_status_id}
                      >
                        {statusConfig.services_status?.name}
                        {statusConfig.requires_user_action &&
                          ' (Acción requerida)'}
                        {statusConfig.is_final && ' (Final)'}
                        {statusConfig.is_common && ' (Común)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Service Progress */}
            <div className="p-6">{renderServiceProgress(service)}</div>

            {/* Status Configuration Info */}
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Configuración de Estados para este Servicio
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {service.available_statuses.map((statusConfig) => (
                    <div
                      key={statusConfig.id}
                      className={`p-3 rounded-lg border ${
                        statusConfig.services_status_id === service.status_id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {statusConfig.services_status?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{statusConfig.order_position}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {statusConfig.is_common && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            Común
                          </span>
                        )}
                        {statusConfig.requires_user_action && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                            Acción requerida
                          </span>
                        )}
                        {statusConfig.is_final && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                            Final
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay servicios para gestionar
          </h3>
          <p className="text-gray-500">
            Esta obra no tiene servicios registrados con configuración de
            estados.
          </p>
        </div>
      )}
    </div>
  );
}
