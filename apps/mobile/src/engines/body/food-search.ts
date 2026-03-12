import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FOOD_SEARCH_PROVIDERS,
  usdaFoodProvider,
  lookupUsdaMacros,
  type FoodNutritionDetails,
  type FoodSearchResult,
} from './food-providers';

export type { FoodNutrient, FoodNutritionDetails, FoodSearchResult } from './food-providers';

const FOOD_SEARCH_STORAGE_KEY = 'axis.body.food-search.v1';
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_RECENT_FOODS = 40;
const MAX_FAVORITE_FOODS = 40;
const MAX_QUERY_CACHE = 50;
const MAX_CATALOG_FOODS = 400;
const MIN_REMOTE_QUERY_LENGTH = 2;
const PROVIDER_TIMEOUTS_MS = {
  open_food_facts: 2000,
  usda: 2500,
  edamam: 2000,
} as const;

interface QueryCacheEntry {
  updated_at: number;
  results: FoodSearchResult[];
}

interface FoodDetailsCacheEntry {
  updated_at: number;
  details: FoodNutritionDetails | null;
}

export interface FoodSearchPreview {
  results: FoodSearchResult[];
  should_fetch_remote: boolean;
}

interface QueryIntent {
  tokens: string[];
  is_barcode: boolean;
  is_generic: boolean;
  is_branded: boolean;
}

interface FoodSearchStore {
  custom_foods: FoodSearchResult[];
  recent_foods: FoodSearchResult[];
  favorite_foods: FoodSearchResult[];
  catalog_foods: FoodSearchResult[];
  query_cache: Record<string, QueryCacheEntry>;
  food_details_cache: Record<string, FoodDetailsCacheEntry>;
}

const EMPTY_STORE: FoodSearchStore = {
  custom_foods: [],
  recent_foods: [],
  favorite_foods: [],
  catalog_foods: [],
  query_cache: {},
  food_details_cache: {},
};

