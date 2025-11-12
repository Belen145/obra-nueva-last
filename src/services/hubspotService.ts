class HubSpotService {
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN;
    
    // Configuración diferente para desarrollo vs producción
    this.baseUrl = import.meta.env.DEV 
      ? '/api/hubspot'  // Proxy local en desarrollo
      : '/.netlify/functions';  // Netlify functions en producción
  }

  private async makeRequest(endpoint: string, method: string = 'POST', data?: any) {
    // En desarrollo: llamada directa a HubSpot API
    // En producción: llamada a nuestra función Netlify
    const url = import.meta.env.DEV 
      ? `${this.baseUrl}${endpoint}`
      : `${this.baseUrl}/hubspot-deals`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Solo agregar Authorization en desarrollo
    if (import.meta.env.DEV) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      // En desarrollo: formato HubSpot directo
      // En producción: formato para nuestra función
      const body = import.meta.env.DEV 
        ? data 
        : { constructionData: data.constructionData || data };
      
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createDealFromConstruction(constructionData: {
    name: string;
    address: string;
    postal_code: string;
    municipality: string;
    responsible_name: string;
    responsible_lastname: string;
    responsible_phone: string;
    responsible_email: string;
    company_name?: string;
    company_cif?: string;
    fiscal_address?: string;
    housing_count?: number;
    acometida?: string;
    servicios_obra?: string[];
  }) {
    try {
      // Preparar datos para desarrollo (HubSpot API directo)
      const dealData = {
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

      // En producción, enviamos todos los datos a la función
      const requestData = import.meta.env.DEV 
        ? dealData
        : constructionData;

      const endpoint = import.meta.env.DEV ? '/crm/v3/objects/deals' : '';
      const response = await this.makeRequest(endpoint, 'POST', requestData);

      // En desarrollo: response.id
      // En producción: response.dealId
      const dealId = import.meta.env.DEV ? response.id : response.dealId;
      
      console.log('Deal creado en HubSpot con todos los campos:', dealId);
      return response;

    } catch (error) {
      console.error('Error al crear deal en HubSpot:', error);
      throw error;
    }
  }
}

export const hubSpotService = new HubSpotService();