"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgents } from "@/context/AgentsContext";
import { buildProjectContext } from "@/lib/formatters";

interface Message {
  role: "user" | "jarvis";
  text: string;
}

interface JarvisModalProps {
  open: boolean;
  onClose: () => void;
}

export function JarvisModal({ open, onClose }: JarvisModalProps) {
  const { agents, settings, currentProject } = useAgents();
  const agent = agents["jarvis"];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  const pipelineId = agent?.pipelineId || settings.queryPipelineId;

  // Compressed project context — constant size regardless of document/session growth
  const projectContext = buildProjectContext(agents, currentProject.sessionLog);

  const sessionCount = currentProject.sessionLog?.length ?? 0;
  const contextBadges = [
    agents.cps?.output && "CPS",
    agents.prd?.output && "PRD",
    sessionCount > 0   && `${sessionCount} session${sessionCount > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      if (!pipelineId) throw new Error("No pipeline ID configured for Jarvis. Add NEXT_PUBLIC_PIPELINE_JARVIS to .env.local");

      const history = messages
        .map((m) => `${m.role === "user" ? "User" : "Jarvis"}: ${m.text}`)
        .join("\n");

      const parts: string[] = [];
      if (projectContext) parts.push(`[PROJECT CONTEXT]\n${projectContext}`);
      if (history)        parts.push(`[CONVERSATION HISTORY]\n${history}`);
      parts.push(history ? `[NEW QUESTION]\n${q}` : q);
      const userInput = parts.join("\n\n");

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;

      const res = await fetch("/api/airia", {
        method: "POST",
        headers,
        body: JSON.stringify({ pipelineId, userInput }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const answer = typeof data === "string" ? data : data.output ?? JSON.stringify(data);
      setMessages((prev) => [...prev, { role: "jarvis", text: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      // restore question so user doesn't lose it
      setMessages((prev) => prev.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <DialogTitle className="text-[15px] font-semibold tracking-tight flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[11px] text-white font-bold shrink-0">J</span>
            Jarvis
          </DialogTitle>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-[11px] text-zinc-400">Ask any technical or domain question · no question too basic</p>
            {contextBadges.length > 0 && (
              <div className="flex items-center gap-1">
                {contextBadges.map((b) => (
                  <span key={b} className="text-[10px] font-medium px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-zinc-500">{b}</span>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8 space-y-2">
              <p className="text-[13px] font-medium text-zinc-400">What do you need to know?</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {[
                  "What is event sourcing?",
                  "Explain CQRS simply",
                  "What are bounded contexts?",
                  "Microservices vs monolith tradeoffs",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "jarvis" && (
                <span className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center text-[9px] text-white font-bold shrink-0 mt-1">J</span>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white rounded-br-sm whitespace-pre-wrap"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-bl-sm"
                }`}
              >
                {msg.role === "user" ? msg.text : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      h1: ({ children }) => <p className="font-semibold text-[13px] mt-3 mb-1 first:mt-0">{children}</p>,
                      h2: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
                      h3: ({ children }) => <p className="font-medium mt-2 mb-0.5 first:mt-0 text-zinc-800">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock
                          ? <code className="block bg-zinc-100 border border-zinc-200 rounded px-2.5 py-2 font-mono text-[11px] text-zinc-800 overflow-x-auto my-2 whitespace-pre">{children}</code>
                          : <code className="bg-zinc-100 border border-zinc-200 rounded px-1 py-0.5 font-mono text-[11px] text-zinc-800">{children}</code>;
                      },
                      pre: ({ children }) => <>{children}</>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-300 pl-3 text-zinc-500 italic my-2">{children}</blockquote>,
                      hr: () => <hr className="border-zinc-200 my-3" />,
                      table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-[11px] border-collapse w-full">{children}</table></div>,
                      th: ({ children }) => <th className="border border-zinc-200 px-2 py-1 bg-zinc-100 font-medium text-left">{children}</th>,
                      td: ({ children }) => <td className="border border-zinc-200 px-2 py-1">{children}</td>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <span className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center text-[9px] text-white font-bold shrink-0 mt-0.5">J</span>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-100 px-4 py-3 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[10px] text-zinc-300 hover:text-zinc-500 transition-colors mb-2 block"
            >
              Clear conversation
            </button>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
              className="flex-1 text-[12px] resize-none border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="h-[58px] px-3.5 bg-zinc-900 text-white rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-30 transition-opacity shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
