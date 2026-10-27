// =================================================================
// OVER THE HORIZON: 3D Procedural Model Suite (Photos 1 & 2 Exact Match)
// =================================================================
import * as THREE from 'three';

// Color Palette Constants
export const PALETTE = {
  // Photo 1: Oakhaven Overland
  orangeBody: 0xD6581C,      // Warm retro orange
  creamCab: 0xF5F3EB,        // Vintage cream white
  darkTrim: 0x1E2126,        // Matte dark chassis
  chrome: 0xDFE3E8,          // High-reflectivity chrome
  windshield: 0x223142,      // Dark tinted glass
  amberLight: 0xF7981D,      // Amber indicators / beacon
  redJerry: 0xC92222,        // Red fuel can & taillight
  oliveDuffel: 0x4C5B3E,     // Olive canvas duffel
  tanDuffel: 0xB89C68,       // Khaki luggage
  crateWood: 0x7D4E29,       // Expedition wood crate
  rubberTire: 0x181A1D,      // Deep knobby rubber tire
  timberLog: 0x5C361D,       // Cedar log dark
  timberLogAlt: 0x4C2A14,    // Cedar log shadow
  roofShingle: 0x3B2314,     // Weathered timber roof
  chimneyStone: 0x666A70,    // Chimney masonry stone
  stoneGrey: 0x565B63,       // Village chalet stonework & masonry
  smokePuff: 0xF7F7FA,       // Puffy white chimney smoke
  porchDeck: 0x704626,       // Porch floor deck
  windowGlow: 0xFFDF73,      // Cozy golden amber interior
  fenceRail: 0x6B4426,       // Rustic split-rail fence
  pineTrunk: 0x4A2E19,       // Dark pine bark
  pineFoliage: [0x275C2A, 0x347331, 0x204D23, 0x3C8038], // 4-tiered pine facets

  // Photo 2: Solaria Moebius
  moebiusWhite: 0xF8F7F2,    // Clean cream aerodynamic shell
  moebiusOrange: 0xEB6622,   // High-contrast French comic orange
  sandstone: 0xE2925D,       // Golden sandstone arch
  sandstoneShadow: 0xC47847, // Sandstone shadowed face
  ancientWhite: 0xDEC8B2,    // Weathered minaret sandstone
  cyanRune: 0x18E2CD,        // Glowing turquoise rune bands
  mintCrystal: 0x5CE2BC,     // Photo 2 Mint-green crystal clusters
  peachDune: 0xF8D2B0,       // Warm peach dune sand
  lavenderSky: 0xDDD7ED,     // Cosmic lilac atmosphere
  moonLarge: 0xE0F4EB,       // Pale mint moon
  moonSmall: 0xF5DCDE        // Pale pink companion moon
};

function createMat(color, roughness = 0.82, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: roughness,
    metalness: metalness,
    flatShading: true
  });
}

function createHeadlightProjectionTexture(hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, 256, 256);
  
  const c = new THREE.Color(hexColor);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  // Soft feathered forward spotlight projection
  const grad = ctx.createRadialGradient(128, 25, 8, 128, 125, 120);
  grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0.85)`);
  grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.50)`);
  grad.addColorStop(0.70, `rgba(${r}, ${g}, ${b}, 0.16)`);
  grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(128, 120, 108, 118, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Builds a soft, feathered near-field ground glow (eliminates harsh 22m polygon slicing into terrain)
export function buildCurvedGroundLightPool(width, length, baseRadius, hexColor, maxBrightness = 0.32) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  const c = new THREE.Color(hexColor);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  // Smooth Gaussian radial falloff (100% feathered to 0 at perimeter)
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0.65)`);
  grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.35)`);
  grad.addColorStop(0.70, `rgba(${r}, ${g}, ${b}, 0.08)`);
  grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(3.6, 4.5);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: maxBrightness,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.03, -3.2); // Anchored right ahead of bumper
  return mesh;
}

// -----------------------------------------------------------------
// 1. OVERLAND 4x4 WAGON (PHOTO 1 VEHICLE)
// -----------------------------------------------------------------
export function buildOverlandWagon() {
  const group = new THREE.Group();
  group.name = "OverlandWagonBody";

  const matOrange = createMat(PALETTE.orangeBody, 0.75, 0.15);
  const matCream = createMat(PALETTE.creamCab, 0.85, 0.05);
  const matDark = createMat(PALETTE.darkTrim, 0.9, 0.2);
  const matChrome = createMat(PALETTE.chrome, 0.25, 0.85);
  const matGlass = createMat(PALETTE.windshield, 0.2, 0.3);
  const matRed = createMat(PALETTE.redJerry, 0.7, 0.1);
  const matAmber = createMat(PALETTE.amberLight, 0.5, 0.2);

  // Lower Hood & Main Body
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.36, 1.35), matOrange);
  hood.position.set(0, 0.46, -0.82);
  group.add(hood);

  const lowerRear = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.48, 1.75), matOrange);
  lowerRear.position.set(0, 0.40, 0.65);
  group.add(lowerRear);

  // Wheel Arch Rocker Fenders
  for (const x of [-0.80, 0.80]) {
    const fArch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.95), matOrange);
    fArch.position.set(x, 0.32, -0.95);
    group.add(fArch);

    const rArch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.95), matOrange);
    rArch.position.set(x, 0.32, 0.95);
    group.add(rArch);
  }

  // Front Grille & Chrome Bezel
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.32, 0.08), matDark);
  grille.position.set(0, 0.46, -1.52);
  group.add(grille);

  // Round Headlights (Photo 1)
  for (const x of [-0.52, 0.52]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), matChrome);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.48, -1.54);
    group.add(rim);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), createMat(0xFFF8E7, 0.1, 0.1));
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(x, 0.48, -1.57);
    group.add(bulb);
  }

  // Heavy Front Bumper & Recovery Hooks
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 0.18), matDark);
  bumper.position.set(0, 0.22, -1.55);
  group.add(bumper);

  for (const x of [-0.35, 0.35]) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), matChrome);
    hook.position.set(x, 0.22, -1.66);
    group.add(hook);
  }

  // Upper Vintage Cream Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.62, 1.68), matCream);
  cab.position.set(0, 0.92, 0.64);
  group.add(cab);

  // Sloped Front Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.52, 0.06), matGlass);
  windshield.rotation.x = 0.24;
  windshield.position.set(0, 0.88, -0.22);
  group.add(windshield);

  // Side Glass Windows
  for (const x of [-0.74, 0.74]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.45), matGlass);
    sideGlass.position.set(x, 0.96, 0.64);
    group.add(sideGlass);
  }

  // Rear Glass Window
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.42, 0.04), matGlass);
  rearGlass.position.set(0, 0.96, 1.49);
  group.add(rearGlass);

  // Roof & Overland Tubular Roof Rack
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 1.76), matCream);
  roof.position.set(0, 1.25, 0.64);
  group.add(roof);

  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 1.62), matDark);
  rack.position.set(0, 1.34, 0.64);
  group.add(rack);

  // 4 Round Auxiliary Roof Fog Lights (Photo 1 1:1 Match)
  for (const x of [-0.48, -0.16, 0.16, 0.48]) {
    const fRim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), matDark);
    fRim.rotation.x = Math.PI / 2;
    fRim.position.set(x, 1.45, -0.16);
    group.add(fRim);

    const fBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10), createMat(0xFFF6D6, 0.2, 0.1));
    fBulb.rotation.x = Math.PI / 2;
    fBulb.position.set(x, 1.45, -0.19);
    group.add(fBulb);
  }

  // Roof Expedition Cargo: Duffel Bags, Wooden Crate, Spare Tire
  const duffelOlive = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.60), createMat(PALETTE.oliveDuffel));
  duffelOlive.position.set(0.36, 1.48, 0.42);
  group.add(duffelOlive);

  const duffelTan = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.55), createMat(PALETTE.tanDuffel));
  duffelTan.position.set(-0.36, 1.47, 0.40);
  group.add(duffelTan);

  const woodCrate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.36), createMat(PALETTE.crateWood));
  woodCrate.position.set(0.34, 1.48, 1.05);
  group.add(woodCrate);

  const roofSpare = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 14), createMat(PALETTE.rubberTire));
  roofSpare.position.set(0, 1.45, -0.05);
  group.add(roofSpare);

  // Tailgate: Rear Ladder, Mounted Spare Tire, Red Jerry Cans, License Plate
  const rearSpare = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.20, 14), createMat(PALETTE.rubberTire));
  rearSpare.rotation.x = Math.PI / 2;
  rearSpare.position.set(0.24, 0.72, 1.62);
  group.add(rearSpare);

  const jerryCan = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.24), matRed);
  jerryCan.position.set(-0.15, 0.70, 1.58);
  group.add(jerryCan);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.02), createMat(0xF4E88C));
  plate.position.set(-0.15, 0.42, 1.54);
  group.add(plate);

  for (const x of [-0.70, 0.70]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), matRed);
    tail.position.set(x, 0.44, 1.53);
    group.add(tail);
  }

  return group;
}

// Overland Wheel with Vintage Cream Steel Rim & Chrome Hubcap
export function buildOverlandWheel() {
  const wheel = new THREE.Group();
  wheel.name = "OverlandWheel";

  const matTire = createMat(PALETTE.rubberTire, 0.9, 0.05);
  const matRim = createMat(PALETTE.creamCab, 0.6, 0.15); // Vintage cream rim (Photo 1)
  const matHub = createMat(PALETTE.chrome, 0.2, 0.85);   // Chrome center hubcap

  // Cylinder along local Y axis (outer face = +Y)
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.36, 18), matTire);
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.38, 14), matRim);
  wheel.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 10), matHub);
  hub.position.y = 0.02;
  wheel.add(hub);

  return wheel;
}

// -----------------------------------------------------------------
// 2. MOEBIUS EXPLORATION ROVER (PHOTO 2 VEHICLE)
// -----------------------------------------------------------------
// -----------------------------------------------------------------
// 2. THE GRAND PLANETARY TOUR: 8 BESPOKE VEHICLES (1 PER PLANET)
// -----------------------------------------------------------------

