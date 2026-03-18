import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel is stateless — store ended IDs in a global (persists within same instance)
// For production reliability, replace with Redis/KV
const conversationStatusStore: Record<string, string> = {};

export { conversationStatusStore };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const event = req.body;
  const conversationId = event.conversation_id;
  const eventType = event.event_type || event.status;

  if (conversationId && (eventType === "conversation.ended" || eventType === "ended")) {
    conversationStatusStore[conversationId] = "ended";
    console.log(`Marked ${conversationId} as ended`);
  }

  res.status(200).json({ received: true });
}