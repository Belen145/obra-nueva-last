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
      const { data, error: createError } = await supabase
        .from("services")
        .insert({
          construction_id: constructionId,
          type_id: typeId,
          status_id: 1, // Estado inicial
          comment: comment || null,
        })
        .select(
          `
          id,
          construction_id,
          type_id,
          status_id,
          comment,
          service_type:type_id (
            id,
            name
          ),
          status:services_status!status_id (
            id,
            name
          )
        `
        )
        .single();
      if (createError) {
        console.error("Error creating service:", createError);
        throw new Error(`Error al crear el servicio: ${createError.message}`);
      }
      if (!data) {
        throw new Error("No se pudo crear el servicio");
      }
      return data as unknown as CreatedService;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al crear el servicio";
      console.error("Error in createService:", message);
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
