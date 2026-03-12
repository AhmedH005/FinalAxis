import { useQuery } from '@tanstack/react-query';

const WGER_BASE = 'https://wger.de';

async function fetchWgerExerciseImage(exerciseName: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `${WGER_BASE}/api/v2/exercise/search/?term=${encodeURIComponent(exerciseName)}&language=english&format=json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const exerciseId = searchData?.suggestions?.[0]?.data?.id;
    if (!exerciseId) return null;

    const imgRes = await fetch(
      `${WGER_BASE}/api/v2/exerciseimage/?exercise=${exerciseId}&format=json&is_main=True`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    const imageUrl: string | undefined = imgData?.results?.[0]?.image;
    return imageUrl ?? null;
  } catch {
    return null;
  }
}

export function useWgerExerciseImage(exerciseName: string) {
  return useQuery({
    queryKey: ['wger', 'image', exerciseName],
    queryFn: () => fetchWgerExerciseImage(exerciseName),
    staleTime: 7 * 24 * 60 * 60 * 1000, // 1 week — rarely changes
    retry: 1,
    gcTime: 30 * 24 * 60 * 60 * 1000, // keep cached for 30 days
  });
}
