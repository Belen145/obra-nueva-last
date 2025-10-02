import React, { useState, useEffect, useRef } from 'react';
import { FileText, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentTextFormProps {
  documentTypeId: number;
  documentTypeName: string;
  serviceId: number;
  serviceName: string;
  existingContent?: string | null;
  existingDocumentId?: number | null;
  onSuccess?: () => void;
}

/**
 * Formulario para crear o editar el contenido de un documento de texto asociado a un servicio.
 * Permite guardar, actualizar y manejar el estado del documento.
 */
export default function DocumentTextForm({
  documentTypeId,
  documentTypeName,
  serviceId,
  serviceName,
  existingContent = null,
  existingDocumentId = null,
  onSuccess,
}: DocumentTextFormProps) {
  // Estado local para el contenido, guardado y errores
  const [content, setContent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const { onDocumentStatusUpdate } = useServiceStatusTransition(); // No se usa

  // Inicializar el contenido al montar o cambiar existingContent
  useEffect(() => {
    setContent(existingContent || '');
    setError(null);
  }, [existingContent]);

  // Autoguardado con debounce
  useEffect(() => {
    if (content === (existingContent || '')) return;
    setSaved(false);
    setSaving(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        setError(null);
        if (!content.trim()) {
          setError('El contenido no puede estar vacío');
          setSaving(false);
          return;
        }
        if (existingDocumentId) {
          // Update
          const { error } = await supabase
            .from('documents')
            .update({
              content_text: content,
              updated_at: new Date().toISOString(),
              document_status_id: 3,
            })
            .eq('id', existingDocumentId);
          if (error) throw error;
        } else {
          // Insert
          const { error } = await supabase.from('documents').insert({
            service_id: serviceId,
            document_type_id: documentTypeId,
            content_text: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            document_status_id: 3,
          });
          if (error) throw error;
        }
        setSaved(true);
        if (onSuccess) onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setSaving(false);
      }
    }, 1000);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [content, documentTypeId, serviceId, existingDocumentId]);

  return (
    <div className="bg-white rounded-xl w-full max-w-2xl mx-4 my-4 p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        {existingDocumentId ? (
          <Edit3 className="w-6 h-6 text-blue-600 mr-3" />
        ) : (
          <FileText className="w-6 h-6 text-blue-600 mr-3" />
        )}
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {existingDocumentId ? 'Editar Contenido' : 'Escribir Contenido'}
          </h2>
          <p className="text-sm text-gray-600">{documentTypeName}</p>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Servicio:</strong> {serviceName}
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Service ID: {serviceId} • Document Type ID: {documentTypeId}
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <span className="w-5 h-5 text-red-500 mr-3">!</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contenido del Documento *
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe aquí el contenido del documento..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={12}
        />
        <p className="text-xs text-gray-500 mt-1">
          Caracteres: {content.length}
        </p>
        <span className="text-xs text-gray-400 h-4">
          {saving ? 'Guardando...' : saved ? 'Guardado' : ''}
        </span>
      </div>
      {content.trim() && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vista previa del texto aportado:
          </label>
          <div className="whitespace-pre-line bg-gray-50 border border-gray-200 rounded p-3 text-gray-800">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
