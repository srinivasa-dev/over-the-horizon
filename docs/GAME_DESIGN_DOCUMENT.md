# Over The Horizon: Master Game Design Document

**An Alpine & 9-Planet Low-Poly Driving Odyssey**

> [!IMPORTANT]
> **PROPRIETARY & CONFIDENTIAL — ALL RIGHTS RESERVED**
> Copyright © 2026 Over The Horizon Creators. This document, game design specifications, planetary lore, storylines, and creative mechanics are proprietary intellectual property. No permission is granted to reproduce, copy, or create derivative games using these concepts.

---

## 1. Executive Summary & Vision

**Over The Horizon** is a stylized, spherical-gravity driving adventure that pairs the warm, tactile charm of miniature low-poly dioramas (*Art of Rally*, *Firewatch*, *A Short Hike*) with tight vehicle physics and dynamic arcade challenges.

Players explore a complete 9-planet solar system—anchored by the lush alpine diorama of **Oakhaven (Earth)**—navigating curved horizons in planetary exploration rigs under true spherical radial gravity.

```mermaid
graph LR
    Sun["Faceted Golden Sun"] --> P1["Cinderfell (Mercury)"]
    Sun --> P2["Aetheria (Venus)"]
    Sun --> P3["Oakhaven (Earth)"]
    Sun --> P4["Rustvale (Mars)"]
    Sun --> P5["Stormhaven (Jupiter)"]
    Sun --> P6["Ringhaven (Saturn)"]
    Sun --> P7["Frostveil (Uranus)"]
    Sun --> P8["Thalassa (Neptune)"]
    Sun --> P9["Nocturna (Pluto)"]
```

---

## 2. The 9-Planet Solar System Roster

Each world is an independent miniature spherical diorama with its own distinct geological biome, climate parameters, and bespoke exploration vehicle.

### 1. Cinderfell (Mercury Equivalent)
* **Visual Style:** Scorched charcoal basalt with glowing amber lava fissures, obsidian crags, and heat distortion ripples.
* **Vehicle:** *Obsidian Lava Crawler* — Heavy 6-wheel articulated crawler with heat-resistant treads.
* **Atmosphere:** Void vacuum, harsh solar radiation glare, zero clouds.

### 2. Aetheria (Venus Equivalent)
* **Visual Style:** Golden sulfuric atmosphere with swirling cloud bands, dense acid mist, and amber stone monoliths.
* **Vehicle:** *Aether Stratospheric Skimmer* — Streamlined low-drag high-pressure hover buggy.
* **Atmosphere:** High-density amber fog, heavy greenhouse atmospheric scattering.

### 3. Oakhaven (Earth)
* **Visual Style:** Lush alpine national park diorama. Low-poly faceted emerald pine trees, crystalline mountain streams, rustic wooden bridges, and cozy log cabins.
* **Vehicle:** *TrailScout 4x4 Rig* — Classic 1970s overland utility truck with high-travel suspension, roof rack, and rear spare tire.
* **Atmosphere:** Earth-like troposphere with dynamic diurnal sunlight, drifting cumulus clouds, gentle rain, and mountain blizzards.

### 4. Rustvale (Mars Equivalent)
* **Visual Style:** Deep crimson iron-oxide canyons, jagged sandstone spires, sweeping orange dunes, and frozen polar dry-ice caps.
* **Vehicle:** *Valkyrie Dune Rover* — Long-travel sand buggy with massive balloon paddle tires.
* **Atmosphere:** Thin pink-orange sky, swirling red dust devils.

### 5. Stormhaven (Jupiter Equivalent)
* **Visual Style:** Colossal gas giant diorama with chromatic storm bands, deep bronze and ivory turbulence swirls, and a Great Storm Vortex.
* **Vehicle:** *Titan Cloud Hauler* — Multi-rotor atmospheric cargo hauler engineered for dense cloud currents.
* **Atmosphere:** Continuous atmospheric turbulence, ambient lightning flashes.

### 6. Ringhaven (Saturn Equivalent)
* **Visual Style:** Golden planetary sphere encircled by majestic low-poly 3D faceted orbital rings composed of spinning ice boulders.
* **Vehicle:** *RingStrider Buggy* — Ultra-wide low-gravity sprint buggy with stabilization outriggers.
* **Atmosphere:** Serene golden sky with constant silhouettes of overhead rings.

### 7. Frostveil (Uranus Equivalent)
* **Visual Style:** Pale cyan methane ice diorama featuring a dramatic 82° steeply tilted ring disc.
* **Vehicle:** *Cryo-Glider Half-Track* — Twin front steering skis with rear caterpillar tracks for zero-friction ice gliding.
* **Atmosphere:** Pale aquamarine haze with diamond dust precipitation.

