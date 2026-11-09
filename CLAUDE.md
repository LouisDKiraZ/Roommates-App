# Roomly — project memory for Claude

This file is the persistent context for working on this codebase. Read it
before making changes. For generic Expo/React Native guidance (commands,
"Expo changes every release, check the docs" reminder, EAS, Continuous
Native Generation), see [AGENTS.md](./AGENTS.md) — that file was generated
by `create-expo-app` and is kept up to date by Expo tooling itself.

## Concept

Roomly is a mobile app that helps roommates organize shared living. Five
features define the product:

1. **Cleaning task repartition** — a rotating list of chores assigned to
   roommates, with frequency (daily/weekly/biweekly/monthly) and due dates.
2. **Expense history & price splitting** — shared purchases logged with who
   paid, split evenly (or unevenly) across roommates, with a running "you
   owe / you're owed" balance.
3. **Shared calendar** — a household calendar for events (rent due dates,
   dinners, repair visits, birthdays), with room to connect Google Calendar
   and/or Apple Calendar later.
4. **Accounts** — sign up, log in, log out.
5. **Apartments** — create a new apartment or join an existing one via
   invite code; manage roommates.

## Current state: accounts + apartments are real, the rest is a skeleton

Two of the five features are wired to a real, locally-persisted backend:

- **Accounts** — sign up (name, username, password, confirm password — see
  password-strength rules in [lib/auth/password.ts](./lib/auth/password.ts)),
  log in, log out. Users live in an on-device SQLite database
  (`expo-sqlite`), passwords are salted + iterated-SHA-256 hashed (never
  stored in plaintext), and the logged-in user id is persisted via
  `@react-native-async-storage/async-storage` so sessions survive a reload.
- **Apartments** — create an apartment (gets a real random invite code), or
  request to join one by entering its code. Joining isn't instant: the
  apartment's **owner** (whoever created it) sees pending requests on the
  Apartment tab and has to accept or decline each one; the requester sees
  "Request pending" on the onboarding screen until then. One apartment per
  user, enforced at the repository layer.

There's still **no server** — "real" means persisted on this device's local
database, not synced anywhere. See "Known limitations" below for what that
means for testing the invite flow.

The other three features (**cleaning, expenses, calendar**) remain the
original **skeleton**: realistic mock data, no persistence, no real
handlers. Every screen that would normally perform an action for those
(add a task, add an expense, add an event, connect Google/Apple Calendar)
shows a native `Alert` saying the feature isn't implemented yet (see
[components/ui/Fab.tsx](./components/ui/Fab.tsx) and the inline
`Alert.alert(...)` calls across the `(tabs)` screens).

When implementing one of those remaining features, replace the relevant
mock data source and wire up real handlers the same way accounts/apartments
were — the screens, layout, and types are already there. See
[context/AppStateContext.tsx](./context/AppStateContext.tsx) and
`lib/repositories/*` for the pattern to follow (screens call context
methods; context methods call repositories; repositories are the only code
that touches the database).

## Stack & why

- **Expo (SDK 58) + Expo Router + TypeScript** — managed React Native
  workflow, file-based routing, works on iOS, Android, and web from one
  codebase. Chosen over bare React Native to avoid native tooling
  (Xcode/Android Studio) being required just to preview UI — Expo Go and
  the web build cover that.
- **React Native StyleSheet + a hand-rolled design-token file**
  ([constants/theme.ts](./constants/theme.ts), [constants/Colors.ts](./constants/Colors.ts))
  instead of a UI kit (NativeWind, Tamagui, RN Paper, etc.). Kept
  dependency-free since the brief was "visual skeleton" — swap in a UI kit
  later if the team wants one, but there's no lock-in today.
- **React Context** ([context/AppStateContext.tsx](./context/AppStateContext.tsx))
  for auth/apartment state — not Redux/Zustand/etc., since a handful of
  async methods plus a few pieces of state don't need a real state manager.
  Revisit if the remaining mock features grow data-fetching needs (React
  Query is the natural fit with Expo).
- **@expo/vector-icons (Ionicons)** for all icons — bundled with Expo,
  works identically on iOS/Android/web. (The template's `expo-symbols`
  `SymbolView` — iOS-only SF Symbols — was replaced with this for
  cross-platform consistency.)
