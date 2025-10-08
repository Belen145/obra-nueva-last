import React, { useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentTypeId: number;
  documentTypeName: string;
  serviceId: number;
  serviceName: string;
}

/**
 * Modal para subir un documento asociado a un servicio.
 * Permite seleccionar, arrastrar y subir archivos, mostrando mensajes de éxito y error.
 */
export default function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  documentTypeId,
  documentTypeName,
  serviceId,
  serviceName,
}: DocumentUploadModalProps) {
  // Estado local para archivo seleccionado, drag&drop y mensajes
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { uploadDocument, uploading, error, clearError } = useDocumentUpload();

  /**
   * Maneja la selección de archivo desde el input.
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      clearError();
      setSuccessMessage(null);
    }
  };

  /**
   * Maneja el evento drag over para resaltar el área de drop.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  /**
   * Maneja el evento drag leave para quitar el resaltado.
   */
  const handleDragLeave = () => {
    setDragOver(false);
  };

  /**
   * Maneja el drop de archivo en el área de drop.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      clearError();
      setSuccessMessage(null);
    }
  };

  /**
   * Maneja la subida del archivo seleccionado.
   */
  const handleUpload = async () => {
    if (!selectedFile) return;
    const result = await uploadDocument({
      file: selectedFile,
      documentTypeId,
      serviceId,
    });
    if (result.success) {
      setSuccessMessage(result.message || 'Documento subido exitosamente');
      setSelectedFile(null);
      // Esperar un momento para mostrar el mensaje de éxito
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    }
  };

  /**
   * Limpia el estado local y cierra el modal.
   */
  const handleClose = () => {
    setSelectedFile(null);
    setSuccessMessage(null);
    clearError();
    onClose();
  };

  /**
   * Formatea el tamaño de archivo a una cadena legible.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Upload className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Subir Documento
              </h2>
              <p className="text-sm text-gray-600">{documentTypeName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Service Info */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Servicio:</strong> {serviceName}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Service ID: {serviceId} • Document Type ID: {documentTypeId}
            </p>
          </div>

          {/* Success Message */}
          {/* {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
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
          )} */}

          {/* Error Message */}
          {/* {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )} */}

          {/* File Upload Area */}
          <div
            className={`border-2 border-dotted rounded-lg p-6 text-center transition-all duration-300 ${
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
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Cambiar archivo
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
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </label>
              </div>
            )}
          </div>

          {/* File Types Info */}
          <p className="text-xs text-gray-500 mt-2 text-center">
            Formatos soportados: PDF, DOC, DOCX, JPG, JPEG, PNG
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {uploading ? (
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
}
