import { useState, useEffect, useCallback } from "react";
import { supabase, Construction } from "../lib/supabase";
import { hubSpotService } from "../services/hubspotService";

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
      console.log('🏗️ Creando nueva construcción...');
      
      // TEST: Verificar estructura de tabla antes de insertar
      try {
        console.log('🔍 Verificando estructura de tabla construction...');
        const { data: testData, error: testError } = await supabase
          .from("construction")
          .select("id, name, hubspot_deal_id")
          .limit(1);
        
        if (!testError && testData && testData.length > 0) {
          console.log('📊 Ejemplo de registro existente:', testData[0]);
        } else {
          console.log('📊 No hay registros existentes o error:', testError);
        }
      } catch (testError) {
        console.log('⚠️ Error en test de estructura:', testError);
      }
      
      let hubspotDealId = null;
      
      // 1. Crear deal en HubSpot primero
      try {
        console.log('📤 Creando deal en HubSpot...');
        
        // Mapear datos de construcción al formato esperado por HubSpot
        const hubspotData = {
          name: constructionData.name,
          address: constructionData.address || '',
          postal_code: '', // No tenemos este campo en Construction
          municipality: '', // No tenemos este campo en Construction
          responsible_name: constructionData.responsible || '',
          responsible_lastname: '',
          responsible_phone: '',
          responsible_email: '',
          company_name: '',
          company_cif: '',
          fiscal_address: '',
          housing_count: 1,
          acometida: '',
          servicios_obra: []
        };
        
        const hubspotResponse = await hubSpotService.createDealFromConstruction(hubspotData);
        
        console.log('🔍 Respuesta completa de HubSpot:', hubspotResponse);
        
        // Extraer el deal ID de la respuesta - probemos diferentes estructuras
        if (import.meta.env.DEV) {
          hubspotDealId = hubspotResponse.id;
        } else {
          // En producción, la función Netlify devuelve { success: true, dealId: "xxx", message: "..." }
          hubspotDealId = hubspotResponse.dealId || 
                         hubspotResponse.id || 
                         hubspotResponse.recordId ||
                         hubspotResponse.data?.id ||
                         hubspotResponse.data?.dealId;
        }
        
        // Convertir a string si es necesario
        if (hubspotDealId && typeof hubspotDealId !== 'string') {
          hubspotDealId = String(hubspotDealId);
        }
        
        console.log('✅ Deal ID extraído:', hubspotDealId);
        console.log('🔍 Tipo de deal ID:', typeof hubspotDealId);
      } catch (hubspotError) {
        console.error('⚠️ Error creando deal en HubSpot:', hubspotError);
        // Continuamos sin bloquear la creación de la obra
      }

      // 2. Crear la obra en Supabase con el deal ID
      const dataToInsert = {
        ...constructionData,
        hubspot_deal_id: hubspotDealId // Guardar el ID del deal
      };

      console.log('💾 Datos a insertar en Supabase:', {
        name: dataToInsert.name,
        hubspot_deal_id: dataToInsert.hubspot_deal_id,
        hubspot_deal_id_length: dataToInsert.hubspot_deal_id?.length,
        all_keys: Object.keys(dataToInsert)
      });

      // Verificar explícitamente que tenemos el deal ID antes de insertar
      if (!hubspotDealId) {
        console.warn('⚠️ ADVERTENCIA: hubspot_deal_id es null/undefined, se insertará como NULL');
      }

      const { data, error } = await supabase
        .from("construction")
        .insert([dataToInsert])
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
        console.error('❌ Error insertando en Supabase:', error);
        console.error('❌ Datos que causaron el error:', dataToInsert);
        throw error;
      }

      console.log('✅ Construcción creada en Supabase:', {
        id: data.id,
        name: data.name,
        hubspot_deal_id: data.hubspot_deal_id,
        hubspot_deal_id_type: typeof data.hubspot_deal_id
      });

      // Verificación adicional: consultar la BD directamente después de insertar
      try {
        const { data: verificacion, error: verifyError } = await supabase
          .from("construction")
          .select("id, name, hubspot_deal_id")
          .eq("id", data.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Error verificando inserción:', verifyError);
        } else {
          console.log('🔍 Verificación directa de BD:', verificacion);
        }
      } catch (verifyError) {
        console.error('❌ Error en verificación:', verifyError);
      }

      console.log('✅ Construcción creada:', data.id, 'con HubSpot Deal:', hubspotDealId);
      setConstructions((prev: Construction[]) => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error("❌ Error adding construction:", err);
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
