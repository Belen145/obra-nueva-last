import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Service {
  id: number;
  type_id: number;
  status_id: number;
  construction_id: number;
  comment: string | null;
  service_type?: {
    id: number;
    name: string;
  };
  services_status?: {
    id: number;
    name: string;
    is_final: boolean;
    is_incidence: boolean;
    requires_user_action?: boolean;
  };
}

interface ServicesCache {
  [constructionId: number]: {
    data: Service[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    lastLoaded: number; // Timestamp para evitar recargas frecuentes
  };
}

/**
 * Hook para gestionar la caché de servicios por obra de construcción.
 * Incluye optimizaciones para evitar recargas innecesarias al cambiar de pestaña.
 */
export function useServicesCache(): {
  getServices: (constructionId: number) => Promise<Service[]>;
  getServicesCacheState: (constructionId: number) => {
    data: Service[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
  };
  clearCache: (constructionId?: number) => void;
} {
  const [cache, setCache] = useState<ServicesCache>({});

  // Optimización: Evitar recargas por cambio de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      // No hacer nada especial cuando la página se vuelve visible
      // El caché ya maneja la persistencia de datos
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getServices = useCallback(
    async (constructionId: number) => {
      const now = Date.now();
      const cacheEntry = cache[constructionId];
      
      // Si ya están cargados y la carga fue reciente (menos de 5 minutos), usar caché
      if (cacheEntry?.loaded && cacheEntry.lastLoaded > now - 5 * 60 * 1000) {
        return cacheEntry.data;
      }

      // Si ya está cargando, esperar resultado existente
      if (cacheEntry?.loading) {
        // Esperar un poco y retornar datos existentes si los hay
        return cacheEntry.data || [];
      }
      // Marcar como cargando
      setCache((prev) => ({
        ...prev,
        [constructionId]: {
          data: prev[constructionId]?.data || [],
          loading: true,
          loaded: false,
          error: null,
          lastLoaded: 0,
        },
      }));

      try {
        const { data, error } = await supabase
          .from('services')
          .select(
            `
            *,
            service_type (
              id,
              name
            ),
            services_status:services_status!status_id (
              id,
              name,
              is_final,
              is_incidence,
              requires_user_action
            ),
            previous_status:services_status!previous_status_id (
              id,
              name,
              is_final,
              is_incidence
            )
          `
          )
          .eq('construction_id', constructionId)
          .order('id');

        if (error) {
          throw error;
        }

        // Guardar en caché
        setCache((prev) => ({
          ...prev,
          [constructionId]: {
            data: data || [],
            loading: false,
            loaded: true,
            error: null,
            lastLoaded: Date.now(),
          },
        }));

        return data || [];
      } catch (error) {
        setCache((prev) => ({
          ...prev,
          [constructionId]: {
            data: [],
            loading: false,
            loaded: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            lastLoaded: 0,
          },
        }));

        return [];
      }
    },
    [cache]
  );

  const getServicesCacheState = useCallback(
    (constructionId: number) => {
      const cacheEntry = cache[constructionId];
      return {
        data: cacheEntry?.data || [],
        loading: cacheEntry?.loading || false,
        loaded: cacheEntry?.loaded || false,
        error: cacheEntry?.error || null,
      };
    },
    [cache]
  );

  const clearCache = useCallback((constructionId?: number) => {
    if (constructionId) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[constructionId];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  return {
    getServices,
    getServicesCacheState,
    clearCache,
  };
}
