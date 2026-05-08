/**
 * OpenFoodFacts API client.
 * No API key required. Be polite with a UA string per their guidelines.
 *
 * Docs:
 *   https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
import type { Food } from '../db'

const UA = 'SnapBite/0.1 (https://github.com/example/snapbite)'

export interface OFFProduct {
  code: string
  product_name?: string
  product_name_en?: string
  brands?: string
  image_front_small_url?: string
  image_url?: string
  serving_quantity?: string | number
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

interface OFFSearchResponse {
  products: OFFProduct[]
  count: number
}

interface OFFProductResponse {
  status: 0 | 1
  product?: OFFProduct
}

/* ---- Search by text ---- */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<OFFProduct[]> {
  if (!query.trim()) return []
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '20')
  url.searchParams.set('fields',
    'code,product_name,product_name_en,brands,image_front_small_url,image_url,nutriments,serving_quantity')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`OFF search failed: ${res.status}`)
  const data: OFFSearchResponse = await res.json()
  return (data.products ?? []).filter(hasNutrition)
}

/* ---- Lookup by barcode ---- */
export async function lookupBarcode(code: string): Promise<OFFProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data: OFFProductResponse = await res.json()
  if (data.status !== 1 || !data.product) return null
  return hasNutrition(data.product) ? data.product : null
}

/* ---- Mappers ---- */
export function offToFood(p: OFFProduct): Omit<Food, 'id' | 'createdAt'> {
  const n = p.nutriments ?? {}
  const portion = Number(p.serving_quantity) || 100
  return {
    source: 'off',
    externalId: p.code,
    name: p.product_name_en || p.product_name || 'Unknown',
    brand: p.brands?.split(',')[0]?.trim(),
    imageUrl: p.image_front_small_url || p.image_url,
    kcalPer100g:    Number(n['energy-kcal_100g']) || 0,
    proteinPer100g: Number(n.proteins_100g) || 0,
    carbsPer100g:   Number(n.carbohydrates_100g) || 0,
    fatPer100g:     Number(n.fat_100g) || 0,
    defaultPortionG: portion
  }
}

function hasNutrition(p: OFFProduct): boolean {
  const k = p.nutriments?.['energy-kcal_100g']
  return typeof k === 'number' && k > 0
}
