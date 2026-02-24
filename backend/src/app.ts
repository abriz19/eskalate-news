import express from "express";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes.js";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Hello World!",
  });
});

// Routes
app.use("/api/auth", authRouter);

export default app;
