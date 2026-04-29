import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TOKEN_STORAGE_KEY = "cco_demo_token";
const USER_STORAGE_KEY = "cco_demo_user";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});

const statusClassMap = {
  Optimized: "status optimized",
  Moderate: "status moderate",
  "Not Optimized": "status not-optimized"
};

const priorityClassMap = {
  High: "priority high",
  Medium: "priority medium",
  Low: "priority low"
};

const advisorClassMap = {
  High: "advisor-badge high",
  Medium: "advisor-badge medium",
  Low: "advisor-badge low"
};

const serviceHealthClassMap = {
  Healthy: "service-state healthy",
  Degraded: "service-state degraded",
  Critical: "service-state critical"
};

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getRuntimeHealthLabel = (overall = "Unknown") => {
  if (overall === "Critical") return "Needs Immediate Attention";
  if (overall === "Warning") return "Watch Closely";
  if (overall === "Healthy") return "Stable";
  return "Unknown";
};

const ProgressBar = ({ label, value }) => (
  <div className="progress-item">
    <div className="progress-head">
      <p>{label}</p>
      <span>{value}%</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const nodeLayout = [
  { key: "gateway", x: 14, y: 20, label: "Gateway", serviceId: "svc-gateway" },
  { key: "checkout", x: 46, y: 14, label: "Checkout", serviceId: "svc-checkout" },
  { key: "notify", x: 78, y: 22, label: "Notify", serviceId: "svc-notify" },
  { key: "media", x: 25, y: 64, label: "Media", serviceId: "svc-media" },
  { key: "analytics", x: 67, y: 68, label: "Analytics", serviceId: "svc-analytics" }
];

const links = [
  ["gateway", "checkout"],
  ["checkout", "notify"],
  ["gateway", "media"],
  ["media", "analytics"],
  ["checkout", "analytics"]
];

const getNodeHealthClass = (status = "Healthy") => {
  if (status === "Critical") return "node critical";
  if (status === "Degraded") return "node degraded";
  return "node healthy";
};

const TopologyMap = ({ services, crisisActive }) => {
  const serviceById = new Map((services || []).map((service) => [service.id, service]));
  const nodeByKey = new Map(nodeLayout.map((node) => [node.key, node]));

  return (
    <div className="topology-wrap">
      <svg viewBox="0 0 100 100" className={crisisActive ? "topology-links pulse" : "topology-links"}>
        {links.map(([fromKey, toKey]) => {
          const from = nodeByKey.get(fromKey);
          const to = nodeByKey.get(toKey);
          return (
            <line
              key={`${fromKey}-${toKey}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {nodeLayout.map((node) => {
        const service = serviceById.get(node.serviceId) || {};
        return (
          <article
            key={node.key}
            className={getNodeHealthClass(service.status)}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <strong>{node.label}</strong>
            <span>{service.status || "Unknown"}</span>
          </article>
        );
      })}
    </div>
  );
};

const LoginScreen = ({ form, mode, onModeChange, onChange, onSubmit, loading, error }) => (
  <main className="login-page">
    <section className="login-wrap">
      <article className="login-info">
        <p className="eyebrow">Final Year Project</p>
        <h1>AWS Cloud Cost Optimizer Pro</h1>
        <p>
          Enterprise-style FinOps dashboard with governance score, action planning, and resource risk
          intelligence.
        </p>
        <ul>
          <li>Role-based entry (demo)</li>
          <li>Cost optimization maturity scoring</li>
          <li>Action board with ownership and expected savings</li>
        </ul>
      </article>

      <article className="login-card">
        <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
        <p>
          {mode === "login"
            ? "Use your account credentials to access the dashboard."
            : "Create a local account for your teammate without any database setup."}
        </p>
        <div className="auth-mode-switch">
          <button
            type="button"
            className={mode === "login" ? "mode-btn active" : "mode-btn"}
            onClick={() => onModeChange("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "register" ? "mode-btn active" : "mode-btn"}
            onClick={() => onModeChange("register")}
          >
            Create Account
          </button>
        </div>
        <form onSubmit={onSubmit} className="login-form">
          {mode === "register" && (
            <>
              <label>
                Full Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => onChange("name", event.target.value)}
                  required
                />
              </label>
              <label>
                Role
                <input
                  type="text"
                  value={form.role}
                  onChange={(event) => onChange("role", event.target.value)}
                  placeholder="FinOps Analyst"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="demo-note">
          Demo account: <strong>admin@beproject.com</strong> / <strong>admin123</strong>
        </p>
      </article>
    </section>
  </main>
);

function App() {
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem(TOKEN_STORAGE_KEY) || "",
    user: safeParse(localStorage.getItem(USER_STORAGE_KEY))
  }));
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({
    name: "",
    role: "Team Member",
    email: "admin@beproject.com",
    password: "admin123"
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [simulator, setSimulator] = useState({
    scenario: "normal",
    services: [],
    activityLog: [],
    timelineFrames: [],
    warRoom: null
  });
  const [actionCatalog, setActionCatalog] = useState([]);
  const [actionLoading, setActionLoading] = useState("");
  const [actionIntensity, setActionIntensity] = useState(2);
  const [activeView, setActiveView] = useState("dashboard");
  const [streamStatus, setStreamStatus] = useState("Offline");
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [warRoom, setWarRoom] = useState({
    incidentId: null,
    crisisActive: false,
    lossPerMin: 0,
    revenueRiskPerMin: 0,
    priorityAction: "Monitor platform baseline.",
    eta: "No active incident",
    rootCause: "System stable.",
    blastRadius: [],
    moneySaved: 0,
    reportCard: null,
    resolutionSeconds: 0
  });
  const [timeFrames, setTimeFrames] = useState([]);
  const [timeFrameIndex, setTimeFrameIndex] = useState(0);
  const [storyPlaying, setStoryPlaying] = useState(false);
  const [storyStep, setStoryStep] = useState(0);
  const [ceoMode, setCeoMode] = useState(false);
  const [liveLeakCounter, setLiveLeakCounter] = useState(0);
  const [reportCard, setReportCard] = useState(null);

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setSession({ token: "", user: null });
    setAnalysis(null);
    setSimulator({
      scenario: "normal",
      services: [],
      activityLog: [],
      timelineFrames: [],
      warRoom: null
    });
    setActionCatalog([]);
    setWarRoom({
      incidentId: null,
      crisisActive: false,
      lossPerMin: 0,
      revenueRiskPerMin: 0,
      priorityAction: "Monitor platform baseline.",
      eta: "No active incident",
      rootCause: "System stable.",
      blastRadius: [],
      moneySaved: 0,
      reportCard: null,
      resolutionSeconds: 0
    });
    setTimeFrames([]);
    setReportCard(null);
    setError("");
  };

  const fetchInitialData = async (token) => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [stateRes, actionsRes, warRoomRes, framesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/simulator/state`, { headers }),
        fetch(`${API_BASE_URL}/api/simulator/actions`, { headers }),
        fetch(`${API_BASE_URL}/api/war-room/state`, { headers }),
        fetch(`${API_BASE_URL}/api/timemachine/frames?limit=60`, { headers })
      ]);

      if (
        stateRes.status === 401 ||
        actionsRes.status === 401 ||
        warRoomRes.status === 401 ||
        framesRes.status === 401
      ) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      if (!stateRes.ok) {
        throw new Error("Could not fetch simulator state.");
      }
      if (!actionsRes.ok) throw new Error("Could not fetch simulator actions.");
      if (!warRoomRes.ok) throw new Error("Could not fetch war room state.");
      if (!framesRes.ok) throw new Error("Could not fetch timeline frames.");

      const stateResult = await stateRes.json();
      const actionResult = await actionsRes.json();
      const warRoomResult = await warRoomRes.json();
      const framesResult = await framesRes.json();
      setAnalysis(stateResult.analysis);
      setSimulator(stateResult.simulator);
      setActionCatalog(actionResult.actions || []);
      setWarRoom(warRoomResult.warRoom || stateResult.simulator.warRoom || null);
      setTimeFrames(framesResult.frames || stateResult.simulator.timelineFrames || []);
      setReportCard(
        (warRoomResult.warRoom && warRoomResult.warRoom.reportCard) ||
          (stateResult.simulator.warRoom && stateResult.simulator.warRoom.reportCard) ||
          null
      );
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("cco_api_base_url", API_BASE_URL);
  }, []);

  useEffect(() => {
    if (!session.token) {
      setLoading(false);
      return;
    }
    fetchInitialData(session.token);
  }, [session.token]);

  useEffect(() => {
    if (!session.token) return;

    const source = new EventSource(
      `${API_BASE_URL}/api/stream?token=${encodeURIComponent(session.token)}`
    );
    setStreamStatus("Connecting");

    source.addEventListener("connected", () => {
      setStreamStatus("Live");
    });

    source.addEventListener("analysis-update", (event) => {
      try {
        const payload = JSON.parse(event.data);
        setAnalysis(payload.analysis);
        setSimulator(payload.simulator);
        setWarRoom(payload.simulator?.warRoom || null);
        setTimeFrames(payload.simulator?.timelineFrames || []);
        if (payload.simulator?.warRoom?.reportCard) {
          setReportCard(payload.simulator.warRoom.reportCard);
        }
        setLastRealtimeUpdate(payload.timestamp || new Date().toISOString());
        setError("");
        setStreamStatus("Live");
      } catch {
        setStreamStatus("Data Error");
      }
    });

    source.onerror = () => {
      setStreamStatus("Reconnecting");
    };

    return () => {
      source.close();
      setStreamStatus("Offline");
    };
  }, [session.token]);

  useEffect(() => {
    if (!warRoom?.crisisActive) return;

    const tick = setInterval(() => {
      setLiveLeakCounter((prev) => prev + Number(warRoom.lossPerMin || 0) / 60);
    }, 1000);

    return () => clearInterval(tick);
  }, [warRoom?.crisisActive, warRoom?.lossPerMin]);

  useEffect(() => {
    if (!storyPlaying) return;
    const totalSteps = Math.min(6, timeFrames.length || 0);
    if (totalSteps <= 1) {
      setStoryPlaying(false);
      return;
    }

    const replayOrder = Array.from({ length: totalSteps }, (_, index) => totalSteps - 1 - index);
    setStoryStep(0);
    setTimeFrameIndex(replayOrder[0] || 0);
    const timer = setInterval(() => {
      setStoryStep((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          clearInterval(timer);
          setStoryPlaying(false);
          return prev;
        }
        setTimeFrameIndex(replayOrder[next] || 0);
        return next;
      });
    }, 1400);

    return () => clearInterval(timer);
  }, [storyPlaying, timeFrames.length]);

  useEffect(() => {
    const maxIndex = Math.max(0, timeFrames.length - 1);
    if (timeFrameIndex > maxIndex) {
      setTimeFrameIndex(maxIndex);
    }
  }, [timeFrameIndex, timeFrames.length]);

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setLoginError("");

    if (mode === "login") {
      setLoginForm((prev) => ({
        ...prev,
        email: "admin@beproject.com",
        password: "admin123"
      }));
    } else {
      setLoginForm((prev) => ({
        ...prev,
        name: "",
        role: "Team Member",
        email: "",
        password: ""
      }));
    }
  };

  const onAuthSubmit = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const isLogin = authMode === "login";
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? {
            email: loginForm.email,
            password: loginForm.password
          }
        : {
            name: loginForm.name,
            role: loginForm.role,
            email: loginForm.email,
            password: loginForm.password
          };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || (isLogin ? "Login failed." : "Registration failed."));
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      setSession({ token: result.token, user: result.user });
    } catch (err) {
      setLoginError(err.message || "Unable to complete authentication.");
    } finally {
      setLoginLoading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!analysis) return [];
    return [
      { title: "Overall Status", value: analysis.summary.overallStatus },
      { title: "Monthly Spend", value: currency.format(analysis.summary.totalMonthlyCost) },
      { title: "Potential Savings", value: currency.format(analysis.summary.totalPotentialSavings) },
      { title: "Average Score", value: `${analysis.summary.averageScore}/100` },
      { title: "Maturity Level", value: analysis.maturity.level },
      { title: "High Risk Assets", value: analysis.governance.highRiskResources }
    ];
  }, [analysis]);

  const serviceHealthSummary = useMemo(() => {
    const counts = { Healthy: 0, Degraded: 0, Critical: 0 };
    simulator.services.forEach((service) => {
      counts[service.status] += 1;
    });
    return counts;
  }, [simulator.services]);

  const filteredResources = useMemo(() => {
    if (!analysis) return [];
    return analysis.resources.filter((resource) => {
      const matchStatus = statusFilter === "All" ? true : resource.status === statusFilter;
      const matchSearch = [resource.name, resource.type, resource.region]
        .join(" ")
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [analysis, searchText, statusFilter]);

  const totalMonthlyCostBase = analysis?.summary?.totalMonthlyCost || 1;
  const websiteAdvisorCards = analysis?.websiteAdvisor?.cards || [];
  const selectedFrame = timeFrames[timeFrameIndex] || null;
  const storyScenes = useMemo(() => {
    const count = Math.min(6, timeFrames.length || 0);
    return Array.from({ length: count }, (_, index) => {
      const frameIndex = count - 1 - index;
      return { frame: timeFrames[frameIndex], frameIndex };
    }).filter((item) => item.frame);
  }, [timeFrames]);
  const oldestFrame = timeFrames.length > 0 ? timeFrames[timeFrames.length - 1] : null;
  const twinBeforeCost = Number(oldestFrame?.totalMonthlyCost || totalMonthlyCostBase);
  const twinAfterCost = Number(analysis?.summary?.totalMonthlyCost || 0);
  const twinSavings = Math.max(0, twinBeforeCost - twinAfterCost);
  const twinBeforeRisk = Number(
    (oldestFrame?.serviceSummary?.critical || 0) * 2 +
      (oldestFrame?.serviceSummary?.degraded || 0)
  );
  const twinAfterRisk = Number(
    (analysis?.runtimeHealth?.criticalServices || 0) * 2 +
      (analysis?.runtimeHealth?.degradedServices || 0)
  );

  const executeSimulatorAction = async (actionType) => {
    if (!session.token) return;
    setActionLoading(actionType);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/simulator/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          actionType,
          intensity: actionIntensity
        })
      });

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not execute action.");
      }

      setAnalysis(result.analysis);
      setSimulator(result.simulator);
      setLastRealtimeUpdate(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setActionLoading("");
    }
  };

  const resetSimulatorState = async () => {
    if (!session.token) return;
    setActionLoading("SIMULATOR_RESET");
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/simulator/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not reset simulator.");
      }

      setAnalysis(result.analysis);
      setSimulator(result.simulator);
      setLastRealtimeUpdate(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Reset failed.");
    } finally {
      setActionLoading("");
    }
  };

  const startWarRoomCrisis = async () => {
    if (!session.token) return;
    setActionLoading("WAR_ROOM_START");
    setError("");
    setLiveLeakCounter(0);

    try {
      const response = await fetch(`${API_BASE_URL}/api/war-room/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not start war room crisis.");
      }

      setAnalysis(result.analysis);
      setSimulator(result.simulator);
      setWarRoom(result.warRoom || result.simulator?.warRoom || null);
      setTimeFrames(result.simulator?.timelineFrames || []);
      setActiveView("warroom");
      setLastRealtimeUpdate(new Date().toISOString());
      setReportCard(null);
    } catch (err) {
      setError(err.message || "War room start failed.");
    } finally {
      setActionLoading("");
    }
  };

  const autoHealWarRoom = async () => {
    if (!session.token) return;
    setActionLoading("WAR_ROOM_HEAL");
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/war-room/auto-heal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not execute auto-heal.");
      }

      setAnalysis(result.analysis);
      setSimulator(result.simulator);
      setWarRoom(result.warRoom || result.simulator?.warRoom || null);
      setTimeFrames(result.simulator?.timelineFrames || []);
      setReportCard(result.reportCard || result.warRoom?.reportCard || null);
      setLastRealtimeUpdate(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Auto-heal failed.");
    } finally {
      setActionLoading("");
    }
  };

  const downloadOwnerReportPdf = () => {
    if (!analysis) {
      setError("Report not ready yet. Please wait for dashboard data.");
      return;
    }

    const runtime = analysis.runtimeHealth?.overall || "Unknown";
    const healthLabel = getRuntimeHealthLabel(runtime);
    const highRiskCount = Number(analysis.governance?.highRiskResources || 0);
    const urgency =
      highRiskCount >= 3 ? "High urgency" : highRiskCount >= 1 ? "Medium urgency" : "Low urgency";
    const topIssues = (analysis.resources || [])
      .filter((item) => item.status !== "Optimized")
      .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
      .slice(0, 3);
    const topActions = (analysis.actionPlan || []).slice(0, 3);
    const printableDate = new Date().toLocaleString("en-IN");

    const issueRows =
      topIssues.length > 0
        ? topIssues
            .map(
              (item, index) => `
                <li>
                  <strong>${index + 1}. ${escapeHtml(item.name)}</strong><br/>
                  Current monthly spend: ${currency.format(item.monthlyCost || 0)}.<br/>
                  Main issue: ${escapeHtml((item.suggestions || ["Needs review"])[0])}
                </li>
              `
            )
            .join("")
        : "<li>No major issue detected right now. Keep monitoring daily traffic and costs.</li>";

    const actionRows =
      topActions.length > 0
        ? topActions
            .map(
              (item, index) => `
                <li>
                  <strong>${index + 1}. ${escapeHtml(item.action)}</strong><br/>
                  Expected monthly saving: ${currency.format(item.expectedMonthlySavings || 0)}<br/>
                  Owner: ${escapeHtml(item.owner || "Project Team")} | Timeline: ${escapeHtml(item.timeline || "This week")}
                </li>
              `
            )
            .join("")
        : "<li>No pending action. Current setup is stable.</li>";

    const incidentSummary = reportCard
      ? `
        <section class="block">
          <h3>Live Demo Incident Result</h3>
          <p>
            Incident resolved in ${escapeHtml(String(warRoom?.resolutionSeconds || reportCard.resolutionSeconds || 0))} seconds.
            Total money saved: <strong>${formatInr(reportCard.moneySaved || 0)}</strong>.
            Final score: <strong>${escapeHtml(String(reportCard.score || 0))}/100</strong>.
          </p>
        </section>
      `
      : "";

    const reportHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Owner Summary Report</title>
        <style>
          body { font-family: "Segoe UI", Arial, sans-serif; margin: 28px; color: #1b2533; }
          h1, h2, h3, p { margin: 0; }
          .head { border-bottom: 2px solid #d9e4f1; padding-bottom: 12px; margin-bottom: 16px; }
          .head p { margin-top: 6px; color: #4a5a70; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 10px; margin: 12px 0 18px; }
          .card { border: 1px solid #d9e4f1; border-radius: 10px; padding: 10px; background: #f8fbff; }
          .card p { color: #4a5a70; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
          .card strong { font-size: 20px; }
          .block { margin-top: 18px; }
          .block h3 { margin-bottom: 8px; }
          .block p { color: #33455f; line-height: 1.5; }
          ul { margin: 8px 0 0; padding-left: 18px; }
          li { margin-bottom: 10px; line-height: 1.5; color: #2d405a; }
          .foot { margin-top: 22px; border-top: 1px solid #d9e4f1; padding-top: 10px; color: #53657d; font-size: 12px; }
          @media print { body { margin: 16mm; } }
        </style>
      </head>
      <body>
        <section class="head">
          <h1>Cloud Cost Optimizer - Owner Summary Report</h1>
          <p>Project: ${escapeHtml(analysis.metadata?.projectName || "Demo Project")} | Environment: ${escapeHtml(analysis.metadata?.environment || "N/A")}</p>
          <p>Prepared for: ${escapeHtml(session.user?.name || "Project Owner")} | Generated: ${escapeHtml(printableDate)}</p>
        </section>

        <section class="grid">
          <article class="card">
            <p>Monthly cloud bill</p>
            <strong>${currency.format(analysis.summary?.totalMonthlyCost || 0)}</strong>
          </article>
          <article class="card">
            <p>Possible monthly saving</p>
            <strong>${currency.format(analysis.summary?.totalPotentialSavings || 0)}</strong>
          </article>
          <article class="card">
            <p>Website condition</p>
            <strong>${escapeHtml(healthLabel)}</strong>
          </article>
          <article class="card">
            <p>Urgency level</p>
            <strong>${escapeHtml(urgency)}</strong>
          </article>
        </section>

        <section class="block">
          <h3>What This Means For Business</h3>
          <p>
            Your current cloud bill is ${currency.format(analysis.summary?.totalMonthlyCost || 0)} per month.
            If you apply the key actions below, expected saving is about ${currency.format(
              analysis.summary?.totalPotentialSavings || 0
            )} every month.
            Current customer experience is <strong>${escapeHtml(healthLabel)}</strong> and should be reviewed daily.
          </p>
        </section>

        <section class="block">
          <h3>Top 3 Problems (Simple View)</h3>
          <ul>${issueRows}</ul>
        </section>

        <section class="block">
          <h3>Top 3 Actions For This Week</h3>
          <ul>${actionRows}</ul>
        </section>

        ${incidentSummary}

        <section class="foot">
          Tip: This page opens print dialog automatically. In destination, choose "Save as PDF" to download.
        </section>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;

    const popup = window.open("", "_blank", "width=980,height=860");
    if (!popup) {
      setError("Popup blocked. Please allow popups and try again.");
      return;
    }

    popup.document.open();
    popup.document.write(reportHtml);
    popup.document.close();
  };

  if (!session.token) {
    return (
      <LoginScreen
        form={loginForm}
        mode={authMode}
        onModeChange={switchAuthMode}
        onChange={(field, value) => setLoginForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={onAuthSubmit}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-shell">
          <h1>Cloud Cost Optimizer Pro</h1>
          <p>Loading secured dashboard...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-shell">
          <h1>Cloud Cost Optimizer Pro</h1>
          <p className="error-text">{error}</p>
          <div className="error-actions">
            <button onClick={() => fetchInitialData(session.token)}>Retry</button>
            <button className="secondary-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page dashboard-canvas">
      <section className="bg-orb orb-a" />
      <section className="bg-orb orb-b" />
      <section className="dashboard-shell creative-shell">
        <header className="command-deck">
          <section className="deck-main">
            <p className="eyebrow">Business Cost Control Studio</p>
            <h1>Cloud Cost Optimizer Pro</h1>
            <p className="deck-description">
              Creative demo mode with live actions, instant feedback, and easy navigation for non-technical viewers.
            </p>
            <section className="flow-strip">
              <button
                className={activeView === "website" ? "flow-step active" : "flow-step"}
                onClick={() => setActiveView("website")}
              >
                <span className="flow-index">01</span>
                <span className="flow-text">Run Live Shop</span>
              </button>
              <button
                className={activeView === "warroom" ? "flow-step active" : "flow-step"}
                onClick={() => setActiveView("warroom")}
              >
                <span className="flow-index">02</span>
                <span className="flow-text">Trigger Crisis</span>
              </button>
              <button
                className={activeView === "dashboard" ? "flow-step active" : "flow-step"}
                onClick={() => setActiveView("dashboard")}
              >
                <span className="flow-index">03</span>
                <span className="flow-text">Check Insights</span>
              </button>
              <button className="flow-step" onClick={downloadOwnerReportPdf}>
                <span className="flow-index">04</span>
                <span className="flow-text">Export PDF</span>
              </button>
            </section>
          </section>

          <section className="deck-side">
            <article className="deck-profile">
              <p className="profile-name">{session.user?.name}</p>
              <p className="profile-role">{session.user?.role}</p>
              <span className="stream-indicator">Realtime: {streamStatus}</span>
            </article>
            <section className="deck-quick-actions">
              <button className="secondary-btn owner-report-btn" onClick={downloadOwnerReportPdf}>
                Download Owner Report (PDF)
              </button>
              <button className="secondary-btn" onClick={() => setActiveView("website")}>
                Open Live Demo
              </button>
              <button className="secondary-btn" onClick={() => fetchInitialData(session.token)}>
                Refresh Data
              </button>
              <button className="secondary-btn" onClick={logout}>
                Logout
              </button>
            </section>
          </section>
        </header>

        <section className="hero-ribbon">
          <article className="hero-chip main">
            <h2>
              {analysis.metadata.projectName} | {analysis.metadata.environment}
            </h2>
            <p>Generated: {new Date(analysis.metadata.generatedAt).toLocaleString()}</p>
            <p>Current scenario: {simulator.scenario}</p>
            {lastRealtimeUpdate && <p>Last update: {new Date(lastRealtimeUpdate).toLocaleString()}</p>}
          </article>
          <article className="hero-chip accent">
            <p>Potential Monthly Savings</p>
            <strong>{currency.format(analysis.summary.totalPotentialSavings || 0)}</strong>
          </article>
          <article className="hero-chip accent">
            <p>High Priority Items</p>
            <strong>{analysis.governance.highRiskResources || 0}</strong>
          </article>
          <article className="hero-chip status">
            <p>Overall Status</p>
            <span className={statusClassMap[analysis.summary.overallStatus]}>
              {analysis.summary.overallStatus}
            </span>
          </article>
        </section>

        <section className="view-switch command-nav">
          <button
            className={activeView === "dashboard" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("dashboard")}
          >
            <span className="view-pill-shape">Easy Overview</span>
          </button>
          <button
            className={activeView === "simulator" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("simulator")}
          >
            <span className="view-pill-shape">Traffic Lab</span>
          </button>
          <button
            className={activeView === "website" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("website")}
          >
            <span className="view-pill-shape">Live Shop Demo</span>
          </button>
          <button
            className={activeView === "warroom" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("warroom")}
          >
            <span className="view-pill-shape">Crisis & Recovery</span>
          </button>
        </section>

        <section className="quick-dock">
          <button
            className="dock-btn"
            onClick={() => setActiveView("website")}
            title="Open live shop page"
          >
            <span>Shop</span>
          </button>
          <button
            className="dock-btn"
            onClick={() => setActiveView("warroom")}
            title="Open crisis and recovery page"
          >
            <span>Crisis</span>
          </button>
          <button className="dock-btn" onClick={downloadOwnerReportPdf} title="Download owner report PDF">
            <span>PDF</span>
          </button>
          <button
            className="dock-btn"
            onClick={() => fetchInitialData(session.token)}
            title="Refresh dashboard data"
          >
            <span>Sync</span>
          </button>
        </section>

        <section className="workspace-area">

        {activeView === "dashboard" ? (
          <>
            <section className="summary-grid">
              {summaryCards.map((card) => (
                <article className="summary-card animated" key={card.title}>
                  <p>{card.title}</p>
                  <h3>{card.value}</h3>
                </article>
              ))}
            </section>

            <section className="panel-card plain-language-panel">
              <h3>Simple Business View</h3>
              <div className="plain-grid">
                <article>
                  <p>Website Condition</p>
                  <h4>{getRuntimeHealthLabel(analysis.runtimeHealth?.overall || "Unknown")}</h4>
                </article>
                <article>
                  <p>Money You Can Save Monthly</p>
                  <h4>{currency.format(analysis.summary.totalPotentialSavings || 0)}</h4>
                </article>
                <article>
                  <p>Items Needing Attention</p>
                  <h4>{analysis.governance.highRiskResources || 0} high-priority items</h4>
                </article>
                <article>
                  <p>Best Next Action</p>
                  <h4>{analysis.actionPlan?.[0]?.action || "Continue monitoring daily report."}</h4>
                </article>
              </div>
            </section>

            <section className="panel-grid">
              <article className="panel-card">
                <h3>Cost Health Basics</h3>
                <ProgressBar
                  label="Reserved Coverage"
                  value={Number(analysis.governance.reservedCoverageAvg || 0)}
                />
                <ProgressBar
                  label="Rightsizing Coverage"
                  value={Number(analysis.governance.rightsizingCoverage || 0)}
                />
                <p className="tiny-note">Idle resources: {analysis.governance.idleResources}</p>
                <p className="tiny-note">FinOps maturity: {analysis.maturity.score}/100</p>
              </article>

              <article className="panel-card">
                <h3>Where Money Is Going</h3>
                <div className="type-stack">
                  {analysis.typeBreakdown.map((item) => (
                    <div className="type-row" key={item.type}>
                      <div>
                        <strong>{item.type}</strong>
                        <p>{item.resourceCount} resources</p>
                      </div>
                      <div className="type-bar-wrap">
                        <div
                          className="type-bar"
                          style={{
                            width: `${Math.max(
                              8,
                              (item.monthlyCost / totalMonthlyCostBase) * 100
                            )}%`
                          }}
                        />
                      </div>
                      <span>{currency.format(item.monthlyCost)}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel-card">
              <h3>Simple Insights</h3>
              <ul className="insight-list">
                {analysis.insights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </section>

            <section className="panel-card">
              <h3>Suggestions You Can Apply</h3>
              <div className="runtime-health-strip">
                <p>Status: {analysis.runtimeHealth?.overall || "Unknown"}</p>
                <p>Req/min: {analysis.runtimeHealth?.totalRequestsPerMin || 0}</p>
                <p>Latency: {analysis.runtimeHealth?.avgLatencyMs || 0} ms</p>
                <p>Error: {analysis.runtimeHealth?.avgErrorRate || 0}%</p>
              </div>
              <div className="advisor-grid">
                {websiteAdvisorCards.map((card) => (
                  <article className="advisor-card" key={`${card.title}-${card.severity}`}>
                    <div className="advisor-head">
                      <h4>{card.title}</h4>
                      <span className={advisorClassMap[card.severity] || "advisor-badge low"}>
                        {card.severity}
                      </span>
                    </div>
                    <p>{card.recommendation}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel-card">
              <div className="action-header">
                <h3>What To Do Next</h3>
                <button onClick={() => fetchInitialData(session.token)}>Refresh Analysis</button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Resource</th>
                      <th>Owner</th>
                      <th>Expected Savings</th>
                      <th>Timeline</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.actionPlan.map((action) => (
                      <tr key={action.id}>
                        <td>
                          <span className={priorityClassMap[action.priority]}>{action.priority}</span>
                        </td>
                        <td>
                          {action.resourceName} ({action.type})
                        </td>
                        <td>{action.owner}</td>
                        <td>{currency.format(action.expectedMonthlySavings)}</td>
                        <td>{action.timeline}</td>
                        <td>{action.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel-card">
              <div className="resource-toolbar">
                <h3>Detailed Resource List</h3>
                <div className="toolbar-controls">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option>All</option>
                    <option>Optimized</option>
                    <option>Moderate</option>
                    <option>Not Optimized</option>
                  </select>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search name/type/region"
                  />
                </div>
              </div>

              <div className="resource-grid">
                {filteredResources.map((resource) => (
                  <article className="resource-card animated" key={resource.id}>
                    <div className="resource-head">
                      <div>
                        <h4>{resource.name}</h4>
                        <p>
                          {resource.type} | {resource.region}
                        </p>
                      </div>
                      <span className={statusClassMap[resource.status]}>{resource.status}</span>
                    </div>
                    <div className="metric-row">
                      <p>Score: {resource.score}/100</p>
                      <p>Risk: {resource.riskLevel}</p>
                    </div>
                    <div className="metric-row">
                      <p>Cost: {currency.format(resource.monthlyCost)}</p>
                      <p>Savings: {currency.format(resource.potentialMonthlySavings)}</p>
                    </div>
                    <div>
                      <h5>Recommended Changes</h5>
                      <ul>
                        {resource.suggestions.map((tip) => (
                          <li key={`${resource.id}-${tip}`}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : activeView === "simulator" ? (
          <>
            <section className="panel-card">
              <div className="simulator-header">
                <h3>Traffic & Load Simulator</h3>
                <div className="intensity-box">
                  <label htmlFor="intensity">Intensity: {actionIntensity}</label>
                  <input
                    id="intensity"
                    type="range"
                    min="1"
                    max="5"
                    value={actionIntensity}
                    onChange={(event) => setActionIntensity(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="simulator-action-grid">
                {actionCatalog.map((action) => (
                  <button
                    key={action.actionType}
                    className="simulator-btn"
                    onClick={() => executeSimulatorAction(action.actionType)}
                    disabled={Boolean(actionLoading)}
                  >
                    <strong>
                      {actionLoading === action.actionType ? "Running..." : action.label}
                    </strong>
                    <span>{action.description}</span>
                  </button>
                ))}
              </div>

              <div className="simulator-controls">
                <button
                  className="secondary-btn"
                  onClick={resetSimulatorState}
                  disabled={actionLoading === "SIMULATOR_RESET"}
                >
                  {actionLoading === "SIMULATOR_RESET" ? "Resetting..." : "Reset Demo State"}
                </button>
                <p>
                  Service Health: {serviceHealthSummary.Healthy} Healthy | {serviceHealthSummary.Degraded}{" "}
                  Degraded | {serviceHealthSummary.Critical} Critical
                </p>
              </div>
            </section>

            <section className="service-grid">
              {simulator.services.map((service) => (
                <article className="panel-card service-card" key={service.id}>
                  <div className="service-head">
                    <h4>{service.name}</h4>
                    <span className={serviceHealthClassMap[service.status]}>{service.status}</span>
                  </div>
                  <p>Category: {service.category}</p>
                  <p>Requests/min: {service.requestsPerMin}</p>
                  <p>Latency: {service.latencyMs} ms</p>
                  <p>Error Rate: {service.errorRate}%</p>
                </article>
              ))}
            </section>

            <section className="panel-card">
              <h3>Live Activity Feed</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Source</th>
                      <th>Intensity</th>
                      <th>Scenario</th>
                      <th>Cost Delta</th>
                      <th>Triggered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulator.activityLog.map((event) => (
                      <tr key={event.id}>
                        <td>{new Date(event.timestamp).toLocaleTimeString()}</td>
                        <td>{event.label}</td>
                        <td>{event.source || "simulator"}</td>
                        <td>{event.intensity}</td>
                        <td>{event.scenario}</td>
                        <td>{currency.format(event.costDelta)}</td>
                        <td>{event.actor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : activeView === "website" ? (
          <>
            <section className="panel-card website-demo-shell">
              <div className="website-demo-head">
                <div>
                  <h3>Live Client Website</h3>
                  <p>
                    Open the client demo site in a new tab and perform user actions. This dashboard will
                    update in real time with traffic, latency, cost, and optimization guidance.
                  </p>
                </div>
                <a
                  className="launch-link"
                  href="/client-store.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Launch Demo Website
                </a>
              </div>
              <iframe
                title="Client Website Demo"
                src="/client-store.html"
                className="website-iframe"
              />
            </section>

            <section className="panel-card">
              <h3>Suggestions For Website Owner</h3>
              <div className="advisor-grid">
                {websiteAdvisorCards.map((card) => (
                  <article className="advisor-card" key={`${card.title}-${card.recommendation}`}>
                    <div className="advisor-head">
                      <h4>{card.title}</h4>
                      <span className={advisorClassMap[card.severity] || "advisor-badge low"}>
                        {card.severity}
                      </span>
                    </div>
                    <p>{card.recommendation}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {!ceoMode && (
              <section className="panel-card warroom-hero">
                <div>
                  <h3>Crisis & Recovery Center</h3>
                  <p>
                    Start a flash-sale crisis, watch backend impact in real time, then auto-heal and present
                    business savings.
                  </p>
                </div>
                <div className="warroom-hero-actions">
                  <button
                    onClick={startWarRoomCrisis}
                    disabled={actionLoading === "WAR_ROOM_START" || Boolean(warRoom?.crisisActive)}
                  >
                    {actionLoading === "WAR_ROOM_START" ? "Starting..." : "Start Flash Sale Crisis"}
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={autoHealWarRoom}
                    disabled={actionLoading === "WAR_ROOM_HEAL" || !warRoom?.crisisActive}
                  >
                    {actionLoading === "WAR_ROOM_HEAL" ? "Healing..." : "Fix Now (Auto-Heal)"}
                  </button>
                  <button className="secondary-btn" onClick={() => setCeoMode(true)}>
                    CEO Mode
                  </button>
                </div>
              </section>
            )}

            {ceoMode ? (
              <>
                <section className="ceo-mode-strip">
                  <button className="secondary-btn" onClick={() => setCeoMode(false)}>
                    Exit CEO Mode
                  </button>
                </section>
                <section className="summary-grid ceo-grid">
                  <article className="summary-card">
                    <p>Risk</p>
                    <h3>{warRoom?.crisisActive ? "High" : "Stabilized"}</h3>
                  </article>
                  <article className="summary-card">
                    <p>Loss / Min</p>
                    <h3>{formatInr(warRoom?.lossPerMin || 0)}</h3>
                  </article>
                  <article className="summary-card">
                    <p>Priority Action</p>
                    <h3>{warRoom?.priorityAction || "Monitor"}</h3>
                  </article>
                  <article className="summary-card">
                    <p>ETA</p>
                    <h3>{warRoom?.eta || "--"}</h3>
                  </article>
                  <article className="summary-card">
                    <p>Business Impact</p>
                    <h3>{formatInr(warRoom?.revenueRiskPerMin || 0)}/min at risk</h3>
                  </article>
                </section>
              </>
            ) : (
              <>
                <section className="panel-grid">
                  <article className="panel-card">
                    <h3>Crisis Status</h3>
                    <p className={warRoom?.crisisActive ? "war-alert active" : "war-alert"}>
                      {warRoom?.crisisActive
                        ? `Incident ${warRoom.incidentId || ""} active`
                        : "No active incident"}
                    </p>
                    <p className="war-metric">Live Money Leak: {formatInr(liveLeakCounter)}/sec</p>
                    <p className="war-metric">
                      Estimated Revenue Risk: {formatInr(warRoom?.revenueRiskPerMin || 0)}/min
                    </p>
                    <p className="war-metric">Priority: {warRoom?.priorityAction || "Monitor"}</p>
                    <p className="war-metric">
                      Blast Radius: {(warRoom?.blastRadius || []).join(", ") || "Contained"}
                    </p>
                    <p className="war-root">AI Root Cause: {warRoom?.rootCause || "No active issue."}</p>
                  </article>

                  <article className="panel-card">
                    <h3>System Map</h3>
                    <TopologyMap services={simulator.services || []} crisisActive={Boolean(warRoom?.crisisActive)} />
                  </article>
                </section>

                <section className="panel-card">
                  <div className="action-header">
                    <h3>Incident Timeline</h3>
                    <button
                      className="secondary-btn"
                      onClick={() => setStoryPlaying(true)}
                      disabled={storyPlaying || timeFrames.length < 2}
                    >
                      {storyPlaying ? "Replaying..." : "Story Mode Replay"}
                    </button>
                  </div>
                  <p className="tiny-note">Yesterday at 2:10 PM what happened? Replay the incident timeline.</p>
                  <input
                    className="time-slider"
                    type="range"
                    min={0}
                    max={Math.max(0, timeFrames.length - 1)}
                    value={timeFrameIndex}
                    onChange={(event) => setTimeFrameIndex(Number(event.target.value))}
                  />
                  {selectedFrame ? (
                    <div className="timeline-card">
                      <p>
                        <strong>{selectedFrame.trigger}</strong> |{" "}
                        {new Date(selectedFrame.timestamp).toLocaleString()}
                      </p>
                      <p>
                        Cost: {currency.format(selectedFrame.totalMonthlyCost)} | Critical Nodes:{" "}
                        {selectedFrame.serviceSummary?.critical || 0} | Avg Latency:{" "}
                        {selectedFrame.serviceSummary?.avgLatencyMs || 0}ms
                      </p>
                    </div>
                  ) : (
                    <p className="tiny-note">No timeline frame available yet.</p>
                  )}

                  <div className="story-scenes">
                    {storyScenes.map(({ frame, frameIndex }, index) => {
                      const severityClass =
                        (frame.serviceSummary?.critical || 0) > 0
                          ? "critical"
                          : (frame.serviceSummary?.degraded || 0) > 0
                            ? "degraded"
                            : "healthy";
                      const isActive = frameIndex === timeFrameIndex;
                      return (
                        <article
                          key={frame.id}
                          className={`scene-card ${severityClass} ${isActive ? "active" : ""}`}
                          onClick={() => setTimeFrameIndex(frameIndex)}
                        >
                          <span>Scene {index + 1}</span>
                          <strong>{frame.trigger}</strong>
                          <p>
                            {new Date(frame.timestamp).toLocaleTimeString()} | latency{" "}
                            {frame.serviceSummary?.avgLatencyMs || 0}ms
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="panel-card">
                  <h3>Before vs After</h3>
                  <div className="twin-grid">
                    <article className="twin-card before">
                      <p>Before Optimization</p>
                      <h4>{currency.format(twinBeforeCost)}</h4>
                      <span>Risk Index: {twinBeforeRisk}</span>
                    </article>
                    <article className="twin-card after">
                      <p>After Optimization</p>
                      <h4>{currency.format(twinAfterCost)}</h4>
                      <span>Risk Index: {twinAfterRisk}</span>
                    </article>
                    <article className="twin-card impact">
                      <p>Impact Delta</p>
                      <h4>{currency.format(twinSavings)} saved</h4>
                      <span>
                        Risk reduced by {Math.max(0, twinBeforeRisk - twinAfterRisk)} points
                      </span>
                    </article>
                  </div>
                </section>

                {!warRoom?.crisisActive && reportCard && (
                  <section className="panel-card recovery-banner">
                    <p className="eyebrow">Hero Moment</p>
                    <h3>Dramatic Recovery Complete. You saved {formatInr(reportCard.moneySaved || 0)}.</h3>
                    <p>
                      Auto-heal stabilized critical services and reduced active business loss in seconds.
                    </p>
                  </section>
                )}
              </>
            )}

            {reportCard && !ceoMode && (
              <section className="panel-card certificate">
                <h3>Optimization Report Card</h3>
                <p>
                  Incident {reportCard.incidentId || "-"} resolved in{" "}
                  {warRoom?.resolutionSeconds || reportCard.resolutionSeconds || 0} sec.
                </p>
                <div className="certificate-grid">
                  <article>
                    <p>Score</p>
                    <h4>{reportCard.score}/100</h4>
                  </article>
                  <article>
                    <p>Grade</p>
                    <h4>{reportCard.grade}</h4>
                  </article>
                  <article>
                    <p>Money Saved</p>
                    <h4>{formatInr(reportCard.moneySaved || 0)}</h4>
                  </article>
                </div>
                <p className="tiny-note">{reportCard.summary}</p>
                <p className="tiny-note">Next Step: {reportCard.nextStep}</p>
              </section>
            )}
          </>
        )}
      </section>
      </section>
    </main>
  );
}

export default App;
