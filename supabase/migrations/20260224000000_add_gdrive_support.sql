-- Añadir columna gdrive_folder_id a la tabla construction
ALTER TABLE construction ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;

-- Añadir columna gdrive_folder_id a la tabla services
ALTER TABLE services ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;

-- Crear tabla para almacenar los IDs de carpetas de categorías en Google Drive
CREATE TABLE IF NOT EXISTS gdrive_category_folders (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, category)
);

-- Habilitar RLS
ALTER TABLE gdrive_category_folders ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden ver y gestionar sus propias carpetas
CREATE POLICY "authenticated_all" ON gdrive_category_folders
  FOR ALL USING (auth.role() = 'authenticated');
