import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_TOKEN = process.env.HUBSPOT_API_TOKEN!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Validar token de autorización
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'No autorizado' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }

  try {
    const { service_id, type_id } = JSON.parse(event.body || '{}');

    // Validación de parámetros
    if (!service_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'service_id es requerido' }),
      };
    }

    if (type_id === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'type_id es requerido' }),
      };
    }

    // Actualizar el type_id en la tabla services
    const { data, error } = await supabase
      .from('services')
      .update({ type_id })
      .eq('id', service_id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando tipo de servicio:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Tipo de servicio actualizado correctamente',
        data,
      }),
    };
  } catch (err: any) {
    console.error('Error inesperado:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Error interno del servidor' }),
    };
  }
};
