interface ServiceUpdateData {
  serviceId: number;
  statusId?: number;
  comment?: string;
}

interface ServiceUpdateResponse {
  success: boolean;
  message: string;
  service?: {
    id: number;
    status_id: number;
    comment: string;
    construction_id: number;
  };
  changes?: {
    status_changed: boolean;
    comment_changed: boolean;
  };
  error?: string;
  details?: string;
}

class HubSpotServiceUpdateService {
  private baseUrl: string;

  constructor() {
    // En desarrollo usa localhost, en producción usa la URL de Netlify
    this.baseUrl = import.meta.env.DEV 
      ? 'http://localhost:8888/.netlify/functions'
      : '/.netlify/functions';
  }

  /**
   * Actualiza el estado y/o comentario de un servicio desde HubSpot
   */
  async updateServiceFromHubSpot(data: ServiceUpdateData): Promise<ServiceUpdateResponse> {
    try {
      console.log('🔄 Actualizando servicio desde HubSpot:', data);

      const response = await fetch(`${this.baseUrl}/hubspot-service-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: data.serviceId,
          statusId: data.statusId,
          comment: data.comment
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Servicio actualizado:', result);

      return result;

    } catch (error) {
      console.error('💥 Error actualizando servicio:', error);
      throw error;
    }
  }

  /**
   * Genera la URL para webhook de HubSpot (método GET)
   * Útil para configurar en HubSpot workflows
   */
  generateWebhookUrl(baseUrl: string): string {
    return `${baseUrl}/.netlify/functions/hubspot-service-update?serviceId={{service_id}}&statusId={{status_id}}&comment={{comment}}`;
  }

  /**
   * Actualiza solo el estado del servicio
   */
  async updateServiceStatus(serviceId: number, statusId: number): Promise<ServiceUpdateResponse> {
    return this.updateServiceFromHubSpot({ serviceId, statusId });
  }

  /**
   * Actualiza solo el comentario del servicio
   */
  async updateServiceComment(serviceId: number, comment: string): Promise<ServiceUpdateResponse> {
    return this.updateServiceFromHubSpot({ serviceId, comment });
  }

  /**
   * Actualiza tanto estado como comentario
   */
  async updateServiceStatusAndComment(
    serviceId: number, 
    statusId: number, 
    comment: string
  ): Promise<ServiceUpdateResponse> {
    return this.updateServiceFromHubSpot({ serviceId, statusId, comment });
  }
}

export const hubSpotServiceUpdateService = new HubSpotServiceUpdateService();