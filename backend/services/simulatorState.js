import fs from "node:fs/promises";

const roundTo2 = (value) => Number(value.toFixed(2));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const servicesTemplate = [
  {
    id: "svc-gateway",
    name: "API Gateway Service",
    category: "Traffic",
    requestsPerMin: 360,
    latencyMs: 160,
    errorRate: 0.6,
    status: "Healthy"
  },
  {
    id: "svc-checkout",
    name: "Checkout Service",
    category: "Business",
    requestsPerMin: 240,
    latencyMs: 210,
    errorRate: 0.8,
    status: "Healthy"
  },
  {
    id: "svc-media",
    name: "Media Upload Service",
    category: "Storage",
    requestsPerMin: 120,
    latencyMs: 260,
    errorRate: 0.4,
    status: "Healthy"
  },
  {
    id: "svc-notify",
    name: "Notification Service",
    category: "Async",
    requestsPerMin: 95,
    latencyMs: 180,
    errorRate: 0.3,
    status: "Healthy"
  },
  {
    id: "svc-analytics",
    name: "Analytics Worker",
    category: "Compute",
    requestsPerMin: 150,
    latencyMs: 320,
    errorRate: 1.1,
    status: "Healthy"
  }
];

const websiteMetricsTemplate = {
  activeUsers: 84,
  sessionsToday: 1320,
  pageViews: 6420,
  searches: 940,
  cartAdds: 315,
  ordersPlaced: 142,
  uploads: 82,
  videoPlays: 167
};

export const simulatorActionsCatalog = [
  {
    actionType: "TRAFFIC_SPIKE",
    label: "Traffic Spike",
    description: "Simulate marketing campaign traffic surge."
  },
  {
    actionType: "ORDER_BURST",
    label: "Order Burst",
    description: "Simulate checkout-heavy transaction burst."
  },
  {
    actionType: "UPLOAD_MEDIA",
    label: "Upload Media",
    description: "Simulate image/video uploads increasing storage load."
  },
  {
    actionType: "INCIDENT_MODE",
    label: "Incident Mode",
    description: "Introduce a service degradation incident."
  },
  {
    actionType: "RUN_OPTIMIZATION",
    label: "Run Optimization",
    description: "Apply optimization actions and improve efficiency."
  },
  {
    actionType: "NIGHT_IDLE",
    label: "Night Idle",
    description: "Simulate poor scheduling with long idle workloads."
  }
];

export const websiteActivityCatalog = [
  {
    activityType: "VISIT_HOME",
    label: "Visit Homepage",
    description: "User opens homepage and browses content.",
    mappedActionType: "TRAFFIC_SPIKE",
    intensityMultiplier: 1,
    metricsDelta: {
      activeUsers: 1,
      sessionsToday: 1,
      pageViews: 3
    }
  },
  {
    activityType: "SEARCH_PRODUCTS",
    label: "Search Products",
    description: "User performs product/category search.",
    mappedActionType: "TRAFFIC_SPIKE",
    intensityMultiplier: 1,
    metricsDelta: {
      pageViews: 2,
      searches: 2
    }
  },
  {
    activityType: "ADD_TO_CART",
    label: "Add To Cart",
    description: "User adds selected products to cart.",
    mappedActionType: "ORDER_BURST",
    intensityMultiplier: 1,
    metricsDelta: {
      pageViews: 1,
      cartAdds: 2
    }
  },
  {
    activityType: "PLACE_ORDER",
    label: "Place Order",
    description: "User completes checkout order flow.",
    mappedActionType: "ORDER_BURST",
    intensityMultiplier: 1.7,
    metricsDelta: {
      pageViews: 2,
      ordersPlaced: 1
    }
  },
  {
    activityType: "UPLOAD_PROFILE_IMAGE",
    label: "Upload Profile Image",
    description: "User uploads a profile image/file.",
    mappedActionType: "UPLOAD_MEDIA",
    intensityMultiplier: 1,
    metricsDelta: {
      pageViews: 1,
      uploads: 1
    }
  },
  {
    activityType: "WATCH_PRODUCT_VIDEO",
    label: "Watch Product Video",
    description: "User watches a rich media product video.",
    mappedActionType: "TRAFFIC_SPIKE",
    intensityMultiplier: 1.8,
    metricsDelta: {
      pageViews: 1,
      videoPlays: 1
    }
  },
  {
    activityType: "FLASH_SALE_EVENT",
    label: "Flash Sale Event",
    description: "Sudden promotional event with high concurrent load.",
    mappedActionType: "INCIDENT_MODE",
    intensityMultiplier: 1.6,
    metricsDelta: {
      activeUsers: 3,
      sessionsToday: 2,
      pageViews: 8,
      searches: 4,
      cartAdds: 2
    }
  },
  {
    activityType: "ENABLE_AUTO_SCALING",
    label: "Enable Auto Scaling Policy",
    description: "Platform owner applies optimization response.",
    mappedActionType: "RUN_OPTIMIZATION",
    intensityMultiplier: 1,
    metricsDelta: {
      activeUsers: 0
    }
  }
];

