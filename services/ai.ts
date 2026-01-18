export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const API_BASE_URL = 'https://llm.meirl.dev/v1';
const API_KEY = 'syed';
const MODEL_ID = 'qwen3-coder-30B-instruct';

export async function sendAIRequest(messages: AIChatMessage[]): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API Error:', response.status, errorText);
      throw new Error(`AI Request failed: ${response.status}`);
    }

    const data: AIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI Service Exception:', error);
    throw error;
  }
}
