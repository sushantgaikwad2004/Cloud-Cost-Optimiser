import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDb } from "./config/db.js";
import analyzeRoutes from "./routes/analyzeRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Cloud Cost Optimizer API is running.");
});

app.use("/api", analyzeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Something went wrong.",
    detail: err.message
  });
});

const start = async () => {
  await connectDb();
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
};

start();

