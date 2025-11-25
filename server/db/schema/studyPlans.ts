import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const studyPlans = pgTable("study_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  subject: varchar("subject").notNull(),
  level: varchar("level"),
  duration: integer("duration"), // in days
  topics: jsonb("topics").$type<{
    topic: string;
    estimatedTime: number;
    completed: boolean;
  }[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user study plans
  index("study_plans_user_id_idx").on(table.userId),
  // Index for active plans
  index("study_plans_active_idx").on(table.isActive),
]);
