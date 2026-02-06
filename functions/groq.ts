import type { Handler } from "@netlify/functions";
import OpenAI from "openai";

type RequestBody = {
  prompt ? : string;
};

export const handler: Handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }
  
  // Parseo del body
  let body: RequestBody;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "JSON inválido" }),
    };
  }
  
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta el campo 'prompt'" }),
    };
  }
  
  // Leer variables de entorno (las creás en Netlify)
  const apiKey = process.env.GROQ_API_KEY;
  const systemPrompt = process.env.SYSTEM_PROMPT ?? "Sos un asistente útil, claro y breve.";
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta la variable de entorno GROQ_API_KEY" }),
    };
  }
  
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
    
    const response = await client.responses.create({
      model: "openai/gpt-oss-20b",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    
    // Intentar obtener texto legible
    const anyResp = response as any;
    const outputText =
      anyResp.output_text ??
      (Array.isArray(anyResp.output) ?
        anyResp.output
        .map((o: any) => {
          // varios formatos posibles — intentamos extraer texto si existe
          if (o.content) {
            if (Array.isArray(o.content)) {
              return o.content.map((c: any) => c.text ?? JSON.stringify(c)).join("");
            }
            return String(o.content);
          }
          return JSON.stringify(o);
        })
        .join("\n") :
        JSON.stringify(response));
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        output: outputText,
        usedSystemPrompt: systemPrompt,
      }),
    };
  } catch (error: any) {
    console.error("Error Groq:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error al llamar a la API",
        detail: error?.message || String(error),
      }),
    };
  }
};