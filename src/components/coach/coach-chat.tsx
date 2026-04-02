"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const STARTERS = [
  "How do I negotiate my salary as an OPT candidate?",
  "What should I say when asked about visa sponsorship?",
  "Help me prepare for a system design interview",
  "How do I stand out with limited US work experience?",
];

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Placeholder streaming message
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snap, streaming: true };
          return next;
        });
      }

      // Mark streaming done
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: accumulated };
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "580px" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1 py-2 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#333333", textAlign: "center" }}>
                What can I help you with today?
              </p>
              <p style={{ fontSize: "12px", color: "#aaaaaa", marginTop: "4px", textAlign: "center" }}>
                Personalised advice based on your resume and target roles
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-2.5 border border-[#e8e8e8] rounded-[8px] hover:border-[#6366f1] hover:bg-[#6366f108] transition-all"
                  style={{ fontSize: "12px", color: "#555555" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="rounded-[10px] px-4 py-2.5 max-w-[80%]"
              style={{
                fontSize: "13px",
                lineHeight: 1.6,
                background: msg.role === "user" ? "#6366f1" : "#f5f5f5",
                color: msg.role === "user" ? "white" : "#333333",
              }}
            >
              {msg.role === "user" ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p style={{ marginBottom: "8px", lineHeight: 1.6 }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ paddingLeft: "16px", marginBottom: "8px", listStyleType: "disc" }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: "16px", marginBottom: "8px", listStyleType: "decimal" }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#111111" }}>{children}</strong>,
                    code: ({ children }) => (
                      <code style={{ background: "#e8e8e8", padding: "1px 5px", borderRadius: "3px", fontSize: "12px" }}>
                        {children}
                      </code>
                    ),
                    h3: ({ children }) => <p style={{ fontWeight: 600, color: "#111111", marginBottom: "6px", marginTop: "10px" }}>{children}</p>,
                    h4: ({ children }) => <p style={{ fontWeight: 600, color: "#333333", marginBottom: "4px", marginTop: "8px" }}>{children}</p>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
              {msg.streaming && msg.content === "" && (
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#aaaaaa] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#aaaaaa] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#aaaaaa] animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-[#f0f0f0]">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your coach anything…"
          disabled={loading}
          className="flex-1 border border-[#e8e8e8] rounded-[8px] px-4 py-2.5 outline-none focus:border-[#6366f1] transition-colors bg-white"
          style={{ fontSize: "13px", color: "#111111" }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-3 py-2.5 rounded-[8px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
