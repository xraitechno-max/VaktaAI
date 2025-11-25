import { pgTable, text, timestamp, uuid, integer, jsonb, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  subject: varchar("subject").notNull(),
  level: varchar("level"),
  topic: varchar("topic").notNull(),
  currentPhase: varchar("current_phase").default('diagnostic'),
  phaseStep: integer("phase_step").default(0),
  progress: integer("progress").default(0),
  personaId: varchar("persona_id").notNull(),
  adaptiveMetrics: jsonb("adaptive_metrics").$type<{
    diagnosticScore?: number;
    checkpointsPassed?: number;
    hintsUsed?: number;
    misconceptions?: string[];
    strongConcepts?: string[];
  }>(),
  profileSnapshot: jsonb("profile_snapshot").$type<{
    [key: string]: any;
  }>(),
  voiceEnabled: boolean("voice_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user chats
  index("chats_user_id_idx").on(table.userId),
  // Index for chat ordering
  index("chats_user_created_idx").on(table.userId, table.createdAt),
]);
