import axios from 'axios';
import { DifyResponse } from '../types';

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY!;

export async function sendMessageToDify(
  message: string,
  userId: string,
  conversationId?: string
): Promise<DifyResponse> {
  try {
    const response = await axios.post(
      `${DIFY_API_URL}/chat-messages`,
      {
        inputs: {},
        query: message,
        response_mode: 'blocking',
        conversation_id: conversationId,
        user: userId,
      },
      {
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      conversation_id: response.data.conversation_id,
      message_id: response.data.message_id,
      answer: response.data.answer,
    };
  } catch (error) {
    console.error('Error sending message to Dify:', error);
    throw new Error('Failed to process message with AI');
  }
}