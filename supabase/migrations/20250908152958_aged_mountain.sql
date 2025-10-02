/*
  # Configurar políticas RLS para documentos y Storage

  1. Políticas para tabla documents
    - Permitir SELECT, INSERT, UPDATE, DELETE para usuarios públicos
    - Necesario para que la aplicación funcione sin autenticación

  2. Políticas para Storage bucket documents
    - Permitir SELECT, INSERT, UPDATE, DELETE en el bucket
    - Configurar bucket como público si no existe
    - Políticas permisivas para operaciones de archivos

  3. Configuración del bucket
    - Crear bucket si no existe
    - Configurar como público para descargas
    - Establecer límites apropiados
*/

-- Habilitar RLS en la tabla documents si no está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable insert access for all users" ON documents;
DROP POLICY IF EXISTS "Enable update access for all users" ON documents;
DROP POLICY IF EXISTS "Enable delete access for all users" ON documents;

-- Crear políticas permisivas para la tabla documents
CREATE POLICY "Enable read access for all users" ON documents
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON documents
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON documents
  FOR DELETE USING (true);

-- Crear bucket documents si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Eliminar políticas existentes del bucket para evitar conflictos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- Crear políticas para el bucket documents en storage.objects
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Public Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents');

CREATE POLICY "Public Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents');