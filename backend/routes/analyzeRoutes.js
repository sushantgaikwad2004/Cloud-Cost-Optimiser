import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import AnalysisReport from "../models/AnalysisReport.js";
import { analyzeAwsData } from "../services/optimizer.js";
import {
  applySimulatorAction,
  applyWebsiteActivity,
  getTimeMachineFrames,
  getWarRoomState,
  getSimulatorSnapshot,
  initializeSimulator,
  resetSimulator,
  runWarRoomAutoHeal,
  simulatorActionsCatalog,
  startWarRoomCrisis,
  websiteActivityCatalog
} from "../services/simulatorState.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplePath = path.join(__dirname, "..", "data", "aws-sample.json");
const streamClients = new Map();

const demoUsers = [
  {
    email: "admin@beproject.com",
    password: "admin123",
    name: "Aarav Sharma",
    role: "FinOps Lead"
  },
  {
    email: "reviewer@beproject.com",
    password: "review123",
    name: "Nisha Verma",
    role: "Cloud Reviewer"
  }
];

const createToken = (user) => {
  const payload = {
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 8 * 60 * 60 * 1000
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
};

const decodeToken = (token) => {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Missing token." });
  }

  const user = decodeToken(token);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized. Invalid or expired token." });
  }

  req.user = user;
  next();
};

const ensureSimulator = async () => {
  await initializeSimulator(samplePath);
};

const saveReportIfMongoAvailable = async (analysis) => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    await AnalysisReport.create({
      projectName: analysis.metadata.projectName,
      environment: analysis.metadata.environment,
      summary: analysis.summary,
      resources: analysis.resources,
      suggestions: analysis.suggestions
    });
  } catch (error) {
    console.error("Could not persist analysis report:", error.message);
  }
};

const broadcastAnalysisUpdate = async (trigger = "update") => {
  if (streamClients.size === 0) return;

  try {
    await ensureSimulator();
    const snapshot = getSimulatorSnapshot();
    const analysis = analyzeAwsData(snapshot);
    const payload = JSON.stringify({
      trigger,
      timestamp: new Date().toISOString(),
      analysis,
      simulator: snapshot.serviceOps
    });

    streamClients.forEach((clientRes) => {
      clientRes.write(`event: analysis-update\n`);
      clientRes.write(`data: ${payload}\n\n`);
    });
  } catch (error) {
    console.error("Could not broadcast stream update:", error.message);
  }
};

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "cloud-cost-optimizer-api",
    time: new Date().toISOString()
  });
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = demoUsers.find((entry) => entry.email === email && entry.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = createToken(user);
  res.json({
    token,
    user: {
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/sample", async (req, res, next) => {
  try {
    await ensureSimulator();
    res.json(getSimulatorSnapshot());
  } catch (error) {
    next(error);
  }
});

router.get("/analyze", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const analysis = analyzeAwsData(getSimulatorSnapshot());
    await saveReportIfMongoAvailable(analysis);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

router.post("/analyze", requireAuth, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.resources)) {
      return res.status(400).json({
        message: "Invalid payload. Send JSON with a resources array."
      });
    }

    const analysis = analyzeAwsData(payload);
    await saveReportIfMongoAvailable(analysis);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

router.get("/simulator/actions", requireAuth, (req, res) => {
  res.json({ actions: simulatorActionsCatalog });
});

router.get("/simulator/state", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const snapshot = getSimulatorSnapshot();
    const analysis = analyzeAwsData(snapshot);
    res.json({
      simulator: snapshot.serviceOps,
      analysis
    });
  } catch (error) {
    next(error);
  }
});

router.post("/simulator/action", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const { actionType, intensity } = req.body || {};

    const { snapshot, costDelta } = applySimulatorAction({
      actionType,
      intensity,
      actor: req.user.name || req.user.email
    });

    const analysis = analyzeAwsData(snapshot);
    await saveReportIfMongoAvailable(analysis);
    await broadcastAnalysisUpdate("simulator-action");

    res.json({
      message: "Action executed successfully.",
      costDelta,
      simulator: snapshot.serviceOps,
      analysis
    });
  } catch (error) {
    next(error);
  }
});

