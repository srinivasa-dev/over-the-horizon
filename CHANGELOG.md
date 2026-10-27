# Changelog

All notable changes to **Over The Horizon** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.8] - 2026-10-27

### Added
- **Automated Test Suite & Code Coverage (`test/`)**:
  - Implemented zero-dependency headless unit test suite with 30 tests across 6 test suites (`planet.test.js`, `physics.test.js`, `models.test.js`, `weather.test.js`, `settings.test.js`, `icons.test.js`).
  - Achieved **90.7% line coverage** and **96.2% function coverage** across `src/js/` simulation modules.
- **GitHub Actions Continuous Integration (`.github/workflows/ci.yml`)**:
  - Configured automated PR and branch validation matrix on Node 20.x and 22.x with syntax verification and coverage reporting.
- **Astronomical Tiered Planetary Sizing (`src/js/planet.js`)**:
  - Expanded planetary scale from a uniform 65m globe to tiered astronomical radii:
    - Dwarf worlds: `Nocturna` ($R = 90\text{ m}$), `Cinderfell` ($R = 95\text{ m}$)
    - Terrestrial worlds: `Rustvale` ($R = 110\text{ m}$), `Oakhaven` ($R = 115\text{ m}$), `Aetheria` ($R = 115\text{ m}$)
    - Ice & Ocean giants: `Frostveil` ($R = 120\text{ m}$), `Thalassa` ($R = 125\text{ m}$)
    - Gas & Ring giants: `Ringhaven` ($R = 130\text{ m}$), `Stormhaven` ($R = 135\text{ m}$)
  - Scaled circuit circumferences from 408m to 565m-848m ($0.57\text{--}0.85\text{ km}$ per lap).
- **High-Fidelity 5,120-Triangle Terrain Resolution**:
  - Upgraded planetary surface mesh from 1,280 triangles to 5,120 triangles (`IcosahedronGeometry` detail 4) for crisp, tactile low-poly landscapes and smooth mountain summits.
- **Handcrafted Multi-Biomes & Curated Landmarks for All 9 Planets**:
  - Replaced generic 8-item alternating loops with 20–28 curated landmarks and environmental scatter items across 4 distinct named sectors per world.
  - Populated Mars terraforming bio-domes, comms towers, obsidian spires, geothermal vents, sulfuric glass rotunda domes, lightning pylons, plasma relay rods, ring tracker stations, cryo-drills, abyssal beacons, oceanic monoliths, RTG power posts, and roadside warning bollards.
- **Dynamic Planetary Rings & Alien Atmospheric Wisps**:
  - Scaled double translucent rings for Ringhaven and perpendicular rings for Frostveil to match expanded radii.
  - Implemented dynamic atmospheric drift particles tailored to each planet: volcanic ash embers, sulfuric smog, martian dust puffs, ion sparks, marine mist, and starlight void crystals.
- **Camera, Lighting & Physics Calibration**:
  - Dynamically calibrated initial diorama camera position, directional sun distance (380m-430m), diorama overview elevation (54m), and chase POV ground-clearance clamp.
  - Tuned predictive steering lookahead arc (`4.8 / planetR`) and curved ground light pool geometry.

---

## [2.5.3] - 2026-10-27

### Added
- **Dedicated Static SEO Pages**:
  - Created `/planets.html`: Complete guide to all 9 miniature planetary worlds with geological compositions, vehicle chassis specs, and gravitational metrics.
  - Created `/modes.html`: Complete breakdown of Cosy Cruise, Celestial Cascade, and Crossy Odyssey game modes, rules, and controls.
  - Created `/about.html`: Complete solo creator dossier (Srinivasa Yadav), compute telemetry, Three.js architecture, and links.
  - Updated `sitemap.xml` with priority indexing for all dedicated pages.
- **Progressive Web App Service Worker (`sw.js`)**:
  - Implemented offline play support with a Cache-First strategy for static 3D assets, procedural audio scripts, and CSS.
