import { and, eq, inArray } from "drizzle-orm";
import { db, checkInsTable, habitsTable, usersTable } from "@workspace/db";
import {
  CreateHabitBody,
  GetHabitResponse,
  GetMeResponse,
  GetWeeklyProgressResponse,
  SetHabitCheckInResponse,
  UpdateHabitBody,
  UpdateMeBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { HttpError } from "./http-error";
import {
  isValidDateKey,
  localDateForTimeZone,
  previousSevenDateKeys,
  weekdayIndexForDateKey,
  weekdayLabelForDateKey,
} from "./date-utils";

type HabitCreateInput = z.infer<typeof CreateHabitBody>;
type HabitUpdateInput = z.infer<typeof UpdateHabitBody>;
type ProfileUpdateInput = z.infer<typeof UpdateMeBody>;
type HabitDto = z.infer<typeof GetHabitResponse>;
type ProfileDto = z.infer<typeof GetMeResponse>;
type CheckInDto = z.infer<typeof SetHabitCheckInResponse>;
type WeekProgressDto = z.infer<typeof GetWeeklyProgressResponse>;

function isHabitScheduled(
  habit: Pick<typeof habitsTable.$inferSelect, "frequency" | "weekdays">,
  localDate: string,
): boolean {
  return (
    habit.frequency === "daily" ||
    habit.weekdays.includes(weekdayIndexForDateKey(localDate))
  );
}

function normalizeWeekdays(weekdays: number[]): number[] {
  return [...new Set(weekdays)].sort((left, right) => left - right);
}

function toHabitDto(
  habit: typeof habitsTable.$inferSelect,
  completedToday: boolean,
  today: string,
): HabitDto {
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    frequency: habit.frequency as HabitDto["frequency"],
    weekdays: habit.weekdays ?? [],
    reminderTime: habit.reminderTime,
    isActive: habit.isActive,
    completedToday,
    scheduledToday: habit.isActive && isHabitScheduled(habit, today),
  };
}

function toProfileDto(user: typeof usersTable.$inferSelect): ProfileDto {
  return {
    id: user.id,
    displayName: user.displayName,
    timeZone: user.timeZone,
    remindersEnabled: user.remindersEnabled,
  };
}

export async function ensureUser(
  userId: string,
  requestedTimeZone?: string,
): Promise<typeof usersTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existing) {
    if (!requestedTimeZone || existing.timeZone === requestedTimeZone) {
      return existing;
    }
    const [updated] = await db
      .update(usersTable)
      .set({ timeZone: requestedTimeZone, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(usersTable)
    .values({ id: userId, timeZone: requestedTimeZone ?? "UTC" })
    .onConflictDoNothing()
    .returning();

  if (created) return created;
  const [raced] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!raced) throw new Error("User profile could not be initialized");
  return raced;
}

export async function getProfile(
  userId: string,
  timeZone?: string,
): Promise<ProfileDto> {
  return toProfileDto(await ensureUser(userId, timeZone));
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileDto> {
  const current = await ensureUser(userId);
  const changes: Partial<typeof usersTable.$inferInsert> = {};

  if (input.displayName !== undefined) {
    const normalized = input.displayName?.trim() ?? "";
    changes.displayName = normalized.length ? normalized : null;
  }
  if (input.timeZone !== undefined) changes.timeZone = input.timeZone;
  if (input.remindersEnabled !== undefined) {
    changes.remindersEnabled = input.remindersEnabled;
  }
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, "Provide at least one profile field to update");
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(usersTable.id, current.id))
    .returning();
  return toProfileDto(updated);
}

export async function listHabits(userId: string): Promise<HabitDto[]> {
  const user = await ensureUser(userId);
  const today = localDateForTimeZone(new Date(), user.timeZone);
  const [habits, checkIns] = await Promise.all([
    db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.userId, userId))
      .orderBy(habitsTable.createdAt),
    db
      .select({ habitId: checkInsTable.habitId, completed: checkInsTable.completed })
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.userId, userId),
          eq(checkInsTable.localDate, today),
        ),
      ),
  ]);
  const checkedToday = new Map(checkIns.map((checkIn) => [checkIn.habitId, checkIn.completed]));
  return habits.map((habit) =>
    toHabitDto(habit, checkedToday.get(habit.id) ?? false, today),
  );
}

export async function getHabit(
  userId: string,
  habitId: string,
): Promise<HabitDto | null> {
  const user = await ensureUser(userId);
  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)))
    .limit(1);
  if (!habit) return null;

  const today = localDateForTimeZone(new Date(), user.timeZone);
  const [checkIn] = await db
    .select({ completed: checkInsTable.completed })
    .from(checkInsTable)
    .where(
      and(
        eq(checkInsTable.userId, userId),
        eq(checkInsTable.habitId, habitId),
        eq(checkInsTable.localDate, today),
      ),
    )
    .limit(1);
  return toHabitDto(habit, checkIn?.completed ?? false, today);
}

function validateSchedule(frequency: string, weekdays: number[]): void {
  if (
    weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(weekdays).size !== weekdays.length
  ) {
    throw new HttpError(400, "Choose unique weekdays from Monday through Sunday");
  }
  if (frequency === "weekdays" && weekdays.length === 0) {
    throw new HttpError(400, "Choose at least one day for this habit");
  }
}

