import { createSign } from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- Google Drive Auth (sin dependencias npm, usa crypto nativo) ---

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

// --- Google Drive upload multipart ---

async function uploadFileToDrive(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  const boundary = `-------boundary_${Date.now()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  // Construir cuerpo multipart manualmente
  const metaPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
  ].join('\r\n');

  const filePart = `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const metaBytes = Buffer.from(metaPart + filePart, 'utf-8');
  const fileBytes = Buffer.from(fileBuffer);
  const closingBytes = Buffer.from(closing, 'utf-8');

  const body = Buffer.concat([metaBytes, fileBytes, closingBytes]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': String(body.length),
      },
      body,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error subiendo fichero a Google Drive: ${err}`);
  }

  return await response.json() as { id: string; webViewLink: string };
}

// --- Handler principal ---

export async function handler(event: any, _context: any) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Leer variables de entorno
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      console.error('❌ Falta variable de entorno: GOOGLE_SERVICE_ACCOUNT_KEY');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Google Drive no configurado en el servidor' }),
      };
    }

    // Parsear body
    const body = JSON.parse(event.body || '{}');
    const { fileUrl, fileName, mimeType, folderId, additionalFolderIds } = body as {
      fileUrl: string;
      fileName: string;
      mimeType: string;
      folderId: string;
      additionalFolderIds?: string[];
    };

    if (!fileUrl || !fileName || !folderId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Faltan parámetros: fileUrl, fileName, folderId' }),
      };
    }

    // Parsear credenciales de la cuenta de servicio
    const serviceAccount = JSON.parse(serviceAccountKey);
    // Normalizar saltos de línea de la clave privada (problema común en env vars)
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    // Obtener access token de Google
    console.log('🔑 Obteniendo access token de Google...');
    const accessToken = await getAccessToken(serviceAccount);
    console.log('✅ Access token obtenido');

    // Descargar el fichero desde Supabase
    console.log(`⬇️ Descargando fichero desde: ${fileUrl}`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`No se pudo descargar el fichero desde Supabase: ${fileResponse.status}`);
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(`✅ Fichero descargado (${fileBuffer.byteLength} bytes)`);

    // Subir a Google Drive (carpeta principal)
    const resolvedMimeType = mimeType || 'application/octet-stream';
    console.log(`⬆️ Subiendo "${fileName}" a carpeta Drive: ${folderId}`);
    const driveFile = await uploadFileToDrive(fileBuffer, fileName, resolvedMimeType, folderId, accessToken);
    console.log(`✅ Fichero subido a Drive: ${driveFile.id}`);

    // Añadir el mismo fichero a las carpetas adicionales (otros servicios de la misma obra)
    if (additionalFolderIds && additionalFolderIds.length > 0) {
      for (const extraFolderId of additionalFolderIds) {
        console.log(`📎 Añadiendo fichero a carpeta adicional: ${extraFolderId}`);
        const addRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${driveFile.id}?addParents=${extraFolderId}&supportsAllDrives=true&fields=id`,
          {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        if (addRes.ok) {
          console.log(`✅ Fichero añadido a carpeta: ${extraFolderId}`);
        } else {
          console.warn(`⚠️ No se pudo añadir a carpeta ${extraFolderId}:`, await addRes.text());
        }
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        driveFileId: driveFile.id,
        driveFileUrl: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
      }),
    };

  } catch (err: any) {
    console.error('💥 Error en google-drive-upload:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Error interno al subir fichero a Google Drive',
        details: err?.message || String(err),
      }),
    };
  }
}
