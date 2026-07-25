import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const memberVisits = sqliteTable("member_visits", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  username: text("username"),
  displayName: text("display_name"),
  email: text("email"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  visitCount: integer("visit_count").notNull().default(1),
  status: text("status").notNull().default("active"),
});
