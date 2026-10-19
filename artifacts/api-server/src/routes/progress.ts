import { Router, type IRouter } from "express";
import { GetWeeklyProgressResponse } from "@workspace/api-zod";
import { authenticatedUserId, requireAuth } from "../middlewares/require-auth";
import { getWeeklyProgress } from "../lib/rozgar-service";

const router: IRouter = Router();

router.get("/progress/week", requireAuth, async (_req, res): Promise<void> => {
  const progress = await getWeeklyProgress(authenticatedUserId(res));
  res.json(GetWeeklyProgressResponse.parse(progress));
});

export default router;
