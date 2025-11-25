export async function handler(event: any, context: any) {
  console.log('🚀 Función hubspot-service-update iniciada');
  console.log('📝 Event method:', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Respondiendo a preflight CORS');
    return { statusCode: 200, headers, body: '' };
  }

  // Aceptar tanto POST como GET (por limitación de HubSpot)
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    console.log('❌ Método no permitido:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Only POST and GET methods allowed' })
    };
  }

  try {
    let serviceId, statusId, comment;

    // Manejar diferentes métodos
    if (event.httpMethod === 'POST') {
      // Datos desde body (método preferido)
      if (!event.body) {
        console.log('❌ No hay body en la request POST');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No body provided for POST request' })
        };
      }

      const bodyData = JSON.parse(event.body);
      serviceId = bodyData.serviceId || bodyData.service_id;
      statusId = bodyData.statusId || bodyData.status_id;
      comment = bodyData.comment;
      
      console.log('📥 Datos desde POST body:', { serviceId, statusId, comment });

    } else if (event.httpMethod === 'GET') {
      // Datos desde query parameters (para webhook de HubSpot)
      const queryParams = event.queryStringParameters || {};
      serviceId = queryParams.serviceId || queryParams.service_id;
      statusId = queryParams.statusId || queryParams.status_id;
      comment = queryParams.comment;
      
      console.log('📥 Datos desde GET query:', { serviceId, statusId, comment });
    }

    // Validar parámetros requeridos
    if (!serviceId) {
      console.log('❌ Falta service_id');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'service_id is required',
          received: { serviceId, statusId, comment }
        })
      };
    }

    // Validar que serviceId y statusId sean números válidos
    const serviceIdNum = parseInt(serviceId);
    const statusIdNum = statusId ? parseInt(statusId) : null;

    if (isNaN(serviceIdNum) || serviceIdNum <= 0) {
      console.log('❌ service_id inválido:', serviceId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'service_id must be a valid positive number',
          received: serviceId
        })
      };
    }

    if (statusId && (isNaN(statusIdNum) || statusIdNum <= 0)) {
      console.log('❌ status_id inválido:', statusId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'status_id must be a valid positive number',
          received: statusId
        })
      };
    }

    console.log('✅ Parámetros validados:', {
      serviceId: serviceIdNum,
      statusId: statusIdNum,
      comment: comment || 'null'
    });

    // Importar Supabase (necesitaremos la configuración)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Configuración de Supabase no encontrada');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database configuration not found' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar que el servicio existe
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, status_id, comment, construction_id')
      .eq('id', serviceIdNum)
      .single();

    if (serviceError) {
      console.log('❌ Error consultando servicio:', serviceError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Service not found',
          service_id: serviceIdNum,
          details: serviceError.message
        })
      };
    }

    console.log('📊 Servicio encontrado:', {
      id: serviceData.id,
      currentStatusId: serviceData.status_id,
      currentComment: serviceData.comment,
      constructionId: serviceData.construction_id
    });

    // Preparar datos para actualizar
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (statusIdNum) {
      updateData.status_id = statusIdNum;
    }

    if (comment !== undefined && comment !== null) {
      updateData.comment = comment;
    }

    console.log('📤 Actualizando servicio con:', updateData);

    // Actualizar el servicio
    const { data: updatedService, error: updateError } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', serviceIdNum)
      .select('id, status_id, comment, construction_id')
      .single();

    if (updateError) {
      console.log('❌ Error actualizando servicio:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to update service',
          details: updateError.message
        })
      };
    }

    console.log('✅ Servicio actualizado exitosamente:', {
      id: updatedService.id,
      newStatusId: updatedService.status_id,
      newComment: updatedService.comment
    });

    // Respuesta exitosa
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Service updated successfully',
        service: {
          id: updatedService.id,
          status_id: updatedService.status_id,
          comment: updatedService.comment,
          construction_id: updatedService.construction_id
        },
        changes: {
          status_changed: statusIdNum ? serviceData.status_id !== statusIdNum : false,
          comment_changed: comment !== undefined ? serviceData.comment !== comment : false
        }
      })
    };

  } catch (error) {
    console.error('💥 Error en función:', error);
    console.error('💥 Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
}