import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import { ServiceIncidenceInfo } from './ServiceIncidenceInfo';
import { supabase } from '../lib/supabase';

// ---------------------------------------------
// ServiceIncidenceModal
// Modal for resolving service incidences (upload file or text, update status)
// ---------------------------------------------

interface ServiceIncidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
}

// Main modal component
export const ServiceIncidenceModal: React.FC<ServiceIncidenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  service,
}) => {
  // --------------------
  // State Management
  // --------------------

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // El objeto service ya viene completo desde ConstructionView

  // --------------------
  // File and Text Handlers
  // --------------------

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Drag and drop handlers

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // --------------------
  // Submission Logic
  // --------------------

  const handleSubmit = async () => {
    // Validar que al menos uno de los campos esté lleno
    if (!selectedFile && !textContent.trim()) {
      setError('Debes subir un archivo o escribir un texto para continuar');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      console.log('🔄 Procesando incidencia para servicio:', service.id);

      let fileUrl: string | null = null;

      // 1. Subir archivo si existe
      if (selectedFile) {
        console.log('📁 Subiendo archivo:', selectedFile.name);

        const timestamp = Date.now();
        const fileExtension = selectedFile.name.split('.').pop();
        const cleanFileName = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `incidence_${timestamp}_${cleanFileName}.${fileExtension}`;
        const filePath = `incidences/${service.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('❌ Error subiendo archivo:', uploadError);
          throw new Error(`Error al subir archivo: ${uploadError.message}`);
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        console.log('✅ Archivo subido exitosamente:', fileUrl);
      }

      // 2. Guardar en incidence_documents
      console.log('💾 Guardando documento de incidencia...');

      const { data: incidenceDoc, error: incidenceError } = await supabase
        .from('incidence_documents')
        .insert({
          service_id: service.id,
          service_status_id: service.status_id,
          link: fileUrl,
          content_text: textContent.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (incidenceError) {
        console.error(
          '❌ Error guardando documento de incidencia:',
          incidenceError
        );
        // Si falla el guardado, eliminar el archivo subido
        if (fileUrl && selectedFile) {
          await supabase.storage
            .from('documents')
            .remove([`incidences/${service.id}/${selectedFile.name}`]);
        }
        throw new Error(
          `Error al guardar documento de incidencia: ${incidenceError.message}`
        );
      }

      console.log('✅ Documento de incidencia guardado:', incidenceDoc);

      // 3. Transicionar servicio al estado 19
      console.log('🔄 Transicionando servicio al estado 19...');

      const { error: updateError } = await supabase
        .from('services')
        .update({
          status_id: 19,
          updated_at: new Date().toISOString(),
        })
        .eq('id', service.id);

      if (updateError) {
        console.error(
          '❌ Error actualizando estado del servicio:',
          updateError
        );
        throw new Error(
          `Error al actualizar estado del servicio: ${updateError.message}`
        );
      }

      console.log('✅ Servicio transicionado exitosamente al estado 19');

      // 4. Mostrar éxito y cerrar
      setSuccessMessage(
        'Incidencia procesada exitosamente. El servicio ha sido actualizado.'
      );

      // Esperar un momento para mostrar el mensaje
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('❌ Error procesando incidencia:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedFile(null);
      setTextContent('');
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  // --------------------
  // Utility Functions
  // --------------------

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --------------------
  // Render Logic
  // --------------------

  const canSubmit = (selectedFile || textContent.trim()) && !submitting;

  if (!isOpen) return null;

  // --------------------
  // Main Render
  // --------------------

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Resolver Incidencia
              </h2>
              <p className="text-sm text-gray-600">
                {service.service_type?.name || `Servicio ${service.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tracker y Observaciones */}
        <div className="px-6 pt-4">
          <ServiceIncidenceInfo service={service} />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Service Info */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-900">
                  Estado de Incidencia Detectado
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  <strong>Estado actual:</strong>{' '}
                  {service.services_status?.name || 'Sin estado'}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Service ID: {service.id} • Status ID: {service.status_id}
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    ¡Éxito!
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Subir Archivo (Opcional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-3">
                    <FileText className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      disabled={submitting}
                      className="text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      Quitar archivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload
                      className={`w-12 h-12 mx-auto ${
                        dragOver ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Arrastra un archivo aquí
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        o haz clic para seleccionar
                      </p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      disabled={submitting}
                      className="hidden"
                      id="incidence-file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    />
                    <label
                      htmlFor="incidence-file-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivo
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Text Content Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Descripción o Comentarios (Opcional)
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={submitting}
                placeholder="Describe la incidencia, las acciones tomadas, o cualquier información relevante..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Caracteres: {textContent.length}
              </p>
            </div>

            {/* Requirement Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    Requisitos
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Debes proporcionar al menos un archivo <strong>o</strong>{' '}
                    escribir una descripción. No es necesario completar ambos
                    campos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Resolver Incidencia
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
