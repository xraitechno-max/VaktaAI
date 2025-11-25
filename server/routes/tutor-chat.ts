import { Router, type Response } from 'express';
import { db } from '../db';
import { chats, messages, tutorSessions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { aiService } from '../openai';

const router = Router();

// Create tutor chat session
router.post('/chat', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { subject = 'Physics', topic = 'General' } = req.body;

    // Get user profile
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const chatId = nanoid();

    // Create chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      subject,
      topic,
      mode: 'tutor',
      language: userProfile.locale || 'en',
      title: `${subject}: ${topic}`,
    });

    // Session created via chat record - no separate tutor session needed

    // Greeting message
    const greeting = `Namaste! Main Mary hoon, tera AI Tutor. ${subject} ke bare mein aaj kya seekhna hai? 💡`;

    try {
      await db.insert(messages).values({
        id: nanoid(),
        chatId,
        role: 'assistant',
        content: greeting,
        metadata: {
          speakMeta: {
            persona: 'Mary',
            language: userProfile.locale || 'en',
          },
        },
      });
    } catch (err) {
      console.log('Message insert skipped');
    }

    res.json({ chatId });
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({ message: 'Failed to create chat' });
  }
});

// Get messages
router.get('/messages', async (req: any, res: Response) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ message: 'Missing chatId' });

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId as string),
    });

    res.json(chatMessages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Get AI response
router.post('/respond', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chatId, userMessage } = req.body;

    if (!userId || !chatId || !userMessage) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    // Save user message
    try {
      await db.insert(messages).values({
        id: nanoid(),
        chatId,
        role: 'user',
        content: userMessage,
      });
    } catch (err) {
      console.log('User message insert skipped');
    }

    // Get chat for context
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Get recent messages for context
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      limit: 10,
    });

    const conversationHistory = recentMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Get AI response
    const tutorResponse = await aiService
      .generateTutorResponse(
        chat.subject || 'General',
        'beginner',
        chat.topic || 'Learning',
        chat.language || 'en',
        conversationHistory,
        'teach'
      )
      .then((result: any) => result.explain || result)
      .catch(() => `That's a great question! Let me help you understand this concept step by step.`);

    // Save response
    try {
      await db.insert(messages).values({
        id: nanoid(),
        chatId,
        role: 'assistant',
        content: tutorResponse,
        metadata: {
          speakMeta: {
            persona: 'Mary',
            language: chat.language || 'en',
          },
        },
      });
    } catch (err) {
      console.log('Response message insert skipped');
    }

    res.json({ response: tutorResponse });
  } catch (error) {
    console.error('Tutor response error:', error);
    res.status(500).json({ message: 'Failed to generate response' });
  }
});

export default router;
