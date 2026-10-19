import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  // Clerk is the identity provider; this is its verified subject ID.
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  timeZone: text("time_zone").notNull().default("UTC"),
  remindersEnabled: boolean("reminders_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
