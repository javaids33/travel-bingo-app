import { AIChatMessage, sendAIRequest } from './ai';

export interface BingoTask {
    task_name: string;
    description: string;
    coordinates?: {
        lat: number;
        long: number;
    };
}

export interface ValidationResult {
    verified: boolean;
    reason: string;
}

export const AIAgent = {
    /**
     * Generates 25 unique exploration tasks for a specific location.
     */
    async generateBingoCard(location: string): Promise<BingoTask[]> {
        const systemPrompt = `You are a local travel guide. Return valid JSON only. Generate 25 unique exploration tasks for ${location}. Include 'task_name', 'description', and estimated 'lat/long' coordinates if specific. The output must be a RAW JSON array of objects, no markdown formatting.`;

        const messages: AIChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate tasks for ${location}` }
        ];

        try {
            const result = await sendAIRequest(messages);
            // Clean up potential markdown code blocks if the LLM includes them
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const tasks: BingoTask[] = JSON.parse(cleanJson);
            return tasks.slice(0, 25); // Ensure exactly 25
        } catch (error) {
            console.error('Error generating bingo card:', error);
            throw new Error('Failed to generate bingo card.');
        }
    },

    /**
     * Validates a photo submission against a task description.
     * Note: This assumes the custom LLM has vision capabilities or logic to handle image URLs.
     * If the model is text-only, this relies on the model interpreting the URL or metadata (mostly effective with Vision models).
     */
    async validateSubmission(imageUrl: string, taskDescription: string): Promise<ValidationResult> {
        const prompt = `Analyze this image URL: ${imageUrl}. Does it match the description '${taskDescription}'? Return JSON: { "verified": boolean, "reason": "string" }. Return valid JSON only.`;

        const messages: AIChatMessage[] = [
            { role: 'user', content: prompt }
        ];

        try {
            const result = await sendAIRequest(messages);
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error('Error validating submission:', error);
            // Fallback or default behavior could be defined here
            return { verified: false, reason: "AI validation failed." };
        }
    }
};