let memoryStore: FoodSearchStore | null = null;
let storePromise: Promise<FoodSearchStore> | null = null;
const inFlightSearches = new Map<string, Promise<FoodSearchResult[]>>();
const inFlightDetailRequests = new Map<string, Promise<FoodNutritionDetails | null>>();

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeQuery(query: string) {
  return normalizeText(query);
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

function getQueryIntent(query: string): QueryIntent {
  const normalized = normalizeQuery(query);
  const tokens = tokenize(normalized);
  const compact = normalized.replace(/\s+/g, '');
  const isBarcode = /^\d{8,14}$/.test(compact);
  const hasDigits = tokens.some((token) => /\d/.test(token));
  const isGeneric = !isBarcode && !hasDigits && tokens.length > 0 && tokens.length <= 2;

  return {
    tokens,
    is_barcode: isBarcode,
    is_generic: isGeneric,
    is_branded: !isBarcode && !isGeneric,
  };
}

function foodKey(food: FoodSearchResult) {
  return `${food.provider}:${food.id}`;
}

function dedupeFoods(foods: FoodSearchResult[]) {
  const seen = new Set<string>();
  const output: FoodSearchResult[] = [];

  for (const food of foods) {
    const key = foodKey(food);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(food);
  }

  return output;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Search timed out'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  });
}

function sortFoodsForQuery(foods: FoodSearchResult[], query: string, store: FoodSearchStore) {
  return dedupeFoods(foods)
    .map((food) => ({ food, score: scoreFoodMatch(food, query, store) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.food);
}

function mergeFoodPools(...groups: FoodSearchResult[][]) {
  return dedupeFoods(groups.flat());
}

function mergeCatalogFoods(...groups: FoodSearchResult[][]) {
  return mergeFoodPools(...groups).slice(0, MAX_CATALOG_FOODS);
}

function trimStore(store: FoodSearchStore): FoodSearchStore {
  const entries = Object.entries(store.query_cache)
    .sort(([, a], [, b]) => b.updated_at - a.updated_at)
    .slice(0, MAX_QUERY_CACHE);

  return {
    custom_foods: dedupeFoods(store.custom_foods).slice(0, MAX_FAVORITE_FOODS),
    recent_foods: dedupeFoods(store.recent_foods).slice(0, MAX_RECENT_FOODS),
    favorite_foods: dedupeFoods(store.favorite_foods).slice(0, MAX_FAVORITE_FOODS),
    catalog_foods: dedupeFoods(store.catalog_foods).slice(0, MAX_CATALOG_FOODS),
    query_cache: Object.fromEntries(entries),
    food_details_cache: store.food_details_cache,
  };
}

async function persistStore(nextStore: FoodSearchStore) {
  memoryStore = trimStore(nextStore);
  await AsyncStorage.setItem(FOOD_SEARCH_STORAGE_KEY, JSON.stringify(memoryStore));
  return memoryStore;
}

async function loadStore() {
  if (memoryStore) return memoryStore;
  if (storePromise) return storePromise;

  storePromise = AsyncStorage.getItem(FOOD_SEARCH_STORAGE_KEY)
    .then((raw) => {
      if (!raw) {
        memoryStore = EMPTY_STORE;
        return memoryStore;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<FoodSearchStore>;
        memoryStore = {
          custom_foods: parsed.custom_foods ?? [],
          recent_foods: parsed.recent_foods ?? [],
          favorite_foods: parsed.favorite_foods ?? [],
          catalog_foods: parsed.catalog_foods ?? [],
          query_cache: parsed.query_cache ?? {},
          food_details_cache: parsed.food_details_cache ?? {},
        };
      } catch {
        memoryStore = EMPTY_STORE;
      }

      return memoryStore;
    })
    .finally(() => {
      storePromise = null;
    });

  return storePromise;
}

function getIndexedFoods(store: FoodSearchStore) {
  const cachedFoods = Object.values(store.query_cache).flatMap((entry) => entry.results);

  return mergeFoodPools(
    store.custom_foods,
    store.favorite_foods,
    store.recent_foods,
    store.catalog_foods,
    cachedFoods,
  );
}

function scoreFoodMatch(food: FoodSearchResult, query: string, store: FoodSearchStore) {
  const intent = getQueryIntent(query);
  const normalizedName = normalizeText(food.name);
  const normalizedBrand = normalizeText(food.brand ?? '');
  const key = foodKey(food);
  const queryTokens = intent.tokens;
  const nameTokens = tokenize(normalizedName);
  const brandTokens = tokenize(normalizedBrand);

  // Text-match score — must be > 0 for the food to appear at all
  let textScore = 0;

  if (normalizedName === query) textScore += 80;
  else if (normalizedName.startsWith(query)) textScore += 50;
  else if (normalizedName.includes(query)) textScore += 20;

  // Token-based matching: "chicken breast" finds "Breast, Chicken, Skinless"
  if (queryTokens.length > 0) {
    const matchedCount = queryTokens.filter((token) => (
      nameTokens.some((candidate) => candidate === token || candidate.startsWith(token))
      || brandTokens.some((candidate) => candidate === token || candidate.startsWith(token))
    )).length;
    const ratio = matchedCount / queryTokens.length;
    textScore += ratio * 40;
    if (matchedCount === queryTokens.length) textScore += 20; // all tokens matched
  }

  if (normalizedBrand.startsWith(query)) textScore += 12;
  else if (normalizedBrand.includes(query)) textScore += 6;
  if (food.barcode === query) textScore += 100;

  // No text match → exclude entirely, regardless of recency/favorites
  if (textScore === 0) return 0;

  // Bias bonuses only boost foods that already matched — they don't create results
  let score = textScore;
  if (store.custom_foods.some((item) => foodKey(item) === key)) score += 36;
  if (store.favorite_foods.some((item) => foodKey(item) === key)) score += 24;
  if (store.recent_foods.some((item) => foodKey(item) === key)) score += 16;
  if (food.provider === 'local') score += 12;
  if (food.calories_per_100g !== null) score += 4;

  if (intent.is_generic) {
    if (!food.brand) score += 24;
    if (food.provider === 'usda') score += 18;
    if (food.provider === 'open_food_facts' && food.brand) score -= 10;
    if (nameTokens.length > queryTokens.length + 2) score -= 8;
  }

  if (intent.is_branded) {
    if (food.brand) score += 14;
    if (food.provider === 'open_food_facts') score += 10;
  }

  score -= Math.max(0, normalizedName.length - query.length) * 0.01;

  return score;
}

function searchLocalFoods(store: FoodSearchStore, query: string, limit: number) {
  const indexedFoods = getIndexedFoods(store);

  return sortFoodsForQuery(indexedFoods, query, store).slice(0, limit);
}

function shouldSkipRemoteSearch(localResults: FoodSearchResult[], normalizedQuery: string, limit: number) {
  if (normalizedQuery.length < 3 && localResults.length > 0) return true;
  if (localResults.length >= limit) return true;

  const strongMatches = localResults.filter((food) => {
    const name = normalizeText(food.name);
    return name === normalizedQuery || name.startsWith(normalizedQuery);
  });

  return strongMatches.length >= Math.min(limit, 3);
}

async function searchRemoteProviders(query: string, limit: number) {
  const providerLimit = Math.max(limit, 10);
  const intent = getQueryIntent(query);

  // Provider ordering strategy:
  //   Generic queries (e.g. "chicken breast", "rice"):
  //     USDA → best complete macros for whole/generic foods
  //     OFF  → 2.8M product fallback
  //     Edamam → if configured, rounds out coverage
  //
  //   Branded queries (e.g. "chobani yogurt", "heinz ketchup"):
  //     Edamam → 615k+ UPC-linked branded foods (if configured)
  //     OFF    → massive global product database
  //     USDA   → catches branded foods in their FDC branded database
  const orderedProviders = intent.is_generic
    ? [
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'usda'),
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'open_food_facts'),
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'edamam'),
    ]
    : [
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'edamam'),
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'open_food_facts'),
      ...FOOD_SEARCH_PROVIDERS.filter((p) => p.id === 'usda'),
    ];

  // Fan out to all providers in parallel for fastest possible results
  const providerResults = await Promise.allSettled(
    orderedProviders.map((provider) => {
      const timeoutMs = PROVIDER_TIMEOUTS_MS[provider.id as keyof typeof PROVIDER_TIMEOUTS_MS] ?? 2000;
      return withTimeout(
        provider.search(query, providerLimit, { preferGeneric: intent.is_generic }),
        timeoutMs,
      );
    }),
  );

  // Re-merge in priority order (first provider wins on dedup)
  let aggregated: FoodSearchResult[] = [];
  for (const result of providerResults) {
    if (result.status === 'fulfilled') {
      aggregated = mergeFoodPools(aggregated, result.value);
    }
  }

  return aggregated.slice(0, limit * 2);
}

