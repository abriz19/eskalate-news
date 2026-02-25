import express from "express";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import authRouter from "./modules/auth/auth.routes.js";
import articleRouter from "./modules/articles/article.routes.js";
import authorRouter from "./modules/author/author.routes.js";
import { errorFormatter } from "./middleware/errorFormatter.js";

const app = express();

app.use(helmet());
app.use(express.json());

const openapiPath = path.join(process.cwd(), "src", "docs", "openapi.yaml");
const openapiDocument = YAML.load(openapiPath);

app.get("/", (_req, res) => {
  res.json({
    Success: true,
    Message: "OK",
    Object: { status: "running" },
    Errors: null,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/articles", articleRouter);
app.use("/api/author", authorRouter);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use(errorFormatter);

export default app;