router.post("/simulator/reset", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const snapshot = resetSimulator();
    const analysis = analyzeAwsData(snapshot);
    await saveReportIfMongoAvailable(analysis);
    await broadcastAnalysisUpdate("simulator-reset");

    res.json({
      message: "Simulator reset to default sample state.",
      simulator: snapshot.serviceOps,
      analysis
    });
  } catch (error) {
    next(error);
  }
});

router.get("/website/activities", requireAuth, (req, res) => {
  res.json({ activities: websiteActivityCatalog });
});

router.get("/website/state", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const snapshot = getSimulatorSnapshot();
    const analysis = analyzeAwsData(snapshot);
    res.json({
      simulator: snapshot.serviceOps,
      analysis
    });
  } catch (error) {
    next(error);
  }
});

router.post("/website/activity", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const { activityType, volume, details } = req.body || {};

    const { snapshot, costDelta } = applyWebsiteActivity({
      activityType,
      volume,
      details,
      actor: req.user.name || req.user.email
    });

    const analysis = analyzeAwsData(snapshot);
    await saveReportIfMongoAvailable(analysis);
    await broadcastAnalysisUpdate("website-activity");

    res.json({
      message: "Website activity captured successfully.",
      costDelta,
      simulator: snapshot.serviceOps,
      analysis
    });
  } catch (error) {
    next(error);
  }
});

router.get("/timemachine/frames", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const limit = Number(req.query.limit || 45);
    const frames = getTimeMachineFrames(limit);
    res.json({ frames });
  } catch (error) {
    next(error);
  }
});

router.get("/war-room/state", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const snapshot = getSimulatorSnapshot();
    const analysis = analyzeAwsData(snapshot);
    const warRoom = getWarRoomState();
    res.json({
      simulator: snapshot.serviceOps,
      analysis,
      warRoom
    });
  } catch (error) {
    next(error);
  }
});

router.post("/war-room/start", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const { snapshot, warRoom } = startWarRoomCrisis({
      actor: req.user.name || req.user.email
    });

    const analysis = analyzeAwsData(snapshot);
    await saveReportIfMongoAvailable(analysis);
    await broadcastAnalysisUpdate("war-room-start");

    res.json({
      message: "War room crisis simulation started.",
      simulator: snapshot.serviceOps,
      analysis,
      warRoom
    });
  } catch (error) {
    next(error);
  }
});

router.post("/war-room/auto-heal", requireAuth, async (req, res, next) => {
  try {
    await ensureSimulator();
    const { snapshot, warRoom, reportCard } = runWarRoomAutoHeal({
      actor: req.user.name || req.user.email
    });

    const analysis = analyzeAwsData(snapshot);
    await saveReportIfMongoAvailable(analysis);
    await broadcastAnalysisUpdate("war-room-auto-heal");

    res.json({
      message: "Auto-heal executed and platform stabilized.",
      simulator: snapshot.serviceOps,
      analysis,
      warRoom,
      reportCard
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stream", async (req, res) => {
  try {
    await ensureSimulator();
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const user = decodeToken(token);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized stream access." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const clientId = `client-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    streamClients.set(clientId, res);

    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: "Stream connected." })}\n\n`);

    const snapshot = getSimulatorSnapshot();
    const analysis = analyzeAwsData(snapshot);
    res.write(`event: analysis-update\n`);
    res.write(
      `data: ${JSON.stringify({
        trigger: "initial",
        timestamp: new Date().toISOString(),
        analysis,
        simulator: snapshot.serviceOps
      })}\n\n`
    );

    const keepAlive = setInterval(() => {
      res.write(`event: keepalive\n`);
      res.write(`data: ${Date.now()}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      streamClients.delete(clientId);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not establish stream." });
  }
});

export default router;
