import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface RequiredDocument {
  id: number;
  service_type_id: number;
  document_type_id: number;
  only_self_managed: boolean | null;
  documentation_type?: {
    id: number;
    name: string;
    category: string | null;
    requires_file: boolean | null;
  };
}

interface DocumentsCache {
  [serviceTypeId: number]: {
    data: RequiredDocument[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
  };
}

export function useServiceDocuments() {
  const [cache, setCache] = useState<DocumentsCache>({});

  const getRequiredDocuments = useCallback(
    async (serviceTypeId: number, filterOnlySelfManaged: boolean = false) => {
      // Si ya están cargados, usar caché
      const cacheKey = `${serviceTypeId}_${filterOnlySelfManaged}`;
      if (cache[serviceTypeId]?.loaded && !filterOnlySelfManaged) {
        return cache[serviceTypeId].data;
      }

      // Si ya está cargando, no hacer otra petición
      if (cache[serviceTypeId]?.loading && !filterOnlySelfManaged) {
        return cache[serviceTypeId]?.data || [];
      }

      // Marcar como cargando solo si no es filtro específico
      if (!filterOnlySelfManaged) {
        setCache((prev) => ({
          ...prev,
          [serviceTypeId]: {
            data: [],
            loading: true,
            loaded: false,
            error: null,
          },
        }));
      }

      try {
        let query = supabase
          .from("service_required_document")
          .select(
            `
          *,
          documentation_type (
            id,
            name,
            category,
            requires_file
          )
        `
          )
          .eq("service_type_id", serviceTypeId);

        if (filterOnlySelfManaged) {
          query = query.eq("only_self_managed", true);
        }

        const { data, error } = await query.order("id");

        if (error) {
          console.error(`❌ Error en consulta Supabase:`, error);
          throw error;
        }

        if (data && data.length > 0) {
          data.forEach((doc, index) => {
            console.log(`📄 Documento ${index + 1}:`, {
              id: doc.id,
              service_type_id: doc.service_type_id,
              document_type_id: doc.document_type_id,
              documentation_type: doc.documentation_type,
            });
          });
        } else {
          console.warn(
            `⚠️ No se encontraron documentos para service_type_id: ${serviceTypeId}`
          );
          console.log(
            `🔍 Verifica que existan registros en la tabla 'service_required_document' con service_type_id = ${serviceTypeId}`
          );
        }

        // Guardar en caché
        if (!filterOnlySelfManaged) {
          setCache((prev) => ({
            ...prev,
            [serviceTypeId]: {
              data: data || [],
              loading: false,
              loaded: true,
              error: null,
            },
          }));
        }

        return data || [];
      } catch (error) {
        console.error(
          `❌ Error cargando documentos para service_type_id ${serviceTypeId}${
            filterOnlySelfManaged ? " (solo self-managed)" : ""
          }:`,
          error
        );

        if (!filterOnlySelfManaged) {
          setCache((prev) => ({
            ...prev,
            [serviceTypeId]: {
              data: [],
              loading: false,
              loaded: false,
              error:
                error instanceof Error ? error.message : "Error desconocido",
            },
          }));
        }

        return [];
      }
    },
    [cache]
  );

  const getDocumentsCacheState = useCallback(
    (serviceTypeId: number) => {
      return (
        cache[serviceTypeId] || {
          data: [],
          loading: false,
          loaded: false,
          error: null,
        }
      );
    },
    [cache]
  );

  const clearCache = useCallback((serviceTypeId?: number) => {
    if (serviceTypeId) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[serviceTypeId];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  return { getRequiredDocuments, getDocumentsCacheState, clearCache };
}
