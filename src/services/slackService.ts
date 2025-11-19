interface SlackNotificationData {
  obraName: string;
  documentName: string;
  downloadUrl: string;
  userName: string;
  userEmail: string;
}

class SlackService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL || '';
  }

  isConfigured(): boolean {
    const isConfigured = !!this.webhookUrl;
    console.log('🔧 SlackService: Verificando configuración...', {
      hasWebhookUrl: isConfigured,
      webhookUrlLength: this.webhookUrl.length
    });
    return isConfigured;
  }

  async notifyDocumentUploaded(data: SlackNotificationData): Promise<boolean> {
    console.log('🔄 SlackService: Iniciando notificación...');
    console.log('📋 SlackService: Datos recibidos:', {
      obraName: data.obraName,
      documentName: data.documentName,
      userName: data.userName,
      hasDownloadUrl: !!data.downloadUrl
    });

    if (!this.webhookUrl) {
      console.log('❌ SlackService: Webhook no configurado');
      console.log('🔍 SlackService: Variable de entorno VITE_SLACK_WEBHOOK_URL:', import.meta.env.VITE_SLACK_WEBHOOK_URL ? 'EXISTE' : 'NO EXISTE');
      return false;
    }

    console.log('✅ SlackService: Webhook configurado');

    try {
      const message = {
        text: `📄 Nuevo documento subido en ${data.obraName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📄 Documento Subido'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*🏗️ Obra:*\n${data.obraName}`
              },
              {
                type: 'mrkdwn',
                text: `*📋 Documento:*\n${data.documentName}`
              },
              {
                type: 'mrkdwn',
                text: `*👤 Usuario:*\n${data.userName}\n${data.userEmail}`
              },
              {
                type: 'mrkdwn',
                text: `*📅 Fecha:*\n${new Date().toLocaleString('es-ES')}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Haz clic para descargar el documento:'
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '⬇️ Descargar'
              },
              url: data.downloadUrl
            }
          }
        ]
      };

      console.log('📤 SlackService: Enviando mensaje a Slack...');
      console.log('🔗 SlackService: URL del webhook:', this.webhookUrl.substring(0, 50) + '...');

      // En desarrollo, usar directamente la función de Netlify para evitar CORS
      if (import.meta.env.DEV) {
        try {
          console.log('🔄 SlackService: Modo desarrollo - usando función de Netlify directamente...');
          
          const netlifyUrl = `${window.location.origin}/.netlify/functions/slack-notify`;
          console.log('🔗 SlackService: URL de Netlify:', netlifyUrl);
          
          const netlifyResponse = await fetch(netlifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }), // Enviar el mensaje formateado
          });

          console.log('📡 SlackService: Respuesta de función Netlify:', {
            status: netlifyResponse.status,
            statusText: netlifyResponse.statusText,
            ok: netlifyResponse.ok
          });

          if (netlifyResponse.ok) {
            const responseData = await netlifyResponse.json();
            console.log('✅ SlackService: Notificación enviada via Netlify Functions:', responseData);
            return true;
          }
          
          const errorData = await netlifyResponse.json().catch(() => ({ error: 'Error desconocido' }));
          console.log('❌ SlackService: Error en Netlify Functions:', errorData);
          return false;
        } catch (netlifyError) {
          console.log('❌ SlackService: Error en Netlify Functions:', netlifyError);
          return false;
        }
      }

      // En producción, usar función de Netlify
      try {
        console.log('🔄 SlackService: Modo producción - usando función de Netlify...');
        
        const netlifyUrl = '/.netlify/functions/slack-notify';
        console.log('🔗 SlackService: URL de Netlify:', netlifyUrl);
        
        const netlifyResponse = await fetch(netlifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }), // Enviar el mensaje formateado
        });

        console.log('📡 SlackService: Respuesta de función Netlify:', {
          status: netlifyResponse.status,
          statusText: netlifyResponse.statusText,
          ok: netlifyResponse.ok
        });

        if (netlifyResponse.ok) {
          const responseData = await netlifyResponse.json();
          console.log('✅ SlackService: Notificación enviada via Netlify Functions:', responseData);
          return true;
        }
        
        const errorData = await netlifyResponse.json().catch(() => ({ error: 'Error desconocido' }));
        console.log('❌ SlackService: Error en Netlify Functions:', errorData);
      } catch (netlifyError) {
        console.log('❌ SlackService: Error en Netlify Functions:', netlifyError);
      }

      // Si todo falla, mostrar en consola para desarrollo
      console.log('🧪 SlackService: Todos los métodos fallaron - mostrando en consola para debug');
      console.log('📨 SlackService: Mensaje que se enviaría a Slack:', message);
      
      return false;

    } catch (error) {
      console.error('❌ SlackService: Error en notificación Slack:', error);
      return false;
    }
  }

  // Función temporal para testing
  async testSlackConnection(): Promise<boolean> {
    console.log('🧪 SlackService: Ejecutando test de conexión...');
    
    if (!this.isConfigured()) {
      console.error('❌ SlackService Test: Slack no está configurado');
      return false;
    }

    try {
      const testMessage = {
        text: `🧪 *Test de conexión Slack* - ${new Date().toLocaleString('es-ES')}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "🧪 *Test de conexión exitoso*\n\nEste es un mensaje de prueba para verificar que la integración con Slack funciona correctamente."
            }
          }
        ]
      };

      console.log('📤 SlackService Test: Enviando mensaje de prueba...');

      // En desarrollo, usar directamente la función de Netlify para evitar CORS
      if (import.meta.env.DEV) {
        try {
          console.log('🔄 SlackService Test: Modo desarrollo - usando función de Netlify directamente...');
          
          const netlifyUrl = `${window.location.origin}/.netlify/functions/slack-notify`;
          console.log('🔗 SlackService Test: URL de Netlify:', netlifyUrl);
          
          const netlifyResponse = await fetch(netlifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: testMessage }),
          });

          console.log('📡 SlackService Test: Respuesta de función Netlify:', {
            status: netlifyResponse.status,
            statusText: netlifyResponse.statusText,
            ok: netlifyResponse.ok
          });

          if (netlifyResponse.ok) {
            const responseData = await netlifyResponse.json();
            console.log('✅ SlackService Test: ¡Test exitoso via Netlify Functions!', responseData);
            return true;
          }
          
          const errorData = await netlifyResponse.json().catch(() => ({ error: 'Error desconocido' }));
          console.log('❌ SlackService Test: Error en Netlify Functions:', errorData);
          return false;
        } catch (netlifyError) {
          console.log('❌ SlackService Test: Error en Netlify Functions:', netlifyError);
          return false;
        }
      }

      // En producción, usar función de Netlify
      try {
        console.log('🔄 SlackService Test: Modo producción - usando función de Netlify...');
        
        const netlifyUrl = '/.netlify/functions/slack-notify';
        console.log('🔗 SlackService Test: URL de Netlify:', netlifyUrl);
        
        const netlifyResponse = await fetch(netlifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: testMessage }),
        });

        console.log('📡 SlackService Test: Respuesta de función Netlify:', {
          status: netlifyResponse.status,
          statusText: netlifyResponse.statusText,
          ok: netlifyResponse.ok
        });

        if (netlifyResponse.ok) {
          const responseData = await netlifyResponse.json();
          console.log('✅ SlackService Test: ¡Test exitoso via Netlify Functions!', responseData);
          return true;
        }
        
        const errorData = await netlifyResponse.json().catch(() => ({ error: 'Error desconocido' }));
        console.log('❌ SlackService Test: Error en Netlify Functions:', errorData);
      } catch (netlifyError) {
        console.log('❌ SlackService Test: Error en Netlify Functions:', netlifyError);
      }

      // Si todo falla, mostrar en consola
      console.log('🧪 SlackService Test: Todos los métodos fallaron - mostrando mensaje de prueba en consola');
      console.log('📨 SlackService Test: Mensaje que se enviaría a Slack:', testMessage);
      return false;

    } catch (error) {
      console.error('❌ SlackService Test: Error:', error);
      return false;
    }
  }
}

export const slackService = new SlackService();

// Exportar función de test para debugging desde consola
export const testSlackConnection = () => slackService.testSlackConnection();