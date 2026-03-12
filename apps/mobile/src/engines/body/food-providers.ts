import { USDA_API_BASE, USDA_API_KEY, EDAMAM_APP_ID, EDAMAM_APP_KEY } from '@/constants';

export type FoodProviderId = 'local' | 'open_food_facts' | 'usda' | 'edamam';

export interface FoodNutrient {
  key: string;
  label: string;
  unit: string;
  amount_per_100g: number;
}

export interface FoodNutritionDetails {
  source: FoodProviderId;
  nutrients: FoodNutrient[];
}

export interface FoodSearchResult {
  id: string;
  provider: FoodProviderId;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  nutrition_details?: FoodNutritionDetails | null;
}

export interface FoodSearchOptions {
  preferGeneric?: boolean;
}

export interface FoodSearchProvider {
  id: FoodProviderId;
  search: (query: string, limit: number, options?: FoodSearchOptions) => Promise<FoodSearchResult[]>;
  lookupBarcode?: (barcode: string) => Promise<FoodSearchResult | null>;
  getDetails?: (food: FoodSearchResult) => Promise<FoodNutritionDetails | null>;
}

export const FOOD_SEARCH_PROVIDERS: FoodSearchProvider[] = [];

// ─── Open Food Facts ──────────────────────────────────────────────────────────
// 2.8M+ products globally. No API key required. Best free source for branded/
// supermarket foods. Uses the new Meilisearch-backed search API for much better
// relevance than the old CGI endpoint.

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    energy_100g?: number;          // kJ — fallback when kcal fields are absent
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
}

interface OFFSearchResponse {
  hits?: OFFProduct[];      // new Meilisearch endpoint (search.openfoodfacts.org)
  products?: OFFProduct[];  // legacy CGI endpoint fallback
}

function mapOFFProduct(product: OFFProduct): FoodSearchResult | null {
  const name = (product.product_name_en ?? product.product_name ?? '').trim();
  if (!name) return null;

  const barcode = product.code?.trim() || null;
  const id = barcode ?? name.toLowerCase();

  const n = product.nutriments;

  // Calories: prefer kcal_100g → kcal (per-serving as fallback) → convert from kJ
  let calories: number | null = n?.['energy-kcal_100g'] ?? null;
  if (calories === null && n?.['energy-kcal'] != null) calories = n['energy-kcal'];
  if (calories === null && n?.energy_100g != null) calories = Math.round(n.energy_100g / 4.184);

  const detailNutrients: FoodNutrient[] = [
    n?.fiber_100g != null ? { key: 'fiber', label: 'Fiber', unit: 'g', amount_per_100g: n.fiber_100g } : null,
    n?.sugars_100g != null ? { key: 'sugar', label: 'Sugar', unit: 'g', amount_per_100g: n.sugars_100g } : null,
    n?.sodium_100g != null
      ? { key: 'sodium', label: 'Sodium', unit: 'mg', amount_per_100g: Math.round(n.sodium_100g * 1000) }
      : null,
  ].filter((item): item is FoodNutrient => Boolean(item));

  return {
    id,
    provider: 'open_food_facts',
    name,
    brand: product.brands?.split(',')[0].trim() || null,
    barcode,
    calories_per_100g: calories,
    protein_per_100g: n?.proteins_100g ?? null,
    carbs_per_100g: n?.carbohydrates_100g ?? null,
    fat_per_100g: n?.fat_100g ?? null,
    nutrition_details: detailNutrients.length > 0 ? { source: 'open_food_facts', nutrients: detailNutrients } : null,
  };
}

const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments';

export const openFoodFactsProvider: FoodSearchProvider = {
  id: 'open_food_facts',

  async search(query, limit) {
    // New Meilisearch-backed endpoint — dramatically better relevance than the old CGI endpoint.
    const params = new URLSearchParams({
      q: query.trim(),
      page_size: String(Math.min(limit, 24)),
      fields: OFF_FIELDS,
    });

    const res = await fetch(
      `https://search.openfoodfacts.org/search?${params.toString()}`,
      { headers: { 'User-Agent': 'AXIS-Mobile/1.0 (contact@axis.app)' } },
    );

    if (!res.ok) throw new Error(`OFF search failed: ${res.status}`);

    const data: OFFSearchResponse = await res.json();
    const raw = data.hits ?? data.products ?? [];

    return raw
      .map(mapOFFProduct)
      .filter((item): item is FoodSearchResult => Boolean(item))
      .slice(0, limit);
  },

  async lookupBarcode(barcode) {
    const res = await fetch(
      `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(barcode)}?fields=${OFF_FIELDS}`,
      { headers: { 'User-Agent': 'AXIS-Mobile/1.0 (contact@axis.app)' } },
    );

    if (!res.ok) throw new Error('Barcode lookup failed');

    const data: { product?: OFFProduct; status?: number } = await res.json();
    if (data.status === 0 || !data.product) return null;
    return mapOFFProduct(data.product);
  },
};

