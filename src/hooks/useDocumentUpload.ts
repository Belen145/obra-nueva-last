import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useServiceStatusTransition } from "./useServiceStatusTransition";

interface UploadDocumentParams {
  file?: File; // Puede ser opcional si solo se sube texto
  documentTypeId: number;
  serviceId: number;
  documentStatusId: number;
  contentText?: string | null;
  isIncidenceResolution?: boolean;
}

interface DocumentUploadResult {
  success: boolean;
  document?: any;
  message?: string;
  error?: string;
}

export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const { transitionToNextStatus } = useServiceStatusTransition();

  const uploadDocument = async ({
    file,
    documentTypeId,
    serviceId,
    documentStatusId,
    contentText,
    isIncidenceResolution = false,
  }: UploadDocumentParams): Promise<DocumentUploadResult> => {
    setUploading(true);
    try {
      let link: string | null = null;
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${serviceId}_${documentTypeId}_${Date.now()}.${fileExt}`;
        const filePath = `documents/${serviceId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);
        link = urlData.publicUrl;
      }
      // Guardar registro en la tabla documents
      const documentData: any = {
        service_id: serviceId,
        document_type_id: documentTypeId,
        link: link,
        document_status_id: documentStatusId,
        content_text: contentText || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();
      if (dbError) throw dbError;
      // Si es resolución de incidencia, transicionar el estado
      if (isIncidenceResolution) {
        const transitionResult = await transitionToNextStatus(serviceId);
        if (!transitionResult.success) {
          console.warn(
            "No se pudo transicionar el estado:",
            transitionResult.message
          );
        }
      }
      setUploading(false);
      return {
        success: true,
        document,
        message: "Documento subido exitosamenteeeeeeeee",
      };
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploading(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  };

  return {
    uploadDocument,
    uploading,
  };
}
