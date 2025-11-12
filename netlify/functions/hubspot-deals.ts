export async function handler(event: any, context: any) {
  console.log('🚀 Función hubspot-deals iniciada');
  console.log('📝 Event method:', event.httpMethod);

  // Headers para CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    const { constructionData } = JSON.parse(event.body);
    console.log('📥 Datos recibidos:', JSON.stringify(constructionData, null, 2));

    // Validar que tengamos los datos necesarios
    if (!constructionData || !constructionData.name) {
      console.log('❌ Faltan datos de construcción');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan datos de construcción' })
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

    // Owner ID configurable para producción
    const ownerId = process.env.HUBSPOT_OWNER_ID || '158118434';
    console.log('👤 Owner ID usado:', ownerId);

    // Crear deal en HubSpot con todos los campos
    const dealProperties = {
      properties: {
        dealname: constructionData.name,
        dealstage: '205747816',
        hubspot_owner_id: ownerId, // ✅ Configurable por entorno
        enviar_presupuesto: true,
        direccion_obra: constructionData.address || '',
        codigo_postal_obra: constructionData.postal_code || '',
        municipio_obra: constructionData.municipality || '',
        razon_social_peticionario: constructionData.company_name || '',
        cif_peticionario: constructionData.company_cif || '',
        domicilio_fiscal_peticionario: constructionData.fiscal_address || '',
        numero_viviendas: constructionData.housing_count || 0,
        acometida: constructionData.acometida || '',
        servicios_obra: Array.isArray(constructionData.servicios_obra) 
          ? constructionData.servicios_obra.join(';') 
          : constructionData.servicios_obra || '',
      }
    };

    console.log('🚀 Enviando a HubSpot:', JSON.stringify(dealProperties, null, 2));

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dealProperties),
    });

    console.log('📡 Respuesta HubSpot status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error de HubSpot:', errorText);
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Deal creado exitosamente:', result.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dealId: result.id,
        message: 'Deal creado exitosamente'
      }),
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
      }),
    };
  }
}