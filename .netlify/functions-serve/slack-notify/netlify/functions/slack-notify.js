// netlify/functions/slack-notify.js
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "M\xE9todo no permitido" })
    };
  }
  try {
    console.log("\u{1F680} Funci\xF3n slack-notify iniciada");
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    console.log("\u{1F50D} Webhook URL configurada:", !!webhookUrl);
    if (!webhookUrl) {
      console.log("\u274C SLACK_WEBHOOK_URL no configurada");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Webhook URL no configurada" })
      };
    }
    const requestBody = JSON.parse(event.body || "{}");
    console.log("\u{1F4E8} Datos recibidos:", requestBody);
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
    console.log("\u{1F4E4} Enviando mensaje a Slack...");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(slackMessage)
    });
    console.log("\u{1F4E1} Respuesta de Slack:", response.status, response.statusText);
    if (response.ok) {
      console.log("\u2705 Notificaci\xF3n enviada exitosamente");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Notificaci\xF3n enviada a Slack"
        })
      };
    } else {
      const errorText = await response.text();
      console.log("\u274C Error de Slack:", errorText);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Error al enviar a Slack",
          details: errorText
        })
      };
    }
  } catch (error) {
    console.log("\u274C Error en funci\xF3n:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Error interno",
        details: error.message
      })
    };
  }
};
//# sourceMappingURL=slack-notify.js.map