const getServiceHealthSummary = (services = []) => {
  const summary = services.reduce(
    (acc, service) => {
      acc.totalRequestsPerMin += Number(service.requestsPerMin || 0);
      acc.avgLatencyMs += Number(service.latencyMs || 0);
      acc.avgErrorRate += Number(service.errorRate || 0);
      if (service.status === "Healthy") acc.healthy += 1;
      if (service.status === "Degraded") acc.degraded += 1;
      if (service.status === "Critical") acc.critical += 1;
      return acc;
    },
    {
      totalRequestsPerMin: 0,
      avgLatencyMs: 0,
      avgErrorRate: 0,
      healthy: 0,
      degraded: 0,
      critical: 0
    }
  );

  if (services.length > 0) {
    summary.avgLatencyMs = roundTo2(summary.avgLatencyMs / services.length);
    summary.avgErrorRate = roundTo2(summary.avgErrorRate / services.length);
  }

  summary.totalRequestsPerMin = roundTo2(summary.totalRequestsPerMin);
  return summary;
};

const serviceRiskScore = (service) => {
  const severityBoost = service.status === "Critical" ? 120 : service.status === "Degraded" ? 60 : 0;
  return severityBoost + Number(service.errorRate || 0) * 24 + Number(service.latencyMs || 0) * 0.22;
};

const getWarRoomRootCause = (services = []) => {
  if (!services.length) return "No service data available.";
  const sorted = [...services].sort((a, b) => serviceRiskScore(b) - serviceRiskScore(a));
  const top = sorted[0];
  return `${top.name} showing high latency (${top.latencyMs}ms) and error rate (${top.errorRate}%).`;
};

const getBlastRadius = (services = []) =>
  services
    .filter((service) => service.status !== "Healthy")
    .sort((a, b) => serviceRiskScore(b) - serviceRiskScore(a))
    .slice(0, 4)
    .map((service) => service.name);

const estimateLossPerMinute = ({ totalMonthlyCost, summary, crisisMultiplier = 1 }) => {
  const basePerMinute = totalMonthlyCost / 43200;
  const pressure =
    1 +
    summary.critical * 0.95 +
    summary.degraded * 0.35 +
    summary.avgErrorRate * 0.2 +
    summary.avgLatencyMs / 1400;
  return roundTo2(basePerMinute * pressure * crisisMultiplier);
};

const buildReportCard = (warRoom) => {
  const scoreBase =
    100 -
    warRoom.lossPerMin * 1.2 -
    warRoom.revenueRiskPerMin * 0.1 +
    (warRoom.moneySaved > 0 ? 16 : 0) +
    (warRoom.resolutionSeconds > 0 ? Math.max(0, 80 - warRoom.resolutionSeconds / 2.5) : 0);
  const score = Math.max(0, Math.min(100, Math.round(scoreBase)));
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "Needs Improvement";
  const nextStep =
    score >= 80
      ? "Automate low-risk optimization actions for repeated incidents."
      : "Tune autoscaling thresholds and improve reserved coverage before next traffic event.";

  return {
    generatedAt: nowIso(),
    score,
    grade,
    moneySaved: warRoom.moneySaved,
    incidentId: warRoom.incidentId,
    summary:
      score >= 80
        ? "Excellent crisis handling and stabilization."
        : "Incident resolved but needs stronger preventive guardrails.",
    nextStep
  };
};

let baseSnapshot = null;
let runtimeSnapshot = null;

const ensureRuntime = () => {
  if (!runtimeSnapshot) {
    throw new Error("Simulator not initialized.");
  }
};

const getTotalMonthlyCost = (snapshot) =>
  roundTo2(snapshot.resources.reduce((sum, resource) => sum + Number(resource.monthlyCost || 0), 0));

