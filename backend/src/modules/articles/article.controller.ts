import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import {
  createArticleSchema,
  updateArticleSchema,
  articleIdParamSchema,
  publicFeedQuerySchema,
  articlesMeQuerySchema,
} from "./article.dto.js";
import {
  buildPublicFeedWhere,
  buildArticlesMeWhere,
} from "./article.queries.js";
import { canLogRead } from "./readTracking.js";
import { baseResponse, paginatedResponse } from "../../types/response.js";
import type { IRequestUser } from "../../types/types.js";

const articleSelect = {
  id: true,
  title: true,
  content: true,
  category: true,
  status: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
};

export const createArticle: RequestHandler = async (req, res) => {
  const parsed = createArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (parsed.error as { issues: Array<{ message: string }> }).issues.map(
          (e) => e.message,
        ),
      ),
    );
    return;
  }
  const reqUser = req as unknown as IRequestUser;
  const article = await prisma.article.create({
    data: {
      ...parsed.data,
      authorId: reqUser.user.sub,
      status: "DRAFT",
    },
    select: articleSelect,
  });
  res.status(201).json(baseResponse(true, "Created", article, null));
};

export const updateArticle: RequestHandler = async (req, res) => {
  const paramResult = articleIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (paramResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message),
      ),
    );
    return;
  }
  const bodyResult = updateArticleSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (bodyResult.error as { issues: Array<{ message: string }> }).issues.map(
          (e) => e.message,
        ),
      ),
    );
    return;
  }
  const reqUser = req as unknown as IRequestUser;
  const { id } = paramResult.data;
  const existing = await prisma.article.findFirst({
    where: { id, authorId: reqUser.user.sub, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    const anyArticle = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true, deletedAt: true },
    });
    if (anyArticle && anyArticle.authorId !== reqUser.user.sub) {
      res
        .status(403)
        .json(baseResponse(false, "Forbidden", null, ["Forbidden"]));
      return;
    }
    res
      .status(404)
      .json(baseResponse(false, "Not found", null, ["Article not found"]));
    return;
  }
  const body = bodyResult.data;
  const updateData: Parameters<typeof prisma.article.update>[0]["data"] = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.status !== undefined) updateData.status = body.status;
  const article = await prisma.article.update({
    where: { id },
    data: updateData,
    select: articleSelect,
  });
  res.json(baseResponse(true, "OK", article, null));
};

export const deleteArticle: RequestHandler = async (req, res) => {
  const paramResult = articleIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (paramResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message),
      ),
    );
    return;
  }
  const reqUser = req as unknown as IRequestUser;
  const { id } = paramResult.data;
  const existing = await prisma.article.findFirst({
    where: { id, authorId: reqUser.user.sub, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    const anyArticle = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (anyArticle && anyArticle.authorId !== reqUser.user.sub) {
      res
        .status(403)
        .json(baseResponse(false, "Forbidden", null, ["Forbidden"]));
      return;
    }
    res
      .status(404)
      .json(baseResponse(false, "Not found", null, ["Article not found"]));
    return;
  }
  await prisma.article.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  res.json(baseResponse(true, "Deleted", null, null));
};

export const getArticlesMe: RequestHandler = async (req, res) => {
  const queryResult = articlesMeQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (queryResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message),
      ),
    );
    return;
  }
  const reqUser = req as unknown as IRequestUser;
  const { page, size, includeDeleted } = queryResult.data;
  const where = buildArticlesMeWhere(reqUser.user.sub, includeDeleted ?? false);
  const [list, totalSize] = await Promise.all([
    prisma.article.findMany({
      where,
      select: articleSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.article.count({ where }),
  ]);
  res.json(paginatedResponse("OK", list, page, size, totalSize));
};

export const getPublicFeed: RequestHandler = async (req, res) => {
  const queryResult = publicFeedQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (queryResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message),
      ),
    );
    return;
  }
  const query = queryResult.data;
  const where = buildPublicFeedWhere(query);
  const [list, totalSize] = await Promise.all([
    prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        authorId: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.size,
      take: query.size,
    }),
    prisma.article.count({ where }),
  ]);
  res.json(paginatedResponse("OK", list, query.page, query.size, totalSize));
};

export const getArticleById: RequestHandler = async (req, res) => {
  const paramResult = articleIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (paramResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message),
      ),
    );
    return;
  }
  const readerId =
    (req as unknown as { user?: { sub: string } }).user?.sub ?? null;
  const { id } = paramResult.data;

  const article = await prisma.article.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      status: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
    },
  });

  if (!article) {
    const deleted = await prisma.article.findUnique({
      where: { id },
      select: { deletedAt: true },
    });
    if (deleted?.deletedAt != null) {
      res
        .status(410)
        .json(
          baseResponse(false, "News article no longer available", null, [
            "News article no longer available",
          ]),
        );
      return;
    }
    res
      .status(404)
      .json(baseResponse(false, "Not found", null, ["Article not found"]));
    return;
  }

  if (canLogRead(id, readerId)) {
    setImmediate(() => {
      prisma.readLog
        .create({ data: { articleId: id, readerId } })
        .catch(() => {});
    });
  }

  res.json(baseResponse(true, "OK", article, null));
};
