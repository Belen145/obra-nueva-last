import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface UseServiceGroupsReturn {
  serviceGroups: ServiceGroup[];
  individualServices: ServiceType[];
  loading: boolean;
  error: string | null;
  getGroupById: (groupId: number) => ServiceGroup | undefined;
  getServicesByGroup: (groupId: number) => ServiceType[];
}

/**
 * Hook para manejar grupos de servicios de forma genérica.
 * Carga la configuración de agrupación desde la base de datos.
 */
export function useServiceGroups(): UseServiceGroupsReturn {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [individualServices, setIndividualServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServiceGroups = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Obtener todos los tipos de servicio
        const { data: serviceTypes, error: serviceTypesError } = await supabase
          .from('service_type')
          .select('id, name, Servicio, Acometida')
          .order('name');

        if (serviceTypesError) {
          throw new Error(`Error al cargar tipos de servicio: ${serviceTypesError.message}`);
        }

        // Normalizar los tipos de servicio
        const normalizedServiceTypes = (serviceTypes || []).map(item => ({
          id: item.id,
          name: item.name || 'Servicio sin nombre',
          servicio: item.Servicio || '',
          acometida: item.Acometida || ''
        }));

        // 2. Intentar obtener grupos (puede fallar si las tablas no existen)
        let processedGroups: ServiceGroup[] = [];
        let groupedServiceIds = new Set<number>();

        try {
          const { data: groupsData, error: groupsError } = await supabase
            .from('service_groups')
            .select(`
              id,
              name,
              description,
              service_type_groups!inner(
                service_type_id
              )
            `)
            .order('name');

          if (!groupsError && groupsData && groupsData.length > 0) {
            // Crear mapa de tipos de servicio para búsqueda rápida
            const serviceTypeMap = new Map(
              normalizedServiceTypes.map(st => [st.id, st])
            );

            // Procesar grupos
            processedGroups = groupsData.map(group => {
              const serviceTypeIds = group.service_type_groups.map(stg => stg.service_type_id);
              const groupServiceTypes = serviceTypeIds
                .map(id => serviceTypeMap.get(id))
                .filter((st): st is ServiceType => st !== undefined);

              // Marcar estos servicios como agrupados
              serviceTypeIds.forEach(id => groupedServiceIds.add(id));

              return {
                id: group.id,
                name: group.name,
                description: group.description,
                icon: null, // Campo no existe en la tabla
                service_types: groupServiceTypes
              };
            });
          }
        } catch (groupError) {
          // Las tablas de agrupación no existen, usar solo servicios individuales
        }

        // 3. Identificar servicios individuales (no agrupados)
        const individualServiceTypes = normalizedServiceTypes.filter(
          st => !groupedServiceIds.has(st.id)
        );

        setServiceGroups(processedGroups);
        setIndividualServices(individualServiceTypes);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        
        // En caso de error, intentar cargar al menos los tipos de servicio básicos
        try {
          const { data: fallbackServices } = await supabase
            .from('service_type')
            .select('id, name, Servicio, Acometida')
            .order('name');
          
          if (fallbackServices) {
            const fallbackNormalized = fallbackServices.map(item => ({
              id: item.id,
              name: item.name || 'Servicio sin nombre',
              servicio: item.Servicio || '',
              acometida: item.Acometida || ''
            }));
            setIndividualServices(fallbackNormalized);
          }
        } catch (fallbackError) {
          // Error en fallback, mantener estado vacío
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServiceGroups();
  }, []);

  const getGroupById = (groupId: number): ServiceGroup | undefined => {
    return serviceGroups.find(group => group.id === groupId);
  };

  const getServicesByGroup = (groupId: number): ServiceType[] => {
    const group = getGroupById(groupId);
    return group?.service_types || [];
  };

  return {
    serviceGroups,
    individualServices,
    loading,
    error,
    getGroupById,
    getServicesByGroup
  };
}