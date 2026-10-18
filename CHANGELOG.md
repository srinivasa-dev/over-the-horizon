# Changelog

All notable changes to **Over The Horizon** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-10-18

### Added
- **Tactile Keycaps Controls Guide**: Implemented 3D beveled mechanical keycaps (`<kbd class="keycap">`) organized into two balanced non-wrapping rows (`WASD / Drive`, `SPACE / Nitro`, `C / Camera`, `P / Cruise`, `H / Horn`, `M / Solar Map`).
- **Digital Speedometer Cluster**: Added 34px tabular numeral speed readout with cyan bloom, segmented nitro energy bar with cyan electric bolt vector, and responsive autopilot status pill.
- **Diurnal Astronomical Atmosphere Console**: Custom 24-hour diurnal gradient scrubber with luminous sun bead thumb and real-time planetary clock (`Sunset 18:15`).
- **Bespoke Vector Weather Icons**: Handcrafted SVG vector capsules for Sun, Rain, 6-pointed dendritic crystal Snowflake, and Dust with active amber glow states.
- **Holographic Arcade Shields**: Replaced plain hearts with 3 cyan vector shield charge capsules in arcade headers and toasts.

### Changed
- **Zero Emoji Purge**: Completely purged 100% of emojis across the entire codebase (`planet.js`, `app.js`, `arcade_engine.js`, `hud.js`), replacing all occurrences with crisp bespoke SVG vectors or clean typographical tier badges.
- Scoped Field Guide modal keycap CSS to prevent cascade bleeding onto HUD keycaps.

### Fixed
- Fixed snowflake weather icon displaying an unstyled plus `+` sign.
- Resolved text wrapping and truncation on in-game controls guide.
- Resolved collision penetrations where vehicles could pass partially through trees and outposts.

---

## [2.1.0] - 2026-10-17

### Added
- **Interactive 3D Solar System Orrery Menu**:
  - Central faceted golden Sun radiating amber light.
  - 9 concentric planetary orbital ellipses with interactive node docking.
  - Floating mission briefing docket with live scenic snapshots, terrain specs, and vehicle tags.
  - Extruded amber `LAUNCH EXPEDITION ▶` capsule button.
  - Keyboard navigation (chevrons / left-right arrows) and smooth 3D camera lerping between planetary viewpoints.
- **Scenic Map Previews Atlas**: Generated high-resolution scenic vista snapshots for all 9 planetary destinations.

---

## [2.0.0] - 2026-10-17

### Added
- **9-Planet Solar System Roster**: Expanded from 2 planets to a complete 9-world system:
  1. **Cinderfell** (Mercury equivalent) — Scorched volcanic diorama with lava cracks.
  2. **Aetheria** (Venus equivalent) — Golden swirling dense atmosphere.
  3. **Oakhaven** (Earth) — Alpine national park diorama with pine forests, streams, and bridges.
  4. **Rustvale** (Mars equivalent) — Crimson canyon terrain with polar dry-ice cap.
  5. **Stormhaven** (Jupiter equivalent) — Massive gas giant with chromatic storm bands.
  6. **Ringhaven** (Saturn equivalent) — Golden sphere with iconic low-poly 3D orbital rings.
  7. **Frostveil** (Uranus equivalent) — Cyan methane sphere with steep 82° tilted rings.
  8. **Thalassa** (Neptune equivalent) — Deep cobalt ocean sphere with howling winds.
  9. **Nocturna** (Pluto equivalent) — Nitrogen-methane ice sphere on the cosmic edge.
- **Unique Vehicle Roster**: Designed bespoke vehicle models for each planet:
  - *TrailScout 4x4 Rig* (Oakhaven)
  - *Obsidian Lava Crawler* (Cinderfell)
  - *Aether Stratospheric Skimmer* (Aetheria)
  - *Valkyrie Dune Rover* (Rustvale)
  - *Titan Cloud Hauler* (Stormhaven)
  - *RingStrider Buggy* (Ringhaven)
  - *Cryo-Glider Half-Track* (Frostveil)
  - *Aquanaut Sub-Rover* (Thalassa)
  - *Nocturne Crystalline Surveyor* (Nocturna)
- **Tri-Mode Arcade Engine**:
  - **Cosy Cruise**: Freeform exploration, delivery waypoints, and diurnal time scrubbing.
  - **Celestial Cascade**: T3 Intercept sky hazards, ground astrolabe reticles, near-miss nitro surges, stardust combos, and stationary lock-on alarm.
  - **Crossy Odyssey**: Slalom runs, rolling boulders, crossing convoys, and weave streaks.

### Removed
- Removed legacy Planet Solaria to unify the game around the 9-planet solar system with Oakhaven as Earth.

---

## [1.0.0] - 2026-10-17

### Added
- Initial release of **Over The Horizon**.
- Spherical radial gravity physics with 4-wheel raycast suspension.
- Procedural low-poly terrain generation with noise displacement and biome coloring.
- Procedural Web Audio synthesizer for engine revs, nitro hiss, and chimes.
- Camera follow system with Chase, Orbit, and Cockpit perspectives.
