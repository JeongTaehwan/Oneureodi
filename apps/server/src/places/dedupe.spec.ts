import type { RawPlace } from "../collectors/types";
import { dedupePlaces } from "./dedupe";

const raw = (id: string, name: string, lat: number, lng: number): RawPlace => ({
  provider: "kakao",
  providerPlaceId: id,
  name,
  category: null,
  categoryGroup: null,
  lat,
  lng,
  address: null,
  roadAddress: null,
  phone: null,
  url: null,
});

describe("dedupePlaces", () => {
  it("이름이 같고 200m 안이면 먼저 온 것만 남긴다", () => {
    const out = dedupePlaces([raw("1", "블루보틀 성수점", 37.5445, 127.0562), raw("2", "블루보틀 성수", 37.5441, 127.0559)]);
    expect(out).toHaveLength(1);
    expect(out[0]?.providerPlaceId).toBe("1");
  });

  it("이름이 같아도 멀리 있으면 다른 곳", () => {
    const out = dedupePlaces([raw("1", "스타벅스", 37.5441, 127.0559), raw("2", "스타벅스", 37.56, 127.0559)]);
    expect(out).toHaveLength(2);
  });
});
