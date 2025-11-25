import { pgTable, text, timestamp, uuid, integer, vector, varchar, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { chunks } from './chunks';

export const embeddings = pgTable("embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chunkId: varchar("chunk_id").references(() => chunks.id, { onDelete: "cascade" }).notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  model: varchar("model").notNull().default('text-embedding-3-small'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table): any[] => [
  // Index for chunk embeddings
  index("embeddings_chunk_id_idx").on(table.chunkId),
  // Index for model
  index("embeddings_model_idx").on(table.model),
]);
