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

const LoginScreen = ({ form, onChange, onSubmit, loading, error }) => (
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
        <h2>Sign In</h2>
        <p>Use demo credentials to access the dashboard.</p>
        <form onSubmit={onSubmit} className="login-form">
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="demo-note">
          Demo: <strong>admin@beproject.com</strong> / <strong>admin123</strong>
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
  const [loginForm, setLoginForm] = useState({
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
    activityLog: []
  });
  const [actionCatalog, setActionCatalog] = useState([]);
  const [actionLoading, setActionLoading] = useState("");
  const [actionIntensity, setActionIntensity] = useState(2);
  const [activeView, setActiveView] = useState("dashboard");
  const [streamStatus, setStreamStatus] = useState("Offline");
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setSession({ token: "", user: null });
    setAnalysis(null);
    setSimulator({
      scenario: "normal",
      services: [],
      activityLog: []
    });
    setActionCatalog([]);
    setError("");
  };

  const fetchInitialData = async (token) => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [stateRes, actionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/simulator/state`, { headers }),
        fetch(`${API_BASE_URL}/api/simulator/actions`, { headers })
      ]);

      if (stateRes.status === 401 || actionsRes.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      if (!stateRes.ok) {
        throw new Error("Could not fetch simulator state.");
      }
      if (!actionsRes.ok) throw new Error("Could not fetch simulator actions.");

      const stateResult = await stateRes.json();
      const actionResult = await actionsRes.json();
      setAnalysis(stateResult.analysis);
      setSimulator(stateResult.simulator);
      setActionCatalog(actionResult.actions || []);
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

  const onLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      setSession({ token: result.token, user: result.user });
    } catch (err) {
      setLoginError(err.message || "Unable to sign in.");
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

  if (!session.token) {
    return (
      <LoginScreen
        form={loginForm}
        onChange={(field, value) => setLoginForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={onLogin}
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
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <header className="top-nav">
          <div>
            <p className="eyebrow">FinOps Intelligence Platform</p>
            <h1>Cloud Cost Optimizer Pro</h1>
          </div>
          <div className="user-box">
            <p>{session.user?.name}</p>
            <span>{session.user?.role}</span>
            <span className="stream-indicator">Realtime: {streamStatus}</span>
            <button className="secondary-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <section className="view-switch">
          <button
            className={activeView === "dashboard" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("dashboard")}
          >
            Executive Dashboard
          </button>
          <button
            className={activeView === "simulator" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("simulator")}
          >
            Demo Services Lab
          </button>
          <button
            className={activeView === "website" ? "view-btn active" : "view-btn"}
            onClick={() => setActiveView("website")}
          >
            Client Website Demo
          </button>
        </section>

        <section className="hero-card">
          <div>
            <h2>
              {analysis.metadata.projectName} | {analysis.metadata.environment}
            </h2>
            <p>Generated on: {new Date(analysis.metadata.generatedAt).toLocaleString()}</p>
            <p>Scenario: {simulator.scenario}</p>
            {lastRealtimeUpdate && (
              <p>Last realtime update: {new Date(lastRealtimeUpdate).toLocaleString()}</p>
            )}
          </div>
          <span className={statusClassMap[analysis.summary.overallStatus]}>
            {analysis.summary.overallStatus}
          </span>
        </section>

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

            <section className="panel-grid">
              <article className="panel-card">
                <h3>Governance Signals</h3>
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
                <h3>Cost Breakdown By Resource Type</h3>
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
              <h3>Executive Insights</h3>
              <ul className="insight-list">
                {analysis.insights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </section>

            <section className="panel-card">
              <h3>Website Runtime Advisor</h3>
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
                <h3>Optimization Action Board</h3>
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
                <h3>Resource Deep Dive</h3>
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
                <h3>Demo Services Control Center</h3>
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
              <h3>Realtime Activity Feed</h3>
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
        ) : (
          <>
            <section className="panel-card website-demo-shell">
              <div className="website-demo-head">
                <div>
                  <h3>Live Client Website (Separate Page)</h3>
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
              <h3>Live Suggestion Feed For Website Owner</h3>
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
        )}
      </section>
    </main>
  );
}

export default App;
