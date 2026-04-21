import mongoose from "mongoose";

const analysisReportSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    environment: { type: String, default: "unknown" },
    summary: {
      resourceCount: Number,
      totalMonthlyCost: Number,
      totalPotentialSavings: Number,
      averageScore: Number,
      overallStatus: String
    },
    resources: { type: Array, default: [] },
    suggestions: { type: [String], default: [] }
  },
  { timestamps: true }
);

const AnalysisReport = mongoose.model("AnalysisReport", analysisReportSchema);
export default AnalysisReport;