const buildSimulatorState = () => ({
  scenario: "normal",
  services: deepClone(servicesTemplate),
  websiteMetrics: deepClone(websiteMetricsTemplate),
  activityLog: [],
  timelineFrames: [],
  warRoom: {
    incidentId: null,
    crisisActive: false,
    startedAt: null,
    resolvedAt: null,
    baselineMonthlyCost: 0,
    currentMonthlyCost: 0,
    lossPerMin: 0,
    revenueRiskPerMin: 0,
    rootCause: "System stable.",
    blastRadius: [],
    priorityAction: "Monitor platform baseline.",
    eta: "No active incident",
    moneySaved: 0,
    resolutionSeconds: 0,
    reportCard: null
  }
});

const normalizeService = (service) => {
  service.requestsPerMin = Math.round(clamp(Number(service.requestsPerMin || 0), 0, 8000));
  service.latencyMs = Math.round(clamp(Number(service.latencyMs || 0), 80, 2500));
  service.errorRate = roundTo2(clamp(Number(service.errorRate || 0), 0, 25));
  if (service.errorRate >= 4 || service.latencyMs >= 850) {
    service.status = "Critical";
  } else if (service.errorRate >= 2 || service.latencyMs >= 450) {
    service.status = "Degraded";
  } else {
    service.status = "Healthy";
  }
};

const normalizeServices = () => {
  runtimeSnapshot.serviceOps.services.forEach(normalizeService);
};

const normalizeWebsiteMetrics = () => {
  const metrics = runtimeSnapshot.serviceOps.websiteMetrics;
  Object.keys(metrics).forEach((key) => {
    metrics[key] = Math.round(clamp(Number(metrics[key] || 0), 0, 999999));
  });
};

const withResources = (types, updateFn) => {
  runtimeSnapshot.resources.forEach((resource) => {
    if (types.includes(resource.type)) {
      updateFn(resource);
    }
  });
};

const withService = (serviceId, updateFn) => {
  const service = runtimeSnapshot.serviceOps.services.find((item) => item.id === serviceId);
  if (service) updateFn(service);
};

const setScenario = (value) => {
  runtimeSnapshot.serviceOps.scenario = value;
};

const actionLabelMap = simulatorActionsCatalog.reduce((acc, item) => {
  acc[item.actionType] = item.label;
  return acc;
}, {});

const activityLabelMap = websiteActivityCatalog.reduce((acc, item) => {
  acc[item.activityType] = item.label;
  return acc;
}, {});

const executeTrafficSpike = (intensity) => {
  withService("svc-gateway", (service) => {
    service.requestsPerMin += 190 * intensity;
    service.latencyMs += 30 * intensity;
    service.errorRate += 0.25 * intensity;
  });
  withService("svc-checkout", (service) => {
    service.requestsPerMin += 120 * intensity;
    service.latencyMs += 28 * intensity;
    service.errorRate += 0.2 * intensity;
  });
  withService("svc-analytics", (service) => {
    service.requestsPerMin += 90 * intensity;
    service.latencyMs += 40 * intensity;
    service.errorRate += 0.25 * intensity;
  });

  withResources(["EC2"], (resource) => {
    resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization || 0) + 8 * intensity, 0, 99);
    resource.networkOutGb = clamp(Number(resource.networkOutGb || 0) + 140 * intensity, 0, 20000);
    resource.idleDays = clamp(Number(resource.idleDays || 0) - 2, 0, 365);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 11 * intensity);
  });
  withResources(["CloudFront"], (resource) => {
    resource.networkOutGb = clamp(Number(resource.networkOutGb || 0) + 220 * intensity, 0, 20000);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 7 * intensity);
  });

  setScenario("traffic-surge");
};

const executeOrderBurst = (intensity) => {
  withService("svc-checkout", (service) => {
    service.requestsPerMin += 150 * intensity;
    service.latencyMs += 35 * intensity;
    service.errorRate += 0.2 * intensity;
  });
  withService("svc-notify", (service) => {
    service.requestsPerMin += 80 * intensity;
    service.latencyMs += 25 * intensity;
    service.errorRate += 0.15 * intensity;
  });

  withResources(["RDS"], (resource) => {
    resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization || 0) + 12 * intensity, 0, 99);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 16 * intensity);
  });
  withResources(["EC2"], (resource) => {
    resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization || 0) + 5 * intensity, 0, 99);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 7 * intensity);
  });

  setScenario("order-peak");
};

