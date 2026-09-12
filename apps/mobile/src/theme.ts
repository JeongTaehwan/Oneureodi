/** C · 따뜻한 미니멀. design/canvas.json 의 토큰과 같다. */
export const colors = {
  bg: "#FFFBF5",
  card: "#FFFFFF",
  field: "#FFF6EF",
  text: "#4A403B",
  muted: "#8E8078",
  placeholder: "#BDB0A8",
  accent: "#F28B6F",
  accentSoft: "#FFE4D6",
  hint: "#B07A68",
  line: "#EFE4DC",
  white: "#FFFFFF",
  danger: "#C9563F",
} as const;

export const radii = { card: 24, field: 14, pill: 999 } as const;

export const font = "GowunDodum_400Regular";

/** 카드 그림자 0 6 18 rgba(74,64,59,.06) */
export const cardShadow = {
  shadowColor: "#4A403B",
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

/** 코랄 버튼 그림자 0 8 20 rgba(242,139,111,.35) */
export const accentShadow = {
  shadowColor: "#F28B6F",
  shadowOpacity: 0.35,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;
