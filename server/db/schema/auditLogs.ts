import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(),
  resource: varchar("resource").notNull(),
  resourceId: varchar("resource_id"),
  details: jsonb("details").$type<{
    [key: string]: any;
  }>(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table): any[] => [
  // Index for user audit logs
  index("audit_logs_user_id_idx").on(table.userId),
  // Index for action
  index("audit_logs_action_idx").on(table.action),
  // Index for resource
  index("audit_logs_resource_idx").on(table.resource),
  // Index for timestamp
  index("audit_logs_timestamp_idx").on(table.timestamp),
]);
