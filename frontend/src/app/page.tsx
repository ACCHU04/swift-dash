"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ChatInterface } from "@/components/ChatInterface";
import { Dashboard } from "@/components/Dashboard";
import { FileUpload } from "@/components/FileUpload";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { fetchAmazonData, sendQuery, uploadCSV } from "@/lib/api";
import { ChatMessage, UploadResponse } from "@/types";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  Files,
  History,
  LayoutDashboard,
  Loader2,
  LineChart,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

type ViewKey = "overview" | "analytics" | "reports" | "history" | "settings";

export default function Home() {
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessionId, setSessionId] = useState<string>(uuidv4());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bi_query_history");
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        setQueryHistory(parsed.slice(0, 10));
      }
    } catch {
      setQueryHistory([]);
    }
  }, [isExportingPdf]);

  const persistQueryHistory = (items: string[]) => {
    setQueryHistory(items);
    localStorage.setItem("bi_query_history", JSON.stringify(items));
  };

  const handleSendQuery = useCallback(
    async (query: string) => {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      const nextHistory = [query, ...queryHistory.filter((q) => q !== query)].slice(0, 10);
      persistQueryHistory(nextHistory);
      setIsLoading(true);

      try {
        const response = await sendQuery(query, sessionId);

        // Update sessionId if backend returns a new one
        if (response.session_id && response.session_id !== sessionId) {
          setSessionId(response.session_id);
        }

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: response.insights || (response.error ?? "Query processed."),
          timestamp: new Date(),
          charts: response.charts,
          insights: response.insights,
          sql_query: response.sql_query,
          error: response.error,
          confidence: response.confidence,
          query_plan: response.query_plan,
          clarification_needed: response.clarification_needed,
          clarification_question: response.clarification_question,
          clarification_options: response.clarification_options,
          executive_summary: response.executive_summary,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message;
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: detail
            ? `Query failed: ${detail}`
            : "Failed to connect to the backend. Please ensure the API server is running.",
          timestamp: new Date(),
          error: "Connection error",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const shouldMerge = Boolean(uploadInfo?.session_id);
      const info = await uploadCSV(
        file,
        shouldMerge ? sessionId : undefined,
        shouldMerge,
      );
      setUploadInfo(info);
      setSessionId(info.session_id);
      setMessages([]);

      const systemMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `✅ ${info.message}! Found ${info.row_count.toLocaleString()} rows with ${info.columns.length} columns: ${info.columns.join(", ")}. You can now ask questions about this data.`,
        timestamp: new Date(),
      };
      setMessages([systemMessage]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: detail
          ? `Upload failed: ${detail}`
          : "Failed to upload the dataset. Supported formats: CSV, JSON, XLSX.",
        timestamp: new Date(),
        error: "Upload error",
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFetchAmazon = useCallback(async (category: string) => {
    setIsLoading(true);
    try {
      const shouldMerge = Boolean(uploadInfo?.session_id || sessionId);
      const info = await fetchAmazonData(
        category,
        "US",
        20,
        shouldMerge ? sessionId : undefined,
        shouldMerge,
      );
      setUploadInfo(info);
      setSessionId(info.session_id);
      setMessages([]);

      const sourceHint = info.source_mode === "mock"
        ? " (using mock fallback because RapidAPI key/quota is unavailable)"
        : "";

      const systemMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `✅ ${info.message}! Loaded ${info.row_count.toLocaleString()} rows with ${info.columns.length} columns${sourceHint}. Try asking: 'Compare average price by data_source', 'Compare categories by average rating', or 'Top products by review_count across sources'.`,
        timestamp: new Date(),
      };
      setMessages([systemMessage]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: detail
          ? `Amazon fetch failed: ${detail}`
          : "Failed to fetch Amazon data. Please try again.",
        timestamp: new Date(),
        error: "Amazon fetch error",
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, uploadInfo]);

  const handleNewSession = useCallback(() => {
    setSessionId(uuidv4());
    setMessages([]);
    setUploadInfo(null);
  }, []);

  const suggestedQueries = useMemo(() => {
    if (!uploadInfo?.columns?.length) return undefined;
    const cols = uploadInfo.columns.map((c) => c.toLowerCase());
    const hasDate = cols.some((c) => c.includes("date") || c.includes("month") || c.includes("year"));
    const hasRevenue = cols.some((c) => c.includes("revenue") || c.includes("sales") || c.includes("amount"));
    const hasCategory = cols.some((c) => c.includes("category") || c.includes("product"));
    const hasRegion = cols.some((c) => c.includes("region") || c.includes("country") || c.includes("state"));

    const chips: string[] = [];
    if (hasRevenue && hasDate) chips.push("Show monthly revenue trend");
    if (hasRevenue && hasCategory) chips.push("Compare revenue by product category");
    if (hasRevenue && hasRegion) chips.push("Which region has the highest revenue?");
    chips.push("Show top 5 performers");
    return chips.slice(0, 4);
  }, [uploadInfo]);

  // Get the latest assistant message that has charts
  const latestDashboard = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.charts && m.charts.length > 0);

  const [activeView, setActiveView] = useState<ViewKey>("overview");

  const sidebarItems = [
    { key: "overview" as ViewKey, label: "Overview", icon: LayoutDashboard },
    { key: "analytics" as ViewKey, label: "Analytics", icon: LineChart },
    { key: "reports" as ViewKey, label: "Reports", icon: Files },
    { key: "history" as ViewKey, label: "History", icon: History },
    { key: "settings" as ViewKey, label: "Settings", icon: Settings },
  ];

  const activeSidebarItem = useMemo(
    () => sidebarItems.find((s) => s.key === activeView) ?? sidebarItems[0],
    [activeView]
  );

  const sourceBadge = useMemo(() => {
    if (!uploadInfo) {
      return {
        label: "Default Dataset",
        className: "text-slate-300 bg-slate-700/25 border-slate-500/35",
      };
    }

    if (uploadInfo.source_mode === "live") {
      return {
        label: "Live API",
        className: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
      };
    }

    if (uploadInfo.source_mode === "mock") {
      return {
        label: "Mock API",
        className: "text-amber-300 bg-amber-400/10 border-amber-400/25",
      };
    }

    return {
      label: "Uploaded File",
      className: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
    };
  }, [uploadInfo]);

  const handleExportPdf = useCallback(async () => {
    if (isExportingPdf) return;
    const exportNode = document.getElementById("dashboard-export-region");
    if (!exportNode) return;

    setIsExportingPdf(true);
    exportNode.classList.add("pdf-exporting");

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(exportNode, {
        backgroundColor: "#050818",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: exportNode.scrollWidth,
        windowHeight: exportNode.scrollHeight,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });

      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const headerHeight = 42;
      const imageStartY = margin + headerHeight;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - imageStartY - margin;

      const reportDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const generatedAt = new Date().toLocaleString();

      const drawHeader = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("AI Dashboard Export", margin, margin + 10);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Selected Date: ${reportDate}`, margin, margin + 24);
        pdf.text(`Generated At: ${generatedAt}`, margin, margin + 35);
      };

      const imageWidth = usableWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let positionY = imageStartY;

      drawHeader();
      pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        positionY = imageStartY - (imageHeight - heightLeft);
        pdf.addPage();
        drawHeader();
        pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= usableHeight;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`dashboard-${timestamp}.pdf`);
    } catch {
      window.alert("PDF export failed. Please try again.");
    } finally {
      exportNode.classList.remove("pdf-exporting");
      setIsExportingPdf(false);
    }
  }, [selectedDate]);

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
      return;
    }

    input.click();
  }, []);

  const formattedSelectedDate = useMemo(
    () => new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
      day: "numeric",
    }),
    [selectedDate]
  );

  const exportSessionJson = useCallback(() => {
    const payload = {
      exported_at: new Date().toISOString(),
      session_id: sessionId,
      message_count: messages.length,
      query_history: queryHistory,
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, queryHistory, sessionId]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.replace("/login");
  }, [router]);

  if (!isAuthReady) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="glass-panel px-6 py-4 text-sm text-slate-300">Verifying session...</div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="left-rail py-4 px-2 flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.45)] mb-2">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => setActiveView(item.key)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                activeView === item.key
                  ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="flex-1" />
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_16px_rgba(124,58,237,0.38)] inline-flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <p className="text-[11px] text-slate-500">Dashboard / {activeSidebarItem.label}</p>
              <h1 className="font-head text-base text-slate-100">AI Dashboard</h1>
            </div>
            <div className="hidden md:flex items-center gap-2 soft-pill rounded-lg px-3 py-1.5 text-xs min-w-56">
              <Search className="w-3.5 h-3.5" />
              Ask anything about your data...
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden lg:flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-full ${sourceBadge.className}`}>
              <Activity className="w-3 h-3" />
              {sourceBadge.label}
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-xs soft-pill rounded-full px-3 py-1.5">
              <Sparkles className="w-3 h-3 text-violet-300" />
              {uploadInfo ? `Custom: ${uploadInfo.columns.length} columns` : "Amazon Sales Data"}
            </span>
            <button
              type="button"
              onClick={openDatePicker}
              className="hidden md:flex items-center gap-1.5 text-xs soft-pill rounded-full px-3 py-1.5 hover:bg-slate-800/60 transition-colors"
              title="Select report date"
            >
              <CalendarDays className="w-3 h-3" />
              {formattedSelectedDate}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sr-only"
              aria-label="Select report date"
            />
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="hidden md:inline-flex text-xs text-slate-200 bg-slate-900/70 hover:bg-slate-800/80 border border-white/15 px-3 py-1.5 rounded-lg transition-colors items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>
            <button
              onClick={handleNewSession}
              className="text-xs text-slate-200 bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/45 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New query
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          {activeView === "overview" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <section className="xl:col-span-4 2xl:col-span-3 flex flex-col gap-4 flow-fade">
                <FileUpload onUpload={handleUpload} onFetchAmazon={handleFetchAmazon} isLoading={isLoading} />
                {uploadInfo?.dataset_profile && (
                  <div className="glass-panel p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-100">Dataset Profile</p>
                    <p className="text-xs text-slate-400">
                      {uploadInfo.dataset_profile.row_count.toLocaleString()} rows, {uploadInfo.dataset_profile.column_count} columns
                    </p>
                    <p className="text-xs text-slate-400">
                      Numeric: {uploadInfo.dataset_profile.numeric_columns.length} | Categorical: {uploadInfo.dataset_profile.categorical_columns.length} | Date-like: {uploadInfo.dataset_profile.date_columns.length}
                    </p>
                  </div>
                )}

                {!!queryHistory.length && (
                  <div className="glass-panel p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-100">Recent Questions</p>
                    <div className="space-y-2">
                      {queryHistory.slice(0, 5).map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSendQuery(q)}
                          disabled={isLoading}
                          className="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/70 border border-white/10 hover:border-white/20 px-2.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendQuery}
                  isLoading={isLoading}
                  suggestedQueries={suggestedQueries}
                />
              </section>

              <section id="dashboard-export-region" className="xl:col-span-8 2xl:col-span-9 flow-fade">
                <Dashboard
                  messages={messages}
                  latestDashboard={latestDashboard}
                  isLoading={isLoading}
                />
              </section>
            </div>
          )}

          {activeView === "analytics" && (
            <section id="dashboard-export-region" className="flow-fade space-y-4">
              <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-head text-lg text-slate-100">Analytics Workspace</h2>
                  <p className="text-xs text-slate-400">Focused view for analysis and export-ready visuals.</p>
                </div>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="text-xs text-slate-100 bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/45 px-3 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isExportingPdf ? "Exporting..." : "Export This View"}
                </button>
              </div>
              <Dashboard
                messages={messages}
                latestDashboard={latestDashboard}
                isLoading={isLoading}
              />
            </section>
          )}

          {activeView === "reports" && (
            <section className="flow-fade space-y-4">
              <div className="glass-panel p-5">
                <h2 className="font-head text-lg text-slate-100">Reports Center</h2>
                <p className="text-sm text-slate-400 mt-1">Export your current session and dashboard artifacts.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={exportSessionJson}
                    className="text-xs text-slate-100 bg-slate-900/70 hover:bg-slate-800/80 border border-white/15 px-3 py-2 rounded-lg"
                  >
                    Download Session JSON
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="text-xs text-slate-100 bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/45 px-3 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isExportingPdf ? "Exporting..." : "Download Dashboard PDF"}
                  </button>
                </div>
              </div>
              <div id="dashboard-export-region">
                <Dashboard
                  messages={messages}
                  latestDashboard={latestDashboard}
                  isLoading={isLoading}
                />
              </div>
            </section>
          )}

          {activeView === "history" && (
            <section className="flow-fade grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="glass-panel p-4">
                <h2 className="font-head text-lg text-slate-100">Query History</h2>
                <p className="text-xs text-slate-400 mt-1">Replay previous prompts instantly.</p>
                <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {queryHistory.length === 0 && (
                    <p className="text-xs text-slate-500">No queries yet.</p>
                  )}
                  {queryHistory.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setActiveView("overview");
                        handleSendQuery(q);
                      }}
                      disabled={isLoading}
                      className="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/70 border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-4">
                <h2 className="font-head text-lg text-slate-100">Conversation Log</h2>
                <p className="text-xs text-slate-400 mt-1">Latest chat context from this session.</p>
                <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {messages.length === 0 && <p className="text-xs text-slate-500">No messages yet.</p>}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        m.role === "user"
                          ? "bg-violet-500/15 border-violet-400/25 text-violet-100"
                          : "bg-slate-900/65 border-white/10 text-slate-200"
                      }`}
                    >
                      <p className="uppercase tracking-wide text-[10px] opacity-70 mb-1">{m.role}</p>
                      <p className="leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeView === "settings" && (
            <section className="flow-fade">
              <div className="glass-panel p-5 space-y-4">
                <h2 className="font-head text-lg text-slate-100">Workspace Settings</h2>
                <p className="text-sm text-slate-400">Quick controls for your dashboard workflow.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="glass-metric p-3">
                    <p className="text-xs text-slate-300">Session ID</p>
                    <p className="text-xs text-slate-500 mt-1 break-all">{sessionId}</p>
                  </div>
                  <div className="glass-metric p-3">
                    <p className="text-xs text-slate-300">Messages</p>
                    <p className="text-2xl font-head text-slate-100 mt-1">{messages.length}</p>
                  </div>
                  <div className="glass-metric p-3">
                    <p className="text-xs text-slate-300">Saved Queries</p>
                    <p className="text-2xl font-head text-slate-100 mt-1">{queryHistory.length}</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
