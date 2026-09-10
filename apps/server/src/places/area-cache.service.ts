import { Inject, Injectable, Logger } from "@nestjs/common";
import { Clock } from "../common/clock";
import { mapWithConcurrency } from "../common/http";
import { ENV, Env, cacheTtlMs } from "../config/env";
import { KakaoLocalClient } from "../collectors/kakao-local.client";
import type { Anchor, RawPlace } from "../collectors/types";
import { WebHintCollector } from "../llm/web-hints";
import { dedupePlaces } from "./dedupe";
import { anchorKey, haversineM, isFresh } from "./geo";
import { deriveParking, derivePrice, matchMentions } from "./mention-match";
import { PlacesRepository, type AreaSnapshot, type PlaceToStore, type StoredMention } from "./places.repository";

export interface AreaResult {
  snapshot: AreaSnapshot;
  fromCache: boolean;
}

/**
 * "모아둔 게 있으면 그걸 쓰고, 없으면 실시간으로 가져온다."
 * 캐시 단위는 (좌표 110m 격자, 반경). TTL 은 CACHE_TTL_DAYS.
 */
@Injectable()
export class AreaCacheService {
  private readonly log = new Logger(AreaCacheService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly clock: Clock,
    private readonly repo: PlacesRepository,
    private readonly kakao: KakaoLocalClient,
    private readonly hints: WebHintCollector,
  ) {}

  async getArea(anchor: Anchor, radiusM: number, locationQuery: string): Promise<AreaResult> {
    const key = anchorKey(anchor, radiusM);
    const now = this.clock.now();
    const cached = await this.repo.findArea(key);
    if (cached && isFresh(cached.fetchedAt, now, cacheTtlMs(this.env))) {
      return { snapshot: cached, fromCache: true };
    }
    const snapshot = await this.collectAndStore(key, anchor, radiusM, locationQuery, now);
    return { snapshot, fromCache: false };
  }

  private async collectAndStore(
    key: string,
    anchor: Anchor,
    radiusM: number,
    locationQuery: string,
    now: Date,
  ): Promise<AreaSnapshot> {
    // 1. 지도(카카오)와 웹 글 조사(모델 웹검색)를 동시에 돌린다.
    let hintsFailed = false;
    const [kakaoPlaces, extracted] = await Promise.all([
      this.kakao.collectAround(anchor, radiusM),
      this.hints.collect(locationQuery, anchor).catch((err: unknown) => {
        // 힌트는 없어도 추천은 돌아가야 한다. 지도 장소만으로 진행하되, 이 결과는 캐시하지 않는다.
        hintsFailed = true;
        this.log.warn(`웹 힌트 수집 실패, 지도 장소만 사용 (캐시 안 함): ${err instanceof Error ? err.message : String(err)}`);
        return [];
      }),
    ]);
    const inRadius = (p: RawPlace) => haversineM(anchor, p) <= radiusM;
    let places = dedupePlaces(kakaoPlaces);
    this.log.log(`[${key}] kakao=${kakaoPlaces.length} mentions=${extracted.length} → places=${places.length}`);

    // 2. 이름으로 지도 장소에 붙인다. 못 붙은 상호는 카카오에서 상한 안에서 추가 조회.
    let match = matchMentions(extracted, withTempIds(places));
    if (match.unmatchedNames.length > 0 && this.env.MAX_MENTION_LOOKUPS > 0) {
      const lookups = match.unmatchedNames.slice(0, this.env.MAX_MENTION_LOOKUPS);
      const found = await mapWithConcurrency(lookups, 5, (name) => this.kakao.lookupByName(name, anchor, radiusM));
      const extra = found.filter((p): p is RawPlace => p !== null && inRadius(p));
      if (extra.length > 0) {
        places = dedupePlaces([...places, ...extra]);
        match = matchMentions(extracted, withTempIds(places));
      }
    }

    // 3. 언급에서 장소별 주차·가격을 파생해 저장.
    const byTempId = groupBy(match.matched, (m) => m.placeId);
    const toStore: PlaceToStore[] = places.map((p) => {
      const ms = byTempId.get(tempId(p)) ?? [];
      return { ...p, parking: deriveParking(ms.map((m) => m.parking)), priceHintKrw: derivePrice(ms.map((m) => m.priceHintKrw)) };
    });
    const dbIds = await this.repo.upsertPlaces(toStore, now);
    const mentions: StoredMention[] = [];
    for (const m of match.matched) {
      const placeId = dbIds.get(m.placeId);
      if (!placeId) continue;
      mentions.push({
        placeId,
        placeNameRaw: m.placeName,
        hint: m.hint,
        priceHintKrw: m.priceHintKrw,
        parking: m.parking,
        sourceUrl: m.sourceUrl,
        sourceTitle: m.sourceTitle,
        publishedAt: m.publishedAt,
      });
    }
    if (hintsFailed) {
      // 반쪽짜리 결과를 일주일짜리 캐시로 굳히지 않는다. 다음 요청이 다시 수집한다.
      return {
        anchor,
        radiusM,
        fetchedAt: now,
        places: toStore.flatMap((p) => {
          const id = dbIds.get(tempId(p));
          return id ? [{ ...p, id }] : [];
        }),
        mentions: [],
      };
    }
    await this.repo.replaceArea({ anchorKey: key, anchor, radiusM, placeIds: [...dbIds.values()], mentions, now });

    const stored = await this.repo.findArea(key);
    if (!stored) throw new Error(`저장 직후 조회 실패: ${key}`);
    return stored;
  }
}

function tempId(p: RawPlace): string {
  return `${p.provider}|${p.providerPlaceId}`;
}

function withTempIds(places: readonly RawPlace[]) {
  return places.map((p) => ({ id: tempId(p), name: p.name }));
}

function groupBy<T, K>(items: readonly T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
