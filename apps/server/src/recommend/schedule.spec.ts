import { fitsDate, formatTime, isOpenAt, scheduleStops, windowFor } from "./schedule";

describe("windowFor", () => {
  it("와인바는 술집, 브런치 카페는 브런치, 미술관은 전시(월요일 휴무)", () => {
    expect(windowFor("음식점 > 술집 > 와인바").label).toBe("술집");
    expect(windowFor("음식점 > 카페 > 브런치").label).toBe("브런치");
    expect(windowFor("문화,예술 > 문화시설 > 미술관").closedWeekdays).toEqual([1]);
    expect(windowFor("음식점 > 카페 > 커피전문점").label).toBe("카페");
    expect(windowFor(null, "성수 와인바").label).toBe("술집");
  });
  it("상호의 흔한 말은 분류에 쓰지 않는다 (서울숲 양식당은 식사)", () => {
    expect(windowFor("음식점 > 양식", "파이프그라운드 서울숲").label).toBe("식사");
  });
});

describe("isOpenAt", () => {
  const bar = windowFor("술집");
  it("자정을 넘기는 술집은 13시엔 닫혀 있고 19시와 00:30 엔 열려 있다", () => {
    expect(isOpenAt(bar, 13 * 60, 6)).toBe(false);
    expect(isOpenAt(bar, 19 * 60, 6)).toBe(true);
    expect(isOpenAt(bar, 24 * 60 + 30, 6)).toBe(true);
  });
  it("문 닫기 1시간 전부터는 안 들어간다", () => {
    const cafe = windowFor("카페"); // ~22:00
    expect(isOpenAt(cafe, 20 * 60 + 59, 6)).toBe(true);
    expect(isOpenAt(cafe, 21 * 60 + 30, 6)).toBe(false);
  });
  it("미술관은 월요일에 닫는다", () => {
    expect(isOpenAt(windowFor("미술관"), 14 * 60, 1)).toBe(false);
    expect(isOpenAt(windowFor("미술관"), 14 * 60, 2)).toBe(true);
  });
});

describe("scheduleStops", () => {
  it("13시에 만나 카페 → 전시 → 와인바면 와인바 도착이 17시 이후라 통과", () => {
    const r = scheduleStops(
      [
        { category: "음식점 > 카페", name: "a" },
        { category: "문화시설 > 미술관", name: "b" },
        { category: "술집 > 와인바", name: "c" },
      ],
      [15, 20],
      { weekday: 6, time: "13:00" },
    );
    expect(r.stops.map((s) => s.arrivalTime)).toEqual(["13:00", "14:15", "15:55"]);
    expect(r.stops[2]?.ok).toBe(false); // 15:55 도착은 아직 안 열림
    expect(r.allOpen).toBe(false);
  });
  it("13시에 와인바가 첫 장소면 탈락", () => {
    const r = scheduleStops([{ category: "술집 > 와인바", name: "c" }], [], { weekday: 6, time: "13:00" });
    expect(r.allOpen).toBe(false);
  });
  it("19시 시작이면 식당 → 와인바 통과", () => {
    const r = scheduleStops(
      [
        { category: "음식점 > 양식", name: "a" },
        { category: "술집 > 와인바", name: "c" },
      ],
      [10],
      { weekday: 5, time: "19:00" },
    );
    expect(r.allOpen).toBe(true);
    expect(r.endTime).toBe("21:50");
  });
});

describe("fitsDate", () => {
  it("13시 약속: 와인바(17시 개장)는 남고 클럽(21시)은 빠진다", () => {
    expect(fitsDate(windowFor("술집"), { weekday: 6, time: "13:00" })).toBe(true);
    expect(fitsDate(windowFor("클럽"), { weekday: 6, time: "13:00" })).toBe(false);
  });
  it("20시 약속: 브런치와 미술관은 빠진다", () => {
    expect(fitsDate(windowFor("브런치"), { weekday: 6, time: "20:00" })).toBe(false);
    expect(fitsDate(windowFor("미술관"), { weekday: 6, time: "20:00" })).toBe(false);
  });
});

describe("formatTime", () => {
  it("하루를 넘기면 24 를 뺀다", () => {
    expect(formatTime(25 * 60 + 5)).toBe("01:05");
  });
});
