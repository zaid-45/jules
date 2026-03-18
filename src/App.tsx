import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Video, Loader2, MessageSquare, ShieldCheck, Clock, 
  ChevronLeft, ChevronRight, MoreVertical, Trash2, 
  Eye, FileText, Copy, ExternalLink, ArrowLeft,
  User, Bot, Info, X
} from "lucide-react";

// --- Components ---

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
          <Video className="w-5 h-5 text-black" />
        </div>
        <span className="font-bold tracking-tight text-xl">Agent<span className="text-emerald-500">Jules</span></span>
      </Link>
      <div className="flex items-center gap-8">
        <Link to="/history" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">History</Link>
      </div>
    </div>
  </nav>
);

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const startStatusStream = (convId: string) => {
    const es = new EventSource(`/api/conversation-status-stream/${convId}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.status === "ended") {
          es.close();
          setMeetingUrl(null);
          setConversationId(null);
          navigate("/history");
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // SSE connection dropped — silently close, fallback polling already runs server-side
      es.close();
    };
  };

  const handleMeet = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/create-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details?.message || data.error || "Failed to start conversation");
      }

      const data = await response.json();

      if (data.conversation_url && data.conversation_id) {
        setMeetingUrl(data.conversation_url);
        setConversationId(data.conversation_id);
        startStatusStream(data.conversation_id);
      } else {
        throw new Error("No conversation URL received from the server");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    eventSourceRef.current?.close();
    setMeetingUrl(null);
    setConversationId(null);
    navigate("/history");
  };

  // --- Meeting overlay (iframe) ---
  if (meetingUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#0a0a0a] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-300">Meeting with Jules</span>
          </div>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <X className="w-3 h-3" /> End Call
          </button>
        </div>

        {/* Tavus iframe */}
        <iframe
          src={meetingUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="flex-1 w-full border-0"
          title="Meeting with Jules"
        />
      </div>
    );
  }

  // --- Homepage ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Jules is Online
        </div>
        
        <h1 className="text-7xl font-bold tracking-tighter mb-6 leading-[0.9]">
          Meet <span className="text-emerald-500 italic serif">Jules</span>.
        </h1>
        
        <p className="text-lg text-zinc-400 mb-12 leading-relaxed">
          Agent Jules is an autonomous, reasoning-driven AI Sales Development Representative. 
          It analyzes lead data, selects optimal outreach strategies, and manages the full engagement lifecycle 
          from first contact to meeting booking while continuously improving through a structured feedback loop.
        </p>

        <div className="flex flex-col items-center gap-4">
          <motion.button
            onClick={handleMeet}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-3 bg-white text-black px-12 py-6 rounded-2xl font-bold text-xl transition-all hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Video className="w-6 h-6" />
            )}
            {loading ? "Preparing Session..." : "Meet Jules"}
          </motion.button>
          
          <Link to="/history" className="text-zinc-500 hover:text-white text-sm font-medium transition-colors">
            View Conversation History
          </Link>
        </div>

        {error && (
          <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const History = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        setConversations(data.data || []);
      } catch (err) {
        console.error("Failed to load conversations", err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Conversation History</h2>
          <Link to="/" className="px-4 py-2 bg-emerald-500 text-black rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors">
            New Session
          </Link>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold">Recent Interactions</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4 font-medium">Session Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                      No history found.
                    </td>
                  </tr>
                ) : (
                  conversations.map((conv) => (
                    <tr 
                      key={conv.conversation_id} 
                      className="hover:bg-white/5 transition-colors group cursor-pointer" 
                      onClick={() => navigate(`/details/${conv.conversation_id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-sm">{conv.conversation_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${conv.status === 'ended' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {conv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {new Date(conv.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import { GoogleGenAI } from "@google/genai";

const Details = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'perception'>('transcript');
  const [geminiTranscript, setGeminiTranscript] = useState<any[] | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to load conversation details");
        }
        const data = await res.json();
        setData(data);
      } catch (err: any) {
        console.error("Error loading details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadDetails();
  }, [id]);

  const handleGeminiSTT = async () => {
    if (!data?.recording_url) return;
    setTranscribing(true);
    try {
      const audioRes = await fetch(`/api/proxy-audio?url=${encodeURIComponent(data.recording_url)}`);
      const audioBlob = await audioRes.blob();
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });

      const genAI = new GoogleGenAI({ apiKey: (window as any).process?.env?.GEMINI_API_KEY || "" });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: base64Audio
          }
        },
        { text: "Please provide a verbatim transcript of this conversation. Format it as a JSON array of objects with 'speaker' (either 'User' or 'AI') and 'text' fields." }
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        setGeminiTranscript(JSON.parse(jsonMatch[0]));
      } else {
        setGeminiTranscript([{ speaker: "System", text: text }]);
      }
    } catch (err) {
      console.error("Gemini STT failed:", err);
      alert("Failed to transcribe with Gemini. Please check your API key.");
    } finally {
      setTranscribing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-zinc-500 text-sm animate-pulse">Fetching conversation data...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <Info className="w-8 h-8 text-red-500" />
      </div>
      <div className="max-w-md">
        <h3 className="text-xl font-bold mb-2">Failed to load details</h3>
        <p className="text-zinc-500 text-sm mb-8">{error}</p>
        <Link to="/history" className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all">
          Back to History
        </Link>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      Conversation not found.
    </div>
  );

  const displayTranscript = geminiTranscript || data.transcript;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/history" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Session Details</h2>
        </div>

        <div className="grid lg:grid-cols-[350px_1fr] gap-8 items-start">
          {/* Sidebar */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 backdrop-blur-sm sticky top-24">
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-1">{data.conversation_name}</h3>
              <p className="text-xs text-zinc-500 font-mono">ID: {data.conversation_id}</p>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Status</p>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase border border-emerald-500/20">
                  {data.status}
                </span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Created</p>
                <p className="text-sm text-zinc-300">{new Date(data.created_at).toLocaleString()}</p>
              </div>

              {data.recording_url && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Recording</p>
                  <a 
                    href={data.recording_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View Recording
                  </a>
                </div>
              )}

              <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Context</p>
                <p className="text-xs text-zinc-400 leading-relaxed italic line-clamp-4">
                  "{data.conversational_context}"
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transcript' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  <FileText className="w-4 h-4" /> Transcript
                </button>
                <button 
                  onClick={() => setActiveTab('perception')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'perception' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  <Eye className="w-4 h-4" /> Analysis
                </button>
              </div>

              {activeTab === 'transcript' && !displayTranscript && data.recording_url && (
                <button 
                  onClick={handleGeminiSTT}
                  disabled={transcribing}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {transcribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                  {transcribing ? "Transcribing..." : "Extract Transcript with Gemini"}
                </button>
              )}
            </div>

            <div className="flex-1 p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'transcript' ? (
                  <motion.div 
                    key="transcript"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    {displayTranscript && displayTranscript.length > 0 ? (
                      displayTranscript.map((segment: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${segment.speaker?.toLowerCase() === 'user' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                            {segment.speaker?.toLowerCase() === 'user' ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{segment.speaker}</p>
                            <div className="p-4 bg-white/5 rounded-2xl rounded-tl-none border border-white/5 max-w-2xl">
                              <p className="text-sm text-zinc-300">{segment.text}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <MessageSquare className="w-12 h-12 text-zinc-700 mb-4" />
                        <p className="text-zinc-500">No transcript available.</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {data.status === 'active' 
                            ? "Transcript will be available after the call ends." 
                            : "Tavus hasn't generated a transcript yet. You can use Gemini to extract it from the recording."}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="perception"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-10"
                  >
                    {data.perception_analysis ? (
                      <div className="space-y-8">
                        {Object.entries(data.perception_analysis).map(([key, value]: [string, any]) => (
                          <section key={key}>
                            <h4 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2 capitalize">
                              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                              {key.replace(/_/g, ' ')}
                            </h4>
                            <p className="text-sm text-zinc-400 leading-relaxed pl-3 border-l border-white/5">
                              {value}
                            </p>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Eye className="w-12 h-12 text-zinc-700 mb-4" />
                        <p className="text-zinc-500">Analysis not available.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/details/:id" element={<Details />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}