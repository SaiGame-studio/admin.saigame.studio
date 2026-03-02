# Platform Roadmap

**Last Updated:** March 2, 2026
**Audience:** Frontend / Client-side teams

---

## PHASE 1 — The Idle Game (Foundation)

**Theme:** Core platform infrastructure — authentication, multi-tenancy, player profiles
**Status:** ✅ Complete

### ✅ Completed

| Feature | Description | Completed |
|---|---|---|
| Studio & Game Management | Create and manage multiple studios and games from a single account | Feb 2026 |
| Player Profile & Progress | Per-game player profiles with level, progress, and custom game data | Feb 2026 |
| User Profiles | Display name, avatar, bio, and social links for each player | Feb 2026 |
| Team & Access Control | Role-based team membership with controlled access per game | Feb 2026 |
| Studio & Game Quotas | Per-studio and per-game usage limits based on subscription tier | Feb 2026 |
| Coin System | In-game wallet for earning, spending, and tracking virtual currency | Feb 22, 2026 |
| Plugin Subscriptions | Per-game plugin subscriptions that unlock higher player and content limits | Feb 23, 2026 |

---

## PHASE 2 — The Card Game (Economy, Mechanics & Engagement)

**Theme:** Full game economy — inventory, gacha, shop, quests, battles, leaderboard
**Status:** 🟢 In Progress

### ✅ Completed

| Feature | Description | Completed |
|---|---|---|
| Item & Inventory System | Players can own, manage, and track in-game items across sessions | Feb 24, 2026 |
| Gacha / Loot Box | Random loot packs with configurable weighted drop rates | Feb 25, 2026 |
| Player Mailbox | Send gifts, items, and messages directly to players' in-game inboxes | Feb 26–27, 2026 |
| Passive Resource Generation | Items and resources accumulate over time while the player is offline | Feb 27, 2026 |
| Shop System | In-game shop with purchase limits, restock schedules, and per-item currency support | Mar 2, 2026 |

### ⚪ Planned (Not Started)

| Feature | Group |
|---|---|
| Quest System | Progression |
| Daily Quest System | Progression |
| Battle Pass | Progression |
| Player Containers (Deck / Loadout / Board) | Game Support |
| Entity Definitions (Enemy / Room / Unit) | Game Support |
| Battle Engines (Card / Idle / Roguelike) | Game Support |
| PvP Raid System | Game Support |
| Leaderboard | Engagement |
| Achievement System | Engagement |
| In-App Purchase — Apple + Google Play | Monetization |
| Concurrent User Limit Enforcement | Platform |
| Game Tag System | Platform |
| Geo-Detection (Country from IP) | Platform |
| Player Journey Analytics | Analytics |
| Support Ticket System | Support |
| Email Broadcast to All Players | Communications |
| World Map System | World |

---

## PHASE 3 — The Action RPG (Multi-Region Expansion)

**Theme:** Scale globally — multi-region infrastructure, caching, crafting
**Status:** 🔵 Planned

**Primary goal:** Support 100,000+ concurrent users globally with sub-50ms response times.

| Capability | Description |
|---|---|
| Multi-Region Deployment | Games can be deployed to US, EU, and Asia-Pacific with local data residency |
| High-Performance Caching | Responses served from cache for faster load times globally |
| High-Availability Reads | Automatic failover with zero downtime for read operations |
| Real-Time Leaderboard | Live rank updates with "players near you" rank queries |
| Smooth High-Frequency Stat Updates | HP/MP/EXP and similar stats update rapidly without data loss |
| Graceful Degradation | Platform stays stable and responsive when backend services are under stress |
| Crafting System | Recipe-based item crafting — enables Merge-3 and RPG game types |
| Performance Optimization | Faster response times and higher throughput for growing player bases |

**Unlocks game types:** Action RPG, Merge-3, dungeon crawler with persistent world state.

---

## PHASE 4 — Realtime Multiplayer

**Theme:** Live bidirectional gameplay — matchmaking, real-time PvP
**Status:** 🔵 Planned

**Primary goal:** Enable real-time live PvP and co-op gameplay.

| Capability | Description |
|---|---|
| Real-Time Connection Infrastructure | Persistent connections for live gameplay with automatic reconnect |
| Skill-Based Matchmaking | Match players by skill level (ELO/MMR) with queue and timeout management |
| Game Session Management | Full session lifecycle with state sync and reconnect recovery |
| Live Leaderboard Push | Rank changes pushed to players in real-time without refreshing |
| Real-Time PvP (1v1 / Team) | Live simultaneous battles with synchronized game state |
| Spectator Mode | Watch live games in real-time |
| MOBA / Action Game Support | High-frequency game state sync for fast-paced action game types |

**Unlocks game types:** Real-time PvP, MOBA, co-op multiplayer, live spectator experiences.

---

## Summary

| Phase | Theme | Status | Key Unlocks |
|---|---|---|---|
| **Phase 1** | Foundation | ✅ Complete | Auth, multi-tenant, player profiles, coins, plugin tiers |
| **Phase 2** | Economy & Mechanics | 🟢 In Progress | Inventory, gacha, shop, quests, battles, leaderboard |
| **Phase 3** | Multi-Region Scale | 🔵 Planned | 100K+ CCU, global low-latency, crafting |
| **Phase 4** | Realtime Multiplayer | 🔵 Planned | Live PvP, matchmaking, spectator |
