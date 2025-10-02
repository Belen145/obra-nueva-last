/*
  # Trigger para servicios tipo "ambos"

  1. Función de trigger
    - Detecta cuando se inserta un servicio con type_id correspondiente a "ambos"
    - Cancela la inserción original
    - Crea dos registros: uno para "obra" y otro para "definitiva"

  2. Trigger
    - Se ejecuta BEFORE INSERT en la tabla services
    - Aplica la lógica de división automática

  3. Mapeo de IDs
    - Asume que los type_id siguen el patrón:
      - Luz: obra=1, definitiva=2, ambos=9
      - Agua: obra=3, definitiva=4, ambos=10  
      - Gas: obra=5, definitiva=6, ambos=11
      - Telefonía: obra=7, definitiva=8, ambos=12
*/

-- Función que maneja la lógica de servicios "ambos"
CREATE OR REPLACE FUNCTION handle_ambos_service()
RETURNS TRIGGER AS $$
DECLARE
    obra_type_id INTEGER;
    definitiva_type_id INTEGER;
BEGIN
    -- Mapear type_id de "ambos" a sus equivalentes "obra" y "definitiva"
    CASE NEW.type_id
        WHEN 9 THEN  -- Luz ambos
            obra_type_id := 1;
            definitiva_type_id := 2;
        WHEN 10 THEN -- Agua ambos
            obra_type_id := 3;
            definitiva_type_id := 4;
        WHEN 11 THEN -- Gas ambos
            obra_type_id := 5;
            definitiva_type_id := 6;
        WHEN 12 THEN -- Telefonía ambos
            obra_type_id := 7;
            definitiva_type_id := 8;
        ELSE
            -- Si no es un tipo "ambos", permitir la inserción normal
            RETURN NEW;
    END CASE;

    -- Insertar servicio tipo "obra"
    INSERT INTO services (type_id, status_id, construction_id, comment)
    VALUES (obra_type_id, NEW.status_id, NEW.construction_id, 
            COALESCE(NEW.comment, '') || ' - Obra');

    -- Insertar servicio tipo "definitiva"
    INSERT INTO services (type_id, status_id, construction_id, comment)
    VALUES (definitiva_type_id, NEW.status_id, NEW.construction_id, 
            COALESCE(NEW.comment, '') || ' - Definitiva');

    -- Cancelar la inserción original del tipo "ambos"
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_handle_ambos_service ON services;
CREATE TRIGGER trigger_handle_ambos_service
    BEFORE INSERT ON services
    FOR EACH ROW
    EXECUTE FUNCTION handle_ambos_service();

-- Insertar los tipos de servicio "ambos" si no existen
INSERT INTO service_type (id, name) VALUES 
    (9, 'Luz - Ambos'),
    (10, 'Agua - Ambos'),
    (11, 'Gas - Ambos'),
    (12, 'Telefonía - Ambos')
ON CONFLICT (id) DO NOTHING;