import type { Food } from '../db'

// Free DEMO_KEY works with rate limits (1000 req/hour). User can get their own at api.nal.usda.gov
const API_KEY = 'DEMO_KEY'
const BASE    = '/api/usda/fdc/v1'

// USDA nutrient IDs
const NID_KCAL   = 1008
const NID_PROTEIN = 1003
const NID_CARBS  = 1005
const NID_FAT    = 1004

export interface USDAFood {
  fdcId: number
  description: string
  brandOwner?: string
  dataType: string
  foodNutrients: { nutrientId: number; value: number }[]
}

interface USDASearchResponse {
  foods: USDAFood[]
  totalHits: number
}

export async function searchUSDA(query: string, signal?: AbortSignal): Promise<USDAFood[]> {
  if (!query.trim()) return []
  const url = new URL(`${BASE}/foods/search`)
  url.searchParams.set('query', query)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('pageSize', '15')
  // Prefer Foundation & SR Legacy (raw foods) then Branded
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`)
  const data: USDASearchResponse = await res.json()
  return (data.foods ?? []).filter(f => getNutrient(f, NID_KCAL) > 0)
}

function getNutrient(food: USDAFood, id: number): number {
  return food.foodNutrients.find(n => n.nutrientId === id)?.value ?? 0
}

export function usdaToFood(f: USDAFood): Omit<Food, 'id' | 'createdAt'> {
  return {
    source: 'usda',
    externalId: `usda-${f.fdcId}`,
    name: toTitleCase(f.description),
    brand: f.brandOwner,
    kcalPer100g:    getNutrient(f, NID_KCAL),
    proteinPer100g: getNutrient(f, NID_PROTEIN),
    carbsPer100g:   getNutrient(f, NID_CARBS),
    fatPer100g:     getNutrient(f, NID_FAT),
    defaultPortionG: 100,
  }
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