- **Settings & Accessibility Panel (`#settings-modal` / `src/js/settings.js`)**:
  - Graphics Quality toggle: High (Retina DPR + Shadows) vs Low (1x DPR, low-power mode for older mobile devices).
  - Reduced Motion accessibility toggle: Eliminates camera screen shake, respects `prefers-reduced-motion`.
  - Colorblind-Safe Hazard Mode: High-contrast cyan/amber/white palette and geometric chevrons on meteor astrolabes and rolling boulders.
  - Mobile Tilt Steering with Apple-compliant `DeviceOrientationEvent.requestPermission()` prompt for iOS Safari/Chrome.
  - Fully customizable keyboard controls remapping with persistent `localStorage` storage.
- **Expedition Score Card Sharing**:
  - Integrated native `navigator.share` / clipboard copy in the Game Over summary modal.

### Fixed
- **Mobile Pinch-Zoom Accessibility**:
  - Removed `user-scalable=no` and `maximum-scale=1.0` from `<meta name="viewport">` in `index.html`.
  - Removed document-level `touch-action: none;` from `html, body`. Confined `touch-action: none;` strictly to `#webgl-canvas` and virtual joystick controls while enabling `touch-action: pan-y pinch-zoom;` on all modals and handbook panels.
- **Dev-Only Text Removal**:
  - Removed player-facing local Wi-Fi / Chrome on iPhone debug notices from the fatal error screen. Replaced with clean, player-friendly WebGL support notice.
- **Presence Count Duplicate Cleanup**:
  - Removed duplicate hardcoded static text "1 Explorer Online" from raw HTML markup. Pills remain hidden by default until live Cloudflare WebSocket presence establishes connection.
- **Anti-Cloaking & SEO Cleanups**:
  - Removed cloaked `<article class="sr-only">` block beneath canvas in `index.html`.
  - Dropped obsolete `<meta name="keywords">` tag, eliminating trademark and spam risk.
  - Aligned author metadata and Schema.org JSON-LD to Srinivasa Yadav (Solo Creator).
  - Configured official Twitter / X handle `@TheSyntaxSinner` across all cards, meta tags, and creator dossier.

---

## [2.5.2] - 2026-10-18

### Changed
- **Responsive Mobile Presence Pill Polish**:
  - Implemented compact `[● N]` mobile pill for the planetary carousel menu, reducing horizontal footprint to ~37px to prevent crowding with audio and guide action buttons.
  - Aligned in-game HUD presence pill to the far right of the top header bar on the exact same row as `OVER THE HORIZON` (`.title-card`), preserving full text display across screen sizes.
- **Cloudflare Durable Object Free-Tier SQLite Migration**:
  - Configured `new_sqlite_classes = ["PresenceRoom"]` in `wrangler.toml` complying with Cloudflare's Durable Objects free tier architecture.
  - Linked client production presence gateway to `wss://overthehorizon-presence.srinivasa-yadav-b.workers.dev`.

---

## [2.5.1] - 2026-10-18

### Added
- **Cloudflare Serverless Presence Gateway (`cloudflare/`)**:
  - Implemented zero-database, edge-native active player tracking on Cloudflare Workers and Durable Objects using WebSocket Hibernation.
  - Hardened with strict Origin header validation (`overthehorizon.srinivasa.dev`, `srinivasa.dev`) to prevent hotlinking and third-party abuse.
  - Added hardware IP concurrency cap (max 3 connections per `CF-Connecting-IP`) to block automated bot flooding.
  - Zero financial risk: operates completely within Cloudflare's free tier with automated cut-off and zero overages.
- **Client-Side Live Explorer Indicator with Silent Fail-Safe (`src/js/presence.js`)**:
  - Added subtle, animated emerald green live status pill (`#carousel-presence-pill` and `#hud-presence-pill`) showing real-time concurrent explorers.
  - Built-in **Silent Fail-Safe**: if the WebSocket connection drops, errors, or hits Cloudflare's free quota, the indicator quietly hides itself (`display: none`) with zero UI errors, zero modals, and zero disruption to the 60 FPS Three.js render loop.

