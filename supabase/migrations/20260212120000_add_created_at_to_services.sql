-- Añadir columna created_at a la tabla services para registrar la fecha de inicio de gestión
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Actualizar registros existentes: usar updated_at como valor inicial si existe, sino NOW()
UPDATE services 
SET created_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL;

-- Añadir comentario a la columna
COMMENT ON COLUMN services.created_at IS 'Fecha de inicio de gestión del suministro';