async function saveQueryResults(query: string, results: FoodSearchResult[]) {
  const store = await loadStore();
  const normalizedQuery = normalizeQuery(query);

  return persistStore({
    ...store,
    catalog_foods: mergeCatalogFoods(store.catalog_foods, results),
    query_cache: {
      ...store.query_cache,
      [normalizedQuery]: {
        updated_at: Date.now(),
        results,
      },
    },
  });
}

function mergeFoodDetails(food: FoodSearchResult, details: FoodNutritionDetails | null): FoodSearchResult {
  if (!details) return food;

  return {
    ...food,
    nutrition_details: details,
  };
}

async function saveFoodDetails(food: FoodSearchResult, details: FoodNutritionDetails | null) {
  const store = await loadStore();
  const key = foodKey(food);

  return persistStore({
    ...store,
    custom_foods: store.custom_foods.map((item) => (
      foodKey(item) === key ? mergeFoodDetails(item, details) : item
    )),
    recent_foods: store.recent_foods.map((item) => (
      foodKey(item) === key ? mergeFoodDetails(item, details) : item
    )),
    favorite_foods: store.favorite_foods.map((item) => (
      foodKey(item) === key ? mergeFoodDetails(item, details) : item
    )),
    catalog_foods: store.catalog_foods.map((item) => (
      foodKey(item) === key ? mergeFoodDetails(item, details) : item
    )),
    query_cache: Object.fromEntries(
      Object.entries(store.query_cache).map(([storedQuery, entry]) => [
        storedQuery,
        {
          ...entry,
          results: entry.results.map((item) => (
            foodKey(item) === key ? mergeFoodDetails(item, details) : item
          )),
        },
      ]),
    ),
    food_details_cache: {
      ...store.food_details_cache,
      [key]: {
        updated_at: Date.now(),
        details,
      },
    },
  });
}

