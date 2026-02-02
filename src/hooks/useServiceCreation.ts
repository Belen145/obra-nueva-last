import { useState } from "react";
import { supabase } from "../lib/supabase";
export interface ServiceTypeInput {
  typeIds: number[];
  comment?: string;
}
interface ServiceTypeDB {
  id: number;
  name: string;
}
interface CreateServiceParams {
  constructionId: number;
  typeId: number;
  comment?: string;
}
interface CreatedService {
  id: number;
  construction_id: number;
  type_id: number;
  status_id: number;
  comment: string | null;
  service_type: ServiceTypeDB;
  status: {
    id: number;
    name: string;
  };
}
export function useServiceCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createService = async (
    params: CreateServiceParams
  ): Promise<CreatedService> => {
    const { constructionId, typeId, comment } = params;
    
    try {
      // Validar que el tipo de servicio existe
      const { data: serviceTypeCheck, error: typeCheckError } = await supabase
        .from("service_type")
        .select("id, name")
        .eq("id", typeId)
        .maybeSingle();

      if (typeCheckError) {
        throw new Error(`Error al validar tipo de servicio: ${typeCheckError.message}`);
      }

      if (!serviceTypeCheck) {
        throw new Error(`No existe un tipo de servicio con ID: ${typeId}`);
      }

      // Validar que la construcción existe
      const { data: constructionCheck, error: constructionCheckError } = await supabase
        .from("construction")
        .select("id")
        .eq("id", constructionId)
        .maybeSingle();

      if (constructionCheckError) {
        throw new Error(`Error al validar construcción: ${constructionCheckError.message}`);
      }

      if (!constructionCheck) {
        throw new Error(`No existe una construcción con ID: ${constructionId}`);
      }

      // Obtener estado inicial válido
      const { data: statusCheck } = await supabase
        .from("services_status")
        .select("id, name")
        .eq("id", 1)
        .maybeSingle();

      const statusId = statusCheck?.id || 1;

      // Intentar crear el servicio
      const { data: serviceDataArray, error: createError } = await supabase
        .from("services")
        .insert({
          construction_id: constructionId,
          type_id: typeId,
          status_id: statusId,
          comment: comment || null,
        })
        .select("id, construction_id, type_id, status_id, comment");

      if (createError) {
        throw new Error(`Error al crear el servicio: ${createError.message}`);
      }

      if (serviceDataArray && serviceDataArray.length > 0) {
        // Caso normal: inserción con select exitosa
        const serviceData = serviceDataArray[0];
        const result: CreatedService = {
          ...serviceData,
          service_type: { id: serviceTypeCheck.id, name: serviceTypeCheck.name },
          status: statusCheck || { id: statusId, name: "Estado inicial" }
        };
        return result;
      } else {
        // Caso especial: inserción sin select (para typeId=9 y similares)
        const { error: insertOnlyError } = await supabase
          .from("services")
          .insert({
            construction_id: constructionId,
            type_id: typeId,
            status_id: statusId,
            comment: comment || null,
          });

        if (insertOnlyError) {
          throw new Error(`Error al insertar servicio: ${insertOnlyError.message}`);
        }

        // Crear resultado mock para casos donde no se puede hacer select
        const result: CreatedService = {
          id: -1, // ID mock para casos especiales
          construction_id: constructionId,
          type_id: typeId,
          status_id: statusId,
          comment: comment || null,
          service_type: { id: serviceTypeCheck.id, name: serviceTypeCheck.name },
          status: statusCheck || { id: statusId, name: "Estado inicial" }
        };
        return result;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al crear el servicio";
      console.error(`Error in createService para typeId ${typeId}:`, message);
      throw error;
    }
  };
  const createMultipleServices = async (
    constructionId: number,
    serviceInputs: ServiceTypeInput[],
    globalComment?: string
  ): Promise<CreatedService[]> => {
    setIsCreating(true);
    setError(null);
    try {
      if (!serviceInputs.length) {
        throw new Error("No se proporcionaron tipos de servicio");
      }
      const createdServices: CreatedService[] = [];
      // Procesar cada tipo de servicio
      for (const input of serviceInputs) {
        const { typeIds, comment = globalComment } = input;
        // Verificar que se proporcionaron IDs de tipo de servicio
        if (!typeIds.length) {
          console.warn("Se ignoro un servicio sin tipos seleccionados");
          continue;
        }
        // Obtener información de los tipos de servicio seleccionados
        const { data: selectedTypes, error: typesError } = await supabase
          .from("service_type")
          .select("id, name")
          .in("id", typeIds);
        if (typesError) {
          throw new Error(
            `Error al obtener los tipos de servicio: ${typesError.message}`
          );
        }
        if (!selectedTypes?.length) {
          throw new Error(
            `No se encontraron los tipos de servicio con IDs: ${typeIds.join(
              ", "
            )}`
          );
        }

        // Crear los servicios para cada tipo seleccionado
        for (const serviceType of selectedTypes) {
          try {
            const createdService = await createService({
              constructionId,
              typeId: serviceType.id,
              comment,
            });
            createdServices.push(createdService);
          } catch (serviceError) {
            console.error(
              `Error al crear el servicio ${serviceType.name}:`,
              serviceError
            );
            // En caso de error, intentar revertir los servicios ya creados
            if (createdServices.length > 0) {
              await Promise.all(
                createdServices.map((service) =>
                  supabase.from("services").delete().eq("id", service.id)
                )
              );
            }
            throw serviceError;
          }
        }
      }
      return createdServices;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error desconocido al crear servicios";
      console.error("Error en createMultipleServices:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };
  return {
    createService,
    createMultipleServices,
    isCreating,
    error,
  };
}
