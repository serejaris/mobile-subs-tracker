# SubTrack

## Overview

SubTrack is a subscription tracking mobile application built with Expo (React Native). It helps users manage and monitor their recurring subscriptions with features including a dashboard overview, subscription management (add/edit/delete), analytics with donut charts, and billing reminders. The app supports multiple currencies (RUB, USD, EUR) and categorizes subscriptions across 12 categories (streaming, music, gaming, productivity, etc.). It includes an onboarding flow with popular subscription suggestions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`) and React Compiler experiment
- **Routing**: Expo Router (file-based routing) with typed routes. The app uses a tab-based layout with 4 tabs: Dashboard, Subscriptions, Analytics, and Reminders. Modal screens are used for add/edit subscription forms (presented as form sheets)
- **State Management**: React Context (`SubscriptionsProvider`) for subscription data, with `@tanstack/react-query` available for server-side data fetching
- **Local Storage**: All subscription data is currently stored locally using `@react-native-async-storage/async-storage` — there is no server-side persistence of subscription data yet
- **Styling**: Dark theme with a slate/teal color palette defined in `constants/colors.ts`. Uses `StyleSheet.create` throughout (no CSS-in-JS library). Font family is Inter (loaded via `@expo-google-fonts/inter`)
- **UI Libraries**: `expo-haptics` for tactile feedback, `expo-linear-gradient` for gradients, `react-native-svg` for charts, `expo-blur` and `expo-glass-effect` for visual effects, `react-native-gesture-handler` and `react-native-reanimated` for animations
- **Date Handling**: `date-fns` for date formatting, calculation, and comparison

### Backend (Express)

- **Framework**: Express 5 running as a Node.js server
- **Current State**: The server is minimal — it has CORS setup, serves a static landing page in production, and has a placeholder route registration system. No API routes for subscription CRUD are implemented yet
- **Storage Layer**: `server/storage.ts` defines a `MemStorage` class with only user-related methods (getUser, createUser). The storage interface is ready to be extended with subscription CRUD operations
- **Database Schema**: Drizzle ORM with PostgreSQL. Currently only has a `users` table defined in `shared/schema.ts`. The schema uses `drizzle-zod` for validation schema generation

### Key Architectural Decisions

1. **Client-side storage vs server-side**: Subscription data lives entirely in AsyncStorage on the device. The server and database are scaffolded but not wired up for subscriptions. This means the app works offline-first but lacks sync/backup capabilities
2. **Shared schema directory**: `shared/` contains types and schemas meant to be shared between client and server, following a monorepo-like pattern within a single project
3. **Tab navigation with modals**: Core browsing happens in tabs, while data entry (add/edit) uses modal presentation for a clean UX
4. **Multi-currency support**: The app handles RUB, USD, and EUR with conversion utilities and per-subscription currency tracking, normalizing to monthly amounts for comparison

### Project Structure

```
app/                    # Expo Router pages
  (tabs)/               # Tab navigator screens (dashboard, subscriptions, analytics, reminders)
  add-subscription.tsx  # Modal for adding subscriptions
  edit-subscription.tsx # Modal for editing subscriptions
  onboarding.tsx        # First-run onboarding flow
components/             # Reusable React components
constants/              # Theme colors and constants
lib/                    # Client-side utilities (types, context, query client)
server/                 # Express backend
  index.ts              # Server entry point
  routes.ts             # API route registration
  storage.ts            # Data access layer
shared/                 # Shared code between client and server
  schema.ts             # Drizzle ORM database schema
migrations/             # Drizzle database migrations
scripts/                # Build scripts for static export
```

### Build & Development

- **Dev mode**: Two processes run concurrently — Expo dev server (`expo:dev`) and Express server (`server:dev` via tsx)
- **Production**: Static Expo web build served by Express (`expo:static:build` + `server:build` + `server:prod`)
- **Database**: `db:push` uses drizzle-kit to push schema to PostgreSQL

## External Dependencies

- **PostgreSQL**: Required via `DATABASE_URL` environment variable. Used with Drizzle ORM for server-side data persistence. Currently only the `users` table exists in the schema
- **Drizzle ORM + drizzle-kit**: Database ORM and migration tool for PostgreSQL
- **Expo Services**: Standard Expo SDK services (fonts, haptics, image picker, etc.) — no Expo EAS or push notification services configured
- **No external APIs**: The app does not currently integrate with any third-party subscription detection APIs, payment processors, or notification services. All data is manually entered by the user