// 2a. MAGMA-CRAWLER 8x8 (Cinderfell / Mercury)
export function buildMagmaCrawler() {
  const group = new THREE.Group();
  group.name = "MagmaCrawlerBody";

  const matArmor = createMat(0x1F2421, 0.85, 0.3); // Charcoal heat-shield alloy
  const matLava = new THREE.MeshStandardMaterial({
    color: 0xFF5722,
    emissive: 0xE64A19,
    emissiveIntensity: 0.6,
    roughness: 0.4
  }); // Magma orange accents
  const matCage = createMat(0xE65100, 0.6, 0.4);
  const matVisor = createMat(0x111827, 0.15, 0.6);

  // Heavy Armored Chasis Hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 3.1), matArmor);
  hull.position.set(0, 0.45, 0);
  group.add(hull);

  // Reinforced Cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.58, 1.8), matArmor);
  cab.position.set(0, 0.95, -0.2);
  group.add(cab);

  // Slanted Visor Glass
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.32, 0.08), matVisor);
  visor.rotation.x = 0.28;
  visor.position.set(0, 0.96, -1.08);
  group.add(visor);

  // Heavy Tubular Roll Cage
  const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 1.9), matCage);
  cageTop.position.set(0, 1.28, -0.2);
  group.add(cageTop);

  for (const x of [-0.71, 0.71]) {
    for (const z of [-1.05, 0.65]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 6), matCage);
      bar.position.set(x, 0.98, z);
      group.add(bar);
    }
  }

  // Radiator Heat-Sink Fins on Rear Deck
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.22, 0.04), matLava);
    fin.position.set(0, 0.80, 0.95 + i * 0.16);
    group.add(fin);
  }

  // Heavy Front Bull-Bar
  const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.28, 0.16), matCage);
  bullbar.position.set(0, 0.38, -1.62);
  group.add(bullbar);

  return group;
}

export function buildMagmaWheel() {
  const wheel = new THREE.Group();
  wheel.name = "MagmaWheel";
  const matTire = createMat(0x181A1D, 0.95, 0.05);
  const matRim = createMat(0xD84315, 0.4, 0.6); // Burnt orange beadlock rim
  const matHub = createMat(0x212121, 0.3, 0.7);

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 16), matTire);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 12), matRim);
  wheel.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.38, 8), matHub);
  hub.position.y = 0.02;
  wheel.add(hub);
  return wheel;
}

// 2b. HAZMAT STRIDER (Aetheria / Venus)
export function buildHazmatStrider() {
  const group = new THREE.Group();
  group.name = "HazmatStriderBody";

  const matYellow = createMat(0xF59E0B, 0.7, 0.2); // Hazard yellow
  const matDark = createMat(0x1F2937, 0.85, 0.2);
  const matDome = new THREE.MeshStandardMaterial({
    color: 0x38BDF8,
    roughness: 0.15,
    metalness: 0.8,
    transparent: true,
    opacity: 0.65
  });

  // Sealed Lower Tub Chassis
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.48, 2.9), matYellow);
  tub.position.set(0, 0.46, 0);
  group.add(tub);

  // Black Hazard Stripes on Sides
  for (const x of [-0.83, 0.83]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 2.4), matDark);
    strip.position.set(x, 0.48, 0);
    group.add(strip);
  }

  // Hemispherical Pressurized Glass Cockpit Dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.82, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matDome);
  dome.position.set(0, 0.70, -0.35);
  group.add(dome);

  // Twin Atmospheric Air Scrubber Turbines
  for (const x of [-0.46, 0.46]) {
    const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 12), matDark);
    turbine.rotation.x = Math.PI / 2;
    turbine.position.set(x, 1.05, 0.85);
    group.add(turbine);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 10), matYellow);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(x, 1.05, 0.32);
    group.add(cone);
  }

  // Safety Warning Beacon on Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), matDark);
  mast.position.set(0, 1.45, -0.9);
  group.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFBBF24 }));
  beacon.position.set(0, 1.80, -0.9);
  group.add(beacon);

  return group;
}

export function buildHazmatWheel() {
  const wheel = new THREE.Group();
  wheel.name = "HazmatWheel";
  const matTire = createMat(0x1F2937, 0.9, 0.1);
  const matRim = createMat(0xF59E0B, 0.4, 0.5); // Yellow hazard rim
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.38, 16), matTire);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.40, 12), matRim);
  wheel.add(rim);
  return wheel;
}

// 2c. CRIMSON NOMAD 6x6 (Rustvale / Mars)
export function buildCrimsonNomad() {
  const group = new THREE.Group();
  group.name = "CrimsonNomadBody";

  const matCrimson = createMat(0xB91C1C, 0.7, 0.2); // Mars red oxide
  const matWhite = createMat(0xF8FAFC, 0.8, 0.1);
  const matDark = createMat(0x18181B, 0.85, 0.2);
  const matVisor = createMat(0x0F172A, 0.15, 0.5);

  // Long 6x6 Articulated Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.46, 3.2), matCrimson);
  frame.position.set(0, 0.46, 0);
  group.add(frame);

  // White Pressurized Crew Module
  const crewCab = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.62, 1.8), matWhite);
  crewCab.position.set(0, 0.96, -0.25);
  group.add(crewCab);

  // Angular Mars Rover Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.36, 0.08), matVisor);
  visor.rotation.x = 0.32;
  visor.position.set(0, 0.98, -1.15);
  group.add(visor);

  // Parabolic High-Gain Comms Dish on Roof
  const dishPiv = new THREE.Group();
  dishPiv.position.set(0.35, 1.38, 0.45);
  dishPiv.rotation.x = -0.45;
  dishPiv.rotation.y = 0.30;

  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.08, 0.18, 12), matWhite);
  dish.rotation.x = Math.PI / 2;
  dishPiv.add(dish);
  group.add(dishPiv);

  // Sample Container Trunks on Rear
  const sampleBox = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 0.72), matDark);
  sampleBox.position.set(0, 0.84, 1.12);
  group.add(sampleBox);

  return group;
}

export function buildCrimsonWheel() {
  const wheel = new THREE.Group();
  wheel.name = "CrimsonWheel";
  const matTire = createMat(0x1C1917, 0.95, 0.05); // High-flotation balloon tire
  const matRim = createMat(0xDC2626, 0.4, 0.6);   // Red rim
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.40, 18), matTire);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 14), matRim);
  wheel.add(rim);
  return wheel;
}

// 2d. ION SPEEDER (Stormhaven / Jupiter)
export function buildIonSpeeder() {
  const group = new THREE.Group();
  group.name = "IonSpeederBody";

  const matCobalt = createMat(0x1E3A8A, 0.6, 0.4); // Deep metallic cobalt
  const matIon = new THREE.MeshBasicMaterial({ color: 0x06B6D4 }); // Glowing cyan ion glow
  const matDark = createMat(0x0F172A, 0.85, 0.3);

  // Sleek Aerodynamic Wedge Chasis
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, 3.0), matCobalt);
  wedge.position.set(0, 0.42, 0);
  group.add(wedge);

  // Sloped Cockpit Canopy
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 4), matDark);
  canopy.rotation.x = -Math.PI / 2;
  canopy.position.set(0, 0.78, -0.3);
  group.add(canopy);

  // Twin Rear Ion Thruster Bells
  for (const x of [-0.45, 0.45]) {
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.65, 12), matDark);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(x, 0.52, 1.55);
    group.add(thruster);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), matIon);
    glow.rotation.y = Math.PI;
    glow.position.set(x, 0.52, 1.88);
    group.add(glow);
  }

  // Dual Lightning Arrestor Antennas
  for (const x of [-0.65, 0.65]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), matDark);
    rod.position.set(x, 1.15, -0.1);
    group.add(rod);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), matIon);
    tip.position.set(x, 1.85, -0.1);
    group.add(tip);
  }

  return group;
}

export function buildIonWheel() {
  const wheel = new THREE.Group();
  wheel.name = "IonWheel";
  const matTire = createMat(0x0B0F19, 0.9, 0.1);
  const matGlow = new THREE.MeshBasicMaterial({ color: 0x22D3EE });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.32, 16), matTire);
  wheel.add(tire);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 16), matGlow);
  glowRing.position.y = 0.17;
  wheel.add(glowRing);
  return wheel;
}

// 2e. SOLAR-SAIL SKIMMER (Ringhaven / Saturn)
export function buildSolarSkimmer() {
  const group = new THREE.Group();
  group.name = "SolarSkimmerBody";

  const matGold = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    roughness: 0.25,
    metalness: 0.9
  }); // Mirror gold foil
  const matWhite = createMat(0xFDFBF7, 0.7, 0.1);
  const matGlass = createMat(0x1E293B, 0.2, 0.4);

  // Streamlined Gold-Leaf Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 2.8), matGold);
  body.position.set(0, 0.44, 0);
  group.add(body);

  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 10), matGlass);
  bubble.scale.set(0.9, 0.7, 1.3);
  bubble.position.set(0, 0.78, -0.2);
  group.add(bubble);

  // Twin Swept Solar Wings
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 1.5), matGold);
    wing.position.set(side * 1.15, 0.65, 0.2);
    wing.rotation.z = side * 0.15;
    group.add(wing);
  }

  return group;
}

export function buildSolarWheel() {
  const wheel = new THREE.Group();
  wheel.name = "SolarWheel";
  const matTire = createMat(0x27272A, 0.9, 0.1);
  const matGold = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.3, metalness: 0.85 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.30, 16), matTire);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 12), matGold);
  wheel.add(rim);
  return wheel;
}

// 2f. CRYO-TRAC SNOWCAT (Frostveil / Uranus)
export function buildCryoTrac() {
  const group = new THREE.Group();
  group.name = "CryoTracBody";

  const matOrange = createMat(0xEA580C, 0.7, 0.15); // Arctic rescue orange
  const matWhite = createMat(0xF8FAFC, 0.8, 0.1);
  const matDark = createMat(0x1E293B, 0.9, 0.1);
  const matGlass = createMat(0x38BDF8, 0.2, 0.4);

  // Heavy Snowcat Tub
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.54, 3.0), matOrange);
  tub.position.set(0, 0.46, 0);
  group.add(tub);

  // High Enclosed Sub-Zero Cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.72, 1.9), matWhite);
  cab.position.set(0, 1.05, -0.15);
  group.add(cab);

  // Flat Heated Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.42, 0.06), matGlass);
  windshield.position.set(0, 1.12, -1.12);
  group.add(windshield);

  // Roof Rescue Searchlight
  const light = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 10), matDark);
  light.rotation.x = Math.PI / 2;
  light.position.set(0, 1.55, -0.75);
  group.add(light);

  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), new THREE.MeshBasicMaterial({ color: 0xFFFBEB }));
  bulb.position.set(0, 1.55, -0.87);
  group.add(bulb);

  return group;
}

export function buildCryoWheel() {
  const wheel = new THREE.Group();
  wheel.name = "CryoWheel";
  const matTrack = createMat(0x18181B, 0.95, 0.05); // Rubber track bogie
  const matRim = createMat(0xEA580C, 0.5, 0.5);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.42, 16), matTrack);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.44, 10), matRim);
  wheel.add(rim);
  return wheel;
}

