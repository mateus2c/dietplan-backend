import { Food } from '../enums/food.enum';

export interface FoodData {
  id: Food;
  name: string;
  macrosPer100g: {
    protein: number;
    carbs: number;
    fat: number;
    kcal: number;
  };
}

export const FOOD_DATA: Record<Food, FoodData> = {
  [Food.CHICKEN_BREAST]: {
    id: Food.CHICKEN_BREAST,
    name: 'Peito de frango cozido',
    macrosPer100g: { protein: 31, carbs: 0, fat: 3.6, kcal: 165 },
  },
  [Food.BOILED_EGG]: {
    id: Food.BOILED_EGG,
    name: 'Ovo cozido',
    macrosPer100g: { protein: 13, carbs: 1.1, fat: 11, kcal: 155 },
  },
  [Food.BROWN_RICE_COOKED]: {
    id: Food.BROWN_RICE_COOKED,
    name: 'Arroz integral cozido',
    macrosPer100g: { protein: 2.6, carbs: 23, fat: 0.9, kcal: 111 },
  },
  [Food.BLACK_BEANS_COOKED]: {
    id: Food.BLACK_BEANS_COOKED,
    name: 'Feijão preto cozido',
    macrosPer100g: { protein: 8.9, carbs: 23.7, fat: 0.5, kcal: 132 },
  },
  [Food.OATS]: {
    id: Food.OATS,
    name: 'Aveia',
    macrosPer100g: { protein: 16.9, carbs: 66.3, fat: 6.9, kcal: 389 },
  },
  [Food.BANANA]: {
    id: Food.BANANA,
    name: 'Banana',
    macrosPer100g: { protein: 1.1, carbs: 22.8, fat: 0.3, kcal: 96 },
  },
  [Food.APPLE]: {
    id: Food.APPLE,
    name: 'Maçã',
    macrosPer100g: { protein: 0.3, carbs: 13.8, fat: 0.2, kcal: 52 },
  },
  [Food.SWEET_POTATO_COOKED]: {
    id: Food.SWEET_POTATO_COOKED,
    name: 'Batata doce cozida',
    macrosPer100g: { protein: 1.6, carbs: 20.1, fat: 0.1, kcal: 86 },
  },
  [Food.SALMON_GRILLED]: {
    id: Food.SALMON_GRILLED,
    name: 'Salmão grelhado',
    macrosPer100g: { protein: 22, carbs: 0, fat: 12, kcal: 208 },
  },
  [Food.TUNA_CANNED_WATER]: {
    id: Food.TUNA_CANNED_WATER,
    name: 'Atum enlatado em água',
    macrosPer100g: { protein: 23.6, carbs: 0, fat: 0.8, kcal: 109 },
  },
  [Food.COTTAGE_CHEESE]: {
    id: Food.COTTAGE_CHEESE,
    name: 'Queijo cottage',
    macrosPer100g: { protein: 11.1, carbs: 3.4, fat: 4.3, kcal: 98 },
  },
  [Food.GREEK_YOGURT_PLAIN]: {
    id: Food.GREEK_YOGURT_PLAIN,
    name: 'Iogurte grego natural',
    macrosPer100g: { protein: 10, carbs: 3.6, fat: 4, kcal: 97 },
  },
  [Food.QUINOA_COOKED]: {
    id: Food.QUINOA_COOKED,
    name: 'Quinoa cozida',
    macrosPer100g: { protein: 4.4, carbs: 21.3, fat: 1.9, kcal: 120 },
  },
  [Food.BROCCOLI_COOKED]: {
    id: Food.BROCCOLI_COOKED,
    name: 'Brócolis cozido',
    macrosPer100g: { protein: 2.8, carbs: 7, fat: 0.4, kcal: 35 },
  },
  [Food.ALMONDS]: {
    id: Food.ALMONDS,
    name: 'Amêndoas',
    macrosPer100g: { protein: 21.2, carbs: 21.7, fat: 49.9, kcal: 579 },
  },
  [Food.AVOCADO]: {
    id: Food.AVOCADO,
    name: 'Abacate',
    macrosPer100g: { protein: 2, carbs: 8.5, fat: 14.7, kcal: 160 },
  },
  [Food.WHOLE_WHEAT_BREAD]: {
    id: Food.WHOLE_WHEAT_BREAD,
    name: 'Pão integral',
    macrosPer100g: { protein: 13, carbs: 41, fat: 4.2, kcal: 247 },
  },
  [Food.SKIM_MILK]: {
    id: Food.SKIM_MILK,
    name: 'Leite desnatado',
    macrosPer100g: { protein: 3.4, carbs: 5, fat: 0.2, kcal: 35 },
  },
  [Food.LENTILS_COOKED]: {
    id: Food.LENTILS_COOKED,
    name: 'Lentilha cozida',
    macrosPer100g: { protein: 9, carbs: 20, fat: 0.4, kcal: 116 },
  },
  [Food.OLIVE_OIL]: {
    id: Food.OLIVE_OIL,
    name: 'Azeite de oliva',
    macrosPer100g: { protein: 0, carbs: 0, fat: 100, kcal: 884 },
  },
};

// Helper function to get food data by ID
export function getFoodData(foodId: Food): FoodData | undefined {
  return FOOD_DATA[foodId];
}

// Helper function to get all foods as array
export function getAllFoods(): FoodData[] {
  return Object.values(FOOD_DATA);
}
