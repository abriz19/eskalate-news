import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { dashboardQuerySchema } from "../articles/article.dto.js";
import { buildDashboardWhere } from "../articles/article.queries.js";
import { baseResponse, paginatedResponse } from "../../types/response.js";
import type { IRequestUser } from "../../types/types.js";

export const getDashboard: RequestHandler = async (req, res) => {
  const queryResult = dashboardQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json(
      baseResponse(false, "Validation failed", null, (queryResult.error as { issues: Array<{ message: string }> }).issues.map((e) => e.message))
    );
    return;
  }
  const reqUser = req as unknown as IRequestUser;
  const { page, size } = queryResult.data;
  const where = buildDashboardWhere(reqUser.user.sub);

  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      title: true,
      createdAt: true,
      analytics: {
        select: { viewCount: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * size,
    take: size,
  });

  const totalSize = await prisma.article.count({ where });

  const list = articles.map((a) => ({
    id: a.id,
    title: a.title,
    createdAt: a.createdAt,
    TotalViews: a.analytics.reduce((sum, x) => sum + x.viewCount, 0),
  }));

  res.json(paginatedResponse("OK", list, page, size, totalSize));
};
