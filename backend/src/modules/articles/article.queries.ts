import type { Prisma } from "@prisma/client";
import type { PublicFeedQuery, ArticlesMeQuery } from "./article.dto.js";

export function buildPublicFeedWhere(query: PublicFeedQuery): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {
    deletedAt: null,
    status: "PUBLISHED",
  };
  if (query.category) where.category = query.category;
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };
  if (query.author) {
    where.author = { name: { contains: query.author, mode: "insensitive" } };
  }
  return where;
}

export function buildArticlesMeWhere(
  authorId: string,
  includeDeleted: boolean
): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = { authorId };
  if (!includeDeleted) where.deletedAt = null;
  return where;
}

export function buildDashboardWhere(authorId: string): Prisma.ArticleWhereInput {
  return { authorId, deletedAt: null };
}