export async function rememberRecentFood(food: FoodSearchResult) {
  const store = await loadStore();

  return persistStore({
    ...store,
    catalog_foods: mergeCatalogFoods([food], store.catalog_foods),
    recent_foods: dedupeFoods([food, ...store.recent_foods]).slice(0, MAX_RECENT_FOODS),
  });
}

export async function getRecentFoods(limit = 8) {
  const store = await loadStore();
  return store.recent_foods.slice(0, limit);
}

export async function getCustomFoods(limit = 20) {
  const store = await loadStore();
  return store.custom_foods.slice(0, limit);
}

export async function getFavoriteFoods(limit = 8) {
  const store = await loadStore();
  return store.favorite_foods.slice(0, limit);
}

export async function saveCustomFood(food: Omit<FoodSearchResult, 'provider' | 'id'> & { id?: string }) {
  const store = await loadStore();
  const normalizedName = normalizeText(food.name);
  const id = food.id ?? `custom:${normalizedName.replace(/\s+/g, '-')}`;
  const customFood: FoodSearchResult = {
    ...food,
    id,
    provider: 'local',
  };

  return persistStore({
    ...store,
    catalog_foods: mergeCatalogFoods([customFood], store.catalog_foods),
    custom_foods: dedupeFoods([customFood, ...store.custom_foods]),
  });
}

export async function isFavoriteFood(food: FoodSearchResult) {
  const store = await loadStore();
  const key = foodKey(food);
  return store.favorite_foods.some((item) => foodKey(item) === key);
}

export async function toggleFavoriteFood(food: FoodSearchResult) {
  const store = await loadStore();
  const key = foodKey(food);
  const exists = store.favorite_foods.some((item) => foodKey(item) === key);

  return persistStore({
    ...store,
    catalog_foods: mergeCatalogFoods([food], store.catalog_foods),
    favorite_foods: exists
      ? store.favorite_foods.filter((item) => foodKey(item) !== key)
      : dedupeFoods([food, ...store.favorite_foods]).slice(0, MAX_FAVORITE_FOODS),
  });
}

export async function getFoodDetails(food: FoodSearchResult) {
  if (food.nutrition_details?.nutrients?.length) {
    return food.nutrition_details;
  }

  const store = await loadStore();
  const key = foodKey(food);
  const cachedEntry = store.food_details_cache[key];
  const isFresh = cachedEntry && Date.now() - cachedEntry.updated_at < SEARCH_CACHE_TTL_MS;

  if (isFresh) return cachedEntry.details;

  const existingRequest = inFlightDetailRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = (usdaFoodProvider.getDetails?.(food) ?? Promise.resolve(null))
    .then(async (details) => {
      await saveFoodDetails(food, details);
      return details;
    })
    .finally(() => {
      inFlightDetailRequests.delete(key);
    });

  inFlightDetailRequests.set(key, request);
  return request;
}

