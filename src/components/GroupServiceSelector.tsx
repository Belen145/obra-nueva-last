import React from 'react';

interface ServiceType {
  id: number;
  name: string;
  servicio: string;
  acometida: string;
}

interface ServiceGroup {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  service_types: ServiceType[];
}

interface GroupServiceSelectorProps {
  group: ServiceGroup;
  selectedServiceId?: number;
  isSelected: boolean;
  onToggleGroup: (groupId: number) => void;
  onServiceTypeChange: (groupId: number, serviceTypeId: number) => void;
  getIconByServiceName: (serviceName: string) => string;
}

/**
 * Componente para mostrar un grupo de servicios como una sola tarjeta
 * con selector dropdown para cambiar el tipo de servicio activo.
 */
export function GroupServiceSelector({
  group,
  selectedServiceId,
  isSelected,
  onToggleGroup,
  onServiceTypeChange,
  getIconByServiceName
}: GroupServiceSelectorProps) {
  // Obtener el servicio actualmente seleccionado o el primero por defecto
  const currentService = group.service_types.find(st => st.id === selectedServiceId) 
    || group.service_types[0];

  const handleToggle = () => {
    if (!isSelected) {
      // Si no estaba seleccionado, seleccionar el grupo con el primer servicio
      onServiceTypeChange(group.id, currentService.id);
    } else {
      // Si estaba seleccionado, deseleccionarlo
      onToggleGroup(group.id);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`w-[218.5px] flex flex-col gap-3 p-6 rounded-lg border transition-all duration-200 ${
        isSelected 
          ? 'bg-zen-blue-15 border-2 border-zen-blue-500' 
          : 'bg-white border border-zen-grey-400 hover:border-zen-blue-300'
      }`}
    >
      {/* Icon */}
      <div className={`w-fit p-2 rounded ${
        isSelected ? 'bg-zen-blue-500' : 'bg-zen-grey-200'
      }`}>
        <svg className={`w-4 h-4 ${
          isSelected ? 'text-white' : 'text-zen-grey-600'
        }`} viewBox="0 0 16 16" fill="currentColor">
          <use href={getIconByServiceName(currentService.name)} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 items-start text-left">
        <p className={`font-['Figtree',sans-serif] text-[16px] leading-[1.47] ${
          isSelected ? 'font-semibold text-zen-grey-950' : 'font-medium text-zen-grey-700'
        }`}>
          {group.name}
        </p>
        <p className="font-['Figtree',sans-serif] font-normal text-[14px] leading-[1.25] text-zen-grey-700">
          {group.description || `Servicio de ${group.name.toLowerCase()}`}
        </p>
      </div>
    </button>
  );
}