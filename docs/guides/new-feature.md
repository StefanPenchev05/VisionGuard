# How to Add a New Feature

Features live in `apps/desktop/src/renderer/features/<feature-name>/`. Each feature is a self-contained folder for one domain area (authentication, gesture-recognition, settings, user-session).

## 1. Create the feature folder

```
src/renderer/features/<feature-name>/
  index.ts          ← barrel export
  <FeatureName>.tsx ← root component
```

Example for a new `dashboard` feature:

```
src/renderer/features/dashboard/
  index.ts
  Dashboard.tsx
```

## 2. Write the component

```tsx
// src/renderer/features/dashboard/Dashboard.tsx

export function Dashboard() {
  return (
    <section>
      <h2>Dashboard</h2>
    </section>
  );
}
```

## 3. Export from the barrel

```ts
// src/renderer/features/dashboard/index.ts
export { Dashboard } from "./Dashboard";
```

## 4. Wire it into the app

Import and render it inside `src/renderer/app/App.tsx`:

```tsx
import { Dashboard } from "../features/dashboard";

export function App() {
  return (
    <main className="app-shell">
      <Dashboard />
    </main>
  );
}
```

## Shared / reusable components

If a component will be used across multiple features, place it in `src/renderer/shared/ui/` instead.

```
src/renderer/shared/ui/
  Button/
    Button.tsx
    index.ts
```

## Pages

Full-page views (typically one per route) belong in `src/renderer/pages/`.

## Widgets

Composed blocks that combine multiple features belong in `src/renderer/widgets/`.