// 2g. ABYSSAL HYDRO-ROVER (Thalassa / Neptune)
export function buildHydroRover() {
  const group = new THREE.Group();
  group.name = "HydroRoverBody";

  const matNavy = createMat(0x0369A1, 0.6, 0.3); // Deep ocean blue
  const matBrass = new THREE.MeshStandardMaterial({ color: 0xCA8A04, roughness: 0.35, metalness: 0.8 }); // Nautical brass
  const matDark = createMat(0x0F172A, 0.85, 0.2);
  const matGlass = new THREE.MeshBasicMaterial({ color: 0x06B6D4 });

  // Submersible Pressurized Hull
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 3.1, 14), matNavy);
  hull.rotation.x = Math.PI / 2;
  hull.position.set(0, 0.72, 0);
  group.add(hull);

  // Spherical Forward Observation Dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), matGlass);
  dome.rotation.x = -Math.PI / 2;
  dome.position.set(0, 0.72, -1.55);
  group.add(dome);

  // Twin Side Ballast Pontoons
  for (const side of [-1, 1]) {
    const pontoon = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.8, 10), matBrass);
    pontoon.rotation.x = Math.PI / 2;
    pontoon.position.set(side * 0.95, 0.42, 0);
    group.add(pontoon);
  }

  // Forward Deep-Sea High-Lumen Floodlight Array
  for (const x of [-0.35, 0.35]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), matBrass);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(x, 1.25, -0.9);
    group.add(pod);
  }

  return group;
}

export function buildHydroWheel() {
  const wheel = new THREE.Group();
  wheel.name = "HydroWheel";
  const matTire = createMat(0x0C4A6E, 0.85, 0.15); // Marine compound tire
  const matBrass = new THREE.MeshStandardMaterial({ color: 0xCA8A04, roughness: 0.4, metalness: 0.7 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16), matTire);
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.38, 12), matBrass);
  wheel.add(rim);
  return wheel;
}

// 2h. VOID-SLED (Nocturna / Pluto)
export function buildVoidSled() {
  const group = new THREE.Group();
  group.name = "VoidSledBody";

  const matCarbon = createMat(0x18181B, 0.9, 0.2); // Carbon-fiber dark
  const matRtg = new THREE.MeshStandardMaterial({
    color: 0xEF4444,
    emissive: 0xDC2626,
    emissiveIntensity: 0.8,
    roughness: 0.3
  }); // Glowing nuclear thermal RTG
  const matStarlight = new THREE.MeshBasicMaterial({ color: 0xC084FC });

  // Minimalist Low-Gravity Frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.32, 2.8), matCarbon);
  chassis.position.set(0, 0.38, 0);
  group.add(chassis);

  // Pilot Pod with Cold Astral Visor
  const pod = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 1.4), matCarbon);
  pod.position.set(0, 0.72, -0.3);
  group.add(pod);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.08), matStarlight);
  visor.position.set(0, 0.78, -1.02);
  group.add(visor);

  // Glowing RTG Power Core Cylinder on Rear
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.95, 12), matRtg);
  rtg.rotation.x = Math.PI / 2;
  rtg.position.set(0, 0.70, 0.85);
  group.add(rtg);

  return group;
}

export function buildVoidWheel() {
  const wheel = new THREE.Group();
  wheel.name = "VoidWheel";
  const matTire = createMat(0x18181B, 0.95, 0.05);
  const matCore = new THREE.MeshBasicMaterial({ color: 0xA855F7 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 16), matTire);
  wheel.add(tire);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 10), matCore);
  wheel.add(core);
  return wheel;
}

// Fallback Moebius references for backwards compatibility
export const buildMoebiusRover = buildMagmaCrawler;
export const buildMoebiusRoverWheel = buildMagmaWheel;

// -----------------------------------------------------------------
// 3. ALPINE TIMBER LOG CABIN OUTPOST (PHOTO 1)
// -----------------------------------------------------------------
export function buildAlpineCabin() {
  const cabin = new THREE.Group();
  cabin.name = "AlpineCabin";

  const matLog1 = createMat(PALETTE.timberLog);
  const matLog2 = createMat(PALETTE.timberLogAlt);
  const matRoof = createMat(PALETTE.roofShingle);
  const matStone = createMat(PALETTE.chimneyStone);
  const matSmoke = createMat(PALETTE.smokePuff, 0.9, 0.0);
  const matDeck = createMat(PALETTE.porchDeck);
  const matGlow = new THREE.MeshBasicMaterial({ color: PALETTE.windowGlow });
  const matFence = createMat(PALETTE.fenceRail);
  const matFlag = createMat(0xD62222);

  const cabinW = 4.2;
  const cabinD = 3.6;
  const cabinH = 2.4;
  const logR = 0.16;
  const numLogs = 8;

  // Subterranean Stone Foundation Skirt (Prevents Gaps on Sloped Facets)
  const matFoundation = createMat(0x3d4147);
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.6, 2.8, cabinD + 0.6), matFoundation);
  foundation.position.set(0, -1.2, 0);
  cabin.add(foundation);

  // 1. Stacked Round Timber Logs with Interlocking Notched Corners
  for (let i = 0; i < numLogs; i++) {
    const y = (i + 0.5) * (logR * 1.8);
    const colorMat = i % 2 === 0 ? matLog1 : matLog2;

    const fLog = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, cabinW + 0.4, 8), colorMat);
    fLog.rotation.z = Math.PI / 2;
    fLog.position.set(0, y, -cabinD * 0.5);
    cabin.add(fLog);

    const bLog = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, cabinW + 0.4, 8), colorMat);
    bLog.rotation.z = Math.PI / 2;
    bLog.position.set(0, y, cabinD * 0.5);
    cabin.add(bLog);

    const lLog = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, cabinD + 0.4, 8), colorMat);
    lLog.rotation.x = Math.PI / 2;
    lLog.position.set(-cabinW * 0.5, y + logR * 0.9, 0);
    cabin.add(lLog);

    const rLog = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, cabinD + 0.4, 8), colorMat);
    rLog.rotation.x = Math.PI / 2;
    rLog.position.set(cabinW * 0.5, y + logR * 0.9, 0);
    cabin.add(rLog);
  }

  // Cabin Solid Interior Block
  const interior = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.2, cabinH, cabinD - 0.2), matLog2);
  interior.position.set(0, cabinH * 0.5, 0);
  cabin.add(interior);

  // 2. Steep Gabled Pitch Roof (Weathered Alpine Shingles)
  const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, cabinD + 0.8), matRoof);
  roofL.rotation.z = -0.62;
  roofL.position.set(-1.15, cabinH + 0.82, 0);
  cabin.add(roofL);

  const roofR = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, cabinD + 0.8), matRoof);
  roofR.rotation.z = 0.62;
  roofR.position.set(1.15, cabinH + 0.82, 0);
  cabin.add(roofR);

  // 3. Stone Fireplace Chimney & Puffy Smoke Spheres (Photo 1)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.8, 0.75), matStone);
  chimney.position.set(1.35, 1.9, 0.95);
  cabin.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.16, 0.90), matStone);
  chimneyCap.position.set(1.35, 3.8, 0.95);
  cabin.add(chimneyCap);

  // Low-poly faceted smoke puffs drifting up from chimney
  const smokeSpecs = [
    { r: 0.28, pos: [1.35, 4.15, 0.95] },
    { r: 0.38, pos: [1.50, 4.65, 1.05] },
    { r: 0.48, pos: [1.70, 5.25, 1.18] },
    { r: 0.58, pos: [1.95, 5.95, 1.35] }
  ];
  for (const s of smokeSpecs) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s.r, 1), matSmoke);
    puff.position.set(...s.pos);
    cabin.add(puff);
  }

  // 4. Covered Front Porch Deck & Posts
  const porch = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.4, 0.18, 1.6), matDeck);
  porch.position.set(0, 0.09, -cabinD * 0.5 - 0.8);
  cabin.add(porch);

  for (const x of [-cabinW * 0.5, cabinW * 0.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), matLog1);
    post.position.set(x, 1.1, -cabinD * 0.5 - 1.5);
    cabin.add(post);
  }

  const awning = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.6, 0.10, 1.7), matRoof);
  awning.rotation.x = -0.15;
  awning.position.set(0, 2.15, -cabinD * 0.5 - 0.8);
  cabin.add(awning);

  // 5. Front Door & Cozy Glowing Amber Windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.08), matDeck);
  door.position.set(0.45, 0.95, -cabinD * 0.5 - 0.04);
  cabin.add(door);

  const winFront = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.08), matGlow);
  winFront.position.set(-1.15, 1.25, -cabinD * 0.5 - 0.04);
  cabin.add(winFront);

  const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.75), matGlow);
  winSide.position.set(-cabinW * 0.5 - 0.04, 1.25, 0);
  cabin.add(winSide);

  // 6. Rustic Split-Rail Yard Fence (Planted Deeply for Spherical Curvature)
  const fencePosts = [
    [-5.5, -6.5], [-2.5, -6.5], [1.5, -6.5], [5.5, -6.5],
    [5.5, -3.5], [5.5, -0.5], [5.5, 3.5],
    [-5.5, -3.5], [-5.5, -0.5], [-5.5, 3.5],
    [-2.5, 3.5], [1.5, 3.5]
  ];
  for (const p of fencePosts) {
    // 4.2m tall post sinking 3.0m underground so hillside drop never causes gaps
    const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6), matFence);
    fPost.position.set(p[0], -0.9, p[1]);
    cabin.add(fPost);
  }

  // Fence horizontal rails
  const rails = [
    { pos: [-4.0, 0.45, -6.5], size: [3.0, 0.08, 0.08] },
    { pos: [-4.0, 0.85, -6.5], size: [3.0, 0.08, 0.08] },
    { pos: [3.5, 0.45, -6.5], size: [4.0, 0.08, 0.08] },
    { pos: [3.5, 0.85, -6.5], size: [4.0, 0.08, 0.08] },
    { pos: [5.5, 0.45, -1.5], size: [0.08, 0.08, 5.0] },
    { pos: [5.5, 0.85, -1.5], size: [0.08, 0.08, 5.0] },
    { pos: [-5.5, 0.45, -1.5], size: [0.08, 0.08, 5.0] },
    { pos: [-5.5, 0.85, -1.5], size: [0.08, 0.08, 5.0] }
  ];
  for (const r of rails) {
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(...r.size), matFence);
    railMesh.position.set(...r.pos);
    cabin.add(railMesh);
  }

  // 7. Expedition Flagpole & Red Pennant
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.4, 6), createMat(0xE8ECF0));
  pole.position.set(3.2, 1.5, -5.2);
  cabin.add(pole);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.02), matFlag);
  flag.position.set(3.58, 3.8, -5.2);
  cabin.add(flag);

  return cabin;
}

