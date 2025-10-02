/*
  # Crear bucket de documentos en Supabase Storage

  1. Storage Bucket
    - Crear bucket 'documents' si no existe
    - Configurar como público para permitir descargas
    - Establecer políticas de seguridad básicas

  2. Políticas RLS
    - Permitir SELECT (lectura) para todos los usuarios
    - Permitir INSERT (subida) para usuarios autenticados
    - Permitir UPDATE para usuarios autenticados
    - Permitir DELETE para usuarios autenticados
*/

-- Crear el bucket 'documents' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública de documentos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Política para permitir subida de documentos a usuarios autenticados
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Política para permitir actualización de documentos a usuarios autenticados
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Política para permitir eliminación de documentos a usuarios autenticados
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');