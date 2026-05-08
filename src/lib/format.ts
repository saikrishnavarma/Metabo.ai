export function fmtKcal(kcal: number): string {
  return `${Math.round(kcal)} kcal`
}

export function macrosForPortion(
  food: { kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number },
  portionG: number
) {
  const f = portionG / 100
  return {
    kcal:    food.kcalPer100g    * f,
    protein: food.proteinPer100g * f,
    carbs:   food.carbsPer100g   * f,
    fat:     food.fatPer100g     * f
  }
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
