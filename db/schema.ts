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

export const institutionalDeals = sqliteTable("institutional_deals", {
  id: text("id").primaryKey(),
  hotelId: text("hotel_id").notNull(),
  hotelName: text("hotel_name").notNull(),
  stage: text("stage").notNull(),
  modelJson: text("model_json").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  ownerName: text("owner_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const dealEvents = sqliteTable("deal_events", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  stage: text("stage"),
  createdAt: text("created_at").notNull(),
});

export const dealDocuments = sqliteTable("deal_documents", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull(),
  uploaderUserId: text("uploader_user_id").notNull(),
  uploaderName: text("uploader_name").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  r2Key: text("r2_key").notNull(),
  createdAt: text("created_at").notNull(),
});
