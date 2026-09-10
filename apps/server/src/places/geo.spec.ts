import { anchorKey, haversineM, isFresh } from "./geo";

describe("isFresh", () => {
  const ttl = 7 * 24 * 60 * 60 * 1000;
  const now = new Date("2026-09-08T00:00:00Z");

  it("7일 미만이면 신선", () => {
    expect(isFresh(new Date("2026-09-01T00:00:01Z"), now, ttl)).toBe(true);
  });

  it("정확히 7일이면 만료", () => {
    expect(isFresh(new Date("2026-09-01T00:00:00Z"), now, ttl)).toBe(false);
  });
});

describe("haversineM", () => {
  it("서울역–강남역 약 9.4km", () => {
    const d = haversineM({ lat: 37.5547, lng: 126.9707 }, { lat: 37.4979, lng: 127.0276 });
    expect(d).toBeGreaterThan(8000);
    expect(d).toBeLessThan(10000);
  });
});

describe("anchorKey", () => {
  it("110m 안의 좌표는 같은 키", () => {
    expect(anchorKey({ lat: 37.5441, lng: 127.0559 }, 3000)).toBe(anchorKey({ lat: 37.5444, lng: 127.0556 }, 3000));
  });

  it("반경이 다르면 다른 키", () => {
    expect(anchorKey({ lat: 37.5441, lng: 127.0559 }, 3000)).not.toBe(anchorKey({ lat: 37.5441, lng: 127.0559 }, 5000));
  });
});
