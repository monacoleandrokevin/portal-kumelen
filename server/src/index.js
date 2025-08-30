import dotenv from "dotenv";
dotenv.config();

import { buildApp } from "./app.js";
import { connectMongo } from "./config/mongoose.js";
import { env } from "./config/env.js";

await connectMongo();
const app = await buildApp();
app.listen(env.PORT, () => console.log(`🚀 API on :${env.PORT}`));
