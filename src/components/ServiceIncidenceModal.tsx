import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Check,
  Loader2,
  Trash2,
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isObservacionesExpanded, setIsObservacionesExpanded] = useState(false);
  const [showLeerMas, setShowLeerMas] = useState(false);

  const observacionesRef = useRef<HTMLDivElement>(null);

  // El objeto service ya viene completo desde ConstructionView

  // Check if observaciones text needs "Leer más" button
  useEffect(() => {
    if (observacionesRef.current && service.comment) {
      const lineHeight = 24; // Approximate line height in pixels (16px * 1.47)
      const maxHeight = lineHeight * 2; // 2 lines
      const actualHeight = observacionesRef.current.scrollHeight;
      setShowLeerMas(actualHeight > maxHeight);
    }
  }, [service.comment]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl w-full max-w-[796px] max-h-[90vh] overflow-y-auto relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ overflow: 'hidden' }}>
          {/* Main large ellipse - rotated 90 degrees */}
          <div
            className="absolute"
            style={{
              width: '769px',
              height: '321px',
              left: '513px',
              top: '218px',
              transform: 'rotate(90deg)',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.25) 0%, rgba(133, 163, 255, 0) 100%)',
              filter: 'blur(80px)',
            }}
          />
          {/* Smaller ellipse 1 */}
          <div
            className="absolute"
            style={{
              width: '255px',
              height: '87px',
              left: '595px',
              top: '321px',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(10, 71, 255, 0.2) 0%, rgba(10, 71, 255, 0) 100%)',
              filter: 'blur(50px)',
            }}
          />
          {/* Smaller ellipse 2 */}
          <div
            className="absolute"
            style={{
              width: '213px',
              height: '108px',
              left: '333px',
              top: '323px',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(0, 51, 204, 0.15) 0%, rgba(0, 51, 204, 0) 100%)',
              filter: 'blur(60px)',
            }}
          />
          {/* Smaller ellipse 3 */}
          <div
            className="absolute"
            style={{
              width: '213px',
              height: '108px',
              left: '280px',
              top: '350px',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(71, 117, 255, 0.18) 0%, rgba(71, 117, 255, 0) 100%)',
              filter: 'blur(55px)',
            }}
          />
          {/* Smaller ellipse 4 */}
          <div
            className="absolute"
            style={{
              width: '171px',
              height: '87px',
              left: '514px',
              top: '360px',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.22) 0%, rgba(133, 163, 255, 0) 100%)',
              filter: 'blur(45px)',
            }}
          />
        </div>

        {/* Header with close button */}
        <div className="flex justify-end p-2 relative z-10">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-4 rounded-full disabled:opacity-50"
          >
            <svg className="w-6 h-7 text-zen-grey-950" viewBox="0 0 16 16" fill="none">
              <use href="/icons.svg#x-close" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-10 pb-8 relative z-10">
          {/* Title and Status */}
          <div className="flex flex-col gap-5 mb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-zen-grey-50 flex items-center gap-1 px-2 py-1 rounded">
                  <span className="text-base font-semibold text-zen-grey-950">
                    {service.service_type?.name || `Servicio ${service.id}`}
                  </span>
                </div>
              </div>

              {/* Progress tracker */}
              <div className="py-2">
                <ServiceIncidenceInfo service={service} />
              </div>
            </div>

            {/* Incidencia badge */}
            <div className="bg-zen-grey-100 border border-zen-grey-300 rounded px-2 py-1 flex items-center justify-center self-start">
              <span className="text-xs text-zen-grey-600 font-normal">
                Incidencia
              </span>
            </div>
          </div>

          {/* Observaciones Section */}
          {service.comment && (
            <div className="flex flex-col gap-2 mb-10">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-zen-grey-600" viewBox="0 0 16 16" fill="none">
                  <use href="/icons.svg#chat-dots" />
                </svg>
                <span className="text-sm font-semibold text-zen-grey-600">
                  Observaciones
                </span>
              </div>
              <div
                ref={observacionesRef}
                className="text-base text-zen-grey-600 font-normal overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: isObservacionesExpanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.47',
                }}
              >
                {service.comment}
              </div>
              {showLeerMas && (
                <button
                  onClick={() => setIsObservacionesExpanded(!isObservacionesExpanded)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-zen-grey-100 transition-colors self-end"
                >
                  <span className="text-xs font-semibold text-zen-blue-500">
                    {isObservacionesExpanded ? 'Leer menos' : 'Leer más'}
                  </span>
                  <svg
                    className="w-4 h-4 text-zen-blue-500"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <use href={`/icons.svg#${isObservacionesExpanded ? 'arrow-up' : 'arrow-down'}`} />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
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
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" viewBox="0 0 16 16" fill="none">
                  <use href="/icons.svg#wrench" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tu respuesta Section */}
          <div className="flex flex-col gap-1 mb-10">
            <label className="text-sm font-medium text-zen-grey-700">
              Tu respuesta
            </label>
            <div className="border border-zen-grey-300 rounded overflow-hidden">
              {/* Text area */}
              <div className="bg-white p-4">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={submitting}
                  placeholder="Escribe tu respuesta aquí"
                  className="w-full text-base text-zen-grey-600 font-normal placeholder:text-zen-grey-500 resize-none focus:outline-none disabled:opacity-50"
                  rows={4}
                  style={{ lineHeight: '1.47' }}
                />

                {/* Files and Upload Button */}
                <div className="flex flex-col gap-4 mt-4">
                  {/* Display uploaded file */}
                  {selectedFile && (
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-white border border-zen-grey-300 rounded p-2 flex items-center gap-6">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-zen-grey-600" />
                          <span className="text-sm font-medium text-zen-grey-600 truncate">
                            {selectedFile.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          disabled={submitting}
                          className="shrink-0 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5 text-zen-grey-600" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Adjuntar archivo button */}
                  <div>
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
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-zen-grey-950 rounded cursor-pointer hover:bg-zen-grey-100 transition-colors"
                    >
                      <span className="text-xs font-semibold text-zen-grey-950">
                        Adjuntar archivo
                      </span>
                      <svg className="w-4 h-4 text-zen-grey-950" viewBox="0 0 12 13" fill="none">
                        <use href="/icons.svg#paperclip" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-[205px] flex items-center justify-center gap-2 px-4 py-3 bg-zen-error-200 text-zen-error-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zen-error-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-base font-semibold">Procesando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <use href="/icons.svg#wrench" />
                  </svg>
                  <span className="text-base font-semibold">Resolver incidencia</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
