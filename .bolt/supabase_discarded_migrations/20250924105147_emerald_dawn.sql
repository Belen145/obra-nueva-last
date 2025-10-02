/*
  # Create service_type_status table for managing service status relationships

  1. New Tables
    - `service_type_status`
      - `id` (bigint, primary key)
      - `service_type_id` (integer, foreign key to service_type)
      - `services_status_id` (integer, foreign key to services_status)
      - `is_common` (boolean, indicates if status is common to all service types)
      - `requires_user_action` (boolean, indicates if user interaction is required)
      - `is_final` (boolean, indicates if this is a final status)
      - `order_position` (integer, for ordering statuses)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `service_type_status` table
    - Add policy for public read access

  3. Sample Data
    - Insert common statuses for all service types
    - Insert specific statuses for different service types
*/

CREATE TABLE IF NOT EXISTS service_type_status (
  id bigint PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id integer NOT NULL REFERENCES service_type(id) ON DELETE CASCADE,
  services_status_id integer NOT NULL REFERENCES services_status(id) ON DELETE CASCADE,
  is_common boolean DEFAULT false,
  requires_user_action boolean DEFAULT false,
  is_final boolean DEFAULT false,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_type_id, services_status_id)
);

ALTER TABLE service_type_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON service_type_status
  FOR SELECT
  TO public
  USING (true);

-- Insert common statuses (apply to all service types)
INSERT INTO service_type_status (service_type_id, services_status_id, is_common, requires_user_action, is_final, order_position)
SELECT 
  st.id as service_type_id,
  ss.id as services_status_id,
  true as is_common,
  CASE 
    WHEN ss.name ILIKE '%documentación%' THEN true
    WHEN ss.name ILIKE '%cliente%' THEN true
    ELSE false
  END as requires_user_action,
  CASE 
    WHEN ss.name ILIKE '%cancelado%' THEN true
    WHEN ss.name ILIKE '%cliente realiza%' THEN true
    WHEN ss.name ILIKE '%completado%' THEN true
    ELSE false
  END as is_final,
  ss.id as order_position
FROM service_type st
CROSS JOIN services_status ss
WHERE ss.name IN (
  'Recopilación De documentación',
  'Documentación Completa',
  'Enviado a la comercializadora',
  'Cliente realiza la gestión',
  'Cancelado'
);

-- Insert specific statuses for certain service types
INSERT INTO service_type_status (service_type_id, services_status_id, is_common, requires_user_action, is_final, order_position)
SELECT 
  st.id as service_type_id,
  ss.id as services_status_id,
  false as is_common,
  false as requires_user_action,
  false as is_final,
  ss.id + 100 as order_position
FROM service_type st
CROSS JOIN services_status ss
WHERE st.name ILIKE '%luz%' 
AND ss.name IN ('Revisión técnica', 'Instalación programada')
ON CONFLICT (service_type_id, services_status_id) DO NOTHING;