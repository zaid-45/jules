import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const apiKey = process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API Key missing" });

  const { id } = req.query;

  try {
    const response = await axios.get(`https://tavusapi.com/v2/conversations/${id}`, {
      headers: { "x-api-key": apiKey },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || error.message);
  }
}