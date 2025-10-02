// React and dependencies
import React, { useState } from 'react';
import { Upload, X, File, Check } from 'lucide-react';

/**
 * UploadView
 * UI for uploading files with drag-and-drop, progress, and metadata options.
 * Simulates upload progress for demonstration purposes.
 */
export default function UploadView() {
  // --- State ---
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<any[]>([]); // TODO: Add explicit type for fileData

  // --- Handlers ---
  /** Handle drag over event for dropzone */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  /** Handle drag leave event for dropzone */
  const handleDragLeave = () => {
    setDragOver(false);
  };

  /** Handle file drop event for dropzone */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  /** Handle file selection from input */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  /** Add new files to the list */
  const addFiles = (newFiles: File[]) => {
    const fileData = newFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      progress: 0,
      status: 'pending', // pending, uploading, completed, error
    }));
    setFiles((prev) => [...prev, ...fileData]);
  };

  /** Remove a file from the list */
  const removeFile = (id: number) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  /** Simulate uploading all pending files */
  const uploadFiles = () => {
    files.forEach((fileData) => {
      if (fileData.status === 'pending') {
        // Simulate upload
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: 'uploading' } : f
          )
        );

        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileData.id ? { ...f, progress } : f))
          );

          if (progress >= 100) {
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileData.id
                  ? { ...f, status: 'completed', progress: 100 }
                  : f
              )
            );
          }
        }, 200);
      }
    });
  };

  /** Returns the status icon for a file */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'uploading':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  // --- Render ---
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Subir Documentos
        </h2>
        <p className="text-gray-600">
          Arrastra y suelta archivos o selecciona desde tu dispositivo
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          className={`w-16 h-16 mx-auto mb-4 ${
            dragOver ? 'text-blue-500' : 'text-gray-400'
          }`}
        />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Arrastra archivos aquí
        </h3>
        <p className="text-gray-600 mb-6">
          o haz click para seleccionar archivos de tu dispositivo
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
        >
          <Upload className="w-5 h-5 mr-2" />
          Seleccionar Archivos
        </label>
      </div>

      {/* Upload Options */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Opciones de Subida</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Crear carpeta automáticamente
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Añadir etiquetas por defecto
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Notificar al equipo
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Metadatos</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Seleccionar categoría</option>
                <option>Contratos</option>
                <option>Facturas</option>
                <option>Reportes</option>
                <option>Presentaciones</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etiquetas
              </label>
              <input
                type="text"
                placeholder="Separar con comas"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Archivos Seleccionados ({files.length})
            </h3>
            <button
              onClick={uploadFiles}
              disabled={files.every((f) => f.status !== 'pending')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Subir Todos
            </button>
          </div>

          <div className="space-y-3">
            {files.map((fileData) => (
              <div
                key={fileData.id}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(fileData.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {fileData.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(fileData.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {fileData.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileData.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {fileData.progress}% completado
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
