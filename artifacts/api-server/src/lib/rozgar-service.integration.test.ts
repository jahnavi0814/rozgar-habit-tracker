import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { checkInsTable, db, usersTable } from "@workspace/db";
import {
  createHabit,
  deleteHabit,
  ensureUser,
  getHabit,
  getProfile,
  getWeeklyProgress,
  listHabits,
  setHabitCheckIn,
  updateHabit,
  updateProfile,
} from "./rozgar-service";

test("database operations persist data, keep check-ins unique, and isolate users", async () => {
  const ownerId = `test_${randomUUID()}`;
  const otherId = `test_${randomUUID()}`;

  try {
    await ensureUser(ownerId, "Asia/Kolkata");
    await ensureUser(otherId, "UTC");
    const profile = await getProfile(ownerId);
    assert.equal(profile.timeZone, "Asia/Kolkata");

    const updatedProfile = await updateProfile(ownerId, {
      displayName: "Rozgar Integration Test",
      remindersEnabled: true,
    });
    assert.equal(updatedProfile.displayName, "Rozgar Integration Test");
    assert.equal(updatedProfile.remindersEnabled, true);

    const habit = await createHabit(ownerId, {
      name: "Test morning walk",
      description: "Temporary integration-test record",
      frequency: "daily",
      weekdays: [],
      reminderTime: null,
    });
    assert.equal(habit.isActive, true);
    assert.equal(habit.completedToday, false);

    const renamed = await updateHabit(ownerId, habit.id, {
      name: "Updated morning walk",
    });
    assert.equal(renamed?.name, "Updated morning walk");

    const paused = await updateHabit(ownerId, habit.id, { isActive: false });
    assert.equal(paused?.isActive, false);
    const resumed = await updateHabit(ownerId, habit.id, { isActive: true });
    assert.equal(resumed?.isActive, true);

    const firstCheckIn = await setHabitCheckIn(ownerId, habit.id, true);
    assert.ok(firstCheckIn);
    const changedCheckIn = await setHabitCheckIn(ownerId, habit.id, false);
    assert.ok(changedCheckIn);
    const completedCheckIn = await setHabitCheckIn(ownerId, habit.id, true);
    assert.ok(completedCheckIn);
    assert.equal(completedCheckIn.localDate, firstCheckIn.localDate);

    const sameDateRows = await db
      .select({ id: checkInsTable.id })
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.userId, ownerId),
          eq(checkInsTable.habitId, habit.id),
          eq(checkInsTable.localDate, completedCheckIn.localDate),
        ),
      );
    assert.equal(sameDateRows.length, 1);

    const ownerHabits = await listHabits(ownerId);
    assert.equal(ownerHabits.length, 1);
    assert.equal(ownerHabits[0].completedToday, true);
    assert.equal((await getHabit(ownerId, habit.id))?.name, "Updated morning walk");

    const progress = await getWeeklyProgress(ownerId);
    assert.equal(progress.days.length, 7);
    const checkInDay = progress.days.find(
      (day) => day.localDate === completedCheckIn.localDate,
    );
    assert.ok(checkInDay);
    assert.equal(checkInDay.recorded, true);
    assert.equal(checkInDay.completedCount, 1);

    assert.equal((await listHabits(otherId)).length, 0);
    assert.equal(await getHabit(otherId, habit.id), null);
    assert.equal(
      await updateHabit(otherId, habit.id, { name: "Unauthorized edit" }),
      null,
    );
    assert.equal(await setHabitCheckIn(otherId, habit.id, true), null);
    assert.equal(await deleteHabit(otherId, habit.id), false);
    assert.equal((await getHabit(ownerId, habit.id))?.name, "Updated morning walk");

    await assert.rejects(
      createHabit(ownerId, {
        name: "Invalid schedule",
        frequency: "weekdays",
        weekdays: [],
      }),
    );

    assert.equal(await deleteHabit(ownerId, habit.id), true);
    const remainingCheckIns = await db
      .select({ id: checkInsTable.id })
      .from(checkInsTable)
      .where(eq(checkInsTable.habitId, habit.id));
    assert.equal(remainingCheckIns.length, 0);
  } finally {
    await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
  }
});
