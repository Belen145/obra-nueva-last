import { useState, useEffect } from 'react';
import { supabase, Construction } from '../lib/supabase';

/**
 * Hook para gestionar el estado y operaciones de las obras de construcción.
 * Retorna el listado, estado de carga, error y funciones CRUD.
 */
export function useConstructions(): {
  constructions: Construction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addConstruction: (
    constructionData: Omit<
      Construction,
      'id' | 'construction_status' | 'company'
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

  const fetchConstructions = async () => {
    try {
      console.log(
        '🔄 fetchConstructions called - loading constructions from database...'
      );
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('construction')
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
        .order('id', { ascending: false });

      if (error) {
        throw error;
      }

      setConstructions(data || []);
    } catch (err) {
      console.error('Error fetching constructions:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addConstruction = async (
    constructionData: Omit<
      Construction,
      'id' | 'construction_status' | 'company'
    >
  ) => {
    try {
      const { data, error } = await supabase
        .from('construction')
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
      console.error('Error adding construction:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  };

  const updateConstruction = async (
    id: number,
    updates: Partial<Construction>
  ) => {
    try {
      const { data, error } = await supabase
        .from('construction')
        .update(updates)
        .eq('id', id)
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
      console.error('Error updating construction:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  };

  const deleteConstruction = async (id: number) => {
    try {
      const { error } = await supabase
        .from('construction')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setConstructions((prev: Construction[]) =>
        prev.filter((construction: Construction) => construction.id !== id)
      );
      return { success: true };
    } catch (err) {
      console.error('Error deleting construction:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  };

  useEffect(() => {
    fetchConstructions();
  }, []);

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
