exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('🚀 Función slack-notify iniciada');
    
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    console.log('🔍 Webhook URL configurada:', !!webhookUrl);
    
    if (!webhookUrl) {
      console.log('❌ SLACK_WEBHOOK_URL no configurada');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Webhook URL no configurada' })
      };
    }

    // Parse del body de la request
    const requestBody = JSON.parse(event.body || '{}');
    console.log('📨 Datos recibidos:', requestBody);

    // Crear el mensaje para Slack
    const slackMessage = {
      text: `📋 *Nuevo documento subido*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📋 Nuevo documento subido"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*🏗️ Obra:*\n${requestBody.obra || 'No especificada'}`
            },
            {
              type: "mrkdwn",
              text: `*📄 Documento:*\n${requestBody.documento || 'No especificado'}`
            },
            {
              type: "mrkdwn",
              text: `*📂 Categoría:*\n${requestBody.categoria || 'No especificada'}`
            },
            {
              type: "mrkdwn",
              text: `*📎 Archivo:*\n${requestBody.archivo || 'No especificado'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: requestBody.text || `✅ Documento *${requestBody.archivo || 'archivo'}* subido en la obra *${requestBody.obra || 'obra'}*`
          }
        }
      ]
    };

    console.log('📤 Enviando mensaje a Slack...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    console.log('📡 Respuesta de Slack:', response.status, response.statusText);

    if (response.ok) {
      console.log('✅ Notificación enviada exitosamente');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Notificación enviada a Slack' 
        })
      };
    } else {
      const errorText = await response.text();
      console.log('❌ Error de Slack:', errorText);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Error al enviar a Slack', 
          details: errorText 
        })
      };
    }
  } catch (error) {
    console.log('❌ Error en función:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno', 
        details: error.message 
      })
    };
  }
};