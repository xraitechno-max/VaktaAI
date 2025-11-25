import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventType: varchar("event_type").notNull(),
  eventData: jsonb("event_data").$type<{
    [key: string]: any;
  }>(),
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata").$type<{
    [key: string]: any;
  }>(),
}, (table): any[] => [
  // Index for user analytics
  index("analytics_user_id_idx").on(table.userId),
  // Index for event type
  index("analytics_event_type_idx").on(table.eventType),
  // Index for timestamp
  index("analytics_timestamp_idx").on(table.timestamp),
]);
