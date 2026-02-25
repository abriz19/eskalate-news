import { Router } from "express";
import {
  requireAuth,
  requireRole,
  optionalAuth,
} from "../../middleware/rbac.js";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  getMyArticles,
  getPublicFeed,
  getArticleById,
} from "./article.controller.js";

const router = Router();

router.get("/", getPublicFeed);
router.get("/me", requireAuth, requireRole("AUTHOR"), getMyArticles);
router.get("/:id", optionalAuth, getArticleById);
router.post("/", requireAuth, requireRole("AUTHOR"), createArticle);
router.put("/:id", requireAuth, requireRole("AUTHOR"), updateArticle);
router.delete("/:id", requireAuth, requireRole("AUTHOR"), deleteArticle);

export default router;