### 8. Thalassa (Neptune Equivalent)
* **Visual Style:** Deep cobalt and ultramarine liquid world with rolling tidal swells and submerged crystalline reefs.
* **Vehicle:** *Aquanaut Sub-Rover* — Dual-environment amphibious hull with deployable hydro-propellers.
* **Atmosphere:** High-velocity cobalt winds with heavy oceanic squalls.

### 9. Nocturna (Pluto Equivalent)
* **Visual Style:** Outer-rim dwarf planet diorama composed of faceted nitrogen ice plains, glowing violet geysers, and dark crystalline peaks.
* **Vehicle:** *Nocturne Crystalline Surveyor* — Low-profile scientific scout with high-intensity floodlights.
* **Atmosphere:** Deep cosmic night, twinkling constellations, and glowing stardust motes.

---

## 3. The Tri-Mode Gameplay Architecture

```mermaid
flowchart TD
    ModeSelect["3D Solar System Orrery Menu"] --> M1["Mode 1: Cosy Cruise"]
    ModeSelect --> M2["Mode 2: Celestial Cascade"]
    ModeSelect --> M3["Mode 3: Crossy Odyssey"]

    M1 --> M1_Play["Scenic exploration, delivery outposts, time scrubbing"]
    M2 --> M2_Play["T3 intercept meteors, astrolabe reticles, near-misses, combo multiplier"]
    M3 --> M3_Play["Crossing convoys, slalom courses, rolling boulders, weave streaks"]
```

### Mode 1: Cosy Cruise
* **Core Philosophy:** Pure scenic exploration and relaxed driving with no timers or damage pressure.
* **Objectives:** Traverse winding trails, navigate mountain bridges, discover scenic viewpoints, and log delivery waypoints.
* **Atmosphere Dial:** Players can dynamically scrub the 24-hour diurnal cycle (Dawn, Midday, Sunset, Midnight) and toggle weather states (Clear Sun, Rain, Snow, Dust).

### Mode 2: Celestial Cascade
* **Core Philosophy:** Dynamic sky hazard survival, wave evasion, and high-altitude celestial storm navigation.
* **Mechanics:**
  * **Dynamic Salvo & Wave Director:** Attacks are choreographed in varied, non-linear waves rather than predictable single drops:
    * *Twin Pincer:* Flanking pair targeting outer lane margins, leaving an open 5.6m center escape lane.
    * *Staggered Leapfrog:* Sequential 2-meteor wave (near-center followed by delayed far-flank) testing acceleration and braking.
    * *3-Meteor Slalom Course:* Staggered trio (Left, Right, Center) forming an organic rally slalom course with cascading detonations.
    * *Precision Scout:* High-velocity single strike for quick reflexes with generous stardust drop.
    * *Pinch Flank & Wide Split:* Asymmetric pairs that punish straight-line coasting and reward decisive swerves.
  * **Precision Vehicle Footprint Collision Geometry:** Collision tests against the vehicle's true oriented bounding ground footprint ($[-1.45, +1.50]\text{m}$ along length, $\pm 0.98\text{m}$ along width). Touching any part of the vehicle bumper, hood, wheels, or sides with the 1.65m blast radius registers a direct hit, eliminating center-point-only anomalies.
  * **Near-Miss Surge:** Passing within $1.65\text{m}$–$3.4\text{m}$ of the impact circle edge awards a +150 point bonus and refills 22% of the nitro energy reserve.
  * **Stardust Shards:** Impacts scatter collectible stardust shards (+50 pts) that extend combo timers and scale multipliers up to 5x.
  * **Stationary Lock-on Sentry:** Idling or stopping ($<4\text{ km/h}$) for >1.0s triggers an audible siren and focuses rapid, relentless direct strikes onto the vehicle until moving.
  * **Shield Matrix:** Vehicles possess 3 holographic shield charges before experiencing a mission failure.

### Mode 3: Crossy Odyssey
* **Core Philosophy:** Reflex-driven traffic slalom and mountain avalanche navigation.
* **Mechanics:**
  * **Crossing Convoys:** Multi-lane transport crawlers and wagons traverse intersections across the planet, with collision resolution respecting the full vehicle body and cart footprint.
  * **Rolling Boulders:** Giant faceted boulders detach from mountain peaks and tumble down natural elevation chutes across trails under spherical gravity.
  * **Sprinting Wildlife & Drones:** Rapid animal crossings (Bighorn Ram on Oakhaven, Skitter Drones on alien worlds) that cross the roadway at acute angles.
  * **Clean Weaves:** Threading through convoy gaps or dodging boulders within $2.6\text{m}$–$2.8\text{m}$ of the vehicle perimeter triggers escalating combo multipliers (up to 5x).