---

## [2.5.0] - 2026-10-18

### Added
- **Official Social Media Banners with Genuine Gameplay Photo Capture**:
  - Composed and generated official high-resolution branding banners using actual Three.js in-game gameplay capture of planet Oakhaven, the wooden bridge, pine forests, and the TrailScout 4x4 rig:
    - `assets/banner-readme.png` (1280x520) - Hero banner embedded at the top of `README.md`.
    - `assets/banner-github.png` (1280x640, 2:1 ratio) - GitHub repository social preview.
    - `assets/banner-twitter.png` (1500x500, 3:1 ratio) - Twitter / X profile header with avatar safe zone.
    - `assets/banner-linkedin.png` (1584x396, 4:1 ratio) - LinkedIn profile and company page cover banner.
    - `assets/og-cover.png` (1200x630, 1.91:1 ratio) - Open Graph and web social share image.
  - 100% genuine in-engine visual capture with zero AI-generated concept art substitutions and zero emojis.

---

## [2.4.9] - 2026-10-18

### Added
- **Microsoft Clarity Analytics & Session Diagnostics**:
  - Integrated official Microsoft Clarity analytics snippet into `<head>` with project ID `yznpugasgn` (`https://www.clarity.ms/tag/yznpugasgn`).
  - Asynchronously tracks user journeys, session replays, and heatmaps with zero overhead on the 60 FPS Three.js render loop.

### Changed
- **Removed Specific Calendar Dates from Dev Dossier Telemetry (`#about-modal`)**:
  - Removed `(Oct 17–18, 2026)` from the telemetry card, updating the label to timeless and clean **"TOTAL DEVELOPMENT TIME"** (`36+ hrs`).

---

## [2.4.8] - 2026-10-18

### Changed
- **Removed Procedural Sound Engine Card in Dev Dossier (`#about-modal`)**:
  - Cleaned up the separate `"PROCEDURAL SOUND ENGINE BY GEMINI"` box from the Creator & Dev Dossier tab as requested, leaving a streamlined, balanced left page focused on Creator Story, Vision, and Platform tooling.
  - Purged associated unused CSS classes (`.dev-sound-card`, `.dev-sound-header`, `.dev-sound-icon`, `.dev-sound-title-wrap`, `.dev-sound-title`, `.dev-sound-subtitle`, `.dev-sound-desc`, `.dev-sound-tags`, `.dev-sound-tag`) from `styles/main.css`.
- **Redesigned "RETURN TO EXPEDITION" Action Button (`.btn-timber-action`)**:
  - Fixed issue where the close/return button defaulted to browser user-agent styling resembling a greyed-out or disabled state (`#71717A` / `buttonface`).
  - Implemented tactile, high-visibility amber gold gradient styling (`linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`) with warm gold border (`#FDE68A`), dark bold typography (`#07151D`), return arrow SVG icon, and energetic amber glow shadow.
  - Added smooth interactive hover state (`#FBBF24` to `#EA580C`, icon translation) and active press feedback (`translateY(1px)`).
  - Applied consistently across both Field Handbook (`#btn-close-about`) and Dev Dossier (`#btn-close-about-2`) modal panels.

---

## [2.4.7] - 2026-10-18