const executeUploadMedia = (intensity) => {
  withService("svc-media", (service) => {
    service.requestsPerMin += 130 * intensity;
    service.latencyMs += 32 * intensity;
    service.errorRate += 0.1 * intensity;
  });
  withService("svc-analytics", (service) => {
    service.requestsPerMin += 55 * intensity;
    service.latencyMs += 18 * intensity;
  });

  withResources(["S3"], (resource) => {
    resource.storageUtilization = clamp(Number(resource.storageUtilization || 0) + 8 * intensity, 0, 100);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 14 * intensity);
  });
  withResources(["EBS"], (resource) => {
    resource.storageUtilization = clamp(Number(resource.storageUtilization || 0) + 6 * intensity, 0, 100);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 8 * intensity);
  });

  setScenario("media-heavy");
};

const executeIncidentMode = (intensity) => {
  withService("svc-gateway", (service) => {
    service.latencyMs += 120 * intensity;
    service.errorRate += 1.3 * intensity;
  });
  withService("svc-notify", (service) => {
    service.latencyMs += 130 * intensity;
    service.errorRate += 1.7 * intensity;
  });
  withService("svc-checkout", (service) => {
    service.errorRate += 0.8 * intensity;
    service.latencyMs += 80 * intensity;
  });

  withResources(["EC2"], (resource) => {
    resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization || 0) + 10 * intensity, 0, 99);
    resource.rightSized = false;
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 20 * intensity);
  });
  withResources(["RDS"], (resource) => {
    resource.reservedCoverage = clamp(Number(resource.reservedCoverage ?? 50) - 5 * intensity, 0, 100);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 12 * intensity);
  });

  setScenario("incident");
};

const executeRunOptimization = (intensity) => {
  runtimeSnapshot.resources.forEach((resource) => {
    resource.rightSized = true;
    resource.idleDays = clamp(Number(resource.idleDays || 0) - 5 * intensity, 0, 365);

    if (["EC2", "RDS"].includes(resource.type)) {
      resource.reservedCoverage = clamp(Number(resource.reservedCoverage ?? 50) + 12 * intensity, 0, 100);
      resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization ?? 30) + 4 * intensity, 5, 75);
    }

    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) * (1 - 0.04 * intensity));
  });

  runtimeSnapshot.serviceOps.services.forEach((service) => {
    service.latencyMs = clamp(service.latencyMs - 22 * intensity, 80, 2500);
    service.errorRate = clamp(service.errorRate - 0.5 * intensity, 0, 25);
  });

  setScenario("optimized");
};

const executeNightIdle = (intensity) => {
  runtimeSnapshot.serviceOps.services.forEach((service) => {
    service.requestsPerMin = clamp(service.requestsPerMin - 45 * intensity, 0, 8000);
  });

  withResources(["EC2", "RDS"], (resource) => {
    resource.avgCpuUtilization = clamp(Number(resource.avgCpuUtilization || 0) - 7 * intensity, 0, 99);
    resource.idleDays = clamp(Number(resource.idleDays || 0) + 2 * intensity, 0, 365);
    resource.monthlyCost = roundTo2(Number(resource.monthlyCost || 0) + 3 * intensity);
  });

  setScenario("idle-window");
};

const actionMap = {
  TRAFFIC_SPIKE: executeTrafficSpike,
  ORDER_BURST: executeOrderBurst,
  UPLOAD_MEDIA: executeUploadMedia,
  INCIDENT_MODE: executeIncidentMode,
  RUN_OPTIMIZATION: executeRunOptimization,
  NIGHT_IDLE: executeNightIdle
};

const applyMetricsDelta = (delta = {}, volume = 1) => {
  const metrics = runtimeSnapshot.serviceOps.websiteMetrics;
  Object.entries(delta).forEach(([key, value]) => {
    metrics[key] = Number(metrics[key] || 0) + Number(value || 0) * volume;
  });
  normalizeWebsiteMetrics();
};

