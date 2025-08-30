// server/src/config/mongoose.js
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
}
