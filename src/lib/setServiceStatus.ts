import { supabase } from '../lib/supabase';

/**
 * Cambia el estado de un servicio al ID indicado
 * @param {number} serviceId - ID del servicio
 * @param {number} newStatusId - Nuevo estado
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setServiceStatus(serviceId: number, newStatusId: number) {
  const { error } = await supabase
    .from('services')
    .update({ status_id: newStatusId })
    .eq('id', serviceId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
