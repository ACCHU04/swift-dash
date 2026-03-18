"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ChatMessage } from "@/types";
import { Send, Bot, User, Code, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { LoadingState } from "./LoadingState";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  suggestedQueries?: string[];
}

const EXAMPLE_QUERIES = [
  "What are the total sales by product category?",
  "Show me monthly revenue trends for 2023 by region",
  "Compare average discount % vs rating across categories",
];

const SPEECH_LANGUAGES = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "Hindi", value: "hi-IN" },
  { label: "Tamil", value: "ta-IN" },
  { label: "Telugu", value: "te-IN" },
];

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  suggestedQueries,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState("en-US");
  const [autoSendVoice, setAutoSendVoice] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechBaseInputRef = useRef("");
  const latestInputRef = useRef("");
  const isLoadingRef = useRef(isLoading);
  const onSendRef = useRef(onSendMessage);
  const speechFinalRef = useRef("");
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnimatedAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && !!m.content?.trim());

    if (!latestAssistant) return;
    if (lastAnimatedAssistantIdRef.current === latestAssistant.id) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    lastAnimatedAssistantIdRef.current = latestAssistant.id;
    setStreamingMessageId(latestAssistant.id);
    setStreamingText("");

    const fullText = latestAssistant.content;
    let idx = 0;

    typingTimerRef.current = setInterval(() => {
      idx = Math.min(fullText.length, idx + 3);
      setStreamingText(fullText.slice(0, idx));

      if (idx >= fullText.length && typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, 18);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    onSendRef.current = onSendMessage;
  }, [onSendMessage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTtsSupported("speechSynthesis" in window);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLanguage;

    recognition.onstart = () => {
      setSpeechError(null);
      setIsListening(true);
      speechBaseInputRef.current = latestInputRef.current.trim();
      speechFinalRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          speechFinalRef.current += ` ${chunk}`;
        } else {
          interimTranscript += chunk;
        }
      }

      const base = speechBaseInputRef.current;
      const nextVoice = `${speechFinalRef.current} ${interimTranscript}`.trim();
      const next = base ? `${base} ${nextVoice}` : nextVoice;
      setInput(next.trimStart());
    };

    recognition.onerror = (event: any) => {
      setSpeechError(`Voice input error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      const spokenText = speechFinalRef.current.trim();
      if (autoSendVoice && spokenText && !isLoadingRef.current) {
        const base = speechBaseInputRef.current;
        const finalMessage = base ? `${base} ${spokenText}` : spokenText;
        onSendRef.current(finalMessage.trim());
        setInput("");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [autoSendVoice, speechLanguage]);

  const speakMessage = (text: string) => {
    if (!ttsSupported || typeof window === "undefined" || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLanguage;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!autoSpeak || !ttsSupported || messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !!m.content?.trim());
    if (!lastAssistant) return;
    if (lastSpokenMessageIdRef.current === lastAssistant.id) return;

    lastSpokenMessageIdRef.current = lastAssistant.id;
    speakMessage(lastAssistant.content);
  }, [messages, autoSpeak, ttsSupported, speechLanguage]);

  const handleVoiceToggle = () => {
    if (!speechSupported || !recognitionRef.current) {
      setSpeechError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setSpeechError("Unable to start voice input. Please allow microphone access.");
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const chips = suggestedQueries?.length ? suggestedQueries : EXAMPLE_QUERIES;

  return (
    <div className="flex flex-col glass-panel overflow-hidden h-[620px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-slate-950/35">
        <Bot className="w-4 h-4 text-violet-300" />
        <span className="text-sm font-head font-semibold text-slate-100">Chat with your data</span>
        <button
          onClick={() => setAutoSpeak((v) => !v)}
          disabled={!ttsSupported}
          className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white disabled:opacity-50"
          title={autoSpeak ? "Disable auto voice replies" : "Enable auto voice replies"}
        >
          {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {autoSpeak ? "Voice On" : "Voice Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
            <Bot className="w-10 h-10 text-violet-300/75" />
            <div>
              <p className="text-slate-200 text-sm font-medium mb-1">Ask a business question</p>
              <p className="text-slate-400 text-xs">I&apos;ll generate interactive charts from your data</p>
            </div>
            <div className="w-full space-y-2">
              {chips.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-900/65 hover:bg-slate-800/75 border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {(() => {
                  const isStreamingMessage = msg.role === "assistant" && streamingMessageId === msg.id;
                  const renderedContent = isStreamingMessage ? streamingText : msg.content;

                  return (
                    <>
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-[0_6px_18px_rgba(79,70,229,0.4)]"
                      : msg.error
                      ? "bg-red-900/30 border border-red-800/50 text-red-300 rounded-tl-sm"
                      : "bg-slate-900/85 border border-white/10 text-slate-100 rounded-tl-sm"
                  }`}
                >
                  <p>{renderedContent}</p>
                  {isStreamingMessage && renderedContent.length < msg.content.length && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-violet-300/80 animate-pulse rounded-sm" />
                  )}
                  {msg.clarification_needed && msg.clarification_question && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-amber-300">{msg.clarification_question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(msg.clarification_options || []).map((option) => (
                          <button
                            key={option}
                            onClick={() => onSendMessage(option)}
                            disabled={isLoading}
                            className="text-xs px-2 py-1 rounded-md border border-amber-400/35 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.sql_query && (
                    <details className="mt-2">
                      <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer hover:text-slate-200">
                        <Code className="w-3 h-3" /> View SQL
                      </summary>
                      <pre className="mt-1 text-xs text-slate-300 bg-slate-950 p-2 rounded overflow-x-auto">
                        {msg.sql_query}
                      </pre>
                    </details>
                  )}
                  {msg.role === "assistant" && ttsSupported && (
                    <button
                      onClick={() => speakMessage(msg.content)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
                    >
                      <Volume2 className="w-3 h-3" /> Read aloud
                    </button>
                  )}
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-violet-200" />
                </div>
                <div className="bg-slate-900/85 border border-white/10 rounded-xl rounded-tl-sm px-3 py-2">
                  <LoadingState />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-slate-950/35">
        <div className="mb-2 flex flex-wrap gap-2 items-center">
          <label className="text-[11px] text-slate-400">Voice language</label>
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            aria-label="Voice language"
            title="Voice language"
            className="bg-slate-900/80 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200"
          >
            {SPEECH_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setAutoSendVoice((v) => !v)}
            className={`text-[11px] px-2 py-1 rounded-md border ${
              autoSendVoice
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                : "border-white/10 text-slate-300"
            }`}
          >
            {autoSendVoice ? "Auto-send On" : "Auto-send Off"}
          </button>
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask a business question..."
            rows={2}
            className="flex-1 resize-none bg-slate-900/80 text-slate-100 placeholder-slate-500 border border-white/10 focus:border-violet-400/65 focus:outline-none rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleVoiceToggle}
            disabled={isLoading || !speechSupported}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Stop voice input" : "Start voice input"}
            className={`flex-shrink-0 p-2.5 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? "bg-rose-500/20 border-rose-400/60 text-rose-200"
                : "bg-slate-900/80 border-white/10 text-slate-300 hover:text-slate-100"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            title="Send message"
            className="flex-shrink-0 p-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {speechError && <p className="text-xs text-rose-300 mt-1.5 pl-1">{speechError}</p>}
        <p className="text-xs text-slate-400 mt-1.5 pl-1">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
