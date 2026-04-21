const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));
const roundTo2 = (value) => Number(value.toFixed(2));

const getStatusFromScore = (score) => {
  if (score >= 75) return "Optimized";
  if (score >= 45) return "Moderate";
  return "Not Optimized";
};

const getRiskLevel = (score) => {
  if (score < 45) return "High";
  if (score < 75) return "Medium";
  return "Low";
};

const getEffortFromPenalty = (penalty) => {
  if (penalty >= 25) return "Medium";
  if (penalty >= 15) return "Low";
  return "Low";
};

const getOwnerForType = (resourceType) => {
  if (["EC2", "RDS"].includes(resourceType)) return "Cloud Engineer";
  if (["EBS", "S3"].includes(resourceType)) return "Storage Specialist";
  if (resourceType === "CloudFront") return "Platform Engineer";
  return "FinOps Analyst";
};

const penaltyToPriority = (penalty) => {
  if (penalty >= 25) return "High";
  if (penalty >= 15) return "Medium";
  return "Low";
};

const computeResourceOptimization = (resource) => {
  const monthlyCost = Number(resource.monthlyCost || 0);
  let score = 100;
  let potentialSavings = 0;
  const issues = [];

  const applyPenalty = ({ penalty, savingsMultiplier, suggestion, category }) => {
    const expectedSavings = roundTo2(monthlyCost * savingsMultiplier);
    score -= penalty;
    potentialSavings += expectedSavings;
    issues.push({
      category,
      suggestion,
      penalty,
      expectedSavings,
      effort: getEffortFromPenalty(penalty),
      priority: penaltyToPriority(penalty)
    });
  };

  const utilization = Number(resource.avgCpuUtilization ?? -1);
  if (["EC2", "RDS"].includes(resource.type) && utilization >= 0) {
    if (utilization < 15) {
      applyPenalty({
        penalty: 35,
        savingsMultiplier: 0.35,
        category: "Right-Sizing",
        suggestion: "Usage is very low. Downsize instance or schedule stop during off-hours."
      });
    } else if (utilization < 30) {
      applyPenalty({
        penalty: 20,
        savingsMultiplier: 0.2,
        category: "Right-Sizing",
        suggestion: "Usage is low. Evaluate right-sizing to a smaller instance class."
      });
    }
  }

  const idleDays = Number(resource.idleDays ?? 0);
  if (idleDays >= 7) {
    applyPenalty({
      penalty: 25,
      savingsMultiplier: 0.25,
      category: "Utilization",
      suggestion: "Resource has been idle for many days. Stop or remove when not needed."
    });
  }

  const reservedCoverage = Number(resource.reservedCoverage ?? 100);
  if (["EC2", "RDS"].includes(resource.type) && reservedCoverage < 50) {
    applyPenalty({
      penalty: 15,
      savingsMultiplier: 0.1,
      category: "Commitment Planning",
      suggestion: "Reserved/Savings Plan coverage is low. Commit baseline workloads for discount."
    });
  }

  if (resource.rightSized === false) {
    applyPenalty({
      penalty: 20,
      savingsMultiplier: 0.2,
      category: "Right-Sizing",
      suggestion: "Resource is not right-sized. Match instance size to actual demand."
    });
  }

  const storageUtilization = Number(resource.storageUtilization ?? 100);
  if (["EBS", "S3"].includes(resource.type) && storageUtilization < 50) {
    applyPenalty({
      penalty: 20,
      savingsMultiplier: 0.15,
      category: "Storage Lifecycle",
      suggestion: "Storage usage is low. Archive old data and remove unattached volumes/snapshots."
    });
  }

  const networkOutGb = Number(resource.networkOutGb ?? 0);
  if (networkOutGb > 1000) {
    applyPenalty({
      penalty: 10,
      savingsMultiplier: 0.05,
      category: "Data Transfer",
      suggestion: "High data transfer detected. Use CDN/caching and compress outbound traffic."
    });
  }

  const finalScore = clampScore(score);
  const status = getStatusFromScore(finalScore);
  const riskLevel = getRiskLevel(finalScore);

  const suggestions =
    issues.length > 0
      ? issues.map((issue) => issue.suggestion)
      : ["No major cost issue detected. Continue monitoring usage trends."];

  const recommendations =
    issues.length > 0
      ? issues.map((issue, index) => ({
          id: `${resource.id}-action-${index + 1}`,
          action: issue.suggestion,
          category: issue.category,
          owner: getOwnerForType(resource.type),
          priority: issue.priority,
          effort: issue.effort,
          expectedMonthlySavings: issue.expectedSavings,
          timeline: issue.effort === "Low" ? "1-3 days" : "3-7 days"
        }))
      : [
          {
            id: `${resource.id}-action-1`,
            action: "Keep autoscaling and budget alarms enabled.",
            category: "Monitoring",
            owner: getOwnerForType(resource.type),
            priority: "Low",
            effort: "Low",
            expectedMonthlySavings: 0,
            timeline: "Continuous"
          }
        ];

  return {
    ...resource,
    score: finalScore,
    status,
    riskLevel,
    potentialMonthlySavings: roundTo2(potentialSavings),
    issues,
    suggestions,
    recommendations
  };
};

