import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseServiceTypeChangeReturn {
  changeServiceType: (serviceId: number, newTypeId: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cambiar el tipo de un servicio existente.
 * Útil para servicios agrupados donde el usuario puede cambiar el tipo.
 */
export function useServiceTypeChange(): UseServiceTypeChangeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeServiceType = async (serviceId: number, newTypeId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Verificar que el nuevo tipo de servicio existe
      const { data: serviceType, error: serviceTypeError } = await supabase
        .from('service_type')
        .select('id, name')
        .eq('id', newTypeId)
        .single();

      if (serviceTypeError || !serviceType) {
        throw new Error('El tipo de servicio especificado no existe');
      }

      // Actualizar el tipo del servicio
      const { error: updateError } = await supabase
        .from('services')
        .update({ type_id: newTypeId })
        .eq('id', serviceId);

      if (updateError) {
        throw new Error(`Error al actualizar el servicio: ${updateError.message}`);
      }

      console.log(`✅ Servicio ${serviceId} actualizado al tipo ${newTypeId} (${serviceType.name})`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error en changeServiceType:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    changeServiceType,
    loading,
    error
  };
}