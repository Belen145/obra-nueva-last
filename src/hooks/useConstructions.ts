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
      console.log('🚀🚀🚀 USEONSTRUCTIONS V5.0 - DEPLOY FIX 16:30 🚀🚀🚀');
      alert('🚀 VERSION 16:30 CARGADA - addConstruction iniciando');
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
      

      // 1. Crear la obra en Supabase primero
      const dataToInsert = {
        ...constructionData,
        hubspot_deal_id: null // Se actualizará después
      };

      console.log('💾 Datos a insertar en Supabase:', {
        name: dataToInsert.name,
        all_keys: Object.keys(dataToInsert)
      });

      const { data: construction, error } = await supabase
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
        id: construction.id,
        name: construction.name
      });

      // 2. Crear el deal en HubSpot con el id de la obra
      let hubspotDealId = null;
      try {
        console.log('📤 Creando deal en HubSpot con construction_id:', construction.id);
        const hubspotData = {
          name: constructionData.name,
          address: constructionData.address || '',
          postal_code: '',
          municipality: '',
          responsible_name: constructionData.responsible || '',
          responsible_lastname: '',
          responsible_phone: '',
          responsible_email: '',
          company_name: '',
          company_cif: '',
          fiscal_address: '',
          housing_count: 1,
          acometida: '',
          servicios_obra: [],
          construction_id: String(construction.id) // Aquí se pasa el id de la obra (string)
        };
        console.log('📤 useConstructions -> hubspotData:', hubspotData);
        const hubspotResponse = await hubSpotService.createDealFromConstruction(hubspotData);
        console.log('🔍 Respuesta completa de HubSpot:', hubspotResponse);
        if (import.meta.env.DEV) {
          hubspotDealId = hubspotResponse.id;
        } else {
          hubspotDealId = hubspotResponse.dealId || 
                         hubspotResponse.id || 
                         hubspotResponse.recordId ||
                         hubspotResponse.data?.id ||
                         hubspotResponse.data?.dealId;
        }
        if (hubspotDealId && typeof hubspotDealId !== 'string') {
          hubspotDealId = String(hubspotDealId);
        }
        console.log('✅ Deal ID extraído:', hubspotDealId);
        alert(`🎯 DEAL CREADO: ${hubspotDealId} (tipo: ${typeof hubspotDealId})`);
      } catch (hubspotError) {
        console.error('⚠️ Error creando deal en HubSpot:', hubspotError);
        alert('❌ ERROR en HubSpot: ' + (hubspotError instanceof Error ? hubspotError.message : String(hubspotError)));
      }

      // 3. Actualizar la obra con el id del deal
      if (hubspotDealId) {
        try {
          const { error: updateError } = await supabase
            .from("construction")
            .update({ hubspot_deal_id: hubspotDealId })
            .eq("id", construction.id);
          if (updateError) {
            console.error('⚠️ Error actualizando hubspot_deal_id en obra:', updateError);
          } else {
            construction.hubspot_deal_id = hubspotDealId;
          }
        } catch (updateError) {
          console.error('⚠️ Error actualizando hubspot_deal_id en obra:', updateError);
        }
      }

      alert(`🎯 OBRA CREADA: ID=${construction.id}, HUBSPOT_ID=${construction.hubspot_deal_id}`);

      // Verificación adicional: consultar la BD directamente después de insertar
      try {
        const { data: verificacion, error: verifyError } = await supabase
          .from("construction")
          .select("id, name, hubspot_deal_id")
          .eq("id", construction.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Error verificando inserción:', verifyError);
        } else {
          console.log('🔍 Verificación directa de BD:', verificacion);
        }
      } catch (verifyError) {
        console.error('❌ Error en verificación:', verifyError);
      }

      console.log('✅ Construcción creada:', construction.id, 'con HubSpot Deal:', hubspotDealId);
      setConstructions((prev: Construction[]) => [construction, ...prev]);
      return { success: true, data: construction };
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
