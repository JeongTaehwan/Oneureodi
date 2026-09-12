import AsyncStorage from "@react-native-async-storage/async-storage";
import { RecommendRequestSchema, RecommendResponseSchema, type RecommendRequest, type RecommendResponse } from "@oneureodi/shared";
import { z } from "zod";

const KEY = "oneureodi:last-recommendation";

const SavedSchema = z.object({ request: RecommendRequestSchema, result: RecommendResponseSchema, savedAt: z.string() });
export type SavedRecommendation = z.infer<typeof SavedSchema>;

/** 마지막 추천 하나만 폰에 남긴다. 앱을 껐다 켜도 "지난 추천 다시 보기"가 된다. */
export async function loadLast(): Promise<SavedRecommendation | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = SavedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveLast(request: RecommendRequest, result: RecommendResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ request, result, savedAt: new Date().toISOString() } satisfies SavedRecommendation));
  } catch {
    // 저장 실패는 조용히 넘긴다. 추천 자체는 이미 화면에 있다.
  }
}
