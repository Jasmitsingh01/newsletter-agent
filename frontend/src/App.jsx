import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bot,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Newspaper,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  Activity,
  Mail,
  ExternalLink,
  Sparkles,
  Zap,
  Rocket,
  ShieldCheck,
  Code2,
  Globe,
  Lock,
  ArrowLeft,
  ArrowRight,
  Search,
  FileText,
  Copy,
  Download,
  Check,
  Eye,
  Inbox,
  Terminal,
  Camera,
  Layers,
  Settings,
  Sliders,
  Users,
  BarChart3,
  History,
  CheckSquare,
  Square,
  Bookmark,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import "./App.css";

const API = "http://localhost:8000/api/newsletter";

const PRESET_TOPICS = [
  {
    id: "agents",
    icon: Bot,
    badge: "Hot Topic",
    title: "AI Agents & Autonomous Workflows",
    desc: "Multi-agent frameworks, LangGraph orchestration, memory architectures & tool execution.",
    goal: "Create a weekly newsletter on the latest AI agent architectures, multi-agent frameworks, and autonomous workflow breakthroughs.",
    audience: "AI Engineers & Framework Developers",
    style: "Deep-Dive Technical with Architecture Breakdowns",
  },
  {
    id: "opensource",
    icon: Zap,
    badge: "Trending",
    title: "Open Source LLMs & Local AI",
    desc: "Quantization breakthroughs, Ollama/vLLM updates, small language models & edge computing.",
    goal: "Generate a weekly roundup on open-source LLMs, quantization techniques, local inference tools, and edge AI developments.",
    audience: "Open Source AI Enthusiasts & Researchers",
    style: "Practical & Benchmark-Driven",
  },
  {
    id: "startups",
    icon: Rocket,
    badge: "Venture",
    title: "AI Startups & Product Launches",
    desc: "YC AI batches, funding rounds, developer tool releases, and enterprise deployments.",
    goal: "Curate a weekly newsletter covering new AI startup funding rounds, product launches, and developer tool releases.",
    audience: "Tech Founders, Investors & Operators",
    style: "Market-Focused & Executive Brief",
  },
  {
    id: "safety",
    icon: ShieldCheck,
    badge: "Governance",
    title: "AI Safety & Alignment",
    desc: "Red-teaming benchmarks, jailbreak protections, EU AI Act compliance, and safety standards.",
    goal: "Produce an analytical newsletter on AI alignment, safety benchmarks, regulatory updates, and ethical considerations.",
    audience: "Compliance Officers & Safety Researchers",
    style: "Analytical & Objective",
  },
  {
    id: "devtooling",
    icon: Code2,
    badge: "Developer",
    title: "Agent Tooling & Full-Stack AI",
    desc: "SDK releases, MCP servers, vector databases, and full-stack agent integrations.",
    goal: "Summarize the top practical tools, libraries, and best practices for developers building agentic AI applications.",
    audience: "Full-Stack & Backend Software Engineers",
    style: "Code-Centric & Actionable",
  },
];

const REFINEMENT_PRESETS = [
  {
    icon: Sparkles,
    label: "More Research Papers & ArXiv",
    text: "Find recent research papers and evaluations from arXiv, DeepMind, or OpenAI on multi-agent performance.",
  },
  {
    icon: Code2,
    label: "Focus on GitHub Repositories",
    text: "Focus specifically on open-source agent frameworks, GitHub releases, and developer libraries.",
  },
  {
    icon: Rocket,
    label: "Include Startup Launches & Funding",
    text: "Include newly launched AI agent startups, product features, and enterprise deployment stories.",
  },
  {
    icon: ShieldCheck,
    label: "Safety & Security Benchmarks",
    text: "Add coverage of agent safety benchmarks, cybersecurity vulnerabilities, and guardrail architectures.",
  },
];

const NODE_LABELS = {
  planner: "Planning strategy & queries",
  research: "Browser-Use: Web scraping & DOM parsing",
  rank: "Ranking & editorial filtering",
  summarize: "Extracting insights & takeaways",
  writer: "Drafting newsletter issue",
  critic: "Fact-checking & quality critique",
  revision: "Applying editorial refinements",
  output: "Compiling output files & email",
};

function StepIcon({ name, done }) {
  const icons = {
    planner: Activity,
    research: Globe,
    rank: Star,
    summarize: FileText,
    writer: Mail,
    critic: CheckCircle,
    revision: RefreshCw,
    output: Send,
  };
  const Icon = icons[name] || Activity;
  return (
    <Icon
      size={15}
      className={done ? "step-icon done" : "step-icon"}
    />
  );
}

function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spinner" />;
}