export async function getFoodSearchPreview(query: string, limit = 10): Promise<FoodSearchPreview> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return {
      results: [],
      should_fetch_remote: false,
    };
  }

  const store = await loadStore();
  const localResults = searchLocalFoods(store, normalizedQuery, limit);
  const cachedEntry = store.query_cache[normalizedQuery];
  const isFresh = cachedEntry && Date.now() - cachedEntry.updated_at < SEARCH_CACHE_TTL_MS;

  if (isFresh) {
    return {
      results: sortFoodsForQuery(mergeFoodPools(localResults, cachedEntry.results), normalizedQuery, store).slice(0, limit),
      should_fetch_remote: false,
    };
  }

  return {
    results: localResults.slice(0, limit),
    should_fetch_remote: !(
      normalizedQuery.length < MIN_REMOTE_QUERY_LENGTH
      || shouldSkipRemoteSearch(localResults, normalizedQuery, limit)
    ),
  };
}

export async function searchFoodsRemote(query: string, limit = 10): Promise<FoodSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return [];

  const store = await loadStore();
  const localResults = searchLocalFoods(store, normalizedQuery, limit);

  if (normalizedQuery.length < MIN_REMOTE_QUERY_LENGTH || shouldSkipRemoteSearch(localResults, normalizedQuery, limit)) {
    return localResults.slice(0, limit);
  }

  const existingRequest = inFlightSearches.get(normalizedQuery);
  if (existingRequest) {
    const remoteResults = await existingRequest;
    return sortFoodsForQuery(mergeFoodPools(localResults, remoteResults), normalizedQuery, store).slice(0, limit);
  }

  const request = searchRemoteProviders(normalizedQuery, limit)
    .then(async (remoteResults) => {
      await saveQueryResults(normalizedQuery, remoteResults);
      return remoteResults;
    })
    .finally(() => {
      inFlightSearches.delete(normalizedQuery);
    });

  inFlightSearches.set(normalizedQuery, request);

  const remoteResults = await request;
  return sortFoodsForQuery(mergeFoodPools(localResults, remoteResults), normalizedQuery, store).slice(0, limit);
}

export async function searchFoods(query: string, limit = 10): Promise<FoodSearchResult[]> {
  const preview = await getFoodSearchPreview(query, limit);
  if (!preview.should_fetch_remote) return preview.results;
  return searchFoodsRemote(query, limit);
}

export async function lookupFoodByBarcode(barcode: string) {
  for (const provider of FOOD_SEARCH_PROVIDERS) {
    if (!provider.lookupBarcode) continue;
    try {
      const food = await withTimeout(provider.lookupBarcode(barcode), 5000);
      if (!food) continue;
      await rememberRecentFood(food);
      return food;
    } catch {
      continue;
    }
  }

  return null;
}

export async function enrichFoodMacros(food: FoodSearchResult): Promise<FoodSearchResult> {
  if (food.calories_per_100g !== null) return food;

  const macros = await lookupUsdaMacros(food);
  if (!macros || macros.calories_per_100g === null) return food;

  const enriched: FoodSearchResult = { ...food, ...macros };

  // Patch all caches so future lookups are already enriched
  const store = await loadStore();
  const key = foodKey(enriched);
  const patchFood = (item: FoodSearchResult) => foodKey(item) === key ? { ...item, ...macros } : item;

  await persistStore({
    ...store,
    custom_foods: store.custom_foods.map(patchFood),
    recent_foods: store.recent_foods.map(patchFood),
    favorite_foods: store.favorite_foods.map(patchFood),
    catalog_foods: store.catalog_foods.map(patchFood),
    query_cache: Object.fromEntries(
      Object.entries(store.query_cache).map(([q, entry]) => [
        q,
        { ...entry, results: entry.results.map(patchFood) },
      ]),
    ),
  });

  return enriched;
}

export function calcNutrition(food: FoodSearchResult, serving_g: number) {
  const factor = serving_g / 100;

  return {
    calories: food.calories_per_100g !== null ? Math.round(food.calories_per_100g * factor) : 0,
    protein_g: food.protein_per_100g !== null ? Math.round(food.protein_per_100g * factor * 10) / 10 : null,
    carbs_g: food.carbs_per_100g !== null ? Math.round(food.carbs_per_100g * factor * 10) / 10 : null,
    fat_g: food.fat_per_100g !== null ? Math.round(food.fat_per_100g * factor * 10) / 10 : null,
  };
}
