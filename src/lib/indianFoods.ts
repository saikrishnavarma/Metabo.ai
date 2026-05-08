import type { Food } from './db'

type IndianFood = Omit<Food, 'id' | 'createdAt' | 'externalId' | 'imageUrl'>

export const INDIAN_FOODS: IndianFood[] = [
  // ── South Indian ──
  { source: 'indian', name: 'Dosa (plain)',        brand: 'South Indian', kcalPer100g: 168, proteinPer100g: 4,  carbsPer100g: 27, fatPer100g: 5,  defaultPortionG: 120 },
  { source: 'indian', name: 'Masala Dosa',         brand: 'South Indian', kcalPer100g: 195, proteinPer100g: 5,  carbsPer100g: 29, fatPer100g: 7,  defaultPortionG: 200 },
  { source: 'indian', name: 'Idli',                brand: 'South Indian', kcalPer100g: 100, proteinPer100g: 4,  carbsPer100g: 20, fatPer100g: 0,  defaultPortionG: 80  },
  { source: 'indian', name: 'Medu Vada',           brand: 'South Indian', kcalPer100g: 260, proteinPer100g: 8,  carbsPer100g: 30, fatPer100g: 13, defaultPortionG: 60  },
  { source: 'indian', name: 'Sambar',              brand: 'South Indian', kcalPer100g: 50,  proteinPer100g: 3,  carbsPer100g: 7,  fatPer100g: 1,  defaultPortionG: 150 },
  { source: 'indian', name: 'Coconut Chutney',     brand: 'South Indian', kcalPer100g: 180, proteinPer100g: 2,  carbsPer100g: 8,  fatPer100g: 16, defaultPortionG: 30  },
  { source: 'indian', name: 'Ven Pongal',          brand: 'South Indian', kcalPer100g: 160, proteinPer100g: 5,  carbsPer100g: 27, fatPer100g: 4,  defaultPortionG: 200 },
  { source: 'indian', name: 'Rasam',               brand: 'South Indian', kcalPer100g: 30,  proteinPer100g: 1,  carbsPer100g: 5,  fatPer100g: 0,  defaultPortionG: 150 },
  { source: 'indian', name: 'Upma',                brand: 'South Indian', kcalPer100g: 120, proteinPer100g: 3,  carbsPer100g: 21, fatPer100g: 3,  defaultPortionG: 200 },
  // ── Rice & Breads ──
  { source: 'indian', name: 'Steamed Rice',        brand: 'Staple',       kcalPer100g: 130, proteinPer100g: 3,  carbsPer100g: 29, fatPer100g: 0,  defaultPortionG: 200 },
  { source: 'indian', name: 'Chapati / Roti',      brand: 'Staple',       kcalPer100g: 297, proteinPer100g: 10, carbsPer100g: 56, fatPer100g: 4,  defaultPortionG: 30  },
  { source: 'indian', name: 'Paratha (plain)',      brand: 'Staple',       kcalPer100g: 350, proteinPer100g: 8,  carbsPer100g: 57, fatPer100g: 10, defaultPortionG: 60  },
  { source: 'indian', name: 'Aloo Paratha',        brand: 'Staple',       kcalPer100g: 315, proteinPer100g: 7,  carbsPer100g: 52, fatPer100g: 9,  defaultPortionG: 90  },
  { source: 'indian', name: 'Poha',                brand: 'Breakfast',    kcalPer100g: 110, proteinPer100g: 3,  carbsPer100g: 24, fatPer100g: 1,  defaultPortionG: 200 },
  { source: 'indian', name: 'Vegetable Pulao',     brand: 'Rice',         kcalPer100g: 180, proteinPer100g: 4,  carbsPer100g: 34, fatPer100g: 3,  defaultPortionG: 250 },
  { source: 'indian', name: 'Chicken Biryani',     brand: 'Rice',         kcalPer100g: 250, proteinPer100g: 15, carbsPer100g: 28, fatPer100g: 8,  defaultPortionG: 350 },
  { source: 'indian', name: 'Mutton Biryani',      brand: 'Rice',         kcalPer100g: 280, proteinPer100g: 16, carbsPer100g: 27, fatPer100g: 11, defaultPortionG: 350 },
  { source: 'indian', name: 'Khichdi',             brand: 'Comfort',      kcalPer100g: 120, proteinPer100g: 5,  carbsPer100g: 22, fatPer100g: 2,  defaultPortionG: 250 },
  // ── Dal & Legumes ──
  { source: 'indian', name: 'Dal Tadka',           brand: 'Dal',          kcalPer100g: 110, proteinPer100g: 7,  carbsPer100g: 16, fatPer100g: 2,  defaultPortionG: 200 },
  { source: 'indian', name: 'Dal Makhani',         brand: 'Dal',          kcalPer100g: 140, proteinPer100g: 7,  carbsPer100g: 17, fatPer100g: 5,  defaultPortionG: 200 },
  { source: 'indian', name: 'Rajma Masala',        brand: 'Dal',          kcalPer100g: 127, proteinPer100g: 8,  carbsPer100g: 22, fatPer100g: 1,  defaultPortionG: 200 },
  { source: 'indian', name: 'Chole Masala',        brand: 'Dal',          kcalPer100g: 164, proteinPer100g: 9,  carbsPer100g: 27, fatPer100g: 3,  defaultPortionG: 200 },
  { source: 'indian', name: 'Palak Dal',           brand: 'Dal',          kcalPer100g: 80,  proteinPer100g: 5,  carbsPer100g: 12, fatPer100g: 1,  defaultPortionG: 200 },
  // ── Veg Curries ──
  { source: 'indian', name: 'Aloo Sabzi',          brand: 'Veg Curry',    kcalPer100g: 90,  proteinPer100g: 2,  carbsPer100g: 16, fatPer100g: 2,  defaultPortionG: 150 },
  { source: 'indian', name: 'Paneer Butter Masala',brand: 'Veg Curry',    kcalPer100g: 200, proteinPer100g: 9,  carbsPer100g: 8,  fatPer100g: 15, defaultPortionG: 200 },
  { source: 'indian', name: 'Palak Paneer',        brand: 'Veg Curry',    kcalPer100g: 150, proteinPer100g: 8,  carbsPer100g: 6,  fatPer100g: 10, defaultPortionG: 200 },
  { source: 'indian', name: 'Paneer (raw)',        brand: 'Dairy',        kcalPer100g: 265, proteinPer100g: 18, carbsPer100g: 4,  fatPer100g: 20, defaultPortionG: 100 },
  { source: 'indian', name: 'Mixed Veg Curry',     brand: 'Veg Curry',    kcalPer100g: 70,  proteinPer100g: 3,  carbsPer100g: 10, fatPer100g: 2,  defaultPortionG: 150 },
  // ── Non-Veg ──
  { source: 'indian', name: 'Chicken Curry',       brand: 'Non-Veg',      kcalPer100g: 150, proteinPer100g: 17, carbsPer100g: 5,  fatPer100g: 7,  defaultPortionG: 200 },
  { source: 'indian', name: 'Butter Chicken',      brand: 'Non-Veg',      kcalPer100g: 175, proteinPer100g: 15, carbsPer100g: 7,  fatPer100g: 10, defaultPortionG: 200 },
  { source: 'indian', name: 'Egg Bhurji',          brand: 'Non-Veg',      kcalPer100g: 180, proteinPer100g: 13, carbsPer100g: 3,  fatPer100g: 13, defaultPortionG: 150 },
  { source: 'indian', name: 'Fish Curry',          brand: 'Non-Veg',      kcalPer100g: 120, proteinPer100g: 15, carbsPer100g: 4,  fatPer100g: 5,  defaultPortionG: 200 },
  { source: 'indian', name: 'Mutton Curry',        brand: 'Non-Veg',      kcalPer100g: 190, proteinPer100g: 18, carbsPer100g: 4,  fatPer100g: 11, defaultPortionG: 200 },
  // ── Street Food & Snacks ──
  { source: 'indian', name: 'Samosa',              brand: 'Snack',        kcalPer100g: 300, proteinPer100g: 6,  carbsPer100g: 35, fatPer100g: 15, defaultPortionG: 100 },
  { source: 'indian', name: 'Vada Pav',            brand: 'Snack',        kcalPer100g: 265, proteinPer100g: 7,  carbsPer100g: 42, fatPer100g: 8,  defaultPortionG: 150 },
  { source: 'indian', name: 'Pav Bhaji',           brand: 'Street Food',  kcalPer100g: 155, proteinPer100g: 4,  carbsPer100g: 25, fatPer100g: 5,  defaultPortionG: 300 },
  { source: 'indian', name: 'Bhel Puri',           brand: 'Chaat',        kcalPer100g: 210, proteinPer100g: 5,  carbsPer100g: 40, fatPer100g: 4,  defaultPortionG: 100 },
  { source: 'indian', name: 'Pani Puri (6 pcs)',   brand: 'Chaat',        kcalPer100g: 200, proteinPer100g: 4,  carbsPer100g: 35, fatPer100g: 5,  defaultPortionG: 100 },
  // ── Dairy & Drinks ──
  { source: 'indian', name: 'Dahi (Curd)',         brand: 'Dairy',        kcalPer100g: 61,  proteinPer100g: 3,  carbsPer100g: 5,  fatPer100g: 3,  defaultPortionG: 150 },
  { source: 'indian', name: 'Sweet Lassi',         brand: 'Drink',        kcalPer100g: 80,  proteinPer100g: 4,  carbsPer100g: 12, fatPer100g: 2,  defaultPortionG: 300 },
  { source: 'indian', name: 'Masala Chai',         brand: 'Drink',        kcalPer100g: 40,  proteinPer100g: 2,  carbsPer100g: 5,  fatPer100g: 1,  defaultPortionG: 150 },
  { source: 'indian', name: 'Mango Lassi',         brand: 'Drink',        kcalPer100g: 90,  proteinPer100g: 3,  carbsPer100g: 15, fatPer100g: 2,  defaultPortionG: 300 },
]

export const INDIAN_FOOD_CATEGORIES = [
  'All', 'South Indian', 'Staple', 'Breakfast', 'Rice', 'Dal', 'Veg Curry', 'Non-Veg', 'Snack', 'Dairy', 'Drink'
]
