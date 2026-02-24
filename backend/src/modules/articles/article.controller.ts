import { Prisma, PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";
import { createArticleSchema, getArticlesQuerySchema } from "./article.dto.js";
import type { IRequestUser } from "../../types/types.js";

const prisma = new PrismaClient();

// Create Article (Author only)
export const createArticle: RequestHandler = async (req, res) => {
  try {
    const request = req as unknown as IRequestUser;
    const data = createArticleSchema.parse(req.body);
    const userId = request.user.sub;

    const article = await prisma.article.create({
      data: {
        ...data,
        authorId: userId,
      },
    });

    res.status(201).json(article);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get public articles (Reader)
export const getArticles: RequestHandler = async (req, res) => {
  try {
    const query = getArticlesQuerySchema.parse(req.query);

    const where: Prisma.ArticleWhereInput = {
      deletedAt: null,
      status: "PUBLISHED",
    };

    if (query.category) where.category = query.category;
    if (query.q) where.title = { contains: query.q, mode: "insensitive" };
    if (query.author)
      where.author = { name: { contains: query.author, mode: "insensitive" } };

    const articles = await prisma.article.findMany({
      where,
      skip: (query.page - 1) * query.size,
      take: query.size,
      orderBy: { createdAt: "desc" },
    });

    res.json({ page: query.page, size: query.size, articles });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
