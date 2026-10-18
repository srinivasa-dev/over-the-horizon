# Contributing to Over The Horizon

Thank you for your interest in contributing to **Over The Horizon**! We welcome bug fixes, physics refinements, audio enhancements, new planetary biomes, and optimizations.

---

## 1. Code of Conduct

Please review and adhere to our [Code of Conduct](file:///Users/srinivasayadav/StudioProjects/over-the-horizon/CODE_OF_CONDUCT.md) in all community interactions, issues, and pull requests.

---

## 2. Architectural Principles

When contributing to this repository, please respect our core architectural pillars:

1. **Zero-Build & Native ES Modules**:
   - The game runs directly in modern browsers using native HTML5 Import Maps and ES6 modules (`import * as THREE from 'three'`).
   - Do NOT introduce Webpack, Vite, Rollup, or heavy build pipelines into core development unless strictly optional.
2. **Pure Low-Poly Diorama Aesthetic**:
   - Maintain the stylized flat-shaded geometric low-poly diorama aesthetic (*Art of Rally*, *Firewatch*, *A Short Hike*).
   - All vehicle models, vegetation, terrain props, and orbital bodies are constructed using faceted Three.js geometries with flat shading.
3. **Zero Emojis in User Interface & Telemetry**:
   - All UI icons, telemetry indicators, weather symbols, and feedback badges MUST use bespoke SVG vectors (`src/js/icons.js`).
   - Unicode emoji characters are strictly prohibited across the user interface to ensure cross-platform consistency and visual immersion.
4. **Physically Occluded Particles**:
   - Atmospheric effects (rain, snow, sandstorms) must adhere to raycast and bounding-box occlusion rules, preventing precipitation from penetrating vehicle roofs, covered structures, or tunnels.
5. **Licensing & Intellectual Property Boundary**:
   - The engine source code is licensed under **GNU AGPLv3**. All code contributions must be compatible with AGPLv3.
   - All game design documents, worldbuilding lore, planetary concepts, concept artwork, and 3D models are **All Rights Reserved (Proprietary)**. Creative lore and game design remain the exclusive intellectual property of the project creators.

---

## 3. Development Workflow

### Prerequisites
- Modern web browser with WebGL 2.0 support (Chrome, Edge, Firefox, Safari).
- Any standard static HTTP server (Python 3, Node `http-server`, or VS Code Live Server).

### Running Locally

```bash
# Clone the repository
git clone https://github.com/your-username/over-the-horizon.git
cd over-the-horizon

# Start a local static HTTP server (Python 3)
python3 -m http.server 8080

# Or using Node.js
npx serve -l 8080 .
```

Open your browser at `http://localhost:8080` to play and develop.

---

## 4. Project Structure

```
over-the-horizon/
├── assets/                  # Previews, sound samples, and visual media
│   └── previews/            # 9-planet scenic docket snapshots
├── concept_art/             # Original visual development & concept artwork
├── docs/                    # Technical architecture & detailed design specifications
│   ├── ARCHITECTURE.md      # Engine systems, rendering loop, & physics breakdown
│   └── GAME_DESIGN_DOCUMENT.md # 9-Planet solar system design document
├── libs/                    # Zero-installation vendor libraries (Three.js r128)
├── src/js/                  # Game engine ES modules
│   ├── app.js               # Main game coordinator, loop, & camera controller
│   ├── arcade_engine.js     # Tri-mode logic (Cosy Cruise, Cascade, Crossy)
│   ├── audio.js             # Procedural Web Audio synthesizer (engine, nitro, chime)
│   ├── hud.js               # Telemetry cluster, solar orrery menu, & modal coordinator
│   ├── icons.js             # Crisp vector SVG icon library (zero emojis)
│   ├── planet.js            # Spherical terrain generator, 9 biomes, & prop scattering
│   └── vehicle.js           # 4-wheel raycast suspension & vehicle model builders
├── styles/
│   └── main.css             # Low-poly tactile HUD, keycaps, and solar orrery styling
├── index.html               # Main entrypoint & HTML5 import map
├── CHANGELOG.md             # Version history and release notes
├── CODE_OF_CONDUCT.md       # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md          # This contributor guide
├── LICENSE                  # MIT License
├── README.md                # Master repository documentation
└── SECURITY.md              # Security policy and vulnerability disclosure
```

---

## 5. Automated Headless Verification

Before submitting a Pull Request, run the automated headless verification suite to confirm that:
- The game launches without errors.
- Vehicle acceleration and suspension physics respond correctly.
- Mode transitions (Cosy Cruise, Celestial Cascade, Crossy Odyssey) operate cleanly.
- The UI maintains zero emoji characters.

```bash
# Run the automated in-game HUD and telemetry verification
node scratch/test_ingame_hud.js

# Run the 3D Solar System menu verification
node scratch/test_solar_system_menu.js
```

---

## 6. Pull Request Guidelines

1. **Branch Naming**: Use descriptive names (`feature/new-planet-props`, `fix/suspension-bounce`, `docs/update-readme`).
2. **Commit Messages**: Follow standard conventional commits:
   - `feat:` for new capabilities.
   - `fix:` for bug fixes.
   - `perf:` for performance optimizations.
   - `docs:` for documentation updates.
   - `style:` for UI styling adjustments.
3. **Keep PRs Focused**: Avoid bundling unrelated refactors into a single PR.
4. **Documentation**: If introducing new vehicle dynamics, planet attributes, or controls, update `README.md` and `docs/ARCHITECTURE.md`.
