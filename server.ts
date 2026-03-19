import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to create a conversation
  app.post("/api/create-conversation", async (req, res) => {
    try {
      const apiKey = process.env.API_KEY;
      const appUrl = process.env.APP_URL || `http://localhost:3000`;
      
      if (!apiKey) {
        return res.status(500).json({ error: "API Key is not set in environment variables." });
      }

      const response = await axios.post(
        "https://tavusapi.com/v2/conversations",
        {
          replica_id: "r72f7f7f7c8b",
          persona_id: "p706851aa387",
          conversation_name: "Meeting with Jules",
          conversational_context: "Agent Jules is an autonomous, reasoning-driven AI Sales Development Representative...",
          callback_url: appUrl,
          properties: {
             max_call_duration: 600,
             participant_left_timeout: 60,
             enable_recording: true,
          }
        },
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Error creating conversation:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to create conversation",
        details: error.response?.data || error.message,
      });
    }
  });

  // API route to get conversation details
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return res.status(500).json({ error: "API Key missing" });

      const response = await axios.get(`https://tavusapi.com/v2/conversations/${req.params.id}`, {
        headers: { "x-api-key": apiKey }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || error.message);
    }
  });

  // API route to receive Tavus webhook callbacks
  app.post("/api/conversation-callback", async (req, res) => {
    try {
      const event = req.body;
      console.log("Tavus callback received:", JSON.stringify(event, null, 2));

      const conversationId = event.conversation_id;
      const eventType = event.event_type || event.status;

      if (conversationId && (eventType === "conversation.ended" || eventType === "ended")) {
        // Mark conversation as ended in our local store
        conversationStatusStore[conversationId] = "ended";
        console.log(`Conversation ${conversationId} marked as ended.`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Error handling callback:", error.message);
      res.status(500).json({ error: "Failed to handle callback" });
    }
  });

  // In-memory store to track conversation statuses from webhook
  const conversationStatusStore: Record<string, string> = {};

  // SSE endpoint — frontend connects here to get notified when call ends
  app.get("/api/conversation-status-stream/:id", (req, res) => {
    const conversationId = req.params.id;

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    // Send a heartbeat every 5s to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 5000);

    // Poll our local store every 3s to check if webhook fired
    const check = setInterval(() => {
      if (conversationStatusStore[conversationId] === "ended") {
        res.write(`data: ${JSON.stringify({ status: "ended" })}\n\n`);
        clearInterval(check);
        clearInterval(heartbeat);
        res.end();
      }
    }, 3000);

    // Fallback: also poll Tavus API directly every 10s in case webhook missed
    const apiKey = process.env.API_KEY;
    const fallbackPoll = setInterval(async () => {
      try {
        if (!apiKey) return;
        const response = await axios.get(
          `https://tavusapi.com/v2/conversations/${conversationId}`,
          { headers: { "x-api-key": apiKey } }
        );
        const status = response.data?.status;
        if (status === "ended" || status === "error") {
          conversationStatusStore[conversationId] = "ended";
        }
      } catch (err: any) {
        console.error("Fallback poll error:", err.message);
      }
    }, 10000);

    // Clean up when client disconnects
    req.on("close", () => {
      clearInterval(check);
      clearInterval(heartbeat);
      clearInterval(fallbackPoll);
    });
  });

  // API route to proxy audio for Gemini STT (to avoid CORS)
  app.get("/api/proxy-audio", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      res.set("Content-Type", response.headers["content-type"] || "audio/mpeg");
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error("Error proxying audio:", error.message);
      res.status(500).json({ error: "Failed to proxy audio" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();