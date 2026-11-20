import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform } from "react-native";

/** One icon set: SF Symbols on iOS, Ionicons elsewhere (and in the web preview). */
const ICONS = {
  overview: ["rectangle.grid.2x2", "grid-outline"],
  practice: ["waveform", "pulse-outline"],
  live: ["bubble.left.and.bubble.right", "chatbubbles-outline"],
  progress: ["chart.line.uptrend.xyaxis", "trending-up-outline"],
  glossary: ["character.book.closed", "book-outline"],
  settings: ["gearshape", "settings-outline"],
  chevron: ["chevron.right", "chevron-forward"],
  check: ["checkmark", "checkmark"],
  checkCircle: ["checkmark.circle.fill", "checkmark-circle"],
  mic: ["mic.fill", "mic"],
  stop: ["stop.fill", "stop"],
  play: ["play.fill", "play"],
  plus: ["plus", "add"],
  close: ["xmark", "close"],
  memory: ["brain", "bulb-outline"],
  headphones: ["headphones", "headset-outline"],
  number: ["number", "keypad-outline"],
  keyboard: ["keyboard", "keypad-outline"],
  info: ["info.circle", "information-circle-outline"],
  warning: ["exclamationmark.triangle.fill", "warning"],
  arrow: ["arrow.right", "arrow-forward"],
  trash: ["trash", "trash-outline"],
  search: ["magnifyingglass", "search"],
  clock: ["clock", "time-outline"],
  sparkles: ["sparkles", "sparkles-outline"],
  target: ["target", "locate-outline"],
  list: ["checklist", "checkbox-outline"],
  layers: ["square.stack.3d.up", "layers-outline"],
  speaker: ["speaker.wave.2.fill", "volume-high"],
  restart: ["arrow.counterclockwise", "refresh"],
  share: ["square.and.arrow.up", "share-outline"],
  gauge: ["gauge.with.dots.needle.67percent", "speedometer-outline"],
  minus: ["minus", "remove"],
  dashed: ["circle.dashed", "ellipse-outline"],
  person: ["person.crop.circle", "person-circle-outline"],
  note: ["note.text", "document-text-outline"],
} as const satisfies Record<string, readonly [SFSymbol, keyof typeof Ionicons.glyphMap]>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color, weight = "medium" }: { name: IconName; size?: number; color: string; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  const [sf, ion] = ICONS[name];
  if (Platform.OS === "ios") {
    return <SymbolView name={sf} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: size, height: size }} />;
  }
  return <Ionicons name={ion} size={size} color={color} />;
}