### Added
- **Dev Dossier Expansion & Gemini Procedural Sound Engine Showcase (`#about-modal`)**:
  - Added dedicated **"PROCEDURAL SOUND ENGINE BY GEMINI"** showcase card to the Creator & Dev Dossier tab, spotlighting how the entire audio landscape was architected and coded using **Gemini 3.8 Flash (High)** within **Google Antigravity**.
  - Documented the zero-asset Web Audio API paradigm: 100% mathematical real-time synthesis (zero external MP3/WAV files, 0KB download footprint, dynamic multi-oscillator engine synthesis with RPM-pitch scaling, procedural tire road noise, and 9 modal planetary soundtracks across Pentatonic, Dorian, and Lydian scales).
  - Updated live production telemetry: **36+ development hours** (Oct 17–18, 2026), **~780M total tokens processed**, **5,200+ AI reasoning turns**, **145+ human prompt iterations**, **14,900+ lines of vanilla code**, and **< $28 estimated compute cost**.
  - Expanded Technical Architecture overview documenting latest systems: Edge-to-Edge Mobile & PWA Scaffold, Left-Docked Speedometer Thumb Zone, 360° Interactive Camera Orbit Drag, Restricted Wide-Angle Driver Cockpit View, and Ground-Projected Astrolabe Hazard Radar.

---

## [2.4.6] - 2026-10-18

### Fixed
- **Mobile Volume NaN Values & Web Audio Engine Resilience**:
  - Hardened `safeGetAudioSetting` and `safeSetAudioSetting` in `src/js/audio.js` with `Number.isFinite` validation, automatically clearing corrupt stringified `"NaN"` and `"undefined"` entries from mobile `localStorage`.
  - Added fallback checks before all Web Audio `setValueAtTime` calls, eliminating fatal `TypeError: The provided float value is non-finite` exceptions that previously halted the audio engine on mobile browsers.
  - Implemented iOS WebKit audio hardware unlocker (silent buffer playback on user interaction) and `interrupted` context recovery, ensuring audio streams reliably on mobile Safari and Chrome.
  - Added tactile auditory calibration blip feedback when adjusting sliders in the sound calibration popover.
- **Slider Drag Triggering Planet Map Changes**:
  - Added comprehensive element exclusion to the menu carousel swipe gesture detector (`e.target.closest('button, input, textarea, select, #carousel-audio-popover, #carousel-volume-container, #about-modal')`), preventing horizontal slider drags from being misinterpreted as carousel swipes.
  - Added event stop-propagation on touch and pointer events inside `#carousel-audio-popover` and `#btn-menu-mute`.
  - Added `touch-action: none` and `-webkit-touch-callout: none` in CSS to `.carousel-audio-popover` and `.audio-range-slider`, ensuring all touch drags remain strictly bound to slider adjustment.
- **iOS PWA Top Edge Translucent Blur**:
  - Changed `<meta name="apple-mobile-web-app-status-bar-style" content="default">` (from `black-translucent`), eliminating iOS WebKit's native progressive frosted-glass blur overlay across the top notch and status bar in standalone PWA mode.
  - Added `?v=2.4.6` cache-busting parameters to `styles/main.css` and `src/js/app.js` module imports, ensuring mobile PWAs fetch the newest bundle without stale cache interference.

---

## [2.4.5] - 2026-10-18

### Added
- **Menu-Exclusive Tactile Volume Settings & Calibration Drawer (`#carousel-audio-popover`)**:
  - Implemented sleek audio pill (`#btn-menu-mute`) in the top actions bar of the menu screen (`#welcome-modal`), displaying live volume percentage readout (`85%`, `MUTED`) and responsive SVG speaker icons.
  - Added glassmorphic Sound Calibration popover with precision sliders for **Master Volume**, **Soundtrack (Music)**, and **Engine & Hazards**, alongside an instant **MUTE** toggle.
  - **Zero Driving HUD Clutter Guarantee**: Volume configuration is strictly confined to the pre-game menu screen (`#welcome-modal`). Automatically dismisses on expedition launch, keeping the in-game driving view 100% distraction-free.
  - Added persistent audio preference storage (`localStorage`) with exception-safe wrappers to ensure private-browsing and iOS Safari compatibility.
  - Responsive layout optimizations for mobile screens (iPhone / Android) preventing any overlap with the title pill.

