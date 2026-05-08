import type { MealType } from './db'

export interface DetectedFood {
  name: string
  portionG: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  mealType: MealType
}

export interface AIResponse {
  message: string
  foods: DetectedFood[]
  question: string | null
  type: 'food_log' | 'chat' | 'coaching' | 'analysis'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are Metabo.ai — a premium, intelligent personal metabolism and nutrition companion.
You deeply understand Indian and global foods.

When the user mentions eating food, respond ONLY in this exact JSON format (no markdown, no explanation outside JSON):
{
  "message": "conversational response (1-2 sentences, warm and personal)",
  "foods": [
    {
      "name": "exact food name",
      "portionG": 150,
      "kcal": 250,
      "protein": 12,
      "carbs": 30,
      "fat": 8,
      "mealType": "lunch"
    }
  ],
  "question": "a single clarifying question if needed, or null",
  "type": "food_log"
}

When just chatting (no food), respond as:
{
  "message": "your response",
  "foods": [],
  "question": null,
  "type": "chat"
}

Indian food calorie knowledge (per 100g unless noted):
- Dosa plain (1 piece ~120g): 168 kcal, P:4, C:27, F:5
- Masala dosa (~200g): 195 kcal/100g, P:5, C:29, F:7
- Idli (1 piece ~40g): 100 kcal/100g, P:4, C:20, F:0
- Vada (1 piece ~60g): 260 kcal/100g, P:8, C:30, F:13
- Rice (cooked, 1 cup ~200g): 130 kcal/100g, P:3, C:29, F:0
- Chapati/roti (1 ~30g): 297 kcal/100g, P:10, C:56, F:4
- Paratha (1 ~60g): 350 kcal/100g, P:8, C:57, F:10
- Dal tadka (1 bowl ~200g): 110 kcal/100g, P:7, C:16, F:2
- Dal makhani: 140 kcal/100g, P:7, C:17, F:5
- Rajma: 127 kcal/100g, P:8, C:22, F:1
- Chole: 164 kcal/100g, P:9, C:27, F:3
- Chicken biryani (1 plate ~350g): 250 kcal/100g, P:15, C:28, F:8
- Chicken curry (1 bowl ~200g): 150 kcal/100g, P:17, C:5, F:7
- Butter chicken: 175 kcal/100g, P:15, C:7, F:10
- Paneer (100g raw): 265 kcal, P:18, C:4, F:20
- Paneer butter masala (1 bowl): 200 kcal/100g, P:9, C:8, F:15
- Samosa (1 ~100g): 300 kcal/100g, P:6, C:35, F:15
- Vada pav (1): 265 kcal/100g, P:7, C:42, F:8
- Egg bhurji (2 eggs ~150g): 180 kcal/100g, P:13, C:3, F:13
- Upma (1 bowl ~200g): 120 kcal/100g, P:3, C:21, F:3
- Poha (1 plate ~200g): 110 kcal/100g, P:3, C:24, F:1
- Dahi/curd (100g): 61 kcal, P:3, C:5, F:3
- Masala chai (1 cup ~150ml): 40 kcal/100ml, P:2, C:5, F:1

Restaurant food is ~30–40% more calories than homemade.

Rules:
- Always ask: "Was it homemade or from a restaurant?" if unclear
- Ask portion size if unclear (e.g., "How many chapatis?")
- Be encouraging and brief — never lecture
- If they tell you their weight/goals/workouts, give smart coaching
- Mealtype guess: before 11am=breakfast, 11-15=lunch, 15-18=snack, 18-21=dinner, after 21=snack`

export async function sendMessage(
  messages: ChatMessage[],
  apiKey: string,
): Promise<AIResponse> {
  const res = await fetch('/api/claude/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? '{}'

  try {
    // Strip markdown fences
    let clean = text.replace(/```json\n?|\n?```/g, '').trim()
    // If there's text before the JSON object, extract just the object
    const jsonStart = clean.indexOf('{')
    const jsonEnd   = clean.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      clean = clean.slice(jsonStart, jsonEnd + 1)
    }
    return JSON.parse(clean) as AIResponse
  } catch {
    // Try one more time: find any JSON-looking block
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as AIResponse } catch { /* fall through */ }
    }
    return { message: text, foods: [], question: null, type: 'chat' }
  }
}
