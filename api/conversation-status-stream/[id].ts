import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { conversationStatusStore } from "../conversation-callback";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };
  const apiKey = process.env.API_KEY;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Poll Tavus API directly every 5s (Vercel functions can't hold long SSE connections on free plan)
  let attempts = 0;
  const maxAttempts = 24; // 24 × 5s = 2 minutes max

  const poll = async () => {
    attempts++;

    // Check in-memory store first (set by webhook)
    if (conversationStatusStore[id] === "ended") {
      sendEvent({ status: "ended" });
      res.end();
      return;
    }

    // Fallback: poll Tavus API directly
    if (apiKey) {
      try {
        const response = await axios.get(`https://tavusapi.com/v2/conversations/${id}`, {
          headers: { "x-api-key": apiKey },
        });
        const status = response.data?.status;
        if (status === "ended" || status === "error") {
          sendEvent({ status: "ended" });
          res.end();
          return;
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }

    if (attempts >= maxAttempts) {
      sendEvent({ status: "timeout" });
      res.end();
      return;
    }

    // Send heartbeat and schedule next poll
    res.write(": heartbeat\n\n");
    setTimeout(poll, 5000);
  };

  poll();

  req.on("close", () => res.end());
}