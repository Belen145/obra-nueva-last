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
    const { construction_id, distributor_id } = JSON.parse(event.body || '{}');

    // Validación de parámetros
    if (!construction_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'construction_id es requerido' }),
      };
    }

    if (distributor_id === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'distributor_id es requerido' }),
      };
    }

    // Actualizar el distributor_id en la tabla construction
    const { data, error } = await supabase
      .from('construction')
      .update({ distributor_id })
      .eq('id', construction_id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando distribuidora:', error);
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
        message: 'Distribuidora actualizada correctamente',
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
