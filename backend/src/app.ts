import express from "express";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes.js";
import articleRouter from "./modules/articles/article.routes.js";
import authorRouter from "./modules/author/author.routes.js";
import { errorFormatter } from "./middleware/errorFormatter.js";

const app = express();

app.use(helmet());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ Success: true, Message: "OK", Object: { status: "running" }, Errors: null });
});

app.use("/api/auth", authRouter);
app.use("/api/articles", articleRouter);
app.use("/api/author", authorRouter);

app.use(errorFormatter);

export default app;
