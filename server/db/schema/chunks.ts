import { pgTable, text, timestamp, uuid, integer, jsonb, varchar, vector, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { documents } from './documents';

export const chunks = pgTable("chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  pageNumber: integer("page_number"),
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count"),
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI embedding dimension
  metadata: jsonb("metadata").$type<{
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table): any[] => [
  // Index for document chunks
  index("chunks_document_id_idx").on(table.documentId),
  // Index for chunk ordering
  index("chunks_document_chunk_idx").on(table.documentId, table.chunkIndex),
]);
