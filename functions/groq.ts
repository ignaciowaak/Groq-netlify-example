import type { Handler, HandlerEvent } from "@netlify/functions";
import OpenAI from "openai";

type RequestBody = {
  prompt ? : string;
};

export const handler: Handler = async (event: HandlerEvent) => {
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
  
  if (!body.prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta el campo 'prompt'" }),
    };
  }
  
  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    
    const response = await client.responses.create({
      model: "openai/gpt-oss-20b",
      input: body.prompt,
    });
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        output: response.output_text,
        raw: response, // opcional, por si querés debug
      }),
    };
  } catch (error: any) {
    console.error("Error Groq:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error al llamar a Groq",
        detail: error?.message || String(error),
      }),
    };
  }
};