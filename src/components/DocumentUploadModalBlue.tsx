import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  ServiceProgressTracker,
  ServiceObservations,
} from './ServiceProgressTracker';
import { supabase } from '../lib/supabase';

interface DocumentUploadModalBlueProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
  serviceTypeStatuses?: any[];
}

export const DocumentUploadModalBlue: React.FC<
  DocumentUploadModalBlueProps
> = ({ isOpen, onClose, onSuccess, service, serviceTypeStatuses = [] }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handler para seleccionar archivo
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
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Subida de documento a la tabla documents
  const handleSubmit = async () => {
    if (!selectedFile && !textContent.trim()) {
      setError('Debes subir un archivo o escribir un texto para continuar');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      let fileUrl: string | null = null;
      if (selectedFile) {
        const timestamp = Date.now();
        const fileExtension = selectedFile.name.split('.').pop();
        const cleanFileName = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `document_${timestamp}_${cleanFileName}.${fileExtension}`;
        const filePath = `documents/${service.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError)
          throw new Error(`Error al subir archivo: ${uploadError.message}`);
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }
      // Guardar en tabla documents
      const { error: docError } = await supabase.from('documents').insert({
        service_id: service.id,
        link: fileUrl,
        content_text: textContent.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (docError)
        throw new Error(`Error al guardar documento: ${docError.message}`);
      setSuccessMessage('Documento subido exitosamente.');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Upload className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Subir Documentos
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
          <ServiceProgressTracker
            service={service}
            serviceTypeStatuses={serviceTypeStatuses}
            isIncidence={false}
          />
          <div className="mt-4">
            {/* Observaciones del servicio */}
            <ServiceObservations service={service} />
          </div>
        </div>
        {/* Content */}
        <div className="p-6">
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
                      id="document-file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    />
                    <label
                      htmlFor="document-file-upload"
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
                placeholder="Describe el documento, las acciones tomadas, o cualquier información relevante..."
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
            disabled={(!selectedFile && !textContent.trim()) || submitting}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
