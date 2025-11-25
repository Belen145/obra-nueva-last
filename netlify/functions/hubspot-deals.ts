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

    const { constructionData, serviceIds } = JSON.parse(event.body);
    console.log('📥 Datos recibidos:', JSON.stringify(constructionData, null, 2));
    console.log('📤 Service IDs recibidos:', serviceIds);

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

    // Mapear service IDs a campos de HubSpot según el tipo
    const serviceTypeMapping: Record<number, string> = {
      1: 'construction_electric_service_id',
      2: 'final_electric_service_id', 
      3: 'construction_water_service_id',
      4: 'final_water_service_id',
      5: 'pci_water_service_id',
      6: 'construction_telecom_service_id',
      7: 'construction_gas_service_id'
    };

    // Crear deal en HubSpot con todos los campos
    const dealProperties: any = {
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

    // Agregar service IDs según el mapeo
    if (serviceIds && typeof serviceIds === 'object') {
      console.log('📝 Procesando service IDs para HubSpot...');
      
      Object.entries(serviceIds).forEach(([serviceTypeId, serviceId]) => {
        const typeId = parseInt(serviceTypeId);
        const hubspotField = serviceTypeMapping[typeId];
        
        if (hubspotField && serviceId) {
          // Validar que serviceId sea un número válido
          const serviceIdNum = parseInt(String(serviceId));
          if (!isNaN(serviceIdNum) && serviceIdNum > 0) {
            dealProperties.properties[hubspotField] = String(serviceIdNum);
            console.log(`✅ Mapeado: service_type ${typeId} -> ${hubspotField} = ${serviceIdNum}`);
          } else {
            console.log(`❌ Service ID inválido para tipo ${typeId}:`, serviceId);
          }
        } else {
          console.log(`⚠️ Tipo de servicio no reconocido o sin ID:`, { typeId, serviceId, hubspotField });
        }
      });
    }

    console.log('📝 Propiedades finales del Deal:', dealProperties.properties);

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