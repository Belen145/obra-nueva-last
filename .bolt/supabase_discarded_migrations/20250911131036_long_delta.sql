/*
  # Añadir documento de Autorización UFD

  1. Nuevo Tipo de Documento
    - `documentation_type`: "Autorización UFD" en categoría "Autorizaciones"
  
  2. Documento Requerido para Servicio
    - `service_required_document`: Asociar "Autorización UFD" con "Luz - Obra" (service_type_id: 1)
  
  3. Documento Específico de Distribuidora
    - `distributor_required_document`: Asociar el documento con UFD (distributor_id: 2)
  
  4. Seguridad
    - Mantener las políticas RLS existentes
*/

-- 1. Crear el nuevo tipo de documento "Autorización UFD"
INSERT INTO documentation_type (name, category, url_template)
VALUES ('Autorización UFD', 'Autorizaciones', NULL);

-- 2. Obtener el ID del tipo de documento recién creado y crear el registro en service_required_document
DO $$
DECLARE
    ufd_doc_type_id INTEGER;
    ufd_service_required_id INTEGER;
BEGIN
    -- Obtener el ID del tipo de documento "Autorización UFD"
    SELECT id INTO ufd_doc_type_id 
    FROM documentation_type 
    WHERE name = 'Autorización UFD';
    
    -- Crear el registro en service_required_document para "Luz - Obra" (service_type_id: 1)
    INSERT INTO service_required_document (service_type_id, document_type_id)
    VALUES (1, ufd_doc_type_id)
    RETURNING id INTO ufd_service_required_id;
    
    -- Crear el registro en distributor_required_document para UFD (distributor_id: 2)
    INSERT INTO distributor_required_document (distributor_id, service_required_document_id)
    VALUES (2, ufd_service_required_id);
    
    -- Log de confirmación
    RAISE NOTICE 'Documento "Autorización UFD" creado exitosamente:';
    RAISE NOTICE '- documentation_type.id: %', ufd_doc_type_id;
    RAISE NOTICE '- service_required_document.id: %', ufd_service_required_id;
    RAISE NOTICE '- Asociado a UFD (distributor_id: 2)';
END $$;