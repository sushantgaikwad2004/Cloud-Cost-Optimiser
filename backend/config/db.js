import mongoose from "mongoose";

export const connectDb = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log("MongoDB URI not set. Running without database persistence.");
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected.");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.log("Continuing without database persistence.");
    return false;
  }
};

