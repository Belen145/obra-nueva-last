import { createSign } from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createJWT(serviceAccount: any): string {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })));

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${header}.${payload}.${signature}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = createJWT(serviceAccount);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error obteniendo access token de Google: ${err}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

export async function handler(event: any, _context: any) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Google Drive no configurado en el servidor' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { fileId } = body as { fileId: string };

    if (!fileId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Falta parámetro: fileId' }),
      };
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    console.log('🔑 Obteniendo access token de Google...');
    const accessToken = await getAccessToken(serviceAccount);

    // Mover a papelera con PATCH (funciona con rol Editor en Shared Drive)
    // DELETE permanente requiere rol Organizador/Gestor y es ignorado silenciosamente por Google con Editor
    console.log(`🗑️ Moviendo fichero a papelera de Drive: ${fileId}`);
    const deleteRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      }
    );

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const err = await deleteRes.text();
      throw new Error(`Error moviendo fichero a papelera de Drive: ${err}`);
    }

    console.log(`✅ Fichero movido a papelera de Drive: ${fileId}`);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };

  } catch (err: any) {
    console.error('💥 Error en google-drive-delete:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Error interno al eliminar fichero de Google Drive',
        details: err?.message || String(err),
      }),
    };
  }
}
