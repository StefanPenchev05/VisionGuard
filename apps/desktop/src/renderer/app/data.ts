import { Cuboid, Hand, Monitor, Settings, UserRound } from "lucide-react";

export type AppView = "Monitor" | "Gestures" | "Identity" | "Models" | "Settings";

export const navItems = [
  { label: "Monitor", icon: Monitor },
  { label: "Gestures", icon: Hand },
  { label: "Identity", icon: UserRound },
  { label: "Models", icon: Cuboid },
  { label: "Settings", icon: Settings }
] satisfies ReadonlyArray<{ label: AppView; icon: typeof Monitor }>;
