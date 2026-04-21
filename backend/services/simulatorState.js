import fs from "node:fs/promises";

const roundTo2 = (value) => Number(value.toFixed(2));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const deepClone = (value) => JSON.parse(JSON.stringify(value));

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
  activityLog: []
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
};

export const getSimulatorSnapshot = () => {
  ensureRuntime();
  return deepClone(runtimeSnapshot);
};

export const resetSimulator = () => {
  ensureRuntime();
  runtimeSnapshot = deepClone(baseSnapshot);
  return getSimulatorSnapshot();
};

export const applySimulatorAction = ({ actionType, intensity = 1, actor = "Demo User" }) =>
  executeActionCore({
    actionType,
    intensity,
    actor,
    source: "simulator-lab"
  });

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
