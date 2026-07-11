import {
  Activity,
  Box,
  CircleMinus,
  Cuboid,
  Hand,
  Home,
  Monitor,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";

export const navItems = [
  { label: "Monitor", icon: Monitor, active: true },
  { label: "Gestures", icon: Hand, active: false },
  { label: "Identity", icon: UserRound, active: false },
  { label: "Models", icon: Cuboid, active: false },
  { label: "Settings", icon: Settings, active: false }
];

export const modelHealth = [
  {
    name: "Gesture CNN",
    icon: Activity,
    accuracy: "98.2%",
    latency: "12.6 ms",
    updated: "10:42:10 AM"
  },
  {
    name: "Face Embedding",
    icon: Box,
    accuracy: "99.1%",
    latency: "18.7 ms",
    updated: "10:42:09 AM"
  },
  {
    name: "Liveness Check",
    icon: ShieldCheck,
    accuracy: "97.6%",
    latency: "15.3 ms",
    updated: "10:42:08 AM"
  }
];

export const events = [
  {
    time: "10:42:12 AM",
    event: "Gesture accepted",
    category: "Gesture",
    details: "Open Palm",
    confidence: "98.3%",
    level: "success"
  },
  {
    time: "10:42:09 AM",
    event: "Face drift checked",
    category: "Identity",
    details: "Pose deviation within threshold",
    confidence: "96.7%",
    level: "success"
  },
  {
    time: "10:41:02 AM",
    event: "Low light warning",
    category: "Environment",
    details: "Illuminance 18 lux below threshold",
    confidence: "-",
    level: "warning"
  },
  {
    time: "10:40:55 AM",
    event: "Gesture accepted",
    category: "Gesture",
    details: "Two Finger Swipe",
    confidence: "97.6%",
    level: "success"
  },
  {
    time: "10:40:32 AM",
    event: "Face drift checked",
    category: "Identity",
    details: "Pose deviation within threshold",
    confidence: "97.1%",
    level: "success"
  },
  {
    time: "10:39:45 AM",
    event: "Face drift checked",
    category: "Identity",
    details: "Minor pose drift detected",
    confidence: "93.4%",
    level: "warning"
  }
];

export const riskEvents = [
  { label: "Low light warning", time: "10:41:02 AM", severity: "Low" },
  { label: "Face drift checked", time: "10:39:45 AM", severity: "Medium" },
  { label: "Unusual pose detected", time: "10:37:18 AM", severity: "Medium" }
];

export const gestures = [
  { label: "Open Palm", time: "0.8s ago", icon: Hand, progress: 58 },
  { label: "Two Finger Swipe", time: "2.1s ago", icon: Home, progress: 42 },
  { label: "Idle", time: "5.3s ago", icon: CircleMinus, progress: 12 }
];