// ── Markdown Formatter Component ─────────────────────────────────────
function MarkdownRenderer({ content }) {
  if (!content) return null;

  const renderFormattedText = (text) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="rendered-link"
        >
          {match[1]} <ExternalLink size={11} className="inline-link-icon" />
        </a>
      );
      lastIdx = linkRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts.map((part, pIdx) => {
      if (typeof part !== "string") return part;
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return <strong key={`${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>;
        }
        return bPart;
      });
    });
  };

  const lines = content.split("\n");
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="md-h1">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="md-h2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="md-h3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="md-quote">
          {renderFormattedText(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="md-li">
          {renderFormattedText(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="md-spacer" />);
    } else {
      elements.push(
        <p key={i} className="md-p">
          {renderFormattedText(line)}
        </p>
      );
    }
  }

  return <div className="rendered-markdown">{elements}</div>;
}

// ── Live Chromium Browser-Use Screencast Viewport ────────────────────
function BrowserVisualizer({
  logs,
  phase,
  selectedArticles,
  activeStep,
  liveScreenshot,
  currentBrowserUrl,
  currentBrowserTitle,
  currentBrowserAction,
}) {
  const [browserTab, setBrowserTab] = useState("screencast"); // 'screencast' | 'reader' | 'terminal'
  const [typingIndex, setTypingIndex] = useState(0);

  const browserData = useMemo(() => {
    let latestSearch = "";
    let latestUrl = "";
    let latestTitle = "";
    let latestSnippet = "";
    const searchedQueries = [];
    const visitedPages = [];
    const insights = [];

    for (const log of logs) {
      if (log.includes("[BROWSER:SEARCH]")) {
        const match = log.match(/query: "(.*?)"/);
        if (match) {
          latestSearch = match[1];
          if (!searchedQueries.includes(match[1])) {
            searchedQueries.push(match[1]);
          }
        }
      } else if (log.includes("[BROWSER:NAVIGATE]")) {
        const urlMatch = log.match(/url: "(.*?)"/);
        const titleMatch = log.match(/title: "(.*?)"/);
        if (urlMatch) {
          latestUrl = urlMatch[1];
          latestTitle = titleMatch ? titleMatch[1] : "Web Article";
          visitedPages.push({
            url: urlMatch[1],
            title: latestTitle,
          });
        }
      } else if (log.includes("[BROWSER:READING]")) {
        latestSnippet = log.replace("[BROWSER:READING]", "").trim();
      } else if (log.includes("[BROWSER:ANALYZING]")) {
        insights.push(log.replace("[BROWSER:ANALYZING]", "").trim());
      }
    }

    return {
      latestSearch: latestSearch || "AI Agent Architectures & Autonomous Workflows",
      latestUrl: currentBrowserUrl || latestUrl || (latestSearch ? `https://google.com/search?q=${encodeURIComponent(latestSearch)}` : "https://arxiv.org/search/ai-agents"),
      latestTitle: currentBrowserTitle || latestTitle || "Autonomous Headless Chromium Session",
      latestSnippet,
      searchedQueries,
      visitedPages,
      insights,
    };
  }, [logs, currentBrowserUrl, currentBrowserTitle]);

  useEffect(() => {
    setTypingIndex(0);
    const text = browserData.latestUrl;
    const interval = setInterval(() => {
      setTypingIndex((prev) => {
        if (prev < text.length) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [browserData.latestUrl]);

  const displayUrl = browserData.latestUrl.slice(0, typingIndex || browserData.latestUrl.length);

  return (
    <div className="browser-window">
      {/* Window Controls & Tabs */}
      <div className="browser-chrome">
        <div className="window-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>

        <div className="browser-tabs">
          <button
            type="button"
            className={`browser-tab ${browserTab === "screencast" ? "active" : ""}`}
            onClick={() => setBrowserTab("screencast")}
            aria-label="Live browser stream"
            title="Live browser stream"
          >
            <Camera size={13} />
          </button>
          <button
            type="button"
            className={`browser-tab ${browserTab === "reader" ? "active" : ""}`}
            onClick={() => setBrowserTab("reader")}
            aria-label="DOM extractor"
            title="DOM extractor"
          >
            <FileText size={13} />
          </button>
          <button
            type="button"
            className={`browser-tab ${browserTab === "terminal" ? "active" : ""}`}
            onClick={() => setBrowserTab("terminal")}
            aria-label="Agent console"
            title="Agent console"
          >
            <Terminal size={13} />
          </button>
        </div>
      </div>

      {/* Real Address Bar */}
      <div className="browser-toolbar">
        <div className="nav-controls">
          <button type="button" className="nav-btn" disabled>
            <ArrowLeft size={14} />
          </button>
          <button type="button" className="nav-btn" disabled>
            <ArrowRight size={14} />
          </button>
          <button type="button" className="nav-btn">
            <RefreshCw size={13} className={phase === "running" ? "spin" : ""} />
          </button>
        </div>

        <div className="address-bar">
          <Lock size={12} className="lock-icon" />
          <span className="protocol">https://</span>
          <span className="url-text">{displayUrl}</span>
          {phase === "running" && <span className="typing-cursor">|</span>}
        </div>

        
      </div>

      {/* Action Banner */}
      <div className="browser-action-banner">
        <div className="action-tag">
          <Bot size={13} />
          <span>Browser Action:</span>
        </div>
        <span className="action-details">
          {currentBrowserAction || activeStep || "Connecting to the live browser stream..."}
        </span>
      </div>

      {/* Browser Viewport */}
      <div className="browser-viewport">
        {browserTab === "screencast" && (
          <div className="viewport-screencast">
            {liveScreenshot ? (
              <div className="screencast-container">
                <div className="screencast-header-overlay">
                
                  <a
                    href={browserData.latestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="overlay-url"
                  >
                    <ExternalLink size={11} />
                    {browserData.latestTitle}
                  </a>
                </div>
                <div className="screenshot-wrapper">
                  <img
                    src={liveScreenshot}
                    alt="Live Chromium stream"
                    className="real-browser-img"
                  />
                  {phase === "running" && <div className="scanline-overlay" />}
                </div>
              </div>
            ) : (
              <div className="search-mockup-wrapper">
                <div className="search-mockup-header">
                  <div className="search-box">
                    <Search size={16} className="search-box-icon" />
                    <span className="search-box-query">{browserData.latestSearch}</span>
                    {phase === "running" && <Spinner size={14} />}
                  </div>
                </div>

                <div className="search-results-stream">
                  <div className="results-header">
                    <span>Visited Web Sources ({browserData.visitedPages.length})</span>
                    <span className="active-tag">{activeStep || "Browsing"}</span>
                  </div>

                  {browserData.visitedPages.length > 0 ? (
                    <div className="results-list">
                      {browserData.visitedPages.slice(-4).map((page, idx) => (
                        <div key={idx} className="result-card">
                          <div className="result-domain">
                            <Globe size={11} />
                            <span>{page.url.replace(/^https?:\/\//, "").split("/")[0]}</span>
                            <span className="badge-read">Scraped</span>
                          </div>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="result-title"
                          >
                            {page.title}
                            <ExternalLink size={12} />
                          </a>
                          <p className="result-snippet">
                            {browserData.latestSnippet && idx === browserData.visitedPages.slice(-4).length - 1
                              ? browserData.latestSnippet
                              : `Navigated headless Chrome, parsed text, and extracted live hyperlinks for editorial newsletter synthesis.`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-search-state">
                      <Globe size={32} className="empty-icon" />
                      <p>Launching Google Chrome browser automation & web scraper...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {browserTab === "reader" && (
          <div className="viewport-reader">
            <div className="reader-header">
              <div className="reader-meta">
                <span className="reader-badge">LIVE DOM EXTRACTOR</span>
                <h3 className="reader-title">{browserData.latestTitle}</h3>
                <a
                  href={browserData.latestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="reader-url"
                >
                  <ExternalLink size={12} />
                  {browserData.latestUrl}
                </a>
              </div>
            </div>

            <div className="reading-content-box">
              <div className="reading-scanner-beam" />
              <p className="reading-text-sample">
                {browserData.latestSnippet ||
                  "Parsing HTML elements, evaluating main article body, stripping scripts, and extracting clean text and verified hyperlinks for newsletter curation..."}
              </p>
            </div>

            <div className="extracted-drawer">
              <div className="drawer-title">
                <Sparkles size={14} />
                <span>Extracted Entities & Source Topics</span>
              </div>
              <div className="insight-chips">
                <span className="insight-chip">🎯 Autonomous Agent Systems</span>
                <span className="insight-chip">⚡ Multi-Agent Workflows</span>
                <span className="insight-chip">🔗 Verified Hyperlinks</span>
                <span className="insight-chip">🛡️ Primary Evidence</span>
                {browserData.insights.map((ins, i) => (
                  <span key={i} className="insight-chip dynamic">
                    💡 {ins}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {browserTab === "terminal" && (
          <div className="viewport-terminal">
            <div className="terminal-logs">
              {logs.map((log, i) => (
                <div key={i} className="terminal-line">
                  <span className="term-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="term-msg">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main SaaS Application ────────────────────────────────────────────
function App() {
  const [goal, setGoal] = useState(
    "Create a weekly newsletter on latest AI agent news and send it to our subscribers."
  );
  const [mode, setMode] = useState("autonomous");
  const [audience, setAudience] = useState("AI Engineers & Software Developers");
  const [storyCount, setStoryCount] = useState(6);
  const [newsletterTone, setNewsletterTone] = useState("Deep-Dive Technical");
  const [selectedTopicId, setSelectedTopicId] = useState("agents");

  const [phase, setPhase] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [newsletter, setNewsletter] = useState(null);
  const [critique, setCritique] = useState(null);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [includedUrls, setIncludedUrls] = useState(new Set());
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refineReferences, setRefineReferences] = useState("");
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [outputTab, setOutputTab] = useState("rendered");
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [newsletterSent, setNewsletterSent] = useState(false);

  // Real Browser-Use Screencast state
  const [liveScreenshot, setLiveScreenshot] = useState(null);
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState("");
  const [currentBrowserTitle, setCurrentBrowserTitle] = useState("");
  const [currentBrowserAction, setCurrentBrowserAction] = useState("");

  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  const appendLog = (msg) =>
    setLogs((prev) => [...prev, msg]);

  const connectStream = (id) => {
    eventSourceRef.current?.close();

    const es = new EventSource(`${API}/jobs/${id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "log") {
        appendLog(data.message);
      }

      if (data.type === "browser_event") {
        if (data.screenshot) {
          setLiveScreenshot(data.screenshot);
        }
        if (data.url) {
          setCurrentBrowserUrl(data.url);
        }
        if (data.title) {
          setCurrentBrowserTitle(data.title);
        }
        if (data.details) {
          setCurrentBrowserAction(data.details);
        }
      }

      if (data.type === "status") {
        if (data.status === "completed") {
          es.close();
          await fetchResult(id);
        } else if (data.status === "waiting_for_approval") {
          try {
            const r = await fetch(`${API}/jobs/${id}`);
            const d = await r.json();
            const articles = d.job?.state?.selectedArticles ?? [];
            setSelectedArticles(articles);
            setIncludedUrls(new Set(articles.map((a) => a.url)));
          } catch {
            // non-fatal
          }
          setPhase("waiting_approval");
        } else if (data.status === "failed") {
          setPhase("failed");
          es.close();
        }
      }

      if (data.type === "error") {
        setError(data.message);
        setPhase("failed");
        es.close();
      }
    };

    es.onerror = () => es.close();
  };

  const fetchResult = async (id) => {
    try {
      const res = await fetch(`${API}/jobs/${id}`);
      const data = await res.json();
      if (data.job?.result?.newsletter) {
        setNewsletter(data.job.result.newsletter);
        setCritique(data.job.result.critique ?? null);
        setPhase("completed");
        showToast("Newsletter generated and fact-checked successfully!");
      } else {
        setError("Agent completed but no newsletter was produced.");
        setPhase("failed");
      }
    } catch (err) {
      setError(err.message);
      setPhase("failed");
    }
  };

  const runAgent = async () => {
    setPhase("running");
    setError("");
    setLogs([]);
    setNewsletter(null);
    setCritique(null);
    setSelectedArticles([]);
    setRefineFeedback("");
    setRefineReferences("");
    setLiveScreenshot(null);
    setCurrentBrowserUrl("");
    setCurrentBrowserTitle("");
    setCurrentBrowserAction("");
    setJobId(null);
    setNewsletterSent(false);

    const fullGoal = `${goal} (Target Audience: ${audience}, Stories: ${storyCount}, Tone: ${newsletterTone})`;

    try {
      const res = await fetch(`${API}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: fullGoal, mode }),
      });
      if (!res.ok) throw new Error("Failed to launch agent session");
      const data = await res.json();
      setJobId(data.jobId);
      connectStream(data.jobId);
      showToast("Autonomous browser agent initialized!");
    } catch (err) {
      setError(err.message);
      setPhase("failed");
    }
  };

  const approveResearch = async () => {
    if (!jobId) return;
    setApproving(true);
    try {
      const res = await fetch(`${API}/jobs/${jobId}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Approval failed");
      setPhase("running");
      connectStream(jobId);
      showToast("Articles approved! Writing newsletter draft...");
    } catch (err) {
      setError(err.message);
      setPhase("failed");
    } finally {
      setApproving(false);
    }
  };

  const refineResearch = async () => {
    if (!jobId || !refineFeedback.trim()) return;
    setRefining(true);
    setError("");

    try {
      const referencesArray = refineReferences
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${API}/jobs/${jobId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: refineFeedback,
          references: referencesArray,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit refinement request");
      }

      setPhase("running");
      setRefineFeedback("");
      setRefineReferences("");
      connectStream(jobId);
      showToast("Refinement submitted! Browser is re-searching...");
    } catch (err) {
      setError(err.message);
    } finally {
      setRefining(false);
    }
  };

  const reset = () => {
    eventSourceRef.current?.close();
    setPhase("idle");
    setLogs([]);
    setJobId(null);
    setNewsletter(null);
    setCritique(null);
    setSelectedArticles([]);
    setRefineFeedback("");
    setRefineReferences("");
    setLiveScreenshot(null);
    setCurrentBrowserUrl("");
    setCurrentBrowserTitle("");
    setCurrentBrowserAction("");
    setError("");
    setNewsletterSent(false);
  };

  const handleSelectPreset = (preset) => {
    setSelectedTopicId(preset.id);
    setGoal(preset.goal);
    setAudience(preset.audience);
    setNewsletterTone(preset.style);
    showToast(`Loaded preset: ${preset.title}`);
  };

  const toggleArticleInclusion = (url) => {
    setIncludedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!newsletter) return;
    const blob = new Blob([newsletter.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded newsletter.md");
  };

  const sendNewsletterToSubscribers = async () => {
    if (!jobId || !newsletter || sendingNewsletter || newsletterSent) return;

    setSendingNewsletter(true);
    try {
      const res = await fetch(`${API}/jobs/${jobId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send newsletter");
      setNewsletterSent(true);
      showToast(`Newsletter sent to all ${data.delivery.recipientCount} subscribers!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send newsletter");
    } finally {
      setSendingNewsletter(false);
    }
  };

  const isRunning = phase === "running";

  const steps = Object.keys(NODE_LABELS);
  const completedSteps = steps.filter((s) =>
    logs.some((l) => l.includes(`Agent step completed: ${s}`))
  );
  const activeStep = steps.find((s) => !completedSteps.includes(s));

  // Word count & reading time calculation
  const wordCount = useMemo(() => {
    if (!newsletter?.markdown) return 0;
    return newsletter.markdown.trim().split(/\s+/).length;
  }, [newsletter]);
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="saas-app">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="saas-toast">
          <Sparkles size={14} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SaaS Top Navbar */}
      <header className="saas-header">
        <div className="saas-header-inner">
          <div className="brand-group">
            <div className="brand-logo-badge">
              <Bot size={22} className="brand-logo-icon" />
            </div>
            <div>
              <div className="brand-title-row">
                <span className="brand-name">AgentNews</span>
                <span className="saas-version-pill">SaaS v2.5 PRO</span>
              </div>
              <p className="brand-tagline">Autonomous Browser-Use Editorial Agent</p>
            </div>
          </div>

          <div className="header-meta-group">
            <div className="system-health-pill">
              <span className="online-indicator" />
              <span>Chromium Engine Ready</span>
            </div>
            <div className="system-health-pill model">
              <Sparkles size={12} />
              <span>Gemma 31B</span>
            </div>
            {phase !== "idle" && (
              <div className={`status-badge status-${phase}`}>
                {phase === "running" && <Spinner size={12} />}
                {phase === "completed" && <CheckCircle size={13} />}
                {phase === "failed" && <XCircle size={13} />}
                {phase === "waiting_approval" && <Clock size={13} />}
                <span>
                  {phase === "running" && "Agent Active"}
                  {phase === "completed" && "Completed"}
                  {phase === "failed" && "Failed"}
                  {phase === "waiting_approval" && "Awaiting Review"}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main SaaS Workspace */}
      <main className="saas-main">
        {/* Topic Matrix & Configuration Studio */}
        {(phase === "idle" || phase === "failed") && (
          <div className="config-studio-layout">
            {/* Left Hero Configuration */}
            <section className="card saas-card config-main-card">
              <div className="card-header-row">
                <div className="card-header-left">
                  <Sliders size={18} className="header-accent-icon" />
                  <div>
                    <h2 className="card-heading">Create Newsletter Campaign</h2>
                    <p className="card-subheading">Define your topic, audience, and autonomous browser instructions</p>
                  </div>
                </div>
              </div>

              {/* Goal Input Field */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="saas-label">Campaign Directive & Topic</label>
                  <span className="label-badge">Autonomous Objective</span>
                </div>
                <textarea
                  className="saas-textarea"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={4}
                  placeholder="Describe your newsletter directive in detail..."
                />
              </div>

              {/* Preset Topic Cards Matrix */}
              <div className="preset-matrix-section">
                <span className="matrix-title">Or choose a curated newsletter track:</span>
                <div className="preset-matrix-grid">
                  {PRESET_TOPICS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedTopicId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`preset-card ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectPreset(preset)}
                      >
                        <div className="preset-card-top">
                          <div className="preset-icon-wrap">
                            <Icon size={16} />
                          </div>
                          <span className="preset-badge">{preset.badge}</span>
                        </div>
                        <h4 className="preset-title">{preset.title}</h4>
                        <p className="preset-desc">{preset.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Parameters Grid */}
              <div className="advanced-params-grid">
                <div className="form-group">
                  <label className="saas-label">Target Audience</label>
                  <input
                    type="text"
                    className="saas-input"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. AI Researchers, Senior Developers..."
                  />
                </div>

                <div className="form-group">
                  <label className="saas-label">Stories to Feature</label>
                  <select
                    className="saas-select"
                    value={storyCount}
                    onChange={(e) => setStoryCount(Number(e.target.value))}
                  >
                    <option value={4}>4 Stories (Quick Digest)</option>
                    <option value={5}>5 Stories (Balanced)</option>
                    <option value={6}>6 Stories (Comprehensive)</option>
                    <option value={7}>7 Stories (Deep Dive)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="saas-label">Editorial Style & Tone</label>
                  <select
                    className="saas-select"
                    value={newsletterTone}
                    onChange={(e) => setNewsletterTone(e.target.value)}
                  >
                    <option value="Deep-Dive Technical">Deep-Dive Technical</option>
                    <option value="Executive Brief">Executive Brief (TL;DR)</option>
                    <option value="Practical & Actionable">Practical & Actionable</option>
                    <option value="Analytical & Research">Analytical & Research</option>
                  </select>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="form-group mode-selection-section">
                <label className="saas-label">Autonomous Agent Mode</label>
                <div className="mode-cards-grid">
                  <div
                    className={`mode-card ${mode === "autonomous" ? "active" : ""}`}
                    onClick={() => setMode("autonomous")}
                  >
                    <div className="mode-card-header">
                      <Bot size={18} />
                      <span className="mode-name">Fully Autonomous</span>
                      {mode === "autonomous" && <span className="mode-check">ACTIVE</span>}
                    </div>
                    <p className="mode-desc">
                      Agent autonomously searches, navigates Chrome, ranks, synthesizes, and self-critiques end-to-end without stopping.
                    </p>
                  </div>

                  <div
                    className={`mode-card ${mode === "human" ? "active" : ""}`}
                    onClick={() => setMode("human")}
                  >
                    <div className="mode-card-header">
                      <UserCheck size={18} />
                      <span className="mode-name">Human-in-the-Loop</span>
                      {mode === "human" && <span className="mode-check">ACTIVE</span>}
                    </div>
                    <p className="mode-desc">
                      Pauses after Chrome research to let you inspect articles, add custom instructions/references, or re-search before drafting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Launch Actions */}
              <div className="form-actions-bar">
                {phase === "failed" && (
                  <button className="btn saas-btn-ghost" onClick={reset}>
                    <RefreshCw size={15} />
                    Reset
                  </button>
                )}
                <button className="btn saas-btn-primary launch-btn" onClick={runAgent}>
                  <Send size={16} />
                  Launch Autonomous Browser Agent
                </button>
              </div>

              {error && (
                <div className="saas-alert alert-error">
                  <XCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Live Stepper Tracker */}
        {phase !== "idle" && (
          <section className="card saas-card stepper-card">
            <div className="stepper-horizontal">
              {steps.map((step, idx) => {
                const done = completedSteps.includes(step);
                const active = isRunning && !done && completedSteps.length === steps.indexOf(step);
                return (
                  <div
                    key={step}
                    className={`step-item ${done ? "done" : active ? "active" : "pending"}`}
                  >
                    <div className="step-num-badge">
                      {done ? (
                        <CheckCircle size={14} className="step-check" />
                      ) : active ? (
                        <Spinner size={13} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="step-text-group">
                      <span className="step-title-text">{NODE_LABELS[step].split(":")[0]}</span>
                      <span className="step-sub-text">{done ? "Completed" : active ? "Processing..." : "Pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live Browser-Use Screencast & Agent Viewport */}
        {(isRunning || phase === "waiting_approval" || logs.length > 0) && phase !== "completed" && (
          <BrowserVisualizer
            logs={logs}
            phase={phase}
            selectedArticles={selectedArticles}
            activeStep={NODE_LABELS[activeStep]}
            liveScreenshot={liveScreenshot}
            currentBrowserUrl={currentBrowserUrl}
            currentBrowserTitle={currentBrowserTitle}
            currentBrowserAction={currentBrowserAction}
          />
        )}

        {/* Human-in-the-Loop Review Workbench */}
        {phase === "waiting_approval" && (
          <section className="card saas-card approval-workbench">
            <div className="workbench-header">
              <div className="workbench-title-group">
                <div className="workbench-icon-badge">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="workbench-title">Editorial Review Workbench</h3>
                  <p className="workbench-desc">
                    The browser agent researched and curated {selectedArticles.length} primary stories. You can include/exclude stories or direct re-research.
                  </p>
                </div>
              </div>
              <button
                className="btn saas-btn-primary"
                onClick={approveResearch}
                disabled={approving || refining}
              >
                {approving ? <Spinner size={15} /> : <CheckCircle size={15} />}
                {approving ? "Synthesizing Newsletter..." : "Approve & Compile Newsletter"}
              </button>
            </div>

            {/* Articles Selection Grid */}
            {selectedArticles.length > 0 ? (
              <div className="articles-workbench-grid">
                {selectedArticles.map((article, i) => {
                  const isChecked = includedUrls.has(article.url);
                  return (
                    <div
                      key={i}
                      className={`article-card ${isChecked ? "included" : "excluded"}`}
                    >
                      <div className="article-card-header">
                        <button
                          type="button"
                          className="checkbox-btn"
                          onClick={() => toggleArticleInclusion(article.url)}
                          title={isChecked ? "Exclude from newsletter" : "Include in newsletter"}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="checked-icon" />
                          ) : (
                            <Square size={16} className="unchecked-icon" />
                          )}
                        </button>
                        <span className="article-order">Story #{i + 1}</span>
                        <span className="article-domain-tag">
                          {article.url.replace(/^https?:\/\//, "").split("/")[0]}
                        </span>
                      </div>

                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="article-heading-link"
                      >
                        {article.title}
                        <ExternalLink size={12} />
                      </a>

                      <p className="article-snippet-text">
                        {article.content
                          ? `${article.content.slice(0, 220).trim()}...`
                          : "Primary source article extracted via headless Chromium DOM scraper."}
                      </p>

                      {article.links && article.links.length > 0 && (
                        <div className="source-links-row">
                          <span className="links-count">{article.links.length} citations verified</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-articles-msg">
                <Spinner size={18} />
                <span>Loading researched articles from browser agent...</span>
              </div>
            )}

            {/* Interactive Refinement & Re-search Panel */}
            <div className="refinement-container">
              <div className="refinement-heading-row">
                <Sparkles size={16} className="sparkle-accent" />
                <div>
                  <h4 className="refine-title">Refine Browser Directives & Research</h4>
                  <p className="refine-sub">Provide specific guidance or seeds to steer the autonomous browser agent</p>
                </div>
              </div>

              {/* Quick suggestion chips */}
              <div className="refine-chips-row">
                {REFINEMENT_PRESETS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="refine-preset-chip"
                      onClick={() => setRefineFeedback(item.text)}
                    >
                      <Icon size={12} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Instructions Textarea */}
              <div className="form-group" style={{ marginTop: "12px", marginBottom: "12px" }}>
                <label className="saas-label">Instructions for Re-Research</label>
                <textarea
                  className="saas-textarea"
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  rows={3}
                  placeholder="e.g. Focus on newly published papers on multi-agent memory, omit generic chatbot news..."
                />
              </div>

              {/* Seed URLs & Search Terms */}
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="saas-label">Specific Reference URLs or Search Seeds (Optional)</label>
                <textarea
                  className="saas-textarea"
                  value={refineReferences}
                  onChange={(e) => setRefineReferences(e.target.value)}
                  rows={2}
                  placeholder="https://github.com/... or specific search queries (one per line)"
                />
              </div>

              <div className="refinement-actions-row">
                <button
                  type="button"
                  className="btn saas-btn-ghost"
                  onClick={refineResearch}
                  disabled={refining || approving || !refineFeedback.trim()}
                >
                  {refining ? <Spinner size={14} /> : <RefreshCw size={14} />}
                  {refining ? "Navigating Chrome & Re-Searching..." : "Re-Research with Directives"}
                </button>
                <button
                  type="button"
                  className="btn saas-btn-primary"
                  onClick={approveResearch}
                  disabled={approving || refining}
                >
                  {approving ? <Spinner size={14} /> : <CheckCircle size={14} />}
                  {approving ? "Synthesizing..." : "Approve & Compile Newsletter"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Final Outcome Studio & Email Distribution */}
        {phase === "completed" && newsletter && (
          <section className="outcome-studio-section">
            {/* Top Toolbar */}
            <div className="studio-topbar-card card saas-card">
              <div className="studio-title-block">
                <div className="completed-badge-icon">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h2 className="studio-main-heading">Newsletter Ready for Publication</h2>
                  <div className="studio-metrics-row">
                    <span className="metric-item">
                      <BookOpen size={12} /> {readTimeMin} min read (~{wordCount} words)
                    </span>
                    <span className="metric-item">
                      <Users size={12} /> 3 subscribers
                    </span>
                    <span className="metric-item">
                      <Star size={12} /> Score: {critique?.score || 95}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className="studio-action-buttons">
                <button
                  type="button"
                  className="btn saas-btn-ghost btn-sm"
                  onClick={() => copyToClipboard(newsletter.markdown)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy Markdown"}
                </button>
                <button
                  type="button"
                  className="btn saas-btn-ghost btn-sm"
                  onClick={downloadMarkdown}
                >
                  <Download size={14} />
                  Download .md
                </button>
                <button
                  type="button"
                  className="btn saas-btn-primary btn-sm"
                  onClick={sendNewsletterToSubscribers}
                  disabled={sendingNewsletter || newsletterSent}
                >
                  {sendingNewsletter ? <Spinner size={14} /> : newsletterSent ? <Check size={14} /> : <Send size={14} />}
                  {sendingNewsletter ? "Sending…" : newsletterSent ? "Sent to all subscribers" : "Send to all subscribers"}
                </button>
                <button
                  type="button"
                  className="btn saas-btn-ghost btn-sm"
                  onClick={reset}
                >
                  <RefreshCw size={14} />
                  New Campaign
                </button>
              </div>
            </div>

            {/* Quality & Fact-Checking Audit */}
            {critique && (
              <div className="card saas-card audit-card">
                <div className="audit-header">
                  <div className="audit-score-pill">
                    <span className="score-number">{critique.score}</span>
                    <span className="score-label">/ 100</span>
                  </div>
                  <div className="audit-info">
                    <div className="audit-status-row">
                      <Star size={16} className="star-yellow" />
                      <span className="audit-status-title">
                        {critique.approved ? "Editorial Quality & Fact-Check Approved" : "Editorial Review Completed"}
                      </span>
                    </div>
                    <p className="audit-desc">
                      Verified against primary sources, claims consistency, factual evidence, and stakeholder requirements.
                    </p>
                  </div>
                </div>

                {critique.issues?.length > 0 && (
                  <div className="audit-issues-box">
                    <span className="issues-title">Verification Notes:</span>
                    <ul className="issues-ul">
                      {critique.issues.map((issue, idx) => (
                        <li key={idx} className="issue-li">
                          <AlertTriangle size={13} />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Studio Multi-Tab Viewport */}
            <div className="card saas-card studio-viewport-card">
              <div className="viewport-tabs-header">
                <button
                  type="button"
                  className={`v-tab ${outputTab === "rendered" ? "active" : ""}`}
                  onClick={() => setOutputTab("rendered")}
                >
                  <Eye size={14} />
                  <span>Interactive Newsletter</span>
                </button>
                <button
                  type="button"
                  className={`v-tab ${outputTab === "email" ? "active" : ""}`}
                  onClick={() => setOutputTab("email")}
                >
                  <Inbox size={14} />
                  <span>Email Client Simulator</span>
                </button>
                <button
                  type="button"
                  className={`v-tab ${outputTab === "markdown" ? "active" : ""}`}
                  onClick={() => setOutputTab("markdown")}
                >
                  <Code2 size={14} />
                  <span>Markdown Source</span>
                </button>
              </div>

              {/* Tab 1: Formatted Newsletter */}
              {outputTab === "rendered" && (
                <div className="rendered-newsletter-container">
                  <div className="newsletter-masthead">
                    <div className="masthead-badge">
                      <TrendingUp size={12} />
                      <span>AI AGENT DISPATCH • WEEKLY ISSUE</span>
                    </div>
                    <h1 className="masthead-title">{newsletter.subject}</h1>
                  </div>
                  <hr className="saas-divider" />
                  <MarkdownRenderer content={newsletter.markdown} />
                </div>
              )}

              {/* Tab 2: Email Client Simulator */}
              {outputTab === "email" && (
                <div className="email-simulator-wrapper">
                  <div className="email-client-chrome">
                    <div className="client-dots">
                      <span className="dot dot-red" />
                      <span className="dot dot-yellow" />
                      <span className="dot dot-green" />
                    </div>
                    <span className="client-title">Inbox — AI Agent Dispatch</span>
                  </div>

                  <div className="email-headers-panel">
                    <div className="email-header-row">
                      <span className="h-label">From:</span>
                      <span className="h-val">AI Agent Dispatch &lt;newsletter@ai.dev&gt;</span>
                    </div>
                    <div className="email-header-row">
                      <span className="h-label">To:</span>
                      <span className="h-val">All 3 configured subscribers</span>
                    </div>
                    <div className="email-header-row">
                      <span className="h-label">Subject:</span>
                      <span className="h-val highlight">{newsletter.subject}</span>
                    </div>
                  </div>

                  <div className="email-rendered-body">
                    <MarkdownRenderer content={newsletter.markdown} />
                  </div>
                </div>
              )}

              {/* Tab 3: Markdown Source */}
              {outputTab === "markdown" && (
                <div className="markdown-source-wrapper">
                  <div className="code-toolbar">
                    <span>newsletter.md ({wordCount} words)</span>
                    <button
                      type="button"
                      className="btn saas-btn-ghost btn-xs"
                      onClick={() => copyToClipboard(newsletter.markdown)}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="raw-code-block">{newsletter.markdown}</pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Activity Trace Log */}
        {logs.length > 0 && (
          <section className="card saas-card logs-card">
            <button
              className="logs-toggle-btn"
              onClick={() => setShowLogs((v) => !v)}
            >
              <Activity size={15} />
              <span>Full Agent Activity Trace ({logs.length} events logged)</span>
              {showLogs ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showLogs && (
              <div className="logs-scroller">
                {logs.map((log, i) => {
                  const isFail = log.toLowerCase().includes("failed");
                  const isSuccess = log.toLowerCase().includes("completed");
                  const isBrowser = log.includes("[BROWSER");
                  return (
                    <div
                      key={i}
                      className={`log-row ${
                        isFail ? "fail" : isSuccess ? "success" : isBrowser ? "browser" : ""
                      }`}
                    >
                      <span className="log-idx">{String(i + 1).padStart(2, "0")}</span>
                      <span className="log-text">{log}</span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
