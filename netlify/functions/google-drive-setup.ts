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

// --- Google Drive API helpers ---

async function createFolder(name: string, parentId: string, accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error creando carpeta "${name}" en Drive: ${err}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
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
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    if (!serviceAccountKey || !parentFolderId) {
      console.error('❌ Faltan variables de entorno: GOOGLE_SERVICE_ACCOUNT_KEY o GOOGLE_DRIVE_PARENT_FOLDER_ID');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Google Drive no configurado en el servidor' }),
      };
    }

    // Parsear body
    const body = JSON.parse(event.body || '{}');
    const { constructionId, constructionName, services } = body as {
      constructionId: number;
      constructionName: string;
      services: Array<{
        serviceId: number;
        serviceTypeName: string;
        categories: string[];
      }>;
    };

    if (!constructionName || !services) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Faltan parámetros: constructionName, services' }),
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

    // 1. Crear carpeta raíz de la obra
    console.log(`📁 Creando carpeta raíz: "${constructionName}"`);
    const constructionFolderId = await createFolder(constructionName, parentFolderId, accessToken);
    console.log(`✅ Carpeta raíz creada: ${constructionFolderId}`);

    // 2. Crear subcarpetas por servicio y categoría
    const serviceFolders: Array<{
      serviceId: number;
      folderId: string;
      categoryFolders: Array<{ category: string; folderId: string }>;
    }> = [];

    for (const service of services) {
      console.log(`📁 Creando carpeta servicio: "${service.serviceTypeName}"`);
      const serviceFolderId = await createFolder(service.serviceTypeName, constructionFolderId, accessToken);
      console.log(`✅ Carpeta servicio creada: ${serviceFolderId}`);

      const categoryFolders: Array<{ category: string; folderId: string }> = [];

      for (const category of service.categories) {
        console.log(`  📁 Creando carpeta categoría: "${category}"`);
        const categoryFolderId = await createFolder(category, serviceFolderId, accessToken);
        console.log(`  ✅ Carpeta categoría creada: ${categoryFolderId}`);
        categoryFolders.push({ category, folderId: categoryFolderId });
      }

      serviceFolders.push({
        serviceId: service.serviceId,
        folderId: serviceFolderId,
        categoryFolders,
      });
    }

    console.log('🎉 Estructura de Google Drive creada correctamente');

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        constructionFolderId,
        serviceFolders,
      }),
    };

  } catch (err: any) {
    console.error('💥 Error en google-drive-setup:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Error interno al crear estructura en Google Drive',
        details: err?.message || String(err),
      }),
    };
  }
}
