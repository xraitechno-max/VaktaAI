import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const tutorSessions = pgTable("tutor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subject: varchar("subject").notNull(),
  level: varchar("level"),
  topic: varchar("topic").notNull(),
  personaId: varchar("persona_id").notNull(),
  progress: integer("progress").default(0),
  adaptiveMetrics: jsonb("adaptive_metrics").$type<{
    diagnosticScore?: number;
    checkpointsPassed?: number;
    hintsUsed?: number;
    misconceptions?: string[];
    strongConcepts?: string[];
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user sessions
  index("tutor_sessions_user_id_idx").on(table.userId),
  // Index for active sessions
  index("tutor_sessions_active_idx").on(table.isActive),
]);
