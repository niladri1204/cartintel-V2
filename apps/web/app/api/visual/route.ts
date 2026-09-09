import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { fetchSafeImage } from "../../../server/security/imageFetch";
import { corsHeaders, rateLimit, readJsonBody, rejectUnauthorizedOrigin } from "../../../server/security/requestSecurity";

const MAX_IMAGES = 3;
const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;
const supportedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const statuses = ["recognized", "partially_recognized", "uncertain", "unknown", "unavailable"] as const;

const responseSchema: Schema = { type: Type.OBJECT, properties: { status: { type: Type.STRING }, category: { type: Type.STRING }, brand: { type: Type.STRING }, model: { type: Type.STRING }, productType: { type: Type.STRING }, visualAttributes: { type: Type.OBJECT, properties: { color: { type: Type.STRING }, shape: { type: Type.STRING }, design: { type: Type.STRING }, material: { type: Type.STRING }, formFactor: { type: Type.STRING }, visualCategory: { type: Type.STRING }, accessories: { type: Type.ARRAY, items: { type: Type.STRING } } } }, confidence: { type: Type.NUMBER }, evidence: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, description: { type: Type.STRING }, confidence: { type: Type.NUMBER } }, required: ["source", "description"] } } }, required: ["status", "visualAttributes", "evidence"] };
const prompt = "Analyze the provided product image(s). Identify product category, brand, model, product type, and visible visual attributes. Return structured evidence. Do not invent specifications not visible in the image; use null for unobservable details. If images conflict, use partially_recognized or uncertain.";

type ImageRequest = { url?: unknown; base64?: unknown; mimeType?: unknown };
type Recognition = { status: string; category?: unknown; brand?: unknown; model?: unknown; productType?: unknown; visualAttributes?: unknown; confidence?: unknown; evidence?: unknown };

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 0 && value <= 1 ? Math.round(value * 100) : Math.min(100, Math.max(0, Math.round(value)));
}
function validImage(image: unknown): image is ImageRequest {
  if (!image || typeof image !== "object" || Array.isArray(image)) return false;
  const item = image as ImageRequest;
  const urlValid = typeof item.url === "string" && item.url.length > 0 && item.url.length <= 2048;
  const base64Valid = typeof item.base64 === "string" && item.base64.length > 0 && item.base64.length <= Math.ceil(MAX_INLINE_IMAGE_BYTES * 4 / 3) + 8 && typeof item.mimeType === "string" && supportedMediaTypes.has(item.mimeType.toLowerCase());
  return urlValid || base64Valid;
}
function unavailable(error: string, request: Request, status = 200) {
  return NextResponse.json({ status: "unavailable", category: null, brand: null, model: null, productType: null, visualAttributes: {}, confidence: null, evidence: [{ source: "other", description: error }] }, { status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request);
  return rejected ?? new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request); if (rejected) return rejected;
  const limited = await rateLimit(request, "visual"); if (limited) return limited;
  const parsed = await readJsonBody(request, 16 * 1024 * 1024); if ("error" in parsed) return parsed.error;
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return NextResponse.json({ error: "Invalid visual request." }, { status: 400, headers: corsHeaders(request) });
  const images = (parsed.value as { images?: unknown }).images;
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES || !images.every(validImage)) return NextResponse.json({ error: "images must contain one to three valid image inputs." }, { status: 400, headers: corsHeaders(request) });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Visual recognition is not configured." }, { status: 503, headers: corsHeaders(request) });
  try {
    const contents = [prompt] as Array<string | { inlineData: { data: string; mimeType: string } }>;
    for (const image of images) {
      if (typeof image.base64 === "string" && typeof image.mimeType === "string") contents.push({ inlineData: { data: image.base64, mimeType: image.mimeType.toLowerCase() } });
      else if (typeof image.url === "string") {
        const safeImage = await fetchSafeImage(image.url);
        contents.push({ inlineData: { data: safeImage.base64, mimeType: safeImage.mimeType } });
      }
    }
    if (contents.length === 1) return NextResponse.json({ error: "No valid image data could be processed." }, { status: 400, headers: corsHeaders(request) });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash", contents, config: { responseMimeType: "application/json", responseSchema } });
    if (!response.text) throw new Error("empty Gemini response");
    const result: Recognition = JSON.parse(response.text);
    if (!result || !statuses.includes(result.status as typeof statuses[number])) throw new Error("invalid Gemini response");
    const evidence = Array.isArray(result.evidence) ? result.evidence.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)).slice(0, 20).map((item) => ({ source: typeof item.source === "string" ? item.source.slice(0, 40) : "other", description: typeof item.description === "string" ? item.description.slice(0, 500) : "", confidence: normalizeConfidence(item.confidence) })) : [];
    return NextResponse.json({ ...result, confidence: normalizeConfidence(result.confidence), visualAttributes: result.visualAttributes && typeof result.visualAttributes === "object" ? result.visualAttributes : {}, evidence }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[POST /api/visual] failed", error);
    return unavailable("Visual recognition is temporarily unavailable.", request);
  }
}
