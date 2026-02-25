import { z } from "zod";

const uuidSchema = z.string().uuid();

export const createArticleSchema = z.object({
  title: z.string().min(1).max(150),
  content: z.string().min(50),
  category: z.string().min(1).max(100),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  content: z.string().min(50).optional(),
  category: z.string().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const articleIdParamSchema = z.object({
  id: uuidSchema,
});

export const publicFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  author: z.string().optional(),
  q: z.string().optional(),
});

export const articlesMeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(10),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const dashboardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateArticleDTO = z.infer<typeof createArticleSchema>;
export type UpdateArticleDTO = z.infer<typeof updateArticleSchema>;
export type ArticleIdParam = z.infer<typeof articleIdParamSchema>;
export type PublicFeedQuery = z.infer<typeof publicFeedQuerySchema>;
export type ArticlesMeQuery = z.infer<typeof articlesMeQuerySchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
