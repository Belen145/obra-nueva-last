import { useState, useCallback } from 'react';
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
  };
}

/**
 * Hook para gestionar la caché de servicios por obra de construcción.
 * Retorna funciones para obtener servicios, estado de la caché y limpiar la caché.
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

  const getServices = useCallback(
    async (constructionId: number) => {
      // Si ya están cargados, no hacer nada
      if (cache[constructionId]?.loaded) {
        console.log(
          `✅ Servicios ya cargados para obra ${constructionId}, usando caché`
        );
        return cache[constructionId].data;
      }

      // Si ya está cargando, no hacer otra petición
      if (cache[constructionId]?.loading) {
        console.log(
          `⏳ Ya cargando servicios para obra ${constructionId}, esperando...`
        );
        return [];
      }

      console.log(`🔄 Cargando servicios para obra ${constructionId}...`);

      // Marcar como cargando
      setCache((prev) => ({
        ...prev,
        [constructionId]: {
          data: [],
          loading: true,
          loaded: false,
          error: null,
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

        console.log(`✅ Servicios cargados para obra ${constructionId}:`, data);

        // Guardar en caché
        setCache((prev) => ({
          ...prev,
          [constructionId]: {
            data: data || [],
            loading: false,
            loaded: true,
            error: null,
          },
        }));

        return data || [];
      } catch (error) {
        console.error(
          `❌ Error cargando servicios para obra ${constructionId}:`,
          error
        );

        setCache((prev) => ({
          ...prev,
          [constructionId]: {
            data: [],
            loading: false,
            loaded: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          },
        }));

        return [];
      }
    },
    [cache]
  );

  const getServicesCacheState = useCallback(
    (constructionId: number) => {
      return (
        cache[constructionId] || {
          data: [],
          loading: false,
          loaded: false,
          error: null,
        }
      );
    },
    [cache]
  );

  const clearCache = useCallback((constructionId?: number) => {
    console.log('🧹 clearCache called with constructionId:', constructionId);
    if (constructionId) {
      console.log(
        '🗑️ Clearing cache for specific construction:',
        constructionId
      );
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[constructionId];
        return newCache;
      });
    } else {
      console.log('🗑️ Clearing all cache');
      setCache({});
    }
  }, []);

  return {
    getServices,
    getServicesCacheState,
    clearCache,
  };
}
