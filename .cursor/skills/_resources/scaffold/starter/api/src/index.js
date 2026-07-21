import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { correlationId } from "./middleware/correlationId.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(correlationId);
app.use(morgan("combined"));

app.use(healthRouter);

app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ level: "error", message: err.message }));
  res.status(err.status || 500).json({ error: "internal_error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(JSON.stringify({ level: "info", message: "api listening", port }));
  });
}

export default app;