// ─── USDA FoodData Central ────────────────────────────────────────────────────
// 900k+ foods: 400k branded products + Foundation/SR Legacy generic ingredients.
// Free key (no credit card): https://fdc.nal.usda.gov/api-key-signup.html
// DEMO_KEY works but is rate-limited to 30 req/hour — register for a real key!

interface USDANutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
}

interface USDAFood {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: USDANutrient[];
}

interface USDASearchResponse {
  foods?: USDAFood[];
}

// numbers — nutrientNumber string (Foundation/SR Legacy use 3-digit codes like "208";
//           detail endpoint may return FDC IDs like "1008")
// ids     — nutrientId integers (Branded foods often only have this, no nutrientNumber)
const USDA_NUTRIENTS = {
  calories:  { numbers: ['208', '1008'],        ids: [1008, 2047, 2048] },
  protein:   { numbers: ['203', '1003'],        ids: [1003] },
  carbs:     { numbers: ['205', '1005'],        ids: [1005] },
  fat:       { numbers: ['204', '1004'],        ids: [1004] },
  fiber:     { numbers: ['291', '1079'],        ids: [1079] },
  sugar:     { numbers: ['269', '539', '2000'], ids: [2000, 1063] },
  sodium:    { numbers: ['307', '1093'],        ids: [1093] },
  potassium: { numbers: ['306', '1092'],        ids: [1092] },
} as const;

const USDA_REQUESTED_NUTRIENT_IDS = [1008, 1003, 1004, 1005, 1079, 2000, 1093, 1092];

const USDA_DETAIL_TARGETS: Array<{
  key: string;
  label: string;
  unit: string;
  def: { numbers: readonly string[]; ids: readonly number[] };
}> = [
  { key: 'fiber',     label: 'Fiber',     unit: 'g',  def: USDA_NUTRIENTS.fiber },
  { key: 'sugar',     label: 'Sugar',     unit: 'g',  def: USDA_NUTRIENTS.sugar },
  { key: 'sodium',    label: 'Sodium',    unit: 'mg', def: USDA_NUTRIENTS.sodium },
  { key: 'potassium', label: 'Potassium', unit: 'mg', def: USDA_NUTRIENTS.potassium },
];

function getUsdaNutrientValue(
  nutrients: USDANutrient[] | undefined,
  def: { numbers: readonly string[]; ids: readonly number[] },
) {
  const nutrient = (nutrients ?? []).find((item) => {
    const num = item.nutrientNumber?.trim();
    if (num && (def.numbers as readonly string[]).includes(num)) return true;
    if (item.nutrientId !== undefined && (def.ids as readonly number[]).includes(item.nutrientId)) return true;
    return false;
  });
  return nutrient?.value ?? nutrient?.amount ?? null;
}

function mapUsdaFood(food: USDAFood): FoodSearchResult | null {
  const id = food.fdcId ? String(food.fdcId) : null;
  const name = food.description?.trim();
  if (!id || !name) return null;

  const brand = food.brandName?.trim() || food.brandOwner?.trim() || null;

  return {
    id,
    provider: 'usda',
    name,
    brand,
    barcode: food.gtinUpc?.trim() || null,
    calories_per_100g: getUsdaNutrientValue(food.foodNutrients, USDA_NUTRIENTS.calories),
    protein_per_100g: getUsdaNutrientValue(food.foodNutrients, USDA_NUTRIENTS.protein),
    carbs_per_100g: getUsdaNutrientValue(food.foodNutrients, USDA_NUTRIENTS.carbs),
    fat_per_100g: getUsdaNutrientValue(food.foodNutrients, USDA_NUTRIENTS.fat),
    nutrition_details: {
      source: 'usda',
      nutrients: USDA_DETAIL_TARGETS.map((target) => {
        const amount = getUsdaNutrientValue(food.foodNutrients, target.def);
        if (amount === null) return null;
        return { key: target.key, label: target.label, unit: target.unit, amount_per_100g: amount };
      }).filter((item): item is FoodNutrient => Boolean(item)),
    },
  };
}

