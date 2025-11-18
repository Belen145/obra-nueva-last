import { useState, useEffect, useCallback } from "react";
import { supabase, Construction } from "../lib/supabase";

/**
 * Hook para gestionar el estado y operaciones de las obras de construcción.
 * Retorna el listado, estado de carga, error y funciones CRUD.
 */
export function useConstructions(companyId?: string | null, authLoading?: boolean): {
  constructions: Construction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addConstruction: (
    constructionData: Omit<
      Construction,
      "id" | "construction_status" | "company"
    >
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateConstruction: (
    id: number,
    updates: Partial<Construction>
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteConstruction: (
    id: number
  ) => Promise<{ success: boolean; error?: string }>;
} {
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConstructions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🏗️ Fetching constructions with companyId:', companyId);

      let query = supabase
        .from("construction")
        .select(
          `
          *,
          construction_status (
            id,
            name
          ),
          company (
            id,
            name,
            company_type
          )
        `
        );

      // Filtrar por compañía si no es admin
      if (companyId) {
        console.log('🔍 Aplicando filtro por compañía:', companyId);
        query = query.eq('company_id', companyId);
      } else {
        console.log('👑 Sin filtro de compañía (admin o company_id null)');
      }

      const { data, error } = await query.order("id", { ascending: false });

      if (error) {
        console.error('❌ Error fetching constructions:', error);
        throw error;
      }

      console.log('✅ Constructions fetched:', data?.length || 0, 'obras encontradas');
      setConstructions(data || []);
    } catch (err) {
      console.error("Error fetching constructions:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const addConstruction = async (
    constructionData: Omit<
      Construction,
      "id" | "construction_status" | "company"
    >
  ) => {
    try {
      const { data, error } = await supabase
        .from("construction")
        .insert([constructionData])
        .select(
          `
          *,
          construction_status (
            id,
            name
          ),
          company (
            id,
            name,
            company_type
          )
        `
        )
        .single();

      if (error) {
        throw error;
      }

      setConstructions((prev: Construction[]) => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error("Error adding construction:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      };
    }
  };

  const updateConstruction = async (
    id: number,
    updates: Partial<Construction>
  ) => {
    try {
      const { data, error } = await supabase
        .from("construction")
        .update(updates)
        .eq("id", id)
        .select(
          `
          *,
          construction_status (
            id,
            name
          ),
          company (
            id,
            name,
            company_type
          )
        `
        )
        .single();

      if (error) {
        throw error;
      }

      setConstructions((prev: Construction[]) =>
        prev.map((construction: Construction) =>
          construction.id === id ? data : construction
        )
      );
      return { success: true, data };
    } catch (err) {
      console.error("Error updating construction:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      };
    }
  };

  const deleteConstruction = async (id: number) => {
    try {
      const { error } = await supabase
        .from("construction")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setConstructions((prev: Construction[]) =>
        prev.filter((construction: Construction) => construction.id !== id)
      );
      return { success: true };
    } catch (err) {
      console.error("Error deleting construction:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      };
    }
  };

  useEffect(() => {
    console.log('useConstructions: useEffect triggered with:', { companyId, authLoading });
    
    // Si auth aún está cargando, esperar
    if (authLoading) {
      console.log('useConstructions: Auth still loading, waiting...');
      setLoading(true);
      return;
    }
    
    // Si companyId es undefined después de que auth terminó de cargar, hay un problema
    if (companyId === undefined) {
      console.log('useConstructions: companyId is undefined after auth loaded - problem!');
      setLoading(false);
      setError('No se pudo obtener la información de la compañía del usuario');
      return;
    }
    
    // Si llegamos aquí, todo está bien para hacer fetch
    console.log('useConstructions: Conditions met, fetching constructions...');
    fetchConstructions();
  }, [companyId, authLoading]); // Removido fetchConstructions de las dependencias temporalmente

  return {
    constructions,
    loading,
    error,
    refetch: fetchConstructions,
    addConstruction,
    updateConstruction,
    deleteConstruction,
  };
}
