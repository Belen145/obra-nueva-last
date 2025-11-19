// Servicio de notificaciones Slack para obra-nueva
// Utiliza Netlify Functions para evitar problemas de CORS

/**
 * Notifica la subida de un documento a Slack
 */
export async function notifyDocumentUploaded(
  obraName: string,
  documentName: string,
  categoria: string,
  archivo: string
): Promise<boolean> {
  console.log('🔔 Slack: Iniciando notificación de documento subido', {
    obra: obraName,
    documento: documentName,
    categoria,
    archivo
  });

  try {
    // Detectar entorno (desarrollo vs producción)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isDev ? 'http://localhost:8888' : window.location.origin;
    
    console.log(`🌍 Slack: Entorno detectado: ${isDev ? 'Desarrollo' : 'Producción'}`);
    console.log(`🔗 Slack: URL base: ${baseUrl}`);

    // Preparar mensaje para Slack
    const message = `🏗️ **Nuevo documento subido**\n**Obra:** ${obraName}\n**Documento:** ${documentName}\n**Categoría:** ${categoria}\n**Archivo:** ${archivo}`;

    // Llamar a la función Netlify
    const response = await fetch(`${baseUrl}/.netlify/functions/slack-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        obra: obraName,
        documento: documentName,
        categoria: categoria,
        archivo: archivo
      }),
    });

    console.log('📡 Slack: Respuesta de función Netlify:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Slack: Notificación enviada exitosamente', result);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('❌ Slack: Error en función Netlify:', errorData);
      return false;
    }

  } catch (error) {
    console.error('❌ Slack: Error enviando notificación:', error);
    return false;
  }
}

/**
 * Función de test para verificar conectividad con Slack
 */
export async function testSlackConnection(): Promise<boolean> {
  console.log('🧪 Slack: Iniciando test de conexión...');
  
  return notifyDocumentUploaded(
    'Test de Integración',
    'Documento de Prueba',
    'Test',
    'test-document.pdf'
  );
}