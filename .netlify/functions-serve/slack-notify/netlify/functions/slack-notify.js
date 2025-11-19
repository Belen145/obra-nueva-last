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

// netlify/functions/slack-notify.ts
var slack_notify_exports = {};
__export(slack_notify_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(slack_notify_exports);
var handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "M\xE9todo no permitido" })
    };
  }
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("\u274C Slack webhook URL no configurada");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Slack webhook no configurado" })
    };
  }
  try {
    const requestBody = JSON.parse(event.body || "{}");
    console.log("\u{1F4E8} Netlify Function: Recibiendo petici\xF3n para Slack:", requestBody);
    const slackMessage = {
      text: `\u{1F4CB} *Nuevo documento subido*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "\u{1F4CB} Nuevo documento subido"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*\u{1F3D7}\uFE0F Obra:*
${requestBody.obraName}`
            },
            {
              type: "mrkdwn",
              text: `*\u{1F4C4} Documento:*
${requestBody.documentName}`
            },
            {
              type: "mrkdwn",
              text: `*\u{1F464} Usuario:*
${requestBody.userName}`
            },
            {
              type: "mrkdwn",
              text: `*\u{1F4E7} Email:*
${requestBody.userEmail}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*\u{1F517} Enlace:* <${requestBody.downloadUrl}|Ver documento>`
          }
        }
      ]
    };
    console.log("\u{1F4E4} Netlify Function: Enviando a Slack...");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(slackMessage)
    });
    console.log("\u{1F4E1} Netlify Function: Respuesta de Slack:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    if (response.ok) {
      console.log("\u2705 Netlify Function: Notificaci\xF3n enviada exitosamente");
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ success: true, message: "Notificaci\xF3n enviada a Slack" })
      };
    } else {
      const errorText = await response.text();
      console.error("\u274C Netlify Function: Error de Slack:", errorText);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({
          success: false,
          error: "Error enviando a Slack",
          details: errorText
        })
      };
    }
  } catch (error) {
    console.error("\u274C Netlify Function: Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=slack-notify.js.map
