-- Añadir columna gdrive_file_id a la tabla documents para sincronización con Google Drive
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT;
