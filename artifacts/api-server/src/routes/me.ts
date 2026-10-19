import { Router, type IRouter } from "express";
import {
  GetMeQueryParams,
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";
import { authenticatedUserId, requireAuth } from "../middlewares/require-auth";
import { HttpError } from "../lib/http-error";
import { isValidTimeZone } from "../lib/date-utils";
import { getProfile, updateProfile } from "../lib/rozgar-service";

const router: IRouter = Router();

router.get("/me", requireAuth, async (_req, res): Promise<void> => {
  const query = GetMeQueryParams.safeParse(_req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { timeZone } = query.data;
  if (timeZone && !isValidTimeZone(timeZone)) {
    res.status(400).json({ error: "Use a valid IANA time zone" });
    return;
  }
  const profile = await getProfile(authenticatedUserId(res), timeZone);
  res.json(GetMeResponse.parse(profile));
});

router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one profile field to update" });
    return;
  }
  if (parsed.data.timeZone && !isValidTimeZone(parsed.data.timeZone)) {
    res.status(400).json({ error: "Use a valid IANA time zone" });
    return;
  }

  try {
    const profile = await updateProfile(authenticatedUserId(res), parsed.data);
    res.json(UpdateMeResponse.parse(profile));
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;