// -----------------------------------------------------------------
// 4. LOW-POLY TIERED ALPINE PINES (PHOTO 1)
// -----------------------------------------------------------------
export function buildPineTree(tall = true) {
  const tree = new THREE.Group();
  tree.name = tall ? "PineTreeTall" : "PineTreeBushy";

  const matTrunk = createMat(PALETTE.pineTrunk);
  const foliageMats = PALETTE.pineFoliage.map(c => createMat(c));

  if (tall) {
    // 5.6m Tall Alpine Pine with Deep Ground Root Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.4, 6), matTrunk);
    trunk.position.y = 0.2; // Extends from y = -2.0 to y = +2.4
    tree.add(trunk);

    const tiers = [
      { r: 1.75, h: 1.6, y: 1.6, m: foliageMats[0] },
      { r: 1.40, h: 1.5, y: 2.5, m: foliageMats[1] },
      { r: 1.05, h: 1.4, y: 3.4, m: foliageMats[2] },
      { r: 0.65, h: 1.5, y: 4.4, m: foliageMats[3] }
    ];
    for (const t of tiers) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), t.m);
      cone.position.y = t.y + t.h * 0.5;
      tree.add(cone);
    }
  } else {
    // 4.0m Bushy Alpine Pine with Deep Ground Root Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.8, 6), matTrunk);
    trunk.position.y = -0.1; // Extends from y = -2.0 to y = +1.8
    tree.add(trunk);

    const tiers = [
      { r: 2.10, h: 1.4, y: 0.9, m: foliageMats[2] },
      { r: 1.65, h: 1.3, y: 1.8, m: foliageMats[0] },
      { r: 1.15, h: 1.2, y: 2.6, m: foliageMats[1] },
      { r: 0.60, h: 1.2, y: 3.3, m: foliageMats[3] }
    ];
    for (const t of tiers) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 8), t.m);
      cone.position.y = t.y + t.h * 0.5;
      tree.add(cone);
    }
  }

  return tree;
}

// -----------------------------------------------------------------
// 5. HANDCRAFTED WOODEN RIVER BRIDGE (PHOTO 1)
// -----------------------------------------------------------------
export function buildWoodenBridge() {
  const bridge = new THREE.Group();
  bridge.name = "WoodenRiverBridge";

  const matTimber = createMat(0x4E2F1A);
  const matPlank = createMat(0x6B4426);
  const matRail = createMat(0x59371E);

  const bridgeLen = 8.2;
  const bridgeW = 3.6;

  // 2 Heavy Main Timber Stringers
  for (const x of [-1.65, 1.65]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, bridgeLen), matTimber);
    stringer.position.set(x, 0, 0);
    bridge.add(stringer);
  }

  // 26 Cross Deck Planks
  const numPlanks = 26;
  const pitch = bridgeLen / numPlanks;
  for (let i = 0; i < numPlanks; i++) {
    const z = -bridgeLen * 0.5 + (i + 0.5) * pitch;
    const colorMat = i % 2 === 0 ? matPlank : matTimber;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.12, pitch * 0.88), colorMat);
    plank.position.set(0, 0.26, z);
    bridge.add(plank);
  }

  // Handrail Posts and Longitudinal Rails
  for (const x of [-1.75, 1.75]) {
    for (let i = 0; i < 6; i++) {
      const z = -bridgeLen * 0.45 + (i / 5.0) * bridgeLen * 0.9;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6), matRail);
      post.position.set(x, 0.80, z);
      bridge.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, bridgeLen), matRail);
    rail.position.set(x, 1.32, 0);
    bridge.add(rail);
  }

  // Deep Subterranean Timber Pilings & Stone Riverbed Abutments
  const matStone = createMat(0x3a3d42);
  for (const z of [-bridgeLen * 0.44, 0, bridgeLen * 0.44]) {
    for (const x of [-1.5, 1.5]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 3.4, 6), matTimber);
      piling.position.set(x, -1.5, z);
      bridge.add(piling);
    }
  }
  for (const z of [-bridgeLen * 0.48, bridgeLen * 0.48]) {
    const abutment = new THREE.Mesh(new THREE.BoxGeometry(bridgeW + 0.4, 2.5, 0.8), matStone);
    abutment.position.set(0, -1.1, z);
    bridge.add(abutment);
  }

  return bridge;
}

// -----------------------------------------------------------------
// 6. MOEBIUS LANDMARKS (PHOTO 2 REPLICATION)
// -----------------------------------------------------------------
export function buildSandstoneRingArch(radius = 6.2) {
  const arch = new THREE.Group();
  arch.name = "SandstoneRingArch";

  const matSand1 = createMat(PALETTE.sandstone);
  const matSand2 = createMat(PALETTE.sandstoneShadow);

  const numBlocks = 20;
  const blockLen = (Math.PI * radius / numBlocks) * 1.15;
  const thickness = 0.85;

  for (let i = 0; i <= numBlocks; i++) {
    const angle = (i / numBlocks) * Math.PI;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    const mat = i % 2 === 0 ? matSand1 : matSand2;

    const block = new THREE.Mesh(new THREE.BoxGeometry(blockLen, thickness, thickness), mat);
    block.position.set(px, py, 0);
    block.rotation.z = angle + Math.PI / 2;
    arch.add(block);
  }

  return arch;
}

export function buildAncientMinaret() {
  const minaret = new THREE.Group();
  minaret.name = "AncientMinaret";

  const matStone = createMat(PALETTE.ancientWhite);
  const matShadow = createMat(PALETTE.sandstoneShadow);

  // Stepped base
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.6, 8), matStone);
  b1.position.y = 0.3;
  minaret.add(b1);

  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.6, 8), matStone);
  b2.position.y = 0.9;
  minaret.add(b2);

  // Tower Shaft with Arched Niches
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 7.5, 8), matStone);
  shaft.position.y = 4.65;
  minaret.add(shaft);

  for (const angle of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
    const nx = Math.cos(angle) * 0.88;
    const nz = Math.sin(angle) * 0.88;
    const niche = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.12), matShadow);
    niche.position.set(nx, 4.5, nz);
    niche.rotation.y = angle;
    minaret.add(niche);
  }

  // Corbelled Balcony Gallery
  const balc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.45, 8), matStone);
  balc.position.y = 8.6;
  minaret.add(balc);

  // Conical Spire Dome
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.8, 8), matStone);
  spire.position.y = 10.8;
  minaret.add(spire);

  return minaret;
}

export function buildLeaningObelisk(height = 8.5) {
  const obelisk = new THREE.Group();
  obelisk.name = "LeaningObelisk";

  const matStone = createMat(PALETTE.ancientWhite);
  const matCyan = new THREE.MeshBasicMaterial({ color: PALETTE.cyanRune });

  // 4-sided tapered obelisk body
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, height, 0.9), matStone);
  col.position.y = height * 0.5;
  obelisk.add(col);

  // Pyramidion top apex
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.1, 4), matStone);
  top.rotation.y = Math.PI / 4;
  top.position.y = height + 0.55;
  obelisk.add(top);

  // Glowing Turquoise Rune Bands
  for (const bh of [height * 0.35, height * 0.65]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.18, 0.94), matCyan);
    band.position.y = bh;
    obelisk.add(band);
  }

  // Leaning tilt (12 degrees)
  obelisk.rotation.z = 0.21;
  return obelisk;
}

export function buildMintCrystalCluster(scaleFactor = 1.0) {
  const cluster = new THREE.Group();
  cluster.name = "MintCrystalCluster";

  const matCrystal = createMat(PALETTE.mintCrystal, 0.2, 0.35);

  const specs = [
    { r: 0.45, h: 2.8, pos: [0, 0, 0], rot: [0.10, 0, 0.05] },
    { r: 0.35, h: 2.1, pos: [0.55, 0, 0.25], rot: [-0.15, 0.5, 0.20] },
    { r: 0.38, h: 1.9, pos: [-0.50, 0, 0.35], rot: [0.22, 1.2, -0.18] },
    { r: 0.28, h: 1.4, pos: [-0.35, 0, -0.45], rot: [-0.25, -0.8, -0.12] },
    { r: 0.30, h: 1.6, pos: [0.45, 0, -0.35], rot: [0.18, 2.1, 0.22] }
  ];

  for (const s of specs) {
    const crystal = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r, s.h, 6), matCrystal);
    body.position.y = s.h * 0.5;
    crystal.add(body);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(s.r, 0.55, 6), matCrystal);
    tip.position.y = s.h + 0.275;
    crystal.add(tip);

    crystal.position.set(...s.pos);
    crystal.rotation.set(...s.rot);
    cluster.add(crystal);
  }

  cluster.scale.set(scaleFactor, scaleFactor, scaleFactor);
  return cluster;
}

// -----------------------------------------------------------------
// 6. OAKHAVEN ALPINE VILLAGE & SETTLEMENT ARCHITECTURE
// -----------------------------------------------------------------
export function buildAlpineVillageHouse(variant = 0) {
  const house = new THREE.Group();
  house.name = "AlpineVillageHouse";

  const matStone = createMat(PALETTE.stoneGrey, 0.85);
  const matTimber = createMat(variant === 0 ? PALETTE.timberLog : PALETTE.timberLogAlt, 0.85);
  const matRoof = createMat(variant === 0 ? 0x8B3A2A : 0x4A5568, 0.7); // Red-tile or slate-grey roof
  const matGlow = new THREE.MeshBasicMaterial({ color: 0xFFE082 }); // Warm glowing window
  const matChimney = createMat(0x5A6268, 0.9);

  // Subterranean Stone Foundation Base (Extends 2.3m deep into terrain)
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 2.9), matStone);
  base.position.y = -0.9;
  house.add(base);

  // Timber Log Living Floor
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.6), matTimber);
  walls.position.y = 1.2;
  house.add(walls);

  // Gabled Overhanging Chalet Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.3, 4), matRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.45;
  roof.scale.set(1.0, 1.0, 1.25);
  house.add(roof);

  // Warm Glowing Windows
  for (const z of [-0.6, 0.6]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), matGlow);
    win.position.set(1.12, 1.25, z);
    house.add(win);
  }

  // Rustic Stone Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), matChimney);
  chimney.position.set(-0.65, 2.5, 0.4);
  house.add(chimney);

  return house;
}

export function buildStreetLanternPost() {
  const lantern = new THREE.Group();
  lantern.name = "StreetLanternPost";

  const matIron = createMat(0x24292E, 0.4, 0.5);
  const matGlow = new THREE.MeshBasicMaterial({ color: 0xFFE890 });

  // Post pole with deep ground anchor (Extends 2.0m underground)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.4, 6), matIron);
  pole.position.y = 0.2;
  lantern.add(pole);

  // Lantern head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), matIron);
  head.position.y = 2.35;
  lantern.add(head);

  // Glowing bulb
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), matGlow);
  bulb.position.y = 2.35;
  lantern.add(bulb);

  return lantern;
}

