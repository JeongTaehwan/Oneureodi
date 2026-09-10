import { Injectable } from "@nestjs/common";
import type { Parking } from "@oneureodi/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { Anchor, RawPlace } from "../collectors/types";

export interface StoredMention {
  placeId: string;
  placeNameRaw: string;
  hint: string | null;
  priceHintKrw: number | null;
  parking: Parking;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: Date | null;
}

export interface StoredPlace extends RawPlace {
  id: string;
  parking: Parking;
  priceHintKrw: number | null;
}

export interface AreaSnapshot {
  anchor: Anchor;
  radiusM: number;
  fetchedAt: Date;
  places: StoredPlace[];
  mentions: StoredMention[];
}

/** 새로 저장할 장소 + 언급에서 파생한 값 */
export interface PlaceToStore extends RawPlace {
  parking: Parking;
  priceHintKrw: number | null;
}

@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findArea(anchorKey: string): Promise<AreaSnapshot | null> {
    const area = await this.prisma.areaFetch.findUnique({
      where: { anchorKey },
      include: { places: { include: { place: true } }, mentions: true },
    });
    if (!area) return null;
    return {
      anchor: { name: area.anchorName, lat: area.anchorLat, lng: area.anchorLng },
      radiusM: area.radiusM,
      fetchedAt: area.fetchedAt,
      places: area.places.map(({ place }) => ({
        id: place.id,
        provider: place.provider as RawPlace["provider"],
        providerPlaceId: place.providerPlaceId,
        name: place.name,
        category: place.category,
        categoryGroup: place.categoryGroup,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        roadAddress: place.roadAddress,
        phone: place.phone,
        url: place.url,
        parking: place.parking as Parking,
        priceHintKrw: place.priceHintKrw,
      })),
      mentions: area.mentions.map((m) => ({
        placeId: m.placeId,
        placeNameRaw: m.placeNameRaw,
        hint: m.hint,
        priceHintKrw: m.priceHintKrw,
        parking: m.parking as Parking,
        sourceUrl: m.sourceUrl,
        sourceTitle: m.sourceTitle,
        publishedAt: m.publishedAt,
      })),
    };
  }

  /**
   * 장소를 (provider, providerPlaceId) 기준으로 넣거나 갱신하고 DB id 를 돌려준다.
   * 루프 안 쿼리를 피하려고 createMany → findMany → 바뀐 행만 update 순서로 간다.
   * 같은 지역을 두 요청이 동시에 갱신해도 unique 제약 + skipDuplicates 로 충돌하지 않는다.
   */
  async upsertPlaces(places: readonly PlaceToStore[], now: Date): Promise<Map<string, string>> {
    const naturalKey = (p: { provider: string; providerPlaceId: string }) => `${p.provider}|${p.providerPlaceId}`;
    const ids = new Map<string, string>();
    if (places.length === 0) return ids;

    await this.prisma.place.createMany({
      data: places.map((p) => ({ ...p, fetchedAt: now })),
      skipDuplicates: true,
    });

    const rows = await this.prisma.place.findMany({
      where: { OR: places.map((p) => ({ provider: p.provider, providerPlaceId: p.providerPlaceId })) },
      select: { id: true, provider: true, providerPlaceId: true, parking: true, priceHintKrw: true, name: true },
    });
    const byKey = new Map(rows.map((r) => [naturalKey(r), r]));

    const changed: { id: string; data: { parking: Parking; priceHintKrw: number | null; name: string } }[] = [];
    for (const p of places) {
      const row = byKey.get(naturalKey(p));
      if (!row) continue;
      ids.set(naturalKey(p), row.id);
      if (row.parking !== p.parking || row.priceHintKrw !== p.priceHintKrw || row.name !== p.name) {
        changed.push({ id: row.id, data: { parking: p.parking, priceHintKrw: p.priceHintKrw, name: p.name } });
      }
    }

    await this.prisma.place.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { fetchedAt: now } });
    await Promise.all(changed.map((c) => this.prisma.place.update({ where: { id: c.id }, data: c.data })));
    return ids;
  }

  /** 지역 수집 기록을 통째로 바꾼다. 이전 링크·언급은 지우고 새 것으로. */
  async replaceArea(input: {
    anchorKey: string;
    anchor: Anchor;
    radiusM: number;
    placeIds: readonly string[];
    mentions: readonly StoredMention[];
    now: Date;
  }): Promise<void> {
    const { anchorKey, anchor, radiusM, placeIds, mentions, now } = input;
    await this.prisma.$transaction(async (tx) => {
      const area = await tx.areaFetch.upsert({
        where: { anchorKey },
        create: { anchorKey, anchorName: anchor.name, anchorLat: anchor.lat, anchorLng: anchor.lng, radiusM, fetchedAt: now },
        update: { anchorName: anchor.name, anchorLat: anchor.lat, anchorLng: anchor.lng, radiusM, fetchedAt: now },
      });
      await tx.areaFetchPlace.deleteMany({ where: { areaFetchId: area.id } });
      await tx.webMention.deleteMany({ where: { areaFetchId: area.id } });
      if (placeIds.length > 0) {
        await tx.areaFetchPlace.createMany({
          data: placeIds.map((placeId) => ({ areaFetchId: area.id, placeId })),
          skipDuplicates: true,
        });
      }
      if (mentions.length > 0) {
        await tx.webMention.createMany({
          data: mentions.map((m) => ({ ...m, areaFetchId: area.id })),
          skipDuplicates: true,
        });
      }
    });
  }

  /** TTL 이 지난 수집 기록과, 어느 지역에도 안 걸린 오래된 장소를 지운다. */
  async deleteExpired(before: Date): Promise<{ areas: number; places: number }> {
    const areas = await this.prisma.areaFetch.deleteMany({ where: { fetchedAt: { lt: before } } });
    const places = await this.prisma.place.deleteMany({
      where: { fetchedAt: { lt: before }, areaLinks: { none: {} } },
    });
    return { areas: areas.count, places: places.count };
  }
}