export async function createHabit(
  userId: string,
  input: HabitCreateInput,
): Promise<HabitDto> {
  const user = await ensureUser(userId);
  validateSchedule(input.frequency, input.weekdays);
  const weekdays =
    input.frequency === "daily" ? [] : normalizeWeekdays(input.weekdays);

  const [habit] = await db
    .insert(habitsTable)
    .values({
      userId,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      frequency: input.frequency,
      weekdays,
      reminderTime: input.reminderTime ?? null,
    })
    .returning();
  const today = localDateForTimeZone(new Date(), user.timeZone);
  return toHabitDto(habit, false, today);
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: HabitUpdateInput,
): Promise<HabitDto | null> {
  const [current] = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)))
    .limit(1);
  if (!current) return null;

  const frequency = input.frequency ?? current.frequency;
  const proposedWeekdays = input.weekdays ?? current.weekdays;
  validateSchedule(frequency, proposedWeekdays);

  const changes: Partial<typeof habitsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) changes.name = input.name.trim();
  if (input.description !== undefined) changes.description = input.description.trim();
  if (input.frequency !== undefined) changes.frequency = input.frequency;
  if (frequency === "daily") {
    changes.weekdays = [];
  } else if (input.weekdays !== undefined) {
    changes.weekdays = normalizeWeekdays(input.weekdays);
  }
  if (input.reminderTime !== undefined) changes.reminderTime = input.reminderTime;
  if (input.isActive !== undefined) changes.isActive = input.isActive;

  const [updated] = await db
    .update(habitsTable)
    .set(changes)
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)))
    .returning();
  const user = await ensureUser(userId);
  return toHabitDto(
    updated,
    (
      await db
        .select({ completed: checkInsTable.completed })
        .from(checkInsTable)
        .where(
          and(
            eq(checkInsTable.userId, userId),
            eq(checkInsTable.habitId, habitId),
            eq(
              checkInsTable.localDate,
              localDateForTimeZone(new Date(), user.timeZone),
            ),
          ),
        )
        .limit(1)
    )[0]?.completed ?? false,
    localDateForTimeZone(new Date(), user.timeZone),
  );
}

export async function deleteHabit(
  userId: string,
  habitId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(habitsTable)
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)))
    .returning({ id: habitsTable.id });
  return deleted.length > 0;
}

export async function setHabitCheckIn(
  userId: string,
  habitId: string,
  completed: boolean,
): Promise<CheckInDto | null> {
  const user = await ensureUser(userId);
  const [habit] = await db
    .select({ id: habitsTable.id })
    .from(habitsTable)
    .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)))
    .limit(1);
  if (!habit) return null;

  const localDate = localDateForTimeZone(new Date(), user.timeZone);
  const [checkIn] = await db
    .insert(checkInsTable)
    .values({ userId, habitId, localDate, completed })
    .onConflictDoUpdate({
      target: [checkInsTable.habitId, checkInsTable.localDate],
      set: { completed, updatedAt: new Date() },
    })
    .returning();

  return {
    habitId: checkIn.habitId,
    localDate: checkIn.localDate,
    completed: checkIn.completed,
  };
}

export async function getWeeklyProgress(
  userId: string,
): Promise<WeekProgressDto> {
  const user = await ensureUser(userId);
  const today = localDateForTimeZone(new Date(), user.timeZone);
  const dateKeys = previousSevenDateKeys(today);
  if (!dateKeys.every(isValidDateKey)) {
    throw new Error("Could not generate seven valid local dates");
  }

  const [habits, checkIns] = await Promise.all([
    db.select().from(habitsTable).where(eq(habitsTable.userId, userId)),
    db
      .select({
        habitId: checkInsTable.habitId,
        localDate: checkInsTable.localDate,
        completed: checkInsTable.completed,
      })
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.userId, userId),
          inArray(checkInsTable.localDate, dateKeys),
        ),
      ),
  ]);
  const checkInsByDate = new Map<string, typeof checkIns>();
  for (const checkIn of checkIns) {
    const entries = checkInsByDate.get(checkIn.localDate) ?? [];
    entries.push(checkIn);
    checkInsByDate.set(checkIn.localDate, entries);
  }

  let totalCompleted = 0;
  let totalScheduled = 0;
  let recordedDays = 0;
  const days = dateKeys.map((localDate) => {
    const entries = checkInsByDate.get(localDate) ?? [];
    const scheduledCount = habits.filter(
      (habit) =>
        habit.isActive &&
        localDateForTimeZone(habit.createdAt, user.timeZone) <= localDate &&
        isHabitScheduled(habit, localDate),
    ).length;
    const completedCount = entries.filter((entry) => entry.completed).length;
    const recorded = entries.length > 0;
    const percent = scheduledCount
      ? Math.round((completedCount / scheduledCount) * 100)
      : 0;
    totalCompleted += completedCount;
    totalScheduled += scheduledCount;
    if (recorded) recordedDays += 1;
    return {
      localDate,
      weekday: weekdayLabelForDateKey(localDate),
      scheduledCount,
      completedCount,
      recorded,
      percent,
    };
  });

  return {
    timeZone: user.timeZone,
    days,
    totalCompleted,
    totalScheduled,
    percent: totalScheduled
      ? Math.round((totalCompleted / totalScheduled) * 100)
      : 0,
    recordedDays,
  };
}