### Changed
- **Balanced Audio Gain Restructuring & System-Wide Volume Boost**:
  - Boosted default master volume from $50\%$ (`0.50`) to $85\%$ (`0.85`).
  - Increased soundtrack music sub-bus gain from `0.48` to `0.75` ($+56\%$).
  - Increased SFX sub-bus gain from `0.40` to `0.70` ($+75\%$).
  - Retuned procedural engine synthesis acceleration gain from `0.095` to `0.17` and idle purr from `0.022` to `0.038`.
  - Scaled road tire rumble noise from `0.045` to `0.070`.
  - Resolves player feedback regarding game audio being relatively quiet across mobile and desktop devices.

---

## [2.4.4] - 2026-10-18

### Fixed
- **iOS PWA Standalone Bottom Controls & Safe-Area Inset Fix**:
  - Replaced legacy `-webkit-fill-available` on `html, body` with `position: fixed; inset: 0;`, eliminating the WebKit PWA shrinking bug that caused virtual steering and driving controls to float 110px above the screen bottom.
  - Eliminated double safe-area padding on `.hud-layer` and `.bottom-bar` on mobile, anchoring virtual controls cleanly $12\text{px}$ above the physical iOS Home Indicator bar.
  - **Docked Speedometer to Left Thumb Zone on Mobile**: Relocated the speed indicator pill from screen center to the bottom-left directly above the steering buttons (`#btn-touch-left`, `#btn-touch-right`). Completely eliminates collision and overlap with the `AUTO` and `NITRO` action buttons, leaving the entire center view behind the vehicle wide open.
  - Verified identical responsive ergonomics across iPhone 15 Pro PWA and Android devices (Pixel 7 / Galaxy S23).

### Added
- **Cross-Browser Mobile Compatibility & iOS Chrome Resilience**:
  - Added `libs/es-module-shims.js` polyfill for browsers lacking native HTML5 import maps (older iOS WebKit / Chrome builds).
  - Implemented 3-tier fallback for `THREE.WebGLRenderer` (`high-performance` -> `default` -> basic fallback), preventing context crash on strict mobile GPU power settings.
  - Added WebGL context-loss recovery listeners (`webglcontextlost`, `webglcontextrestored`) to smoothly handle tab switching or device locking on iOS.
  - Protected `localStorage` high-score reads/writes with safe storage wrappers, eliminating fatal `DOMException: SecurityError` crashes in private browsing or partitioned storage mode.
  - Added a non-intrusive on-screen diagnostic overlay in `index.html` alerting users to enable iPhone **Settings > Chrome > Local Network** when testing local IP servers over Wi-Fi.

---

## [2.4.3] - 2026-10-18