- **expo-sqlite** for the accounts/apartments local database — a real
  relational store (foreign keys between users/apartments/membership/
  join_requests), ships inside Expo Go so `npx expo start` keeps working with
  no native rebuild. **expo-crypto** for password hashing (SHA-256 via
  `digestStringAsync`/`randomUUID` — there's no backend to run bcrypt on).
  **@react-native-async-storage/async-storage** for persisting the
  logged-in session (just the user id, never the password).

## Project structure

```
app/                        Expo Router routes — one file = one screen
  _layout.tsx                Root layout: theme + AppStateProvider + Stack
  index.tsx                  Entry point; redirects based on real auth/apartment state
                              (shows a spinner while the session restores)
  (auth)/                    Logged-out stack
    welcome.tsx
    login.tsx                 Username + password
    signup.tsx                 Name, username, password, confirm password + live strength checklist
  onboarding/
    apartment.tsx             Create / request-to-join-by-code / pending-request status (3 inline modes)
  (tabs)/                    Main app, bottom tab navigator
    _layout.tsx
    index.tsx                 Home dashboard (real apartment identity, mock chore/expense/event preview)
    cleaning.tsx               Feature 1 — still mock
    expenses.tsx                Feature 2 — still mock
    calendar.tsx                 Feature 3 — still mock
    apartment.tsx                 Feature 5, real: roommates, invite code + share, join-request
                                   approval (owner only), logout, settings
  +not-found.tsx
  +html.tsx                  Web-only document shell

components/
  Themed.tsx                 Template's Text/View + useThemeColor (kept)
  useColorScheme.ts(.web.ts) Light/dark detection (web hardcodes "light" —
                              see Known limitations below)
  ui/                        Design-system components used across screens
    Screen.tsx                 SafeAreaView + themed background — use this,
                                not SafeAreaView directly, on every screen
    Avatar.tsx                 Avatar + AvatarStack (overlapping avatars)
    Card.tsx, Chip.tsx, Button.tsx, TextField.tsx, ScreenHeader.tsx, Fab.tsx

constants/
  Colors.ts                  Light/dark palette (background, card, text, border, primary…)
  theme.ts                   Spacing, Radius, FontSize, FontWeight, Accent (category colors)

context/
  AppStateContext.tsx         Real auth + apartment/join-request state — the only thing
                               screens call; delegates to lib/repositories/*, see above

types/index.ts                Domain types. Real: AuthUser, MyJoinRequest,
                               IncomingJoinRequest. Mock-facing (unchanged): Roommate,
                               Apartment (now with ownerId), CleaningTask, Expense,
                               ExpenseSplit, CalendarEvent, CurrentUser

mocks/data.ts                 Sample data for the still-mock features (cleaning,
                               expenses, calendar) — this is what those 3 screens render

lib/
  calendarGrid.ts              Pure month-grid helper for the calendar screen
  errors.ts                    AppError — thrown with a user-facing message
  db/client.ts                 getDb(): lazily opens the expo-sqlite db + creates the
                                users/apartments/apartment_members/join_requests tables
  auth/
    password.ts                 Hashing (expo-crypto) + strength rules
    session.ts                   Persisted logged-in user id (AsyncStorage)
    validators.ts                 Username format check
  repositories/                Only code that runs SQL — one file per table/entity
    users.ts, apartments.ts, joinRequests.ts
```

## Conventions to follow

- **Always wrap a screen in `<Screen>`** ([components/ui/Screen.tsx](./components/ui/Screen.tsx)),
  not a raw `SafeAreaView` — it applies the themed background color, which
  React Navigation's default scene background does not.
- **Read colors via `useThemeColor({}, "key")`** from
  [components/Themed.tsx](./components/Themed.tsx), never hardcode hex
  values in a screen (hardcoding is fine only inside the token files
  themselves, or for one-off brand accents from `Accent` in
  [constants/theme.ts](./constants/theme.ts)).
- **Reuse `components/ui/*`** before writing a new primitive. If a pattern
  repeats a third time, extract it there.
- **Mock data lives in `mocks/data.ts`** for the still-mock features
  (cleaning, expenses, calendar). When wiring one of those up for real,
  follow the pattern accounts/apartments already use: a `lib/repositories/*`
  file owns the SQL, `AppStateContext` exposes methods/state built on it,
  screens only call the context — never import a repository or `getDb()`
  directly from a screen.
- A tapped action with no real feature yet should call
  `Alert.alert("X", "Not implemented yet.")` (or use `<Fab comingSoonLabel="…" />`,
  which does this for you) — don't silently no-op, and don't build the real
  feature as a drive-by unless that's the actual task.

## Known limitations (by design, for now)

- **No backend, still.** Accounts and apartments are real and persisted,
  but only to this device's local SQLite database — there's no server and
  nothing syncs between devices. In practice this means **testing the join
  flow means using two accounts on the same device/simulator/browser
  profile**: sign up account A, create an apartment (note the invite code),
  log out, sign up account B, enter A's invite code on the "join" screen
  (this only creates a pending request — B does not join yet), log out, log
  back in as A, accept B's request from the Apartment tab's "Join requests"
  section, log out, log in as B to land in the shared apartment.
- **`Share.share()` has no real implementation on web** (react-native-web
  throws "Share is not supported in this browser") — the "Share invite"
  button on the Apartment tab catches that and falls back to copying the
  invite message to the clipboard (or, if that's unavailable too, just
  shows the code in an alert). Native iOS/Android use the real share sheet.
- **Password hashing is a local-demo stretch (salted, iterated SHA-256 via
  `expo-crypto`), not bcrypt/Argon2.** There's no backend to run a real KDF
  on — reasonable for this app's purpose, not something to copy into a
  product with a server.
- **Cleaning, expenses, and calendar are still fully mock** — no
  persistence, no real authentication-equivalent handlers for those 3.
  Everything about them resets on app reload.
- **Web dark mode is hardcoded to light** in
  [components/useColorScheme.web.ts](./components/useColorScheme.web.ts) —
  this is the Expo template's own workaround for an SSR/hydration flash;
  native iOS/Android correctly follow the system theme via
  [components/useColorScheme.ts](./components/useColorScheme.ts).
- **`app.json`'s `web.output` is `"single"`** (classic client-rendered SPA),
  not `"server"` (the SDK 58 default) or `"static"`. Both alternatives
  produced a blank page in this app during testing — likely because the
  app is inherently client-only (Context-driven auth redirect logic isn't
  a good fit for prerendering/SSR). If a real backend and SSR-friendly data
  fetching are introduced later, this is worth revisiting — but don't
  change it without testing `npx expo start --web` after.
- **The reference "today" date for the calendar mock is hardcoded** to
  `2026-10-27` in [mocks/data.ts](./mocks/data.ts) (`today` export), not
  read from `Date.now()`, so the seeded events stay meaningfully placed
  relative to "today" regardless of when the app is actually run.

## Commands

See [AGENTS.md](./AGENTS.md) for the full list. The ones used most:

```bash
npx expo start              # dev server — scan the QR code with Expo Go
npx expo start --web        # web preview in a browser
npx tsc --noEmit            # typecheck
npx expo lint               # lint
npx expo-doctor             # diagnose dependency/config issues
```
