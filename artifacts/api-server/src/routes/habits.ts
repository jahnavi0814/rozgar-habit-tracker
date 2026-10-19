import { Router, type IRouter } from "express";
import {
  CreateHabitBody,
  CreateHabitResponse,
  DeleteHabitParams,
  GetHabitParams,
  GetHabitResponse,
  ListHabitsResponse,
  SetHabitCheckInBody,
  SetHabitCheckInParams,
  SetHabitCheckInResponse,
  UpdateHabitBody,
  UpdateHabitParams,
  UpdateHabitResponse,
} from "@workspace/api-zod";
import { authenticatedUserId, requireAuth } from "../middlewares/require-auth";
import { HttpError } from "../lib/http-error";
import {
  createHabit,
  deleteHabit,
  getHabit,
  listHabits,
  setHabitCheckIn,
  updateHabit,
} from "../lib/rozgar-service";

const router: IRouter = Router();

router.get("/habits", requireAuth, async (_req, res): Promise<void> => {
  const habits = await listHabits(authenticatedUserId(res));
  res.json(ListHabitsResponse.parse(habits));
});

router.post("/habits", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const habit = await createHabit(authenticatedUserId(res), parsed.data);
    res.status(201).json(CreateHabitResponse.parse(habit));
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/habits/:habitId", requireAuth, async (req, res): Promise<void> => {
  const params = GetHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const habit = await getHabit(authenticatedUserId(res), params.data.habitId);
  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.json(GetHabitResponse.parse(habit));
});

router.patch("/habits/:habitId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one habit field to update" });
    return;
  }
  try {
    const habit = await updateHabit(
      authenticatedUserId(res),
      params.data.habitId,
      parsed.data,
    );
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }
    res.json(UpdateHabitResponse.parse(habit));
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.delete("/habits/:habitId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const deleted = await deleteHabit(
    authenticatedUserId(res),
    params.data.habitId,
  );
  if (!deleted) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.sendStatus(204);
});

router.put(
  "/habits/:habitId/check-in",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetHabitCheckInParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SetHabitCheckInBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const checkIn = await setHabitCheckIn(
      authenticatedUserId(res),
      params.data.habitId,
      parsed.data.completed,
    );
    if (!checkIn) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }
    res.json(SetHabitCheckInResponse.parse(checkIn));
  },
);

export default router;