const updateWarRoomSnapshot = () => {
  const warRoom = runtimeSnapshot.serviceOps.warRoom;
  const services = runtimeSnapshot.serviceOps.services;
  const summary = getServiceHealthSummary(services);
  const currentMonthlyCost = getTotalMonthlyCost(runtimeSnapshot);
  const crisisMultiplier = warRoom.crisisActive ? 1.7 : 1;
  const lossPerMin = estimateLossPerMinute({
    totalMonthlyCost: currentMonthlyCost,
    summary,
    crisisMultiplier
  });

  warRoom.currentMonthlyCost = currentMonthlyCost;
  warRoom.lossPerMin = lossPerMin;
  warRoom.revenueRiskPerMin = roundTo2(lossPerMin * 11.5);
  warRoom.rootCause = getWarRoomRootCause(services);
  warRoom.blastRadius = getBlastRadius(services);

  if (warRoom.crisisActive) {
    warRoom.priorityAction = "Run Auto-Heal and apply emergency scaling.";
    warRoom.eta = "2-4 mins";
  } else if (warRoom.resolvedAt) {
    warRoom.priorityAction = "Incident resolved. Observe for recurrence.";
    warRoom.eta = "Resolved";
  }
};

const pushTimelineFrame = (trigger, meta = {}) => {
  const services = runtimeSnapshot.serviceOps.services;
  const summary = getServiceHealthSummary(services);
  const frame = {
    id: `frame-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: nowIso(),
    trigger,
    scenario: runtimeSnapshot.serviceOps.scenario,
    totalMonthlyCost: getTotalMonthlyCost(runtimeSnapshot),
    activeUsers: runtimeSnapshot.serviceOps.websiteMetrics.activeUsers,
    pageViews: runtimeSnapshot.serviceOps.websiteMetrics.pageViews,
    serviceSummary: {
      healthy: summary.healthy,
      degraded: summary.degraded,
      critical: summary.critical,
      avgLatencyMs: summary.avgLatencyMs,
      avgErrorRate: summary.avgErrorRate
    },
    meta
  };

  runtimeSnapshot.serviceOps.timelineFrames.unshift(frame);
  runtimeSnapshot.serviceOps.timelineFrames = runtimeSnapshot.serviceOps.timelineFrames.slice(0, 120);
};

const pushActivity = ({
  actionType,
  intensity,
  actor,
  costDelta,
  source = "simulator",
  label,
  meta = {}
}) => {
  runtimeSnapshot.serviceOps.activityLog.unshift({
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    actionType,
    label: label || actionLabelMap[actionType] || actionType,
    intensity,
    actor,
    source,
    scenario: runtimeSnapshot.serviceOps.scenario,
    costDelta,
    meta,
    timestamp: new Date().toISOString()
  });

  runtimeSnapshot.serviceOps.activityLog = runtimeSnapshot.serviceOps.activityLog.slice(0, 35);
};

const executeActionCore = ({ actionType, intensity = 1, actor = "Demo User", source = "simulator", label, meta }) => {
  ensureRuntime();
  const action = actionMap[actionType];
  if (!action) {
    throw new Error(`Unsupported action type: ${actionType}`);
  }

  const normalizedIntensity = clamp(Number(intensity || 1), 1, 5);
  const beforeCost = getTotalMonthlyCost(runtimeSnapshot);
  action(normalizedIntensity);
  normalizeServices();
  normalizeWebsiteMetrics();
  const afterCost = getTotalMonthlyCost(runtimeSnapshot);
  const costDelta = roundTo2(afterCost - beforeCost);

  pushActivity({
    actionType,
    intensity: normalizedIntensity,
    actor,
    costDelta,
    source,
    label,
    meta
  });

  updateWarRoomSnapshot();
  pushTimelineFrame(label || actionLabelMap[actionType] || actionType, {
    source,
    actionType
  });

  return {
    snapshot: getSimulatorSnapshot(),
    costDelta
  };
};

export const initializeSimulator = async (samplePath) => {
  if (runtimeSnapshot) return;

  const rawData = await fs.readFile(samplePath, "utf-8");
  const sample = JSON.parse(rawData);
  baseSnapshot = {
    ...sample,
    serviceOps: buildSimulatorState()
  };
  runtimeSnapshot = deepClone(baseSnapshot);
  updateWarRoomSnapshot();
  pushTimelineFrame("Baseline Snapshot", { source: "system" });
};

export const getSimulatorSnapshot = () => {
  ensureRuntime();
  return deepClone(runtimeSnapshot);
};

export const resetSimulator = () => {
  ensureRuntime();
  runtimeSnapshot = deepClone(baseSnapshot);
  updateWarRoomSnapshot();
  pushTimelineFrame("Simulator Reset", { source: "system" });
  return getSimulatorSnapshot();
};

export const applySimulatorAction = ({ actionType, intensity = 1, actor = "Demo User" }) =>
  executeActionCore({
    actionType,
    intensity,
    actor,
    source: "simulator-lab"
  });

export const startWarRoomCrisis = ({ actor = "War Room Commander" }) => {
  ensureRuntime();
  const warRoom = runtimeSnapshot.serviceOps.warRoom;

  if (!warRoom.crisisActive) {
    warRoom.incidentId = `INC-${Date.now()}`;
    warRoom.startedAt = nowIso();
    warRoom.resolvedAt = null;
    warRoom.reportCard = null;
    warRoom.moneySaved = 0;
    warRoom.resolutionSeconds = 0;
    warRoom.baselineMonthlyCost = getTotalMonthlyCost(runtimeSnapshot);
  }

  executeActionCore({
    actionType: "INCIDENT_MODE",
    intensity: 4,
    actor,
    source: "war-room",
    label: "Start Flash Sale Crisis"
  });

  executeActionCore({
    actionType: "TRAFFIC_SPIKE",
    intensity: 3,
    actor,
    source: "war-room",
    label: "Traffic Escalation Wave"
  });

  warRoom.crisisActive = true;
  warRoom.priorityAction = "Run Auto-Heal and apply emergency scaling.";
  warRoom.eta = "2-4 mins";
  updateWarRoomSnapshot();
  pushTimelineFrame("War Room Crisis Started", { incidentId: warRoom.incidentId, source: "war-room" });

  return {
    snapshot: getSimulatorSnapshot(),
    warRoom: deepClone(warRoom)
  };
};

export const runWarRoomAutoHeal = ({ actor = "War Room Commander" }) => {
  ensureRuntime();
  const warRoom = runtimeSnapshot.serviceOps.warRoom;

  executeActionCore({
    actionType: "RUN_OPTIMIZATION",
    intensity: 4,
    actor,
    source: "war-room",
    label: "Auto-Heal Wave 1"
  });

  executeActionCore({
    actionType: "RUN_OPTIMIZATION",
    intensity: 3,
    actor,
    source: "war-room",
    label: "Auto-Heal Wave 2"
  });

  warRoom.crisisActive = false;
  warRoom.resolvedAt = nowIso();
  if (warRoom.startedAt) {
    const started = new Date(warRoom.startedAt).getTime();
    const ended = new Date(warRoom.resolvedAt).getTime();
    warRoom.resolutionSeconds = Math.max(1, Math.round((ended - started) / 1000));
  }

  const rawSaving = warRoom.baselineMonthlyCost - getTotalMonthlyCost(runtimeSnapshot);
  warRoom.moneySaved = roundTo2(Math.max(0, rawSaving + warRoom.lossPerMin * 2.4));
  updateWarRoomSnapshot();
  warRoom.reportCard = buildReportCard(warRoom);
  pushTimelineFrame("War Room Auto-Heal Completed", { incidentId: warRoom.incidentId, source: "war-room" });

  return {
    snapshot: getSimulatorSnapshot(),
    warRoom: deepClone(warRoom),
    reportCard: deepClone(warRoom.reportCard)
  };
};

export const getWarRoomState = () => {
  ensureRuntime();
  updateWarRoomSnapshot();
  return deepClone(runtimeSnapshot.serviceOps.warRoom);
};

export const getTimeMachineFrames = (limit = 45) => {
  ensureRuntime();
  const normalizedLimit = clamp(Number(limit || 45), 5, 120);
  return deepClone(runtimeSnapshot.serviceOps.timelineFrames.slice(0, normalizedLimit));
};

export const applyWebsiteActivity = ({ activityType, volume = 1, actor = "Website User", details = {} }) => {
  ensureRuntime();
  const catalogItem = websiteActivityCatalog.find((item) => item.activityType === activityType);
  if (!catalogItem) {
    throw new Error(`Unsupported website activity: ${activityType}`);
  }

  const normalizedVolume = clamp(Number(volume || 1), 1, 5);
  applyMetricsDelta(catalogItem.metricsDelta, normalizedVolume);

  return executeActionCore({
    actionType: catalogItem.mappedActionType,
    intensity: clamp(catalogItem.intensityMultiplier * normalizedVolume, 1, 5),
    actor,
    source: "website-demo",
    label: activityLabelMap[activityType],
    meta: {
      activityType,
      ...details
    }
  });
};
