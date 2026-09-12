import { estimateLeg, fmtDistance } from "./kakao-routing.client";

describe("estimateLeg", () => {
  const a = { lat: 37.5464, lng: 127.043 };
  const b = { lat: 37.5445, lng: 127.056 }; // 직선 약 1.16km

  it("직선거리에 1.3 을 곱하고 모드별 속도로 분을 낸다", () => {
    const car = estimateLeg("car", a, b);
    const walk = estimateLeg("walk", a, b);
    const transit = estimateLeg("transit", a, b);
    expect(car.distanceM).toBeGreaterThan(1400);
    expect(car.distanceM).toBeLessThan(1600);
    expect(car.durationMin).toBeLessThan(walk.durationMin);
    expect(transit.durationMin).toBeGreaterThanOrEqual(5);
    expect(car.estimated).toBe(true);
    expect(walk.steps[0]?.text).toContain("어림");
  });
});

describe("fmtDistance", () => {
  it("1km 미만은 m, 이상은 km 소수 한 자리", () => {
    expect(fmtDistance(504)).toBe("504m");
    expect(fmtDistance(1469)).toBe("1.5km");
  });
});