const getTypeBreakdown = (resources) => {
  const typeMap = resources.reduce((acc, resource) => {
    const key = resource.type || "Unknown";
    if (!acc[key]) {
      acc[key] = {
        type: key,
        resourceCount: 0,
        monthlyCost: 0,
        potentialMonthlySavings: 0
      };
    }

    acc[key].resourceCount += 1;
    acc[key].monthlyCost += Number(resource.monthlyCost || 0);
    acc[key].potentialMonthlySavings += Number(resource.potentialMonthlySavings || 0);
    return acc;
  }, {});

  return Object.values(typeMap).map((item) => ({
    ...item,
    monthlyCost: roundTo2(item.monthlyCost),
    potentialMonthlySavings: roundTo2(item.potentialMonthlySavings)
  }));
};

const buildActionPlan = (resources) => {
  const actions = resources.flatMap((resource) =>
    resource.recommendations.map((recommendation) => ({
      ...recommendation,
      resourceId: resource.id,
      resourceName: resource.name,
      type: resource.type
    }))
  );

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  return actions
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return b.expectedMonthlySavings - a.expectedMonthlySavings;
    })
    .slice(0, 12);
};

const buildRuntimeHealth = (serviceOps) => {
  const services = Array.isArray(serviceOps?.services) ? serviceOps.services : [];
  if (services.length === 0) {
    return {
      overall: "Unknown",
      totalRequestsPerMin: 0,
      avgLatencyMs: 0,
      avgErrorRate: 0,
      degradedServices: 0,
      criticalServices: 0
    };
  }

  const totals = services.reduce(
    (acc, service) => {
      acc.totalRequestsPerMin += Number(service.requestsPerMin || 0);
      acc.avgLatencyMs += Number(service.latencyMs || 0);
      acc.avgErrorRate += Number(service.errorRate || 0);
      if (service.status === "Degraded") acc.degradedServices += 1;
      if (service.status === "Critical") acc.criticalServices += 1;
      return acc;
    },
    {
      totalRequestsPerMin: 0,
      avgLatencyMs: 0,
      avgErrorRate: 0,
      degradedServices: 0,
      criticalServices: 0
    }
  );

  totals.avgLatencyMs = roundTo2(totals.avgLatencyMs / services.length);
  totals.avgErrorRate = roundTo2(totals.avgErrorRate / services.length);
  totals.totalRequestsPerMin = roundTo2(totals.totalRequestsPerMin);

  let overall = "Healthy";
  if (totals.criticalServices > 0 || totals.avgErrorRate >= 4 || totals.avgLatencyMs >= 800) {
    overall = "Critical";
  } else if (totals.degradedServices > 0 || totals.avgErrorRate >= 2 || totals.avgLatencyMs >= 420) {
    overall = "Warning";
  }

  return {
    overall,
    ...totals
  };
};

const buildWebsiteAdvisor = ({ runtimeHealth, governance, summary }) => {
  const cards = [];

  if (runtimeHealth.overall === "Critical") {
    cards.push({
      severity: "High",
      title: "Critical Runtime Degradation",
      recommendation:
        "Scale API and checkout services immediately, enable aggressive autoscaling thresholds, and investigate error spikes with logs."
    });
  }

  if (runtimeHealth.avgLatencyMs > 350) {
    cards.push({
      severity: runtimeHealth.avgLatencyMs > 700 ? "High" : "Medium",
      title: "Latency Is Increasing",
      recommendation:
        "Enable caching at CDN/app layer, optimize heavy queries, and review instance sizing for request-facing services."
    });
  }

  if (runtimeHealth.avgErrorRate > 1.5) {
    cards.push({
      severity: runtimeHealth.avgErrorRate > 3 ? "High" : "Medium",
      title: "Error Rate Above Safe Baseline",
      recommendation:
        "Inspect failing endpoints, set circuit breakers/retries, and add alert rules for error spikes to prevent downtime."
    });
  }

  if (runtimeHealth.totalRequestsPerMin > 1200 && governance.reservedCoverageAvg < 60) {
    cards.push({
      severity: "Medium",
      title: "Traffic Growth Without Commitment Coverage",
      recommendation:
        "Increase Savings Plan/Reserved coverage for baseline compute to reduce cost during sustained growth."
    });
  }

  if (governance.idleResources >= 2 && runtimeHealth.totalRequestsPerMin < 350) {
    cards.push({
      severity: "Low",
      title: "Low Traffic But Idle Cost Exists",
      recommendation:
        "Use schedules to stop non-critical resources in off-hours and reduce always-on idle spend."
    });
  }

  if (cards.length === 0) {
    cards.push({
      severity: "Low",
      title: "Website Runtime Is Stable",
      recommendation:
        "Continue monitoring traffic and keep autoscaling, alarms, and budget thresholds active."
    });
  }

  const confidence =
    summary.totalMonthlyCost > 0
      ? clampScore((summary.totalPotentialSavings / summary.totalMonthlyCost) * 100)
      : 0;

  return {
    cards,
    advisoryConfidence: confidence
  };
};

