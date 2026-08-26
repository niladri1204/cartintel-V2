import { NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      description: "Must be one of: recognized, partially_recognized, uncertain, unknown, unavailable"
    },
    category: { type: Type.STRING },
    brand: { type: Type.STRING },
    model: { type: Type.STRING },
    productType: { type: Type.STRING },
    visualAttributes: {
      type: Type.OBJECT,
      properties: {
        color: { type: Type.STRING },
        shape: { type: Type.STRING },
        design: { type: Type.STRING },
        material: { type: Type.STRING },
        formFactor: { type: Type.STRING },
        visualCategory: { type: Type.STRING },
        accessories: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    },
    confidence: { type: Type.NUMBER },
    evidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: {
            type: Type.STRING,
            description: "Must be one of: text, logo, shape, layout, ocr, model_features, other"
          },
          description: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["source", "description"]
      }
    }
  },
  required: ["status", "visualAttributes", "evidence"]
};

const prompt = `Analyze the provided product image(s). Identify and return the product category, brand, model, and visible product type.
Extract visible visual attributes like color, shape, design, material, form factor, and any visible accessories.
Provide structured evidence for each classification from the image (e.g. OCR text, logo branding, model features).

CRITICAL ANTI-HALLUCINATION RULES:
1. Do NOT invent specifications that are not visible in the image. E.g. do not guess RAM, storage size, battery capacity, or internal components unless they are explicitly printed on the packaging, label, or readable text in the image.
2. If specifications or details are not visible, set their values to null.
3. If multiple images are provided, combine their evidence. If they conflict, set status to 'partially_recognized' or 'uncertain' and explain the conflict.
`;

export async function POST(req: Request) {
  console.log("[Visual] backend received request");
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API Key is not configured on the backend." },
        { status: 503, headers: corsHeaders }
      );
    }

    const { images } = await req.json();
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'images' must be a non-empty array." },
        { status: 400, headers: corsHeaders }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [prompt];

    // Format up to 3 images for the multimodal request
    const cappedImages = images.slice(0, 3);
    for (const img of cappedImages) {
      if (img.base64 && img.mimeType) {
        contents.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType
          }
        });
      } else if (img.url) {
        try {
          const res = await fetch(img.url);
          const buf = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") || "image/jpeg";
          const base64 = Buffer.from(buf).toString("base64");
          contents.push({
            inlineData: {
              data: base64,
              mimeType
            }
          });
        } catch (fetchError) {
          console.error("Failed to fetch image URL inside backend API:", img.url, fetchError);
        }
      }
    }

    if (contents.length === 1) {
      return NextResponse.json(
        { error: "No valid image data could be processed." },
        { status: 400, headers: corsHeaders }
      );
    }

    const modelName = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash";
    console.log("[Visual] Gemini request started");
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    console.log("[Visual] Gemini response received");
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API.");
    }

    const recognitionResult = JSON.parse(text);
    console.log(
      "[Visual] recognition status/category/brand/model:",
      recognitionResult.status,
      recognitionResult.category,
      recognitionResult.brand,
      recognitionResult.model
    );

    // Validate structured response
    const validStatus = ["recognized", "partially_recognized", "uncertain", "unknown", "unavailable"];
    if (!recognitionResult || !validStatus.includes(recognitionResult.status)) {
      throw new Error("Invalid recognition status returned by Gemini.");
    }

    // Populate default structures if missing
    if (!recognitionResult.visualAttributes) {
      recognitionResult.visualAttributes = {};
    }
    if (!Array.isArray(recognitionResult.evidence)) {
      recognitionResult.evidence = [];
    }

    return NextResponse.json(recognitionResult, { headers: corsHeaders });
  } catch (error) {
    console.error("Visual API Error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        category: null,
        brand: null,
        model: null,
        productType: null,
        visualAttributes: {},
        confidence: null,
        evidence: [
          {
            source: "other",
            description: `Backend visual service error: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      },
      { status: 200, headers: corsHeaders }
    );
  }
}
