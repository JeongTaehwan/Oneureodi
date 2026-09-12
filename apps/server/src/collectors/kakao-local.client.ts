import { Inject, Injectable } from "@nestjs/common";
import { ENV, Env } from "../config/env";
import { fetchJson } from "../common/http";
import type { Anchor, RawPlace } from "./types";

interface KakaoDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
}

interface KakaoSearchResponse {
  documents: KakaoDocument[];
  meta: { total_count: number; pageable_count: number; is_end: boolean };
}

const BASE = "https://dapi.kakao.com/v2/local/search";
/** 카카오 로컬은 페이지당 15건, 최대 45건(3페이지)까지만 준다. */
const PAGE_SIZE = 15;
const MAX_PAGES = 3;
/** 데이트 코스에 쓰는 카테고리 그룹: 카페, 음식점, 문화시설, 관광명소 */
export const DATE_CATEGORY_GROUPS = ["CE7", "FD6", "CT1", "AT4"] as const;

@Injectable()
export class KakaoLocalClient {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private get headers() {
    return { Authorization: `KakaoAK ${this.env.KAKAO_REST_API_KEY}` };
  }

  private async get(path: string, params: Record<string, string | number>): Promise<KakaoSearchResponse> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    return fetchJson<KakaoSearchResponse>(`${BASE}/${path}?${qs.toString()}`, {
      service: "kakao-local",
      timeoutMs: this.env.EXTERNAL_TIMEOUT_MS,
      headers: this.headers,
    });
  }

  /** 지역명·역 이름 → 좌표. 키워드 검색 첫 결과를 기준점으로 쓴다. */
  async geocode(query: string): Promise<Anchor | null> {
    const res = await this.get("keyword.json", { query, size: 1 });
    const doc = res.documents[0];
    if (!doc) return null;
    return { name: doc.place_name, lat: Number(doc.y), lng: Number(doc.x) };
  }

  /** 좌표 주변 반경 안에서 데이트용 카테고리 장소를 모두 모은다. 최대 4 그룹 × 45건. */
  async collectAround(center: { lat: number; lng: number }, radiusM: number): Promise<RawPlace[]> {
    const requests = DATE_CATEGORY_GROUPS.flatMap((group) =>
      Array.from({ length: MAX_PAGES }, (_, i) => ({ group, page: i + 1 })),
    );
    const pages = await Promise.all(
      requests.map(({ group, page }) =>
        this.get("category.json", {
          category_group_code: group,
          x: center.lng,
          y: center.lat,
          radius: Math.min(radiusM, 20000),
          size: PAGE_SIZE,
          page,
        })
          .then((r) => r.documents)
          // 한 페이지 실패가 전체 추천을 죽이지 않게 한다. 빈 페이지로 취급.
          .catch(() => [] as KakaoDocument[]),
      ),
    );
    return pages.flat().map(toRawPlace);
  }

  /** 장소 주변 가장 가까운 주차장(카테고리 PK6). 반경 안에 없으면 null. */
  async nearestParking(center: { lat: number; lng: number }, radiusM: number): Promise<{ name: string; distanceM: number; address: string | null } | null> {
    const res = await this.get("category.json", {
      category_group_code: "PK6",
      x: center.lng,
      y: center.lat,
      radius: Math.min(radiusM, 20000),
      sort: "distance",
      size: 1,
    }).catch(() => null);
    const doc = res?.documents[0];
    if (!doc) return null;
    const distance = Number((doc as { distance?: string }).distance);
    // 거리를 못 받은 주차장은 "0m" 로 보이느니 없는 걸로 친다.
    if (!Number.isFinite(distance) || distance <= 0) return null;
    return { name: doc.place_name, distanceM: Math.round(distance), address: doc.road_address_name || doc.address_name || null };
  }

  /** 블로그에 나온 상호를 좌표 주변에서 찾는다. 반경 밖이면 null. */
  async lookupByName(name: string, center: { lat: number; lng: number }, radiusM: number): Promise<RawPlace | null> {
    const res = await this.get("keyword.json", {
      query: name,
      x: center.lng,
      y: center.lat,
      radius: Math.min(radiusM, 20000),
      size: 1,
    }).catch(() => null);
    const doc = res?.documents[0];
    return doc ? toRawPlace(doc) : null;
  }
}

function toRawPlace(d: KakaoDocument): RawPlace {
  return {
    provider: "kakao",
    providerPlaceId: d.id,
    name: d.place_name,
    category: d.category_name || null,
    categoryGroup: d.category_group_code || null,
    lat: Number(d.y),
    lng: Number(d.x),
    address: d.address_name || null,
    roadAddress: d.road_address_name || null,
    phone: d.phone || null,
    url: d.place_url || null,
  };
}
