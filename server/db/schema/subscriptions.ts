import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  plan: varchar("plan").notNull(), // 'free', 'premium', 'enterprise'
  status: varchar("status").notNull(), // 'active', 'cancelled', 'expired'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  features: jsonb("features").$type<string[]>(),
  usage: jsonb("usage").$type<{
    documents: number;
    sessions: number;
    storage: number;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user subscriptions
  index("subscriptions_user_id_idx").on(table.userId),
  // Index for plan
  index("subscriptions_plan_idx").on(table.plan),
  // Index for status
  index("subscriptions_status_idx").on(table.status),
]);
