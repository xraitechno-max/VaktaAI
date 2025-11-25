import { pgTable, text, timestamp, uuid, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { chats } from './chats';

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    speakSSML?: string;
    speakMeta?: {
      persona?: 'Priya' | 'Amit';
      language?: 'en' | 'hi' | 'hinglish';
      avg_wpm?: number;
      segments?: {
        text: string;
        start: number;
        end: number;
      }[];
    };
    citations?: string[];
    confidence?: number;
    toolUsed?: string;
    regenerated?: boolean;
    emotionDetected?: string;
    languageDetected?: string;
    [key: string]: any;
  }>(),
  tool: varchar("tool"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table): any[] => [
  // Index for chat messages
  index("messages_chat_id_idx").on(table.chatId),
  // Index for message ordering
  index("messages_chat_created_idx").on(table.chatId, table.createdAt),
]);
