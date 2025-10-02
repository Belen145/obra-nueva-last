/*
  # Actualización del esquema para el wizard de creación de obras

  1. Nuevas tablas
    - `addresses` - Para almacenar direcciones de obras y fiscales
    - `societies` - Para información de sociedades/empresas
    - `responsible_persons` - Para datos del responsable
    - `construction_services` - Para servicios solicitados por obra
    - `service_connections` - Para tipos de acometidas

  2. Modificaciones
    - Actualizar tabla `construction` con nuevos campos
    - Agregar relaciones necesarias

  3. Seguridad
    - Habilitar RLS en todas las tablas
    - Crear políticas de acceso
*/

-- Tabla para direcciones (obras y fiscales)
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  street TEXT NOT NULL,
  number TEXT,
  block TEXT,
  staircase TEXT,
  floor TEXT,
  letter TEXT,
  province TEXT NOT NULL,
  municipality TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  address_type TEXT NOT NULL CHECK (address_type IN ('construction', 'fiscal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para sociedades
CREATE TABLE IF NOT EXISTS societies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cif TEXT NOT NULL UNIQUE,
  fiscal_address_id INTEGER REFERENCES addresses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para responsables
CREATE TABLE IF NOT EXISTS responsible_persons (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para tipos de acometidas
CREATE TABLE IF NOT EXISTS connection_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar tipos de acometidas por defecto
INSERT INTO connection_types (name) VALUES 
  ('Obra'),
  ('Definitiva'),
  ('Ambos')
ON CONFLICT (name) DO NOTHING;

-- Tabla para servicios de construcción
CREATE TABLE IF NOT EXISTS construction_services (
  id SERIAL PRIMARY KEY,
  construction_id INTEGER REFERENCES construction(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN ('luz', 'gas', 'agua', 'telefonia')),
  connection_type_id INTEGER REFERENCES connection_types(id),
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar tabla construction
DO $$
BEGIN
  -- Agregar nuevos campos a construction
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'construction' AND column_name = 'housing_count'
  ) THEN
    ALTER TABLE construction ADD COLUMN housing_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'construction' AND column_name = 'construction_address_id'
  ) THEN
    ALTER TABLE construction ADD COLUMN construction_address_id INTEGER REFERENCES addresses(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'construction' AND column_name = 'society_id'
  ) THEN
    ALTER TABLE construction ADD COLUMN society_id INTEGER REFERENCES societies(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'construction' AND column_name = 'responsible_person_id'
  ) THEN
    ALTER TABLE construction ADD COLUMN responsible_person_id INTEGER REFERENCES responsible_persons(id);
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsible_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_services ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (permitir todo por ahora, ajustar según necesidades)
CREATE POLICY "Allow all operations on addresses" ON addresses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on societies" ON societies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on responsible_persons" ON responsible_persons FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on connection_types" ON connection_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on construction_services" ON construction_services FOR ALL TO authenticated USING (true);