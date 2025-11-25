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

    const { email, password, username, companyId } = JSON.parse(event.body);
    console.log('📥 Datos recibidos:', { email, username, companyId });

    // Validar campos requeridos
    if (!email || !password || !username || !companyId) {
      console.log('❌ Faltan campos obligatorios');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Campos obligatorios faltantes',
          required: ['email', 'password', 'username', 'companyId']
        })
      };
    }

    // Verificar credenciales de Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Credenciales de Supabase no configuradas');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Crear cliente de Supabase con credenciales de admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔑 Cliente admin creado, creando usuario...');

    // 1. Crear usuario en auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        username: username
      }
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

    console.log('✅ Usuario creado en auth:', authUser.user?.id);

    // 2. Crear registro en tabla users
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user?.id,
        username: username,
        company_id: parseInt(companyId)
      })
      .select()
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