export function buildWindmill() {
  const windmill = new THREE.Group();
  windmill.name = "HighlandWindmill";

  const matStone = createMat(0xC4B8A5, 0.9);
  const matRoof = createMat(0x3B2F2F, 0.8);
  const matWood = createMat(PALETTE.timberLog, 0.85);
  const matSail = createMat(0xFDFBF7, 0.7);

  // Tapered Octagonal Stone Tower with Subterranean Foundation Skirt (Extends 2.6m underground)
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.1, 7.8, 8), matStone);
  tower.position.y = 1.3;
  windmill.add(tower);

  // Conical Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.3, 8), matRoof);
  cap.position.y = 5.7;
  windmill.add(cap);

  // Rotor Hub & 4 Rotating Sails
  const rotorGroup = new THREE.Group();
  rotorGroup.name = "WindmillRotor";
  rotorGroup.position.set(0, 5.0, 1.35);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 8), matWood);
  hub.rotation.x = Math.PI / 2;
  rotorGroup.add(hub);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.08), matWood);
    spar.position.set(Math.sin(angle) * 1.6, Math.cos(angle) * 1.6, 0);
    spar.rotation.z = -angle;
    rotorGroup.add(spar);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.4, 0.02), matSail);
    sail.position.set(Math.sin(angle) * 1.6 + Math.cos(angle) * 0.22, Math.cos(angle) * 1.6 - Math.sin(angle) * 0.22, 0.03);
    sail.rotation.z = -angle;
    rotorGroup.add(sail);
  }

  windmill.add(rotorGroup);
  return windmill;
}

export function buildObservatoryDome() {
  const obs = new THREE.Group();
  obs.name = "StargazerObservatory";

  const matWhite = createMat(0xF2F5F8, 0.3, 0.4);
  const matFoundation = createMat(0x3B424C, 0.9, 0.1); // Mountain bedrock foundation
  const matDark = createMat(0x2B313A, 0.5, 0.6);
  const matGlow = new THREE.MeshBasicMaterial({ color: 0x64B5F6 });

  // Subterranean Bedrock Foundation Pedestal (Extends 2.8m deep underground)
  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.2, 3.4, 16), matFoundation);
  foundation.position.y = -1.2; // Extends from y = -2.9 to y = +0.5
  obs.add(foundation);

  // Cylindrical Observation Rotunda
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.65, 2.2, 16), matWhite);
  base.position.y = 1.1;
  obs.add(base);

  // Hemispherical Telescope Dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), matWhite);
  dome.position.y = 2.2;
  obs.add(dome);

  // Slit Shutter & Telescope Barrel
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.4, 1.8), matDark);
  slit.position.set(0, 3.2, 1.1);
  obs.add(slit);

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 10), matDark);
  scope.rotation.x = -Math.PI / 3.5;
  scope.position.set(0, 3.1, 1.2);
  obs.add(scope);

  // Communications Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 3.6, 6), matDark);
  mast.position.set(2.2, 1.8, -1.2);
  obs.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), matGlow);
  beacon.position.set(2.2, 3.65, -1.2);
  obs.add(beacon);

  return obs;
}

// -----------------------------------------------------------------
// 7. PLANETARY LANDMARK SUITE (8 SOLAR COMPANIONS)
// -----------------------------------------------------------------

// Cinderfell (Mercury) Landmarks
export function buildObsidianSpire() {
  const spire = new THREE.Group();
  spire.name = "ObsidianSpire";
  const matObsidian = createMat(0x18181B, 0.9, 0.1);
  const matMagma = new THREE.MeshStandardMaterial({
    color: 0xFF5722,
    emissive: 0xE64A19,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  const pillar = new THREE.Mesh(new THREE.ConeGeometry(0.75, 7.5, 5), matObsidian);
  pillar.position.y = 2.4;
  spire.add(pillar);

  const glowCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), matMagma);
  glowCap.position.y = 6.2;
  spire.add(glowCap);

  return spire;
}

export function buildThermalVent() {
  const vent = new THREE.Group();
  vent.name = "ThermalVent";
  const matStone = createMat(0x27272A, 0.95);
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xF97316, emissive: 0xEA580C, emissiveIntensity: 0.9 });

  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 2.8, 8), matStone);
  cone.position.y = 0.8;
  vent.add(cone);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), matGlow);
  core.position.y = 2.1;
  vent.add(core);

  return vent;
}

// Aetheria (Venus) Landmarks
export function buildSulfuricGlassDome() {
  const domeGroup = new THREE.Group();
  domeGroup.name = "SulfuricGlassDome";
  const matBase = createMat(0x78350F, 0.8, 0.2);
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xFBBF24,
    transparent: true,
    opacity: 0.65,
    roughness: 0.15,
    metalness: 0.8
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.8, 8), matBase);
  base.position.y = 0.2;
  domeGroup.add(base);

  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 2), matGlass);
  dome.position.y = 1.4;
  domeGroup.add(dome);

  return domeGroup;
}

export function buildSulfuricArch() {
  const arch = new THREE.Group();
  arch.name = "SulfuricArch";
  const matArch = createMat(0xB45309, 0.85, 0.1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.45, 6, 12, Math.PI), matArch);
  ring.position.y = 0.5;
  arch.add(ring);
  return arch;
}

// Rustvale (Mars) Landmarks
export function buildMarsTerraformDome() {
  const group = new THREE.Group();
  group.name = "MarsTerraformDome";
  const matWhite = createMat(0xF8FAFC, 0.7, 0.2);
  const matGlass = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matWhite);
  dome.position.y = 0.4;
  group.add(dome);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.18, 6, 16), matWhite);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  group.add(ring);

  return group;
}

export function buildMarsCommsTower() {
  const tower = new THREE.Group();
  tower.name = "MarsCommsTower";
  const matTruss = createMat(0x334155, 0.5, 0.5);
  const matDish = createMat(0xF1F5F9, 0.4, 0.3);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 6.2, 6), matTruss);
  mast.position.y = 2.4;
  tower.add(mast);

  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.3, 0.5, 12), matDish);
  dish.rotation.x = Math.PI / 3;
  dish.position.set(0, 5.0, 0.4);
  tower.add(dish);

  return tower;
}

// Stormhaven (Jupiter) Landmarks
export function buildLightningPylon() {
  const pylon = new THREE.Group();
  pylon.name = "LightningPylon";
  const matDark = createMat(0x0F172A, 0.9, 0.1);
  const matIon = new THREE.MeshBasicMaterial({ color: 0x06B6D4 });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, 7.8, 6), matDark);
  mast.position.y = 3.2;
  pylon.add(mast);

  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), matIon);
  tip.position.y = 7.1;
  pylon.add(tip);

  return pylon;
}

export function buildPlasmaRod() {
  const rod = new THREE.Group();
  rod.name = "PlasmaRod";
  const matDark = createMat(0x1E293B, 0.8, 0.2);
  const matBeam = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), matDark);
  base.position.y = 0.4;
  rod.add(base);

  const plasma = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 6), matBeam);
  plasma.position.y = 2.8;
  rod.add(plasma);

  return rod;
}

// Ringhaven (Saturn) Landmarks
export function buildRingTrackerStation() {
  const station = new THREE.Group();
  station.name = "RingTrackerStation";
  const matGold = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.3, metalness: 0.8 });
  const matDark = createMat(0x27272A, 0.85);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 2.0, 8), matDark);
  base.position.y = 0.8;
  station.add(base);

  const tracker = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 6, 16), matGold);
  tracker.position.y = 2.6;
  tracker.rotation.x = 0.45;
  station.add(tracker);

  return station;
}

export function buildIceCrystalArch() {
  const arch = new THREE.Group();
  arch.name = "IceCrystalArch";
  const matIce = new THREE.MeshStandardMaterial({
    color: 0xFDE68A,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.85
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.5, 6, 12, Math.PI), matIce);
  ring.position.y = 0.8;
  arch.add(ring);
  return arch;
}

// Frostveil (Uranus) Landmarks
export function buildCryoDrill() {
  const drill = new THREE.Group();
  drill.name = "CryoDrill";
  const matSteel = createMat(0x475569, 0.4, 0.6);
  const matCryo = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

  const rig = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6.0, 4), matSteel);
  rig.position.y = 2.6;
  drill.add(rig);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 6), matCryo);
  core.position.y = 1.6;
  drill.add(core);

  return drill;
}

export function buildFrostPinnacle() {
  const pin = new THREE.Group();
  pin.name = "FrostPinnacle";
  const matMethane = new THREE.MeshStandardMaterial({
    color: 0x7DD3FC,
    roughness: 0.15,
    metalness: 0.3,
    flatShading: true
  });

  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 7.2, 6), matMethane);
  cone.position.y = 2.8;
  pin.add(cone);
  return pin;
}

// Thalassa (Neptune) Landmarks
export function buildAbyssalBeacon() {
  const beacon = new THREE.Group();
  beacon.name = "AbyssalBeacon";
  const matNavy = createMat(0x0C4A6E, 0.7, 0.3);
  const matGlow = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

  const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 5.4, 8), matNavy);
  pylon.position.y = 2.2;
  beacon.add(pylon);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), matGlow);
  orb.position.y = 5.2;
  beacon.add(orb);

  return beacon;
}

export function buildOceanicMonolith() {
  const mon = new THREE.Group();
  mon.name = "OceanicMonolith";
  const matSlate = createMat(0x1E293B, 0.9, 0.1);
  const matVein = new THREE.MeshBasicMaterial({ color: 0x0284C7 });

  const block = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 1.2), matSlate);
  block.position.y = 2.5;
  mon.add(block);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 1.25), matVein);
  stripe.position.y = 3.6;
  mon.add(stripe);

  return mon;
}

// Nocturna (Pluto) Landmarks
export function buildRtgPowerPost() {
  const rtg = new THREE.Group();
  rtg.name = "RtgPowerPost";
  const matDark = createMat(0x18181B, 0.9);
  const matCore = new THREE.MeshStandardMaterial({
    color: 0xEF4444,
    emissive: 0xDC2626,
    emissiveIntensity: 0.85
  });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 3.8, 6), matDark);
  post.position.y = 1.4;
  rtg.add(post);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 8), matCore);
  core.position.y = 2.8;
  rtg.add(core);

  return rtg;
}

export function buildVoidIceSpire() {
  const spire = new THREE.Group();
  spire.name = "VoidIceSpire";
  const matNitrogen = new THREE.MeshStandardMaterial({
    color: 0xC084FC,
    roughness: 0.2,
    metalness: 0.4,
    flatShading: true
  });

  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 6.8, 5), matNitrogen);
  cone.position.y = 2.6;
  spire.add(cone);
  return spire;
}

