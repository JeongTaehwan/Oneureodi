import { RecommendResponseSchema, type RecommendRequest, type RecommendResponse } from "@oneureodi/shared";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchRecommendations(req: RecommendRequest): Promise<RecommendResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new ApiError(null, `서버에 연결할 수 없어요 (${BASE_URL})`);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  const parsed = RecommendResponseSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(res.status, "서버 응답 형식이 맞지 않아요");
  return parsed.data;
}
