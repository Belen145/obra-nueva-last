export async function handler(event: any, context: any) {
  console.log('🚀 Función hubspot-update-deal iniciada');
  console.log('📝 Event method:', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Respondiendo a preflight CORS');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ Método no permitido:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validar body
    if (!event.body) {
      console.log('❌ No hay body en la request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    const { dealId, propertyName, propertyValue } = JSON.parse(event.body);
    console.log('📥 Datos recibidos:', { 
      dealId, 
      propertyName, 
      propertyValueLength: propertyValue?.length 
    });

    // Validar parámetros requeridos
    if (!dealId || !propertyName || !propertyValue) {
      console.log('❌ Faltan parámetros requeridos');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Faltan parámetros: dealId, propertyName, propertyValue' 
        })
      };
    }

    // Verificar token de HubSpot
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!hubspotToken) {
      console.log('❌ Token de HubSpot no configurado');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'HubSpot token not configured' })
      };
    }

    console.log('🔑 Token encontrado:', hubspotToken.substring(0, 10) + '...');

    // Preparar datos para actualizar el Deal
    const updateData = {
      properties: {
        [propertyName]: propertyValue
      }
    };

    console.log('📤 Actualizando Deal en HubSpot:', {
      dealId,
      property: propertyName,
      valuePreview: propertyValue.substring(0, 100) + '...'
    });

    // Llamar a la API de HubSpot para actualizar el Deal
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    console.log('📡 Respuesta HubSpot status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error de HubSpot:', errorText);
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Deal actualizado exitosamente:', result.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dealId: result.id,
        message: 'Deal actualizado exitosamente'
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
        error: 'Error interno del servidor',
        details: error.message
      })
    };
  }
}