// Legacy Aliases for backwards compatibility
export const buildSpaceBiodome = buildMarsTerraformDome;
export const buildSolarArray = buildLightningPylon;
export const buildCommsDish = buildMarsCommsTower;
export const buildSpaceLander = buildRingTrackerStation;
export const buildAlienSpire = buildObsidianSpire;

// -----------------------------------------------------------------
// 8. TRUE CELESTIAL CASCADE SUITE (Sacred Geometry & Astral FX)
// -----------------------------------------------------------------

/**
 * Builds radiant celestial astral body:
 * Faceted stellar core + twin rotating armillary/astrolabe orbital rings + starburst rays
 */
export function buildStardustCelestial(planetType = "Oakhaven") {
  const celestial = new THREE.Group();
  celestial.name = "FieryCelestialMeteor";

  let flameCoreColor = 0xFFFBEB;     // White-hot flame core
  let flameMidColor = 0xF59E0B;      // Intense golden fire
  let flameCrustColor = 0xEA580C;    // Blazing orange-red molten crust
  let flameDarkColor = 0xB91C1C;     // Deep crimson ember

  if (planetType === "Cinderfell") {
    flameMidColor = 0xEF4444; flameCrustColor = 0x991B1B; flameDarkColor = 0x7F1D1D;
  } else if (planetType === "Aetheria") {
    flameMidColor = 0xFBBF24; flameCrustColor = 0xD97706; flameDarkColor = 0xB45309;
  } else if (planetType === "Rustvale") {
    flameMidColor = 0xF97316; flameCrustColor = 0xC2410C; flameDarkColor = 0x9A3412;
  } else if (planetType === "Stormhaven") {
    flameMidColor = 0x38BDF8; flameCrustColor = 0x0284C7; flameDarkColor = 0x0369A1;
  } else if (planetType === "Frostveil") {
    flameMidColor = 0x67E8F9; flameCrustColor = 0x06B6D4; flameDarkColor = 0x0E7490;
  } else if (planetType === "Nocturna") {
    flameMidColor = 0xC084FC; flameCrustColor = 0x9333EA; flameDarkColor = 0x7E22CE;
  }

  // 1. White-Hot Incandescent Core
  const matCore = new THREE.MeshStandardMaterial({
    color: flameCoreColor,
    emissive: flameMidColor,
    emissiveIntensity: 2.2,
    roughness: 0.1,
    metalness: 0.2,
    flatShading: true
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), matCore);
  core.name = "MoltenCore";
  celestial.add(core);

  // 2. Molten Jagged Rocky Crust (Faceted low-poly shell)
  const matCrust = new THREE.MeshStandardMaterial({
    color: flameCrustColor,
    emissive: flameDarkColor,
    emissiveIntensity: 1.1,
    roughness: 0.8,
    metalness: 0.3,
    flatShading: true
  });
  const crust = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), matCrust);
  crust.name = "MoltenCrust";
  celestial.add(crust);

  // 3. Multi-Stage Blazing Flame Plume (Trailing backwards along +Z) - Pure incandescent fire, zero smoke
  const matInnerFlame = new THREE.MeshBasicMaterial({
    color: flameCoreColor,
    transparent: true,
    opacity: 0.95
  });
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 7), matInnerFlame);
  innerFlame.position.set(0, 0, 1.2);
  innerFlame.rotation.x = Math.PI / 2;
  celestial.add(innerFlame);

  const matOuterFlame = new THREE.MeshBasicMaterial({
    color: flameMidColor,
    transparent: true,
    opacity: 0.85
  });
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(1.20, 3.6, 7), matOuterFlame);
  outerFlame.position.set(0, 0, 1.8);
  outerFlame.rotation.x = Math.PI / 2;
  celestial.add(outerFlame);

  // 4. Elongated Trailing Crimson Tip Flame & Side Flame Jets (Pure Fire Stream)
  const matTipFlame = new THREE.MeshBasicMaterial({
    color: flameDarkColor,
    transparent: true,
    opacity: 0.70
  });
  const tipFlame = new THREE.Mesh(new THREE.ConeGeometry(0.75, 5.2, 7), matTipFlame);
  tipFlame.position.set(0, 0, 2.6);
  tipFlame.rotation.x = Math.PI / 2;
  celestial.add(tipFlame);

  const sideFlames = [];
  [-0.32, 0.32].forEach((offsetY, i) => {
    const sideFlame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.0, 6), matOuterFlame);
    sideFlame.position.set((i === 0 ? -0.28 : 0.28), offsetY, 1.4);
    sideFlame.rotation.x = Math.PI / 2;
    sideFlame.rotation.z = (i === 0 ? -0.25 : 0.25);
    celestial.add(sideFlame);
    sideFlames.push(sideFlame);
  });

  // 5. Orbiting & Trailing Incandescent Ember Sparks (14 sparks)
  const matSpark = new THREE.MeshBasicMaterial({ color: flameMidColor });
  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + (i % 3) * 0.04, 0), matSpark);
    const ang = (i * Math.PI * 2) / 14;
    const rad = 1.25 + (i % 4) * 0.30;
    const zOffset = (i % 5) * 0.5 - 0.4;
    spark.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, zOffset);
    celestial.add(spark);
    sparks.push({ mesh: spark, angle: ang, radius: rad, speed: 3.5 + Math.random() * 3.0 });
  }

  celestial.core = core;
  celestial.crust = crust;
  celestial.innerFlame = innerFlame;
  celestial.outerFlame = outerFlame;
  celestial.tipFlame = tipFlame;
  celestial.sideFlames = sideFlames;
  celestial.smokePuffs = []; // Zero smoke - pure fire aesthetic
  celestial.sparks = sparks;

  return celestial;
}

// Backwards compatibility alias
export const buildStardustMeteor = buildStardustCelestial;

/**
 * Builds sacred geometry astrolabe ground warning reticle:
 * Outer orbital degree ring + inner compass rose + 4 cardinal celestial glyphs
 */
export function buildCelestialAstrolabeReticle(planetType = "Oakhaven", isColorblind = false) {
  const reticle = new THREE.Group();
  reticle.name = "CelestialAstrolabeReticle";

  let ringColor = 0xF59E0B;
  if (isColorblind) {
    ringColor = 0x00E5FF;
  } else if (planetType === "Cinderfell") ringColor = 0xF97316;
  else if (planetType === "Aetheria") ringColor = 0xEAB308;
  else if (planetType === "Rustvale") ringColor = 0xEF4444;
  else if (planetType === "Stormhaven") ringColor = 0x06B6D4;
  else if (planetType === "Ringhaven") ringColor = 0xFBBF24;
  else if (planetType === "Frostveil") ringColor = 0x38BDF8;
  else if (planetType === "Thalassa") ringColor = 0x6366F1;
  else if (planetType === "Nocturna") ringColor = 0xA855F7;

  const matReticle = new THREE.MeshBasicMaterial({
    color: ringColor,
    transparent: true,
    opacity: isColorblind ? 0.95 : 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Outer Astrolabe Ring
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.34, 32), matReticle);
  reticle.add(outerRing);

  // Middle Astrological Ring
  const midRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.78, 24), matReticle);
  reticle.add(midRing);

  // If colorblind, add high-contrast cardinal warning markers
  if (isColorblind) {
    const matChevrons = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2 + Math.PI / 4;
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), matChevrons);
      ch.position.set(Math.cos(angle) * 1.55, Math.sin(angle) * 1.55, 0);
      ch.rotation.z = angle;
      reticle.add(ch);
    }
  }

  // 4 Cardinal Celestial Cross Ticks
  const tickH = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.06), matReticle);
  reticle.add(tickH);
  const tickV = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.9), matReticle);
  reticle.add(tickV);

  // Central 8-Pointed Starburst
  const star1 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), matReticle);
  star1.rotation.z = Math.PI / 4;
  reticle.add(star1);

  reticle.material = matReticle;
  return reticle;
}

/**
 * Builds ethereal translucent Pillar of Starlight (Warning Beam)
 */
export function buildStarlightAuroraPillar(skyHeight = 28.0, planetType = "Oakhaven") {
  let beamColor = 0xFDE68A;
  if (planetType === "Cinderfell") beamColor = 0xFDBA74;
  else if (planetType === "Aetheria") beamColor = 0xFEF08A;
  else if (planetType === "Rustvale") beamColor = 0xFCA5A5;
  else if (planetType === "Stormhaven") beamColor = 0x67E8F9;
  else if (planetType === "Ringhaven") beamColor = 0xFDE68A;
  else if (planetType === "Frostveil") beamColor = 0x7DD3FC;
  else if (planetType === "Thalassa") beamColor = 0xA5B4FC;
  else if (planetType === "Nocturna") beamColor = 0xD8B4FE;

  const matBeam = new THREE.MeshBasicMaterial({
    color: beamColor,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });

  const beamGeom = new THREE.CylinderGeometry(0.12, 0.58, skyHeight, 16, 1, true);
  const beamMesh = new THREE.Mesh(beamGeom, matBeam);
  beamMesh.material = matBeam;
  return beamMesh;
}
/**
 * Builds collectible Stardust Shards dropped upon celestial impact:
 * Shimmering faceted crystal with orbiting stardust halo
 */
export function buildStardustShard(planetType = "Oakhaven") {
  const shard = new THREE.Group();
  shard.name = "StardustShard";

  let colorHex = 0x38BDF8;
  let emissiveHex = 0x0284C7;
  let haloHex = 0xBAE6FD;

  if (planetType === true || planetType === "Aetheria" || planetType === "Ringhaven") {
    colorHex = 0xFBBF24; emissiveHex = 0xD97706; haloHex = 0xFEF08A;
  } else if (planetType === "Cinderfell") {
    colorHex = 0xF97316; emissiveHex = 0xEA580C; haloHex = 0xFDBA74;
  } else if (planetType === "Rustvale") {
    colorHex = 0xEF4444; emissiveHex = 0xDC2626; haloHex = 0xFCA5A5;
  } else if (planetType === "Stormhaven") {
    colorHex = 0x06B6D4; emissiveHex = 0x0891B2; haloHex = 0x67E8F9;
  } else if (planetType === "Frostveil") {
    colorHex = 0x38BDF8; emissiveHex = 0x0284C7; haloHex = 0xBAE6FD;
  } else if (planetType === "Thalassa") {
    colorHex = 0x6366F1; emissiveHex = 0x4F46E5; haloHex = 0xA5B4FC;
  } else if (planetType === "Nocturna") {
    colorHex = 0xC084FC; emissiveHex = 0x9333EA; haloHex = 0xE9D5FF;
  }

  const matCrystal = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: emissiveHex,
    emissiveIntensity: 0.95,
    roughness: 0.15,
    metalness: 0.5,
    flatShading: true
  });

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matCrystal);
  gem.scale.set(0.8, 1.7, 0.8);
  gem.position.y = 0.5;
  gem.castShadow = true;
  shard.add(gem);

  // Tiny orbiting orbital sparkle band
  const matHalo = new THREE.MeshBasicMaterial({ color: haloHex });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 4, 8), matHalo);
  halo.position.y = 0.5;
  halo.rotation.x = Math.PI / 4;
  shard.add(halo);

  return shard;
}

