import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

interface IconProps {
  size?: number;
  color?: string;
}

const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const });
const stroke = (color: string) => ({ stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export function IconChevronLeft({ size = 18, color = colors.muted }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M15 6l-6 6 6 6" {...stroke(color)} />
    </Svg>
  );
}

export function IconWalk({ size = 14, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="5" r="2" {...stroke(color)} />
      <Path d="M9 21l2-7-3-2 1-4 3-1 2 3 3 1" {...stroke(color)} />
      <Path d="M13 14l2 7" {...stroke(color)} />
    </Svg>
  );
}

export function IconTransit({ size = 14, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x="4" y="4" width="16" height="14" rx="3" {...stroke(color)} />
      <Path d="M4 11h16" {...stroke(color)} />
      <Circle cx="8" cy="15" r="1" {...stroke(color)} />
      <Circle cx="16" cy="15" r="1" {...stroke(color)} />
      <Path d="M7 18l-1 3M17 18l1 3" {...stroke(color)} />
    </Svg>
  );
}

export function IconSubway({ size = 14, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x="5" y="3" width="14" height="15" rx="4" {...stroke(color)} />
      <Path d="M5 11h14" {...stroke(color)} />
      <Circle cx="9" cy="15" r="1" {...stroke(color)} />
      <Circle cx="15" cy="15" r="1" {...stroke(color)} />
      <Path d="M8 18l-2 3M16 18l2 3" {...stroke(color)} />
    </Svg>
  );
}

export function IconCar({ size = 14, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 16l1.5-5h11L19 16" {...stroke(color)} />
      <Rect x="3" y="16" width="18" height="4" rx="1" {...stroke(color)} />
      <Circle cx="7.5" cy="20" r="1.5" {...stroke(color)} />
      <Circle cx="16.5" cy="20" r="1.5" {...stroke(color)} />
    </Svg>
  );
}

export function IconParking({ size = 14, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x="3" y="3" width="18" height="18" rx="5" {...stroke(color)} />
      <Path d="M9 17V7h4a3 3 0 0 1 0 6H9" {...stroke(color)} />
    </Svg>
  );
}

export function IconShare({ size = 18, color = colors.muted }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3v12" {...stroke(color)} />
      <Path d="M8 7l4-4 4 4" {...stroke(color)} />
      <Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" {...stroke(color)} />
    </Svg>
  );
}

export function IconSearchFace({ size = 44, color = colors.text }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx="11" cy="11" r="6" {...stroke(color)} strokeWidth={1.8} />
      <Path d="M20 20l-4.5-4.5" {...stroke(color)} strokeWidth={1.8} />
      <Path d="M9 12.5c.6.7 1.4 1 2 1s1.4-.3 2-1" {...stroke(color)} strokeWidth={1.8} />
      <Path d="M9.5 9.5h.01M12.5 9.5h.01" {...stroke(color)} strokeWidth={1.8} />
    </Svg>
  );
}

export function IconHistory({ size = 16, color = colors.accent }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 12a9 9 0 1 0 3-6.7" {...stroke(color)} />
      <Path d="M3 4v5h5" {...stroke(color)} />
      <Path d="M12 8v4l3 2" {...stroke(color)} />
    </Svg>
  );
}
