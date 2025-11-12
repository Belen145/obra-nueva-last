export async function handler(event: any, context: any) {
  // Headers para CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Manejar CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { constructionData } = JSON.parse(event.body || '{}');

    // Validar que tengamos los datos necesarios
    if (!constructionData || !constructionData.name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan datos de construcción' })
      };
    }

    // Crear deal en HubSpot con todos los campos
    const dealProperties = {
      properties: {
        dealname: constructionData.name,
        dealstage: '205747816',
        hubspot_owner_id: '158118434',
        enviar_presupuesto: true,
        direccion_obra: constructionData.address || '',
        codigo_postal_obra: constructionData.postal_code || '',
        municipio_obra: constructionData.municipality || '',
        razon_social_peticionario: constructionData.company_name || '',
        cif_peticionario: constructionData.company_cif || '',
        domicilio_fiscal_peticionario: constructionData.fiscal_address || '',
        numero_viviendas: constructionData.housing_count || 0,
        acometida: constructionData.acometida || '',
        servicios_obra: constructionData.servicios_obra ? constructionData.servicios_obra.join(';') : '',
      }
    };

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dealProperties),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot API Error:', errorText);
      throw new Error(`HubSpot API Error: ${response.status}`);
    }

    const result = await response.json();

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
    console.error('Error en función:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor'
      }),
    };
  }
}