/**
 * Builds rolling boulders that tumble down mountain slopes in Crossy Odyssey:
 * Adapts to each planet's geological composition (granite, basalt, sulfur, iron, ice)
 */
export function buildRollingBoulder(planetType = "Oakhaven", isColorblind = false) {
  const boulder = new THREE.Group();
  boulder.name = "RollingBoulder";

  let rockColor = 0x4B5563; // Default Alpine Granite (Oakhaven)
  let accentColor = 0x365314; // Moss

  if (isColorblind) {
    rockColor = 0x1E293B;
    accentColor = 0xF59E0B;
  } else if (planetType === true || planetType === "Aetheria") {
    rockColor = 0xD97706; accentColor = 0xFDE68A; // Golden sulfur geode
  } else if (planetType === "Cinderfell") {
    rockColor = 0x18181B; accentColor = 0xEF4444; // Volcanic obsidian with lava vein
  } else if (planetType === "Rustvale") {
    rockColor = 0x991B1B; accentColor = 0xF87171; // Crimson iron oxide
  } else if (planetType === "Stormhaven") {
    rockColor = 0x1E293B; accentColor = 0x06B6D4; // Metallic hydrogen plasma nodule
  } else if (planetType === "Ringhaven") {
    rockColor = 0x78716C; accentColor = 0xFBBF24; // Golden ring ice rock
  } else if (planetType === "Frostveil") {
    rockColor = 0x0284C7; accentColor = 0xE0F2FE; // Azure methane glacier sphere
  } else if (planetType === "Thalassa") {
    rockColor = 0x1E3A8A; accentColor = 0x38BDF8; // Abyssal sapphire ice floe
  } else if (planetType === "Nocturna") {
    rockColor = 0x27272A; accentColor = 0xC084FC; // Frozen nitrogen geode
  }

  const matRock = createMat(rockColor, 0.85, 0.1);
  const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), matRock);
  rockMesh.scale.set(1.1, 0.95, 1.05);
  rockMesh.castShadow = true;
  boulder.add(rockMesh);

  // Geological accent patch
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    metalness: 0.3,
    flatShading: true
  });
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.15), matAccent);
  accent.position.set(0.65, 0.35, 0.5);
  accent.rotation.set(0.4, 0.5, 0.2);
  boulder.add(accent);

  if (isColorblind) {
    const matBeacon = new THREE.MeshBasicMaterial({ color: 0xF59E0B, wireframe: true });
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matBeacon);
    beacon.position.set(0, 1.45, 0);
    boulder.add(beacon);
  }

  return boulder;
}

/**
 * Builds crossing traffic vehicles for Crossy Odyssey:
 * Adapts to each of the 9 Solar System worlds:
 * Oakhaven: Rustic Alpine Timber Wagon with rolling spoked wheels & cedar logs
 * Other worlds: Planetary Heavy Transport Crawlers with scanning sensors & native palettes
 */
export function buildCrossingCart(planetType = "Oakhaven") {
  const cart = new THREE.Group();
  cart.name = "CrossingCart";
  const isEarth = (planetType === "Oakhaven" || planetType === false);

  if (isEarth) {
    // Alpine Timber Wagon (Oakhaven)
    const matWood = createMat(PALETTE.crateWood, 0.85, 0.05);
    const matDark = createMat(PALETTE.darkTrim, 0.7, 0.3);
    const matLog = createMat(PALETTE.timberLog, 0.9, 0.0);

    // Bed Chassis
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 2.7), matWood);
    bed.position.y = 0.55;
    bed.castShadow = true;
    cart.add(bed);

    // Side slats
    const slatL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 2.7), matWood);
    slatL.position.set(-0.76, 0.82, 0);
    cart.add(slatL);

    const slatR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 2.7), matWood);
    slatR.position.set(0.76, 0.82, 0);
    cart.add(slatR);

    // Stacked Pine Logs on bed
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.5, 6), matLog);
    log1.rotation.x = Math.PI / 2;
    log1.position.set(-0.35, 0.85, 0);
    cart.add(log1);

    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.5, 6), matLog);
    log2.rotation.x = Math.PI / 2;
    log2.position.set(0.35, 0.85, 0);
    cart.add(log2);

    const log3 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 6), matLog);
    log3.rotation.x = Math.PI / 2;
    log3.position.set(0.0, 1.25, 0);
    cart.add(log3);

    // 4 Wooden Spoked Wheels
    cart.wheels = [];
    const wheelPositions = [
      [-0.92, 0.46, -0.9],
      [0.92, 0.46, -0.9],
      [-0.92, 0.46, 0.9],
      [0.92, 0.46, 0.9]
    ];
    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 8), matDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      cart.add(wheel);
      cart.wheels.push(wheel);
    }
  } else {
    // Planetary Exploration Crawler
    let hullColor = 0xE67E22; // default orange
    let sensorColor = 0x00F0FF;
    let podColor = 0x1E293B;

    if (planetType === "Cinderfell") {
      hullColor = 0xDC2626; sensorColor = 0xF97316; podColor = 0x18181B;
    } else if (planetType === "Aetheria") {
      hullColor = 0xCA8A04; sensorColor = 0xFEF08A; podColor = 0x292524;
    } else if (planetType === "Rustvale") {
      hullColor = 0xB91C1C; sensorColor = 0xFCA5A5; podColor = 0x450A0A;
    } else if (planetType === "Stormhaven") {
      hullColor = 0x0891B2; sensorColor = 0x67E8F9; podColor = 0x0F172A;
    } else if (planetType === "Ringhaven") {
      hullColor = 0xD97706; sensorColor = 0xFDE68A; podColor = 0x292524;
    } else if (planetType === "Frostveil") {
      hullColor = 0x0284C7; sensorColor = 0xBAE6FD; podColor = 0x0C4A6E;
    } else if (planetType === "Thalassa") {
      hullColor = 0x4338CA; sensorColor = 0x818CF8; podColor = 0x1E1B4B;
    } else if (planetType === "Nocturna") {
      hullColor = 0x7E22CE; sensorColor = 0xC084FC; podColor = 0x18181B;
    }

    const matShell = createMat(hullColor, 0.65, 0.2);
    const matPod = createMat(podColor, 0.5, 0.3);
    const matTire = createMat(0x111827, 0.95, 0.05);
    const matLidar = new THREE.MeshBasicMaterial({ color: sensorColor });

    // Armored Crawler Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 2.9), matShell);
    hull.position.y = 0.68;
    hull.castShadow = true;
    cart.add(hull);

    // Equipment Pod
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.8), matPod);
    pod.position.set(0, 1.15, -0.2);
    cart.add(pod);

    // Active Sensor Dome
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 8), createMat(0x0F172A, 0.5, 0.5));
    dome.position.set(0, 1.5, 0.5);
    cart.add(dome);

    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.1), matLidar);
    eye.position.set(0, 1.5, 0.65);
    cart.add(eye);

    // 6 Rover Treads / Knobby Tires
    cart.wheels = [];
    const crawlerWheelPositions = [
      [-0.98, 0.44, -1.0],
      [0.98, 0.44, -1.0],
      [-0.98, 0.44, 0.0],
      [0.98, 0.44, 0.0],
      [-0.98, 0.44, 1.0],
      [0.98, 0.44, 1.0]
    ];
    for (const pos of crawlerWheelPositions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 8), matTire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      cart.add(wheel);
      cart.wheels.push(wheel);
    }
  }

  return cart;
}

/**
 * Builds collectible Repair Wrench Toolbox:
 * Floating emerald green toolbox with a silver wrench floating above it
 */
export function buildRepairWrench() {
  const wrenchPickup = new THREE.Group();
  wrenchPickup.name = "RepairWrench";

  const matGreen = createMat(0x059669, 0.55, 0.2);
  const matChrome = createMat(PALETTE.chrome, 0.25, 0.85);

  // Metal Toolbox Body
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.44), matGreen);
  box.position.y = 0.32;
  box.castShadow = true;
  wrenchPickup.add(box);

  // Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI), matChrome);
  handle.position.set(0, 0.58, 0);
  wrenchPickup.add(handle);

  // Floating Silver Wrench
  const wrenchGroup = new THREE.Group();
  wrenchGroup.name = "FloatingTool";
  wrenchGroup.position.set(0, 0.95, 0);

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.04), matChrome);
  wrenchGroup.add(shaft);

  const headTop = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 6), matChrome);
  headTop.position.y = 0.35;
  wrenchGroup.add(headTop);

  const headBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 6), matChrome);
  headBottom.position.y = -0.35;
  wrenchGroup.add(headBottom);

  wrenchPickup.add(wrenchGroup);
  wrenchPickup.tool = wrenchGroup;

  return wrenchPickup;
}

/**
 * Builds crossing wildlife/creature hazard for Crossy Odyssey:
 * Oakhaven: Alpine Bighorn Ram with curved horns and animated trot legs
 * Other worlds: Planetary Bio/Mecha Skitter Drones adapted to local atmospheres
 */
export function buildAlpineWildlife(planetType = "Oakhaven") {
  const isEarth = (planetType === "Oakhaven" || planetType === false);
  const creature = new THREE.Group();
  creature.name = isEarth ? "AlpineBighornRam" : "PlanetarySkitterDrone";
  creature.legs = [];

  if (isEarth) {
    // 1. Alpine Bighorn Ram (Oakhaven)
    const matWool = createMat(0xF1EAD8, 0.95, 0.0);
    const matHorn = createMat(0x78350F, 0.8, 0.1);
    const matDark = createMat(0x27272A, 0.8, 0.1);

    // Woolly Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 1.15), matWool);
    body.position.y = 0.65;
    body.castShadow = true;
    creature.add(body);

    // Neck & Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.48), matWool);
    head.position.set(0, 0.96, 0.62);
    head.rotation.x = -0.15;
    head.castShadow = true;
    creature.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.28), matDark);
    snout.position.set(0, 0.88, 0.84);
    creature.add(snout);

    // Bighorn Curled Horns (Left & Right)
    const hornL = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 5, 8, Math.PI * 1.3), matHorn);
    hornL.position.set(-0.25, 1.12, 0.54);
    hornL.rotation.set(0.2, 0.4, 0.8);
    creature.add(hornL);

    const hornR = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 5, 8, Math.PI * 1.3), matHorn);
    hornR.position.set(0.25, 1.12, 0.54);
    hornR.rotation.set(0.2, -0.4, -0.8);
    creature.add(hornR);

    // 4 Trot Legs
    const legOffsets = [
      [-0.24, 0.32, -0.42],
      [0.24, 0.32, -0.42],
      [-0.24, 0.32, 0.42],
      [0.24, 0.32, 0.42]
    ];
    for (let i = 0; i < legOffsets.length; i++) {
      const legPivot = new THREE.Group();
      legPivot.position.set(legOffsets[i][0], 0.62, legOffsets[i][2]);

      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.58, 6), matWool);
      legMesh.position.y = -0.29;
      legMesh.castShadow = true;
      legPivot.add(legMesh);

      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.14), matDark);
      hoof.position.y = -0.55;
      legPivot.add(hoof);

      creature.add(legPivot);
      creature.legs.push(legPivot);
    }
  } else {
    // 2. Planetary Skitter Drone
    let chassisCol = 0x1E293B;
    let accentCol = 0xEA580C;
    let visorCol = 0x00F0FF;

    if (planetType === "Cinderfell") {
      chassisCol = 0x18181B; accentCol = 0xDC2626; visorCol = 0xF97316;
    } else if (planetType === "Aetheria") {
      chassisCol = 0x292524; accentCol = 0xCA8A04; visorCol = 0xFEF08A;
    } else if (planetType === "Rustvale") {
      chassisCol = 0x450A0A; accentCol = 0xEF4444; visorCol = 0xFCA5A5;
    } else if (planetType === "Stormhaven") {
      chassisCol = 0x0F172A; accentCol = 0x06B6D4; visorCol = 0x67E8F9;
    } else if (planetType === "Ringhaven") {
      chassisCol = 0x292524; accentCol = 0xF59E0B; visorCol = 0xFDE68A;
    } else if (planetType === "Frostveil") {
      chassisCol = 0x0C4A6E; accentCol = 0x38BDF8; visorCol = 0xBAE6FD;
    } else if (planetType === "Thalassa") {
      chassisCol = 0x1E1B4B; accentCol = 0x6366F1; visorCol = 0x818CF8;
    } else if (planetType === "Nocturna") {
      chassisCol = 0x18181B; accentCol = 0xA855F7; visorCol = 0xC084FC;
    }

    const matChassis = createMat(chassisCol, 0.65, 0.35);
    const matAccent = createMat(accentCol, 0.7, 0.2);
    const matVisor = new THREE.MeshBasicMaterial({ color: visorCol });

    // Pod Core
    const pod = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), matChassis);
    pod.position.y = 0.55;
    pod.scale.set(1.1, 0.8, 1.3);
    pod.castShadow = true;
    creature.add(pod);

    // Accent Shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.8), matAccent);
    shield.position.set(0, 0.72, 0.0);
    creature.add(shield);

    // Glowing Optical Sensor Visor
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.15), matVisor);
    eye.position.set(0, 0.62, 0.58);
    creature.add(eye);

    // 4 Articulated Spider Struts
    const legAngles = [-0.65, 0.65, -2.4, 2.4];
    for (let i = 0; i < legAngles.length; i++) {
      const legPivot = new THREE.Group();
      legPivot.position.set(Math.cos(legAngles[i]) * 0.42, 0.50, Math.sin(legAngles[i]) * 0.52);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), matChassis);
      upper.position.set(0, 0.12, 0.2);
      upper.rotation.x = -0.45;
      legPivot.add(upper);

      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.06), matAccent);
      lower.position.set(0, -0.15, 0.38);
      lower.rotation.x = 0.35;
      legPivot.add(lower);

      creature.add(legPivot);
      creature.legs.push(legPivot);
    }
  }

  return creature;
}

/**
 * Builds stylized zebra hazard crossing stripes decal on road
 */
export function buildRoadHazardStripes(planetType = "Oakhaven") {
  const decal = new THREE.Group();
  decal.name = "RoadHazardStripes";

  let colorPrimary = 0xF5A623;
  if (planetType === "Cinderfell") colorPrimary = 0xF97316;
  else if (planetType === "Aetheria") colorPrimary = 0xEAB308;
  else if (planetType === "Rustvale") colorPrimary = 0xEF4444;
  else if (planetType === "Stormhaven") colorPrimary = 0x06B6D4;
  else if (planetType === "Ringhaven") colorPrimary = 0xFBBF24;
  else if (planetType === "Frostveil") colorPrimary = 0x38BDF8;
  else if (planetType === "Thalassa") colorPrimary = 0x6366F1;
  else if (planetType === "Nocturna") colorPrimary = 0xA855F7;

  const matStripe = new THREE.MeshBasicMaterial({
    color: colorPrimary,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });

  // 6 Angled Crosswalk Stripes
  const stripeCount = 6;
  const stripeWidth = 0.32;
  const stripeLength = 3.6;
  for (let i = 0; i < stripeCount; i++) {
    const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(stripeWidth, stripeLength), matStripe);
    sMesh.rotation.x = -Math.PI / 2;
    sMesh.position.set((i - (stripeCount - 1) / 2) * 0.62, 0.03, 0);
    decal.add(sMesh);
  }

  return decal;
}

/**
 * Builds roadside hazard warning bollard with flashing amber/neon beacon
 */
export function buildHazardWarningBollard(planetType = "Oakhaven") {
  const bollard = new THREE.Group();
  bollard.name = "HazardWarningBollard";

  let beaconColor = 0xF5A623;
  if (planetType === "Cinderfell") beaconColor = 0xF97316;
  else if (planetType === "Aetheria") beaconColor = 0xEAB308;
  else if (planetType === "Rustvale") beaconColor = 0xEF4444;
  else if (planetType === "Stormhaven") beaconColor = 0x06B6D4;
  else if (planetType === "Ringhaven") beaconColor = 0xFBBF24;
  else if (planetType === "Frostveil") beaconColor = 0x38BDF8;
  else if (planetType === "Thalassa") beaconColor = 0x6366F1;
  else if (planetType === "Nocturna") beaconColor = 0xA855F7;

  const matPost = createMat(0x1F2937, 0.7, 0.2);
  const matBeacon = new THREE.MeshBasicMaterial({ color: beaconColor });

  // Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.1, 8), matPost);
  post.position.y = 0.55;
  post.castShadow = true;
  bollard.add(post);

  // Warning Beacon Dome
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 8), matBeacon);
  beacon.position.y = 1.18;
  bollard.add(beacon);
  bollard.beacon = beacon;

  return bollard;
}

/**
 * Builds physical roadside warning signboard for telegraphed crossings & rockfall zones
 */
export function buildCrossingSignboard(planetType = "Oakhaven", signType = "crossing") {
  const group = new THREE.Group();
  group.name = "CrossingSignboard";

  let signBg = 0xF59E0B; // Amber warning
  let iconCol = 0x111827; // Charcoal
  let postCol = 0x4B3621; // Timber post for Oakhaven
  if (planetType !== "Oakhaven") {
    postCol = 0x334155; // Metallic slate post
    if (planetType === "Cinderfell" || planetType === "Rustvale") signBg = 0xEF4444;
    else if (planetType === "Stormhaven" || planetType === "Frostveil") signBg = 0x0EA5E9;
  }

  const matPost = createMat(postCol, 0.8, 0.2);
  const matSign = new THREE.MeshStandardMaterial({
    color: signBg,
    emissive: signBg,
    emissiveIntensity: 0.35,
    roughness: 0.4
  });
  const matIcon = createMat(iconCol, 0.9, 0.1);

  // Signpost pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6), matPost);
  pole.position.y = 0.95;
  pole.castShadow = true;
  group.add(pole);

  // Diamond Warning Plate
  const diamondGeo = new THREE.BoxGeometry(0.85, 0.85, 0.04);
  const plate = new THREE.Mesh(diamondGeo, matSign);
  plate.position.y = 1.9;
  plate.rotation.z = Math.PI / 4; // Diamond orientation
  plate.castShadow = true;
  group.add(plate);

  // Embossed chevron / hazard icon
  if (signType === "rockfall") {
    const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), matIcon);
    rock1.position.set(-0.06, 1.95, 0.035);
    group.add(rock1);
    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), matIcon);
    rock2.position.set(0.12, 1.82, 0.035);
    group.add(rock2);
  } else if (signType === "wildlife") {
    const icon = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 3), matIcon);
    icon.position.set(0, 1.9, 0.035);
    group.add(icon);
  } else {
    // Road Crossing Chevron / Crossroad Plus
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.03), matIcon);
    hBar.position.set(0, 1.9, 0.035);
    group.add(hBar);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.03), matIcon);
    vBar.position.set(0, 1.9, 0.035);
    group.add(vBar);
  }

  return group;
}

/**
 * Builds visible intersecting secondary crossroad track cutting perpendicular across terrain
 */
export function buildCrossroadTrack(planetType = "Oakhaven") {
  const track = new THREE.Group();
  track.name = "CrossroadTrack";

  let trackColor = 0x5C4A33; // Dirt gravel
  if (planetType === "Cinderfell") trackColor = 0x27272A;
  else if (planetType === "Aetheria") trackColor = 0x92400E;
  else if (planetType === "Rustvale") trackColor = 0x7F1D1D;
  else if (planetType === "Stormhaven") trackColor = 0x1E293B;
  else if (planetType === "Ringhaven") trackColor = 0x57534E;
  else if (planetType === "Frostveil") trackColor = 0x0369A1;
  else if (planetType === "Thalassa") trackColor = 0x1E3A8A;
  else if (planetType === "Nocturna") trackColor = 0x3F3F46;

  const matTrack = createMat(trackColor, 0.95, 0.05);

  // Perpendicular Road Strip spanning 54m across the terrain
  const trackGeo = new THREE.BoxGeometry(3.8, 0.06, 54.0);
  const roadMesh = new THREE.Mesh(trackGeo, matTrack);
  roadMesh.position.y = 0.03;
  roadMesh.receiveShadow = true;
  track.add(roadMesh);

  // Low-poly roadside corner timber fences at junction edges
  const matFence = createMat(0x3E2723, 0.9, 0.1);
  const corners = [
    [-2.2, 5.0], [2.2, 5.0],
    [-2.2, -5.0], [2.2, -5.0]
  ];
  for (const [cx, cz] of corners) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), matFence);
    post.position.set(cx, 0.38, cz);
    post.castShadow = true;
    track.add(post);
  }

  return track;
}


