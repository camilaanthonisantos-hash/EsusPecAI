/**
 * Firebase Cloud Functions v2 - Audio Transcription with Groq Whisper Large v3
 */
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const audioTranscription = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    // Enable CORS preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.status(204).send("");
      return;
    }

    res.set("Access-Control-Allow-Origin", "*");

    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method Not Allowed" });
      return;
    }

    try {
      const { audioData, groqApiKey: clientProvidedKey } = req.body || {};

      if (!audioData?.data) {
        res.status(400).json({ success: false, error: "Nenhum áudio recebido." });
        return;
      }

      // 1. Resolve Groq API Key: Client > Firestore (settings/api_keys) > Env/Secrets
      let groqApiKey = clientProvidedKey?.trim() || process.env.GROQ_API_KEY;

      if (!groqApiKey) {
        try {
          const db = admin.firestore();
          const docSnap = await db.collection("settings").doc("api_keys").get();
          if (docSnap.exists) {
            const data = docSnap.data();
            groqApiKey = data?.groq_api_key || data?.groqApiKey;
          }
        } catch (dbErr) {
          console.warn("[CloudFunction/audioTranscription] Could not read Firestore api_keys:", dbErr);
        }
      }

      if (!groqApiKey) {
        res.status(401).json({
          success: false,
          error: "Chave da Groq API não configurada no Firestore (settings/api_keys) nem no ambiente.",
        });
        return;
      }

      // 2. Prepare audio buffer
      const base64Data = String(audioData.data);
      const mimeType = String(audioData.mimeType || "audio/webm").split(";")[0].trim();
      const buffer = Buffer.from(base64Data, "base64");

      const ext = mimeType.includes("mp4") ? "mp4"
                : mimeType.includes("ogg") ? "ogg"
                : mimeType.includes("wav") ? "wav"
                : "webm";

      const audioFile = await toFile(buffer, `input.${ext}`, { type: mimeType });

      // 3. Call Groq Cloud API with whisper-large-v3
      const groq = new OpenAI({
        apiKey: groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });

      const result = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        language: "pt",
        response_format: "text",
      });

      const text = (result as unknown as string).trim();

      res.status(200).json({
        success: true,
        text,
        model: "whisper-large-v3",
      });
    } catch (err: any) {
      console.error("[CloudFunction/audioTranscription] Error:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Erro no processamento da transcrição com a Groq.",
      });
    }
  }
);
