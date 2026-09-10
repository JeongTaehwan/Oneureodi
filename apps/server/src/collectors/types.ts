import type { Parking } from "@oneureodi/shared";

/** 지도 API 응답을 공급자 무관 형태로 바꾼 것. DB 의 Place 와 거의 같다. */
export interface RawPlace {
  provider: "kakao";
  providerPlaceId: string;
  name: string;
  category: string | null;
  categoryGroup: string | null;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  phone: string | null;
  url: string | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Anchor extends GeoPoint {
  name: string;
}

export type { Parking };
