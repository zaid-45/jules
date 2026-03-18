import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.API_KEY;
  const appUrl = process.env.APP_URL || "https://your-app.vercel.app";

  if (!apiKey) return res.status(500).json({ error: "API Key is not set." });

  try {
    const response = await axios.post(
      "https://tavusapi.com/v2/conversations",
      {
        replica_id: "r72f7f7f7c8b",
        persona_id: "pfe23abf050d",
        conversation_name: "Meeting with Jules",
        conversational_context: "Agent Jules is an autonomous, reasoning-driven AI Sales Development Representative...",
        callback_url: `${appUrl}/api/conversation-callback`,
        properties: {
          max_call_duration: 600,
          participant_left_timeout: 60,
          enable_recording: true,
          redirect_url: appUrl,
        },
      },
      {
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: "Failed to create conversation",
      details: error.response?.data || error.message,
    });
  }
}