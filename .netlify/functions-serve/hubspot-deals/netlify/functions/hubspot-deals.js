var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/hubspot-deals.ts
var hubspot_deals_exports = {};
__export(hubspot_deals_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(hubspot_deals_exports);
async function handler(event, context) {
  console.log("\u{1F680} Funci\xF3n hubspot-deals iniciada");
  console.log("\u{1F4DD} Event method:", event.httpMethod);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    console.log("\u2705 Respondiendo a preflight CORS");
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    console.log("\u274C M\xE9todo no permitido:", event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    if (!event.body) {
      console.log("\u274C No hay body en la request");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No body provided" })
      };
    }
    const { constructionData } = JSON.parse(event.body);
    console.log("\u{1F4E5} Datos recibidos:", JSON.stringify(constructionData, null, 2));
    if (!constructionData || !constructionData.name) {
      console.log("\u274C Faltan datos de construcci\xF3n");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Faltan datos de construcci\xF3n" })
      };
    }
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!hubspotToken) {
      console.log("\u274C Token de HubSpot no configurado");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "HubSpot token not configured" })
      };
    }
    console.log("\u{1F511} Token encontrado:", hubspotToken.substring(0, 10) + "...");
    const ownerId = process.env.HUBSPOT_OWNER_ID || "158118434";
    console.log("\u{1F464} Owner ID usado:", ownerId);
    const dealProperties = {
      properties: {
        dealname: constructionData.name,
        dealstage: "205747816",
        hubspot_owner_id: ownerId,
        // ✅ Configurable por entorno
        enviar_presupuesto: true,
        direccion_obra: constructionData.address || "",
        codigo_postal_obra: constructionData.postal_code || "",
        municipio_obra: constructionData.municipality || "",
        razon_social_peticionario: constructionData.company_name || "",
        cif_peticionario: constructionData.company_cif || "",
        domicilio_fiscal_peticionario: constructionData.fiscal_address || "",
        numero_viviendas: constructionData.housing_count || 0,
        acometida: constructionData.acometida || "",
        servicios_obra: Array.isArray(constructionData.servicios_obra) ? constructionData.servicios_obra.join(";") : constructionData.servicios_obra || ""
      }
    };
    console.log("\u{1F680} Enviando a HubSpot:", JSON.stringify(dealProperties, null, 2));
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hubspotToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dealProperties)
    });
    console.log("\u{1F4E1} Respuesta HubSpot status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log("\u274C Error de HubSpot:", errorText);
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    console.log("\u2705 Deal creado exitosamente:", result.id);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dealId: result.id,
        message: "Deal creado exitosamente"
      })
    };
  } catch (error) {
    console.error("\u{1F4A5} Error en funci\xF3n:", error);
    console.error("\u{1F4A5} Stack trace:", error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=hubspot-deals.js.map