### Added
- **Creator Spotlight & AI Dev Dossier Screen (`#about-modal`)**:
  - Implemented dual-tab diegetic navigation (`[EXPEDITION GUIDE]` and `[DEV DOSSIER & CREATOR]`).
  - Added developer profile card crediting **Srinivasa** ([srinivasa.dev](https://srinivasa.dev)) with verified badge and open-source GitHub repository link ([github.com/srinivasa-dev/over-the-horizon](https://github.com/srinivasa-dev/over-the-horizon)).
  - Documented the project vision: childhood imagination of exploring miniature spherical planets (*Over the Hill*, *Art of Rally*, *The Little Prince*) and pushing the frontier of autonomous AI-augmented engineering.
  - Spotlighted autonomous vibe-coding workflow with **Google Antigravity** powered by **Gemini 3.8 Flash (High)**.
  - Published authentic production telemetry extracted from project logs: 32+ development hours, ~700M total tokens processed, 4,680 model reasoning turns, 135 human prompt iterations, 13,880+ lines of vanilla code, and <$25 estimated compute cost.
  - Added in-game trigger: clicking the top-left brand crest or pressing `I` now opens the Dev Dossier modal during live gameplay.

---

## [2.4.2] - 2026-10-18

### Added
- **iOS Safe-Area HUD Scaffold (PWA / Standalone Web App Mode)**:
  - Implemented universal WebKit safe-area tokens on `:root` (`--sat`, `--sab`, `--sal`, `--sar`) with standard $0\text{px}$ fallbacks for zero desktop regressions.
  - Upgraded `.hud-layer` to a responsive safe-area scaffold, guaranteeing top brand badges, navigation odometer chips, and quick action pills sit comfortably below the iPhone notch and Dynamic Island ($59\text{px}$).
  - Padded `.banner-container` toast notifications (`max(24px, calc(var(--sat) + 12px))`), preventing autopilot or checkpoint alerts from being occluded by camera hardware.
  - Elevated virtual steering pads and accelerator/brake pedals above the iOS swipe-to-go-home indicator bar ($34\text{px}$) with dedicated touch breathing room.
  - Added horizontal notch and corner safe-area insets to landscape mode, ensuring left steering buttons and docked speedometer never clip into bezel cutouts.
  - Added safe-area padding to modal overlays (`.modal-overlay`, `.planetary-carousel-menu`, `.atmosphere-box`), preserving touch accessibility for close buttons and mission briefings.

---

## [2.4.1] - 2026-10-18

### Changed
- **Cockpit POV Wide-Angle Driver Restraints (Mode 2)**:
  - Restricted horizontal camera rotation strictly to a natural wide-angle driver field of view ($\pm 75^\circ$ / $\pm 1.30\text{ rad}$), preventing unnatural backwards rotation through the driver seat, headrests, or vehicle firewall.
  - Allowed realistic looking out the driver wing mirror/side window (left) and passenger wing mirror/side window (right) while maintaining forward road awareness.
  - Bounded cockpit vertical pitch between $[-0.35, +0.45]\text{ rad}$ (down to dashboard gauges, up to windshield header/sky), preventing clipping through floorboards or vehicle roof.
  - Added responsive $2.5\text{s}$ idle auto-recenter timeout during high-speed manual driving, smoothly gliding camera back to center windshield view.
- **Camera Terrain Ground-Clearance & Bottom Pitch Floor Clamp**:
  - Clamped minimum downward pitch from $-0.25$ to $-0.06\text{ rad}$ ($-3.4^\circ$), preventing the camera from dipping beneath the roadbed.
  - Added spherical terrain altitude enforcement ($R_{\text{terrain}} + 2.0\text{m}$ desktop, $+2.5\text{m}$ mobile) to guarantee camera never clips underneath terrain surface during downward drag.

---

## [2.4.0] - 2026-10-18

### Added
- **Dynamic Multi-Meteor Salvo & Wave Director (Celestial Cascade)**:
  - Replaced rigid, metronomic 1-by-1 spawner with structured, musical attack waves (`pincer`, `stagger_chase`, `slalom`, `scout`, `pinch_flank`, `leapfrog`).
  - Implemented staggered drop queue (0.2s–0.65s delay offsets) creating thrilling, navigable evasion corridors instead of impossible walls or trivial single drops.
  - Organic pacing with recovery breathers scaled to difficulty, allowing players to collect Stardust Shard clusters and escalate combos.
  - Immobile vehicle punisher: locks onto stationary campers ($<4\text{ km/h}$) and fires continuous targeted strikes until moving.
- **Precision Vehicle Footprint Collision Geometry (Celestial & Crossy Modes)**:
  - Implemented `_getDistanceToVehicle(hazardPos)` utilizing vehicle tangential oriented bounding box extents ($[-1.45, +1.50]\text{m}$ longitudinal spine, $\pm 0.98\text{m}$ lateral width).
  - Replaced center-point-only distance checks: hazards touching or overlapping any part of the front bumper, hood, side doors, or wheels now register direct hits accurately.
  - Calibrated near-miss close calls to measure against the vehicle's actual perimeter, rewarding skillful evasive weaves within $1.65\text{m}$–$3.4\text{m}$.
  - Applied footprint collision resolution across all Crossy Odyssey hazards: crossing transport convoys, mountain rockfall boulders, and sprinting wildlife/drones.
- **360° Orbital Camera Drag & Mobile Gesture Controls**:
  - Full pointer-driven yaw and pitch orbiting around the vehicle on desktop mouse drag and mobile touch drag.
  - Multi-touch pinch-to-zoom on mobile and mouse wheel zoom on desktop ($0.6\times$ to $2.5\times$).
  - Surface-tangent spherical frame mathematics relative to the car's local orthonormal basis ($\mathbf{vehFwd}, \mathbf{vehRight}, \mathbf{vehUp}$) preventing gimbal lock or flipping.
  - Virtual control input isolation preventing driving touch buttons from triggering camera drag, with smooth double-tap/double-click view re-centering.

---

## [2.3.0] - 2026-10-18

### Added
- **Planetary Road Systems Across All 9 Worlds**:
  - Implemented analytical road curves tailored for each celestial body (`getRoadLat(theta)`, `getRoadDLatDTheta(theta)`), replacing single-planet hardcoded formulas.
  - Added true 3D surface-orthogonal lateral vectors via `_getRoadRight(theta) = normalize(tangent × normal)`.
  - Widened and smoothed the roadbed corridor (`smoothstep(distRoad, 0.065, 0.145)`), providing an 8.4m flat driving lane with gentle 10m shoulder transitions across all biomes.
- **7.5m+ Obstacle Exclusion Safety Corridors**:
  - Relocated all alien landmarks, terraforming domes, communication arrays, cryo-drills, and spires to `±0.155` lateral offset (~10.1m from centerline), guaranteeing a strict >7.5m clearance margin.
  - Repositioned Oakhaven props: street lantern posts offset to `0.098` (6.4m), timber guardrails to `0.088` on outer bend shoulders, and widened wooden bridge railings to `±2.6m`.
- **Autopilot 2.0 (Predictive ADAS & Radar)**:
  - **4.5m Forward Predictive Lookahead**: Evaluates upcoming road tangent 4.5m ahead ($\theta + 4.5 / R$), anticipating curves instead of reacting late.
  - **Obstacle Proximity Radar**: Scans forward colliders within 14m and applies dynamic lateral steering repulsion if props are within 3.5m of the vehicle trajectory.
  - **Resilient Deflection Sliding**: Removed the automatic kill-switch upon glancing barrier collisions, allowing smooth physical deflection and immediate auto-recovery along the road tangent.
  - **Auto-Unstuck Watchdog**: Monitors speed during cruising and automatically triggers a 0.75s reversing maneuver with opposite-lock counter-steering if vehicle progress is pinned ($<1.5\text{ m/s}$ for $>1.8\text{ s}$).
- **Headless WebGL Multi-Planet Verification Suite**: Automated verification script testing continuous 15-second laps across Oakhaven, Rustvale, Cinderfell, Stormhaven, and Frostveil with 100% pass rate at 13.50 m/s cruise speed.
- **Mobile Ergonomic Driving Suite & Autopilot Assist**:
  - **Virtual Driving Cluster Autopilot Button**: Dedicated `#btn-touch-auto-drive` positioned in the right-thumb cluster above pedals with emerald active glow and manual touch cancel override.
  - **Dynamic On-Button Nitro Energy Gauge**: Integrated liquid cyan recharge meter (`#touch-nitro-meter`) directly inside the mobile `NITRO` button with live percentage readouts, eliminating duplicate gauges.
  - **Minimal Speed Capsule**: Mobile speedometer pill streamlined to display solely vehicle speed (`KM/H`), hiding the redundant desktop nitro bar and manual driving pill.
  - **Left-Aligned Mobile Odometer**: Repositioned the waypoint & expedition distance chip to the left side in mobile view, cleanly balancing the top app bar.
  - **Enhanced Touch Button Spacing**: Increased clearance across all virtual controls (16px pedal gap, 16px steer gap, 14px upper row gap, 16px vertical row separation) to prevent thumb collision.

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
