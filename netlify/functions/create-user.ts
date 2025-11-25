import { createClient } from '@supabase/supabase-js';

export async function handler(event: any, context: any) {
  console.log('👤 Función create-user iniciada');
  console.log('📝 Event method:', event.httpMethod);

  // Headers para CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Manejar CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Respondiendo a preflight CORS');
    return { statusCode: 200, headers, body: '' };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    console.log('❌ Método no permitido:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validar que el body existe
    if (!event.body) {
      console.log('❌ No hay body en la request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    const { email, password, companyId } = JSON.parse(event.body);
    
    console.log('📥 Datos recibidos:', {
      email: email || 'No proporcionado',
      password: password ? '✅ Proporcionado' : '❌ Falta',
      companyId: companyId || 'No proporcionado'
    });

    // Validar campos requeridos
    if (!email || !password || !companyId) {
      console.log('❌ Faltan campos obligatorios');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: { email: !!email, password: !!password, companyId: !!companyId }
        })
      };
    }

    // Verificar credenciales de Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 Variables de entorno:', {
      supabaseUrl: supabaseUrl ? '✅ Configurada' : '❌ Falta',
      serviceRoleKey: supabaseServiceKey ? '✅ Configurada' : '❌ Falta'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Configuración de Supabase no encontrada');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database configuration not found',
          missing: {
            supabaseUrl: !supabaseUrl,
            serviceRoleKey: !supabaseServiceKey
          }
        })
      };
    }

    console.log('🔧 Creando cliente admin de Supabase...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('👤 Creando usuario en auth...');

    // 1. Crear usuario en auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirmar email
    });

    if (authError) {
      console.error('❌ Error creando usuario en auth:', authError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Error creating user in auth',
          details: authError.message
        })
      };
    }

    console.log('✅ Usuario creado en auth:', {
      id: authUser.user?.id,
      email: authUser.user?.email
    });

    // 2. Crear registro en tabla users
    console.log('💾 Creando registro en tabla users...');

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user?.id,
        username: email,
        company_id: parseInt(companyId)
      })
      .select('*')
      .single();

    if (userError) {
      console.error('❌ Error creando registro en users:', userError);
      
      // Si falla, intentar eliminar el usuario de auth para mantener consistencia
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user?.id || '');
        console.log('🧹 Usuario de auth eliminado por rollback');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error creating user record',
          details: userError.message
        })
      };
    }

    console.log('✅ Usuario registrado exitosamente:', userRecord);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          id: authUser.user?.id,
          email: authUser.user?.email,
          username: userRecord.username,
          company_id: userRecord.company_id
        }
      }),
    };

  } catch (error: any) {
    console.error('💥 Error en función:', error);
    console.error('💥 Stack trace:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      }),
    };
  }
}