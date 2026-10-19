import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { habitsTable } from "./habits";
import { usersTable } from "./users";

export const checkInsTable = pgTable(
  "habit_checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habitsTable.id, { onDelete: "cascade" }),
    // A calendar date in the user's timezone, not a UTC timestamp.
    localDate: date("local_date", { mode: "string" }).notNull(),
    completed: boolean("completed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("habit_checkins_habit_local_date_unique").on(
      table.habitId,
      table.localDate,
    ),
    index("habit_checkins_user_date_idx").on(table.userId, table.localDate),
  ],
);

export type CheckIn = typeof checkInsTable.$inferSelect;
export type NewCheckIn = typeof checkInsTable.$inferInsert;
