import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/rbac.js";
import { getDashboard } from "./author.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("AUTHOR"), getDashboard);

export default router;