---

## 4. Vehicle Physics & Control Specification

* **Radial Spherical Gravity:** Gravity pulls continuously toward the planet's mathematical center `(0, 0, 0)`.
* **4-Wheel Independent Suspension:** Spring-damper raycasting maintains ground contact and prevents clipping through terrain polygons.
* **Continuous Planetary Roadbeds & Safety Corridors:** Every world features an 8.4m wide, leveled asphalt or compacted dirt roadbed (`smoothstep(distRoad, 0.065, 0.145)`). Roadside landmarks, research domes, and energy pylons observe a strict 7.5m+ exclusion corridor, preventing road obstructions.
* **Autopilot 2.0 (Predictive ADAS):** Pressing `P` (or mobile `AUTO` button) activates intelligent road-following assistance featuring 4.5m forward predictive curve lookahead, obstacle proximity radar steering repulsion, barrier glance deflection without throttle cuts, and an auto-unstuck watchdog that reverses and pivots if stalled.
* **Steering & Drift:** Ackermann geometry with dynamic high-speed stability damping. Nitro boosts deliver instant acceleration surges with procedural exhaust particles.
* **Camera Modes & 360° Orbital Gesture Control:**
  - **Mode 0 (Chase POV):** High-speed cinematic chase cam with dynamic portrait scaling, 360° pointer-driven orbital yaw, multi-touch pinch / wheel zoom ($0.6\times$ to $2.5\times$), double-click/tap re-centering, and automated terrain ground-clearance altitude clamping ($R_{\text{terrain}} + 2.0\text{m}$).
  - **Mode 1 (Smart Diorama):** Elevated isometric tracking view showcasing miniature spherical globe curvature and upcoming bends.
  - **Mode 2 (Cockpit / Windshield POV):** First-person driver perspective placed above the dashboard. Horizontal glance is strictly constrained to a natural wide-angle driver field of view ($\pm 75^\circ$ / $\pm 1.30\text{ rad}$), covering the driver's side mirror and passenger mirror while preventing backwards seat rotation. Vertical pitch bounded to $[-0.35, +0.45]\text{ rad}$ with 2.5s auto-recenter timeout.
  - **Mode 3 (Drone Track):** Autonomous orbital tracking fly-by camera circling the vehicle.
* **Control Schemes:**
  - **Keyboard:** `W/A/S/D` or Arrow Keys (Drive & Steer), `SPACE` (Nitro Boost), `S` (Brake), `C` (Camera Cycle), `P` (Autopilot Cruise), `H` (Horn), `M` (Solar System Menu), `Drag` (Orbit Camera).
  - **Mobile:** On-screen virtual directional steering pads, dedicated `AUTO` cruise button, on-button `NITRO` progress meter, `BRAKE` pedal, and single-finger / pinch camera gestures.

---

## 5. User Interface & Presentation Standards

1. **Tactile Mechanical Keycaps:** Controls guide uses beveled 3D mechanical keys with top highlights and bottom shadow bevels.
2. **Digital Speedometer Cluster:** Large tabular numeral speed indicator with cyan glow, segmented nitro energy bar, and autopilot indicator, docked to bottom-left on mobile for ergonomic thumb control.
3. **Diurnal Atmosphere Console:** Celestial gradient scrubber with glowing sun bead thumb and bespoke SVG weather capsules (Sun, Rain, 6-point dendritic Snowflake, Dust).
4. **Diegetic 3D Planetary Carousel Menu:** Pure 3D diorama screen where the selected low-poly planetary globe is the primary interactive hero object, complete with tactile mode capsules and candy amber launch button.
5. **Expedition Manual & Dev Dossier Handbook:** Dual-tab parchment binder providing gameplay rules, vehicle chassis blueprints, creator story, and live project telemetry.
6. **Menu Sound Calibration Drawer:** Tactile audio popover configuring master volume, procedural music, and SFX with instant audio feedback.
7. **Session Analytics & Diagnostics:** Integrated Microsoft Clarity analytics (Project ID `yznpugasgn`) for non-intrusive heatmaps, session diagnostics, and interaction insights.
8. **Zero-Emoji Mandate:** 100% of telemetry, headers, rankings, and notification toasts utilize bespoke SVG vectors or typography.