async function usdaRequest(path: string, init?: RequestInit) {
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(
    `${USDA_API_BASE}${path}${separator}api_key=${encodeURIComponent(USDA_API_KEY)}`,
    init,
  );
  if (!res.ok) throw new Error('USDA request failed');
  return res.json();
}

async function searchUsdaFoods(query: string, limit: number, preferGeneric = false) {
  const body: Record<string, unknown> = {
    query,
    pageSize: limit,
    nutrients: USDA_REQUESTED_NUTRIENT_IDS,
  };

  if (preferGeneric) {
    // Foundation + SR Legacy have the most complete macros for whole/generic foods
    body.dataType = ['Foundation', 'SR Legacy'];
  }
  // Without dataType, USDA returns all types including Branded (400k+ packaged products)

  const data = await usdaRequest('/foods/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as USDASearchResponse;

  return (data.foods ?? [])
    .map(mapUsdaFood)
    .filter((item): item is FoodSearchResult => Boolean(item));
}

function scoreUsdaCandidate(food: FoodSearchResult, target: FoodSearchResult) {
  const normalize = (v: string | null | undefined) => v?.trim().toLowerCase() ?? '';
  const targetName = normalize(target.name);
  const targetBrand = normalize(target.brand);
  const candidateName = normalize(food.name);
  const candidateBrand = normalize(food.brand);

  let score = 0;
  if (candidateName === targetName) score += 60;
  if (candidateName.startsWith(targetName) || targetName.startsWith(candidateName)) score += 35;
  if (candidateName.includes(targetName) || targetName.includes(candidateName)) score += 20;
  if (targetBrand && candidateBrand === targetBrand) score += 20;
  if (target.barcode && food.barcode && target.barcode === food.barcode) score += 40;
  score -= Math.abs(candidateName.length - targetName.length) * 0.2;
  return score;
}

export async function lookupUsdaMacros(food: FoodSearchResult): Promise<{
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
} | null> {
  try {
    if (food.provider === 'usda') {
      const data = await usdaRequest(`/food/${encodeURIComponent(food.id)}`) as USDAFood;
      const mapped = mapUsdaFood(data);
      if (!mapped) return null;
      return {
        calories_per_100g: mapped.calories_per_100g,
        protein_per_100g: mapped.protein_per_100g,
        carbs_per_100g: mapped.carbs_per_100g,
        fat_per_100g: mapped.fat_per_100g,
      };
    }

    const query = `${food.name} ${food.brand ?? ''}`.trim();
    const preferGeneric = !food.brand;
    const matches = await searchUsdaFoods(query, 6, preferGeneric);
    const bestMatch = matches
      .map((item) => ({ item, score: scoreUsdaCandidate(item, food) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!bestMatch || bestMatch.score < 15) return null;
    return {
      calories_per_100g: bestMatch.item.calories_per_100g,
      protein_per_100g: bestMatch.item.protein_per_100g,
      carbs_per_100g: bestMatch.item.carbs_per_100g,
      fat_per_100g: bestMatch.item.fat_per_100g,
    };
  } catch {
    return null;
  }
}

export const usdaFoodProvider: FoodSearchProvider = {
  id: 'usda',
  async search(query, limit, options) {
    return searchUsdaFoods(query, limit, options?.preferGeneric);
  },
  async getDetails(food) {
    if (food.provider === 'usda') {
      const data = await usdaRequest(`/food/${encodeURIComponent(food.id)}`) as USDAFood;
      return mapUsdaFood(data)?.nutrition_details ?? null;
    }

    const matches = await searchUsdaFoods(`${food.name} ${food.brand ?? ''}`.trim(), 5);
    const bestMatch = matches
      .map((item) => ({ item, score: scoreUsdaCandidate(item, food) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!bestMatch || bestMatch.score < 20) return null;
    return bestMatch.item.nutrition_details ?? null;
  },
};

// ─── Edamam Food Database ─────────────────────────────────────────────────────
// 615k+ UPC-linked branded foods + 900k foods total. Best paid option.
// $14/month (30-day free trial). Register at https://developer.edamam.com/
// Set EXPO_PUBLIC_EDAMAM_APP_ID and EXPO_PUBLIC_EDAMAM_APP_KEY in .env
// When keys are absent this provider is not registered — OFF + USDA are used.

interface EdamamFood {
  foodId?: string;
  label?: string;
  brand?: string;
  category?: string;
  nutrients?: {
    ENERC_KCAL?: number;
    PROCNT?: number;
    FAT?: number;
    CHOCDF?: number;
    FIBTG?: number;
    NA?: number;
    SUGAR?: number;
    K?: number;
  };
}

interface EdamamHint {
  food?: EdamamFood;
}

interface EdamamParserResponse {
  parsed?: Array<{ food?: EdamamFood }>;
  hints?: EdamamHint[];
}

function mapEdamamFood(food: EdamamFood): FoodSearchResult | null {
  const name = food.label?.trim();
  const id = food.foodId;
  if (!name || !id) return null;

  const n = food.nutrients;

  const detailNutrients: FoodNutrient[] = [
    n?.FIBTG != null ? { key: 'fiber', label: 'Fiber', unit: 'g', amount_per_100g: n.FIBTG } : null,
    n?.SUGAR != null ? { key: 'sugar', label: 'Sugar', unit: 'g', amount_per_100g: n.SUGAR } : null,
    n?.NA != null ? { key: 'sodium', label: 'Sodium', unit: 'mg', amount_per_100g: n.NA } : null,
    n?.K != null ? { key: 'potassium', label: 'Potassium', unit: 'mg', amount_per_100g: n.K } : null,
  ].filter((item): item is FoodNutrient => Boolean(item));

  return {
    id,
    provider: 'edamam',
    name,
    brand: food.brand?.trim() || null,
    barcode: null,
    calories_per_100g: n?.ENERC_KCAL ?? null,
    protein_per_100g: n?.PROCNT ?? null,
    carbs_per_100g: n?.CHOCDF ?? null,
    fat_per_100g: n?.FAT ?? null,
    nutrition_details: detailNutrients.length > 0 ? { source: 'edamam', nutrients: detailNutrients } : null,
  };
}

async function edamamParserRequest(params: Record<string, string>): Promise<EdamamParserResponse> {
  const searchParams = new URLSearchParams({
    app_id: EDAMAM_APP_ID,
    app_key: EDAMAM_APP_KEY,
    'nutrition-type': 'cooking',
    ...params,
  });

  const res = await fetch(
    `https://api.edamam.com/api/food-database/v2/parser?${searchParams.toString()}`,
    { headers: { 'User-Agent': 'AXIS-Mobile/1.0 (contact@axis.app)' } },
  );

  if (!res.ok) throw new Error(`Edamam request failed: ${res.status}`);
  return res.json();
}

export const edamamProvider: FoodSearchProvider = {
  id: 'edamam',

  async search(query, limit) {
    const data = await edamamParserRequest({ ingr: query.trim() });

    // `parsed` has the best semantic match; `hints` has related branded/packaged foods
    const parsedFoods = (data.parsed ?? [])
      .map((p) => p.food ? mapEdamamFood(p.food) : null)
      .filter((item): item is FoodSearchResult => Boolean(item));

    const hintFoods = (data.hints ?? [])
      .map((h) => h.food ? mapEdamamFood(h.food) : null)
      .filter((item): item is FoodSearchResult => Boolean(item));

    // Parsed first (best match), then hints (broader branded results)
    const seen = new Set<string>();
    const combined: FoodSearchResult[] = [];
    for (const food of [...parsedFoods, ...hintFoods]) {
      if (seen.has(food.id)) continue;
      seen.add(food.id);
      combined.push(food);
      if (combined.length >= limit) break;
    }

    return combined;
  },

  async lookupBarcode(barcode) {
    const data = await edamamParserRequest({ upc: barcode });
    const food = data.hints?.[0]?.food ?? data.parsed?.[0]?.food;
    return food ? mapEdamamFood(food) : null;
  },
};

// ─── Provider registry ────────────────────────────────────────────────────────

// OFF (new Meilisearch API) + USDA are always active — no key required for OFF,
// USDA works with DEMO_KEY (get a free key to remove rate limits).
FOOD_SEARCH_PROVIDERS.push(openFoodFactsProvider, usdaFoodProvider);

// Edamam is an optional upgrade: better branded/UPC coverage, $14/month with
// a 30-day free trial. Activated automatically when keys are present in .env.
if (EDAMAM_APP_ID && EDAMAM_APP_KEY) {
  FOOD_SEARCH_PROVIDERS.push(edamamProvider);
}

export const foodProviders = {
  open_food_facts: openFoodFactsProvider,
  usda: usdaFoodProvider,
  edamam: edamamProvider,
} as const;