export const analyzeAwsData = (input) => {
  const resources = Array.isArray(input?.resources) ? input.resources : [];
  const runtimeHealth = buildRuntimeHealth(input?.serviceOps);
  const analyzedResources = resources.map(computeResourceOptimization);

  const summary = analyzedResources.reduce(
    (acc, resource) => {
      const monthlyCost = Number(resource.monthlyCost || 0);
      acc.totalMonthlyCost += monthlyCost;
      acc.totalPotentialSavings += Number(resource.potentialMonthlySavings || 0);
      acc.averageScore += resource.score;
      acc.statusBreakdown[resource.status] += 1;
      return acc;
    },
    {
      totalMonthlyCost: 0,
      totalPotentialSavings: 0,
      averageScore: 0,
      statusBreakdown: {
        Optimized: 0,
        Moderate: 0,
        "Not Optimized": 0
      }
    }
  );

  if (analyzedResources.length > 0) {
    summary.averageScore = roundTo2(summary.averageScore / analyzedResources.length);
  } else {
    summary.averageScore = 0;
  }

  summary.totalMonthlyCost = roundTo2(summary.totalMonthlyCost);
  summary.totalPotentialSavings = roundTo2(summary.totalPotentialSavings);
  summary.overallStatus = getStatusFromScore(summary.averageScore);
  summary.resourceCount = analyzedResources.length;

  const computeResources = analyzedResources.filter((item) => ["EC2", "RDS"].includes(item.type));
  const reservedCoverageAvg =
    computeResources.length > 0
      ? roundTo2(
          computeResources.reduce((sum, item) => sum + Number(item.reservedCoverage ?? 100), 0) /
            computeResources.length
        )
      : 100;

  const rightSizedCount = analyzedResources.filter((item) => item.rightSized !== false).length;
  const rightsizingCoverage =
    analyzedResources.length > 0 ? roundTo2((rightSizedCount / analyzedResources.length) * 100) : 100;

  const governance = {
    reservedCoverageAvg,
    rightsizingCoverage,
    idleResources: analyzedResources.filter((item) => Number(item.idleDays ?? 0) >= 7).length,
    highRiskResources: analyzedResources.filter((item) => item.riskLevel === "High").length
  };

  const maturityScore = clampScore(
    summary.averageScore * 0.6 + governance.rightsizingCoverage * 0.2 + governance.reservedCoverageAvg * 0.2
  );
  const maturityLevel =
    maturityScore >= 80 ? "Advanced FinOps" : maturityScore >= 60 ? "Growing FinOps" : "Foundational FinOps";

  const topSuggestions = [
    ...new Set(
      analyzedResources
        .filter((item) => item.status !== "Optimized")
        .flatMap((item) => item.suggestions)
    )
  ].slice(0, 8);

  if (topSuggestions.length === 0) {
    topSuggestions.push("Environment looks healthy. Keep weekly cost checks active.");
  }

  const websiteAdvisor = buildWebsiteAdvisor({
    runtimeHealth,
    governance,
    summary
  });
  websiteAdvisor.cards.forEach((card) => {
    topSuggestions.push(card.recommendation);
  });
  const mergedTopSuggestions = [...new Set(topSuggestions)].slice(0, 10);

  const actionPlan = buildActionPlan(analyzedResources);
  const typeBreakdown = getTypeBreakdown(analyzedResources);

  const insights = [
    `Monthly spend is ${summary.totalMonthlyCost} USD with potential savings of ${summary.totalPotentialSavings} USD.`,
    `${governance.highRiskResources} high-risk resources need immediate action.`,
    `Reserved coverage average is ${governance.reservedCoverageAvg}% and rightsizing coverage is ${governance.rightsizingCoverage}%.`,
    `FinOps maturity is ${maturityLevel} (${maturityScore}/100).`,
    `Website runtime is ${runtimeHealth.overall} with avg latency ${runtimeHealth.avgLatencyMs} ms and error rate ${runtimeHealth.avgErrorRate}%.`
  ];

  return {
    metadata: {
      projectName: input?.projectName || "Unnamed Project",
      environment: input?.environment || "unknown",
      generatedAt: new Date().toISOString()
    },
    summary,
    governance,
    maturity: {
      score: maturityScore,
      level: maturityLevel
    },
    runtimeHealth,
    websiteAdvisor,
    typeBreakdown,
    actionPlan,
    resources: analyzedResources,
    suggestions: mergedTopSuggestions,
    insights
  };
};
