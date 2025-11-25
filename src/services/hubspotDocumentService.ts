import { supabase } from '../lib/supabase';

interface DocumentSyncData {
  documentId: number;
  serviceId: number;
  documentTypeId: number;
  link?: string | null;
  contentText?: string | null;
}

interface HubSpotUpdateData {
  dealId: string;
  propertyName: string;
  propertyValue: string;
}

class HubSpotDocumentService {
  /**
   * Sincroniza un documento con HubSpot cuando se sube o actualiza
   */
  async syncDocumentToHubSpot(data: DocumentSyncData): Promise<boolean> {
    try {
      console.log('🚀 HubSpot Document Sync - Iniciando sincronización...', {
        documentId: data.documentId,
        serviceId: data.serviceId,
        documentTypeId: data.documentTypeId
      });

      // 1. Obtener el hubspot_deal_id de la construcción
      const dealId = await this.getConstructionDealId(data.serviceId);
      if (!dealId) {
        console.warn('⚠️ No se encontró hubspot_deal_id para el servicio:', data.serviceId);
        return false;
      }

      // 2. Obtener la propiedad HubSpot del tipo de documento
      const hubspotProperty = await this.getDocumentHubSpotProperty(data.documentTypeId);
      if (!hubspotProperty) {
        console.warn('⚠️ No se encontró propiedad HubSpot para document_type_id:', data.documentTypeId);
        return false;
      }

      // 3. Preparar el contenido según las reglas
      const contentValue = this.prepareDocumentContent(data.link, data.contentText);
      if (!contentValue) {
        console.warn('⚠️ No hay contenido para sincronizar');
        return false;
      }

      // 4. Actualizar el Deal en HubSpot
      const success = await this.updateHubSpotDeal({
        dealId,
        propertyName: hubspotProperty,
        propertyValue: contentValue
      });

      if (success) {
        console.log('✅ Documento sincronizado con HubSpot exitosamente');
      } else {
        console.error('❌ Error al sincronizar documento con HubSpot');
      }

      return success;

    } catch (error) {
      console.error('💥 Error en syncDocumentToHubSpot:', error);
      return false;
    }
  }

  /**
   * Obtiene el hubspot_deal_id de la construcción asociada al servicio
   */
  private async getConstructionDealId(serviceId: number): Promise<string | null> {
    try {
      console.log('🔍 Buscando hubspot_deal_id para serviceId:', serviceId);

      const { data, error } = await supabase
        .from('services')
        .select(`
          construction_id,
          construction!inner(
            hubspot_deal_id
          )
        `)
        .eq('id', serviceId)
        .single();

      if (error) {
        console.error('❌ Error consultando hubspot_deal_id:', error);
        return null;
      }

      const dealId = data?.construction?.hubspot_deal_id;
      console.log('🎯 hubspot_deal_id encontrado:', dealId);

      return dealId || null;

    } catch (error) {
      console.error('💥 Error en getConstructionDealId:', error);
      return null;
    }
  }

  /**
   * Obtiene la propiedad HubSpot del tipo de documento
   */
  private async getDocumentHubSpotProperty(documentTypeId: number): Promise<string | null> {
    try {
      console.log('🔍 Buscando propiedad HubSpot para document_type_id:', documentTypeId);

      const { data, error } = await supabase
        .from('documentation_type')
        .select('hubspot_document, name')
        .eq('id', documentTypeId)
        .single();

      if (error) {
        console.error('❌ Error consultando hubspot_document:', error);
        return null;
      }

      const hubspotProperty = data?.hubspot_document;
      console.log('🎯 Propiedad HubSpot encontrada:', {
        documentName: data?.name,
        hubspotProperty
      });

      return hubspotProperty || null;

    } catch (error) {
      console.error('💥 Error en getDocumentHubSpotProperty:', error);
      return null;
    }
  }

  /**
   * Prepara el contenido del documento según las reglas definidas
   */
  private prepareDocumentContent(link?: string | null, contentText?: string | null): string | null {
    const hasLink = link && link.trim();
    const hasContent = contentText && contentText.trim();

    console.log('📝 Preparando contenido:', { hasLink: !!hasLink, hasContent: !!hasContent });

    if (hasLink && hasContent) {
      // Ambos campos: separados por salto de línea
      return `${link}\n${contentText}`;
    } else if (hasLink) {
      // Solo link
      return link;
    } else if (hasContent) {
      // Solo content_text
      return contentText;
    }

    // Ninguno de los dos
    return null;
  }

  /**
   * Actualiza una propiedad específica de un Deal en HubSpot
   */
  private async updateHubSpotDeal(data: HubSpotUpdateData): Promise<boolean> {
    try {
      console.log('📤 Actualizando Deal en HubSpot:', {
        dealId: data.dealId,
        property: data.propertyName,
        valueLength: data.propertyValue.length
      });

      // Llamar a la función Netlify para actualizar HubSpot
      const response = await fetch('/.netlify/functions/hubspot-update-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId: data.dealId,
          propertyName: data.propertyName,
          propertyValue: data.propertyValue
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response de HubSpot:', errorText);
        return false;
      }

      const result = await response.json();
      console.log('✅ Deal actualizado en HubSpot:', result);

      return result.success === true;

    } catch (error) {
      console.error('💥 Error en updateHubSpotDeal:', error);
      return false;
    }
  }
}

export const hubSpotDocumentService = new HubSpotDocumentService();