import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "URL is required" });

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to proxy audio" });
  }
}