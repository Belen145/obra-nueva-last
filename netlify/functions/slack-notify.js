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
    console.log('🔗 URL del webhook:', webhookUrl.substring(0, 50) + '...');
    console.log('📋 Mensaje a enviar:', JSON.stringify(slackMessage, null, 2));

    try {
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
            details: errorText,
            slackStatus: response.status 
          })
        };
      }
    } catch (fetchError) {
      console.log('❌ Error en fetch a Slack:', fetchError.message);
      console.log('🔍 Stack trace:', fetchError.stack);
      
      // Intentar envío simple como fallback
      try {
        console.log('🔄 Intentando envío simple como fallback...');
        const simpleMessage = {
          text: `📋 Nuevo documento subido\n🏗️ Obra: ${requestBody.obra}\n📄 Documento: ${requestBody.documento}`
        };
        
        const fallbackResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(simpleMessage),
        });
        
        if (fallbackResponse.ok) {
          console.log('✅ Envío simple exitoso');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              message: 'Notificación enviada a Slack (modo simple)' 
            })
          };
        } else {
          console.log('❌ Fallback también falló:', fallbackResponse.status);
        }
      } catch (fallbackError) {
        console.log('❌ Error en fallback:', fallbackError.message);
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error interno', 
          details: fetchError.message,
          stack: fetchError.stack
        })
      };
    }
  } catch (error) {
    console.log('❌ Error general en función:', error.message);
    console.log('🔍 Stack trace general:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno general', 
        details: error.message,
        stack: error.stack
      })
    };
  }
};