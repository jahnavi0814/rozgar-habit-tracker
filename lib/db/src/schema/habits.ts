import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const habitsTable = pgTable(
  "habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    frequency: text("frequency").notNull().default("daily"),
    // Monday = 0 through Sunday = 6, matching the frontend day picker.
    weekdays: integer("weekdays")
      .array()
      .notNull()
      .default(sql`'{}'::integer[]`),
    reminderTime: text("reminder_time"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("habits_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type Habit = typeof habitsTable.$inferSelect;
export type NewHabit = typeof habitsTable.$inferInsert;
