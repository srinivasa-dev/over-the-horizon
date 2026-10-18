// =================================================================
// OVER THE HORIZON: Miniature Planet Generator (R = 65m)
// Inspired by Tiny Skies toy diorama aesthetic & Little Prince globe
// =================================================================
import * as THREE from 'three';
import {
  PALETTE,
  buildAlpineCabin,
  buildAlpineVillageHouse,
  buildStreetLanternPost,
  buildWindmill,
  buildObservatoryDome,
  buildPineTree,
  buildWoodenBridge,
  buildObsidianSpire,
  buildThermalVent,
  buildSulfuricGlassDome,
  buildSulfuricArch,
  buildMarsTerraformDome,
  buildMarsCommsTower,
  buildLightningPylon,
  buildPlasmaRod,
  buildRingTrackerStation,
  buildIceCrystalArch,
  buildCryoDrill,
  buildFrostPinnacle,
  buildAbyssalBeacon,
  buildOceanicMonolith,
  buildRtgPowerPost,
  buildVoidIceSpire
} from './models.js';

export class Planet {
  constructor(type = "Oakhaven", baseRadius = 65.0) {
    this.type = type; // "Cinderfell", "Aetheria", "Oakhaven", "Rustvale", "Stormhaven", "Ringhaven", "Frostveil", "Thalassa", "Nocturna"
    this.planetType = type;
    this.baseRadius = baseRadius;
    this.circumference = 2.0 * Math.PI * baseRadius; // ~408.4 meters
    this.group = new THREE.Group();
    this.group.name = `Planet_${type}`;
    
    this.cloudsGroup = null;
    this.clouds = [];
    this.ringsGroup = null;
    this.meshInstance = null;
    this.oceanMesh = null;
    this.skyDome = null;
    this.hotAirBalloons = [];
    this.landmarks = [];
    this.colliders = []; // Physical obstacle collision registry
    this.windmillRotors = [];
    this.spireApexes = [];

    this._generateCelestialSkybox();
    this._generateStylizedOcean();
    this._generateFacetedPlanet();
    this._spawnLandmarks();

    // CLOUD AUTHENTICITY: ONLY Earth/Oakhaven has water cumulus clouds!
    if (this.type === "Oakhaven") {
      this._spawnOrbitingClouds();
      this._spawnHotAirBalloons();
    } else if (this.type === "Ringhaven" || this.type === "Frostveil") {
      this._spawnPlanetaryRings();
    }
  }

  // ---------------------------------------------------------------
  // 1. COLLISION REGISTRY
  // ---------------------------------------------------------------
  addCollider(pos, radius, height = 8.0, type = "obstacle", name = "Obstacle") {
    this.colliders.push({
      pos: pos.clone(),
      radius,
      height,
      type,
      name
    });
  }

  getNearbyColliders(pos, maxDist = 20.0) {
    const maxDistSq = maxDist * maxDist;
    const nearby = [];
    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      if (pos.distanceToSquared(col.pos) < maxDistSq) {
        nearby.push(col);
      }
    }
    return nearby;
  }

  // ---------------------------------------------------------------
  // 2. DYNAMIC CELESTIAL SKYBOX (RESPONSIVE TO TIME & CLIMATE)
  // ---------------------------------------------------------------
  _generateCelestialSkybox() {
    const skyGeo = new THREE.SphereGeometry(450.0, 32, 24);
    
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x0e0a2a) },
      midColor: { value: new THREE.Color(0x4a1f68) },
      horizonColor: { value: new THREE.Color(0xff8c42) },
      bottomColor: { value: new THREE.Color(0xffd166) },
      starIntensity: { value: 0.25 }
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;

        void main() {
          vec3 nPos = normalize(vWorldPosition);
          float h = nPos.y; // -1.0 to +1.0

          vec3 finalColor = vec3(0.0);
          if (h > 0.25) {
            float t = (h - 0.25) / 0.75;
            finalColor = mix(midColor, topColor, t);
          } else if (h > -0.15) {
            float t = (h + 0.15) / 0.40;
            finalColor = mix(horizonColor, midColor, t);
          } else {
            float t = (h + 1.0) / 0.85;
            finalColor = mix(bottomColor, horizonColor, t);
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.name = "CelestialSkyDome";
    this.group.add(this.skyDome);

    this._generateStarField();
  }

  // Generates rock-solid 3D vertex star points (eliminates subpixel shimmering/grain during camera motion)
  _generateStarField() {
    const starCount = 500;
    const starGeo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    // Spherical Fibonacci distribution across celestial hemisphere
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < starCount; i++) {
      const y = 1 - (i / (starCount - 1)) * 1.85; // Upper celestial dome
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = 2 * Math.PI * i / phi;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const r = 430.0 + (Math.sin(i * 12.0) * 12.0);
      positions.push(x * r, y * r, z * r);

      // Star spectral variations
      const colRand = Math.sin(i * 99.0);
      if (colRand > 0.6) {
        colors.push(0.85, 0.92, 1.0); // Blue-white giant
      } else if (colRand < -0.6) {
        colors.push(1.0, 0.92, 0.82); // Warm amber
      } else {
        colors.push(0.96, 0.96, 1.0); // Pure white
      }
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Circular soft star sprite texture (smooth feathered edges)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();

    const starTex = new THREE.CanvasTexture(canvas);

    this.starMaterial = new THREE.PointsMaterial({
      size: 2.8,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(starGeo, this.starMaterial);
    this.starPoints.name = "CelestialStarPoints";
    this.group.add(this.starPoints);
  }

  // Updates sky colors dynamically in response to Time of Day and Weather Climate
  updateAtmosphere(hourDecimal, weatherMode = "Clear") {
    if (!this.skyUniforms) return;

    let targetTop, targetMid, targetHoriz, targetBottom, stars;

    if (this.type === "Oakhaven") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Deep Moonlit Night
        targetTop = new THREE.Color(0x040612);
        targetMid = new THREE.Color(0x0a1226);
        targetHoriz = new THREE.Color(0x15233e);
        targetBottom = new THREE.Color(0x080c18);
        stars = 1.0;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Dawn / Sunrise
        targetTop = new THREE.Color(0x1c2045);
        targetMid = new THREE.Color(0x5a4267);
        targetHoriz = new THREE.Color(0xf09a70);
        targetBottom = new THREE.Color(0xfed88b);
        stars = 0.15;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Vibrant Azure Daytime
        targetTop = new THREE.Color(0x18569c);
        targetMid = new THREE.Color(0x4a9cdb);
        targetHoriz = new THREE.Color(0xb2e0fa);
        targetBottom = new THREE.Color(0xd6f2ff);
        stars = 0.0;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Golden Hour Sunset
        targetTop = new THREE.Color(0x0e0a2a);
        targetMid = new THREE.Color(0x4a1f68);
        targetHoriz = new THREE.Color(0xff7b36);
        targetBottom = new THREE.Color(0xffca4e);
        stars = 0.25;
      } else {
        // Twilight / Dusk
        targetTop = new THREE.Color(0x07091a);
        targetMid = new THREE.Color(0x20193c);
        targetHoriz = new THREE.Color(0x623550);
        targetBottom = new THREE.Color(0x1c1328);
        stars = 0.70;
      }
    } else if (this.type === "Cinderfell") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Deep Scorched Basalt Night
        targetTop = new THREE.Color(0x050204);
        targetMid = new THREE.Color(0x0f0408);
        targetHoriz = new THREE.Color(0x2e0b0b);
        targetBottom = new THREE.Color(0x991b1b);
        stars = 0.95;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Incandescent Magma Dawn
        targetTop = new THREE.Color(0x18080c);
        targetMid = new THREE.Color(0x4c0519);
        targetHoriz = new THREE.Color(0xea580c);
        targetBottom = new THREE.Color(0xfde047);
        stars = 0.30;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Scorched Solar Void Daytime
        targetTop = new THREE.Color(0x2a0b10);
        targetMid = new THREE.Color(0x7f1d1d);
        targetHoriz = new THREE.Color(0xf97316);
        targetBottom = new THREE.Color(0xfef08a);
        stars = 0.10;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Molten Amber Twilight Sunset
        targetTop = new THREE.Color(0x0f050a);
        targetMid = new THREE.Color(0x3b0716);
        targetHoriz = new THREE.Color(0xdc2626);
        targetBottom = new THREE.Color(0xf59e0b);
        stars = 0.40;
      } else {
        // Ash Twilight
        targetTop = new THREE.Color(0x080306);
        targetMid = new THREE.Color(0x1f070e);
        targetHoriz = new THREE.Color(0x521515);
        targetBottom = new THREE.Color(0x280a0a);
        stars = 0.75;
      }
    } else if (this.type === "Aetheria") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Phosphorescent Acid Night
        targetTop = new THREE.Color(0x0c0602);
        targetMid = new THREE.Color(0x261205);
        targetHoriz = new THREE.Color(0x542308);
        targetBottom = new THREE.Color(0x92400e);
        stars = 0.25;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Golden Sulfur Haze Dawn
        targetTop = new THREE.Color(0x3a1805);
        targetMid = new THREE.Color(0x713f12);
        targetHoriz = new THREE.Color(0xd97706);
        targetBottom = new THREE.Color(0xfef08a);
        stars = 0.05;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Brilliant Amber Sulfuric Smog Daytime
        targetTop = new THREE.Color(0x542308);
        targetMid = new THREE.Color(0x92400e);
        targetHoriz = new THREE.Color(0xf59e0b);
        targetBottom = new THREE.Color(0xfde68a);
        stars = 0.0;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Honey Bronze Sunset
        targetTop = new THREE.Color(0x2d1104);
        targetMid = new THREE.Color(0x5c2407);
        targetHoriz = new THREE.Color(0xea580c);
        targetBottom = new THREE.Color(0xfbbf24);
        stars = 0.10;
      } else {
        // Heavy Bronze Dusk
        targetTop = new THREE.Color(0x180b03);
        targetMid = new THREE.Color(0x3b1807);
        targetHoriz = new THREE.Color(0x78350f);
        targetBottom = new THREE.Color(0x321606);
        stars = 0.20;
      }
    } else if (this.type === "Rustvale") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Deep Cold Starlight Sapphire Night with Mars Rim Glow
        targetTop = new THREE.Color(0x060814);
        targetMid = new THREE.Color(0x11172a);
        targetHoriz = new THREE.Color(0x450a0a);
        targetBottom = new THREE.Color(0x7f1d1d);
        stars = 1.0;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Butterscotch & Coral Peach Dawn
        targetTop = new THREE.Color(0x2d1b36);
        targetMid = new THREE.Color(0x702e3b);
        targetHoriz = new THREE.Color(0xdc2626);
        targetBottom = new THREE.Color(0xfdba74);
        stars = 0.20;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Crisp Rust Oxide Daytime with Golden Horizon
        targetTop = new THREE.Color(0x451a22);
        targetMid = new THREE.Color(0x991b1b);
        targetHoriz = new THREE.Color(0xea580c);
        targetBottom = new THREE.Color(0xfed7aa);
        stars = 0.0;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Fiery Incandescent Vermilion Sunset
        targetTop = new THREE.Color(0x181028);
        targetMid = new THREE.Color(0x581c28);
        targetHoriz = new THREE.Color(0xdc2626);
        targetBottom = new THREE.Color(0xfbbf24);
        stars = 0.35;
      } else {
        // Mauve Martian Twilight
        targetTop = new THREE.Color(0x0e0c18);
        targetMid = new THREE.Color(0x2c1322);
        targetHoriz = new THREE.Color(0x651c2a);
        targetBottom = new THREE.Color(0x260a12);
        stars = 0.70;
      }
    } else if (this.type === "Stormhaven") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Abyssal Jovian Starlight Night
        targetTop = new THREE.Color(0x020617);
        targetMid = new THREE.Color(0x0a0f29);
        targetHoriz = new THREE.Color(0x1e1b4b);
        targetBottom = new THREE.Color(0x0284c7);
        stars = 0.95;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Electric Cyan & Lavender Dawn
        targetTop = new THREE.Color(0x1e1b4b);
        targetMid = new THREE.Color(0x312e81);
        targetHoriz = new THREE.Color(0x06b6d4);
        targetBottom = new THREE.Color(0x67e8f9);
        stars = 0.30;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Saturated Banded Indigo & Cobalt Daytime
        targetTop = new THREE.Color(0x0f172a);
        targetMid = new THREE.Color(0x1e3a8a);
        targetHoriz = new THREE.Color(0x0284c7);
        targetBottom = new THREE.Color(0x38bdf8);
        stars = 0.05;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Electric Violet & Cyan Aurora Sunset
        targetTop = new THREE.Color(0x2e1065);
        targetMid = new THREE.Color(0x581c87);
        targetHoriz = new THREE.Color(0x7c3aed);
        targetBottom = new THREE.Color(0x38bdf8);
        stars = 0.40;
      } else {
        // Deep Neon Ion Twilight
        targetTop = new THREE.Color(0x0a0a20);
        targetMid = new THREE.Color(0x1a1645);
        targetHoriz = new THREE.Color(0x2563eb);
        targetBottom = new THREE.Color(0x0c2554);
        stars = 0.75;
      }
    } else if (this.type === "Ringhaven") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Golden Cosmic Dust Night with Ring Shadows
        targetTop = new THREE.Color(0x090807);
        targetMid = new THREE.Color(0x1c1917);
        targetHoriz = new THREE.Color(0x44403c);
        targetBottom = new THREE.Color(0x92400e);
        stars = 0.95;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Champagne Dawn with Soft Umber Gradients
        targetTop = new THREE.Color(0x1c1917);
        targetMid = new THREE.Color(0x44403c);
        targetHoriz = new THREE.Color(0xb45309);
        targetBottom = new THREE.Color(0xfde68a);
        stars = 0.35;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Warm Butterscotch Ice Daytime
        targetTop = new THREE.Color(0x292524);
        targetMid = new THREE.Color(0x78350f);
        targetHoriz = new THREE.Color(0xd97706);
        targetBottom = new THREE.Color(0xfef08a);
        stars = 0.10;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Radiant Amber & Ring-Arc Sunset
        targetTop = new THREE.Color(0x1a1416);
        targetMid = new THREE.Color(0x572619);
        targetHoriz = new THREE.Color(0xea580c);
        targetBottom = new THREE.Color(0xfbbf24);
        stars = 0.45;
      } else {
        // Umber Ring Twilight
        targetTop = new THREE.Color(0x0f0d0c);
        targetMid = new THREE.Color(0x29231f);
        targetHoriz = new THREE.Color(0x5c3d28);
        targetBottom = new THREE.Color(0x1e1510);
        stars = 0.80;
      }
    } else if (this.type === "Frostveil") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Arctic Aurora Cosmic Night
        targetTop = new THREE.Color(0x020617);
        targetMid = new THREE.Color(0x082f49);
        targetHoriz = new THREE.Color(0x0284c7);
        targetBottom = new THREE.Color(0x38bdf8);
        stars = 0.95;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Rose-Pink over Azure Polar Dawn
        targetTop = new THREE.Color(0x1e1b4b);
        targetMid = new THREE.Color(0x4338ca);
        targetHoriz = new THREE.Color(0x38bdf8);
        targetBottom = new THREE.Color(0xfbcfe8);
        stars = 0.25;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Pure Crisp Arctic Cyan Daytime
        targetTop = new THREE.Color(0x0c4a6e);
        targetMid = new THREE.Color(0x0284c7);
        targetHoriz = new THREE.Color(0x38bdf8);
        targetBottom = new THREE.Color(0xe0f2fe);
        stars = 0.0;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Violet-Peach Ice Ring Sunset
        targetTop = new THREE.Color(0x172554);
        targetMid = new THREE.Color(0x3b82f6);
        targetHoriz = new THREE.Color(0xf472b6);
        targetBottom = new THREE.Color(0xfde68a);
        stars = 0.30;
      } else {
        // Deep Glacial Twilight
        targetTop = new THREE.Color(0x051322);
        targetMid = new THREE.Color(0x0c2742);
        targetHoriz = new THREE.Color(0x1e4f7a);
        targetBottom = new THREE.Color(0x071b2d);
        stars = 0.75;
      }
    } else if (this.type === "Thalassa") {
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Abyssal Bioluminescent Night
        targetTop = new THREE.Color(0x020617);
        targetMid = new THREE.Color(0x0b132b);
        targetHoriz = new THREE.Color(0x1e3a8a);
        targetBottom = new THREE.Color(0x3b82f6);
        stars = 0.95;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Marine Teal & Aquamarine Dawn
        targetTop = new THREE.Color(0x0f172a);
        targetMid = new THREE.Color(0x1e3a8a);
        targetHoriz = new THREE.Color(0x0ea5e9);
        targetBottom = new THREE.Color(0x99f6e4);
        stars = 0.30;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Deep Royal Sapphire Ocean Daytime
        targetTop = new THREE.Color(0x0a1931);
        targetMid = new THREE.Color(0x1d4ed8);
        targetHoriz = new THREE.Color(0x2563eb);
        targetBottom = new THREE.Color(0x93c5fd);
        stars = 0.05;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Indigo & Phosphor Dusk Sunset
        targetTop = new THREE.Color(0x1e1b4b);
        targetMid = new THREE.Color(0x312e81);
        targetHoriz = new THREE.Color(0x6366f1);
        targetBottom = new THREE.Color(0x38bdf8);
        stars = 0.35;
      } else {
        // Deep Sea Twilight
        targetTop = new THREE.Color(0x040b18);
        targetMid = new THREE.Color(0x0c1d38);
        targetHoriz = new THREE.Color(0x1d3e6e);
        targetBottom = new THREE.Color(0x061122);
        stars = 0.75;
      }
    } else {
      // Nocturna (Pluto Counterpart): Obsidian Void & Nitrogen Plains
      if (hourDecimal >= 21.5 || hourDecimal < 4.5) {
        // Pure Obsidian Void Night with Infinite Brilliant Stars
        targetTop = new THREE.Color(0x010103);
        targetMid = new THREE.Color(0x06030a);
        targetHoriz = new THREE.Color(0x180b2b);
        targetBottom = new THREE.Color(0x6b21a8);
        stars = 1.0;
      } else if (hourDecimal >= 4.5 && hourDecimal < 7.5) {
        // Amethyst Frost Dawn
        targetTop = new THREE.Color(0x0a0514);
        targetMid = new THREE.Color(0x241442);
        targetHoriz = new THREE.Color(0x7e22ce);
        targetBottom = new THREE.Color(0xe9d5ff);
        stars = 0.40;
      } else if (hourDecimal >= 7.5 && hourDecimal < 16.5) {
        // Silver Nitrogen Ice Daytime
        targetTop = new THREE.Color(0x110a1f);
        targetMid = new THREE.Color(0x3b185f);
        targetHoriz = new THREE.Color(0x9333ea);
        targetBottom = new THREE.Color(0xf3e8ff);
        stars = 0.15;
      } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
        // Magenta & Violet Outer-Rim Sunset
        targetTop = new THREE.Color(0x08040f);
        targetMid = new THREE.Color(0x2e1065);
        targetHoriz = new THREE.Color(0xa855f7);
        targetBottom = new THREE.Color(0xf472b6);
        stars = 0.45;
      } else {
        // Crystalline Twilight
        targetTop = new THREE.Color(0x030207);
        targetMid = new THREE.Color(0x130722);
        targetHoriz = new THREE.Color(0x3d1761);
        targetBottom = new THREE.Color(0x10051d);
        stars = 0.85;
      }
    }

    // Apply Weather Climate Overlays
    if (weatherMode === "Rain") {
      const rainOvercastTop = new THREE.Color(0x263645);
      const rainOvercastMid = new THREE.Color(0x3f5262);
      const rainOvercastHoriz = new THREE.Color(0x687c8e);
      const rainOvercastBot = new THREE.Color(0x8496a6);
      targetTop.lerp(rainOvercastTop, 0.75);
      targetMid.lerp(rainOvercastMid, 0.75);
      targetHoriz.lerp(rainOvercastHoriz, 0.75);
      targetBottom.lerp(rainOvercastBot, 0.75);
      stars = 0.0;
    } else if (weatherMode === "Snow") {
      const snowOvercastTop = new THREE.Color(0x455a6d);
      const snowOvercastMid = new THREE.Color(0x72899d);
      const snowOvercastHoriz = new THREE.Color(0xadc1d2);
      const snowOvercastBot = new THREE.Color(0xcedde9);
      targetTop.lerp(snowOvercastTop, 0.80);
      targetMid.lerp(snowOvercastMid, 0.80);
      targetHoriz.lerp(snowOvercastHoriz, 0.80);
      targetBottom.lerp(snowOvercastBot, 0.80);
      stars = 0.0;
    } else if (weatherMode === "Sandstorm" || weatherMode === "Dust") {
      const sandTop = new THREE.Color(0x483120);
      const sandMid = new THREE.Color(0x825533);
      const sandHoriz = new THREE.Color(0xbe8859);
      const sandBot = new THREE.Color(0xddab7d);
      targetTop.lerp(sandTop, 0.85);
      targetMid.lerp(sandMid, 0.85);
      targetHoriz.lerp(sandHoriz, 0.85);
      targetBottom.lerp(sandBot, 0.85);
      stars = 0.0;
    }

    this.skyUniforms.topColor.value.copy(targetTop);
    this.skyUniforms.midColor.value.copy(targetMid);
    this.skyUniforms.horizonColor.value.copy(targetHoriz);
    this.skyUniforms.bottomColor.value.copy(targetBottom);
    this.skyUniforms.starIntensity.value = stars;
    if (this.starMaterial) {
      this.starMaterial.opacity = stars;
    }
  }

  // ---------------------------------------------------------------
  // 4. STYLIZED LOW-POLY ANIMATED OCEAN
  // ---------------------------------------------------------------
  _generateStylizedOcean() {
    const oceanRadius = this.baseRadius - 0.75;
    const oceanGeo = new THREE.IcosahedronGeometry(oceanRadius, 3);

    let oceanColor = 0x1fa2c4; // Oakhaven turquoise
    let emissiveColor = 0x000000;
    let oceanRough = 0.15;

    if (this.type === "Cinderfell") {
      oceanColor = 0xEF4444; emissiveColor = 0xDC2626; // Glowing magma
    } else if (this.type === "Aetheria") {
      oceanColor = 0xD97706; oceanRough = 0.3; // Sulfuric acid
    } else if (this.type === "Rustvale") {
      oceanColor = 0x7F1D1D; // Sunken iron basin
    } else if (this.type === "Stormhaven") {
      oceanColor = 0x1E1B4B; emissiveColor = 0x1D4ED8; // Metallic hydrogen
    } else if (this.type === "Ringhaven") {
      oceanColor = 0x92400E; // Liquid ethane
    } else if (this.type === "Frostveil") {
      oceanColor = 0x0284C7; // Liquid methane
    } else if (this.type === "Thalassa") {
      oceanColor = 0x0A2558; // Abyssal ocean
    } else if (this.type === "Nocturna") {
      oceanColor = 0x18181B; // Nitrogen ice sea
    }

    const oceanMat = new THREE.MeshStandardMaterial({
      color: oceanColor,
      emissive: emissiveColor,
      emissiveIntensity: emissiveColor !== 0x000000 ? 0.35 : 0.0,
      roughness: oceanRough,
      metalness: 0.25,
      flatShading: true,
      transparent: true,
      opacity: 0.90
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.name = "StylizedOcean";
    this.oceanMesh.receiveShadow = true;
    this.group.add(this.oceanMesh);
  }

  // ---------------------------------------------------------------
  // 5. PROCEDURAL MINIATURE GLOBE TERRAIN ELEVATION
  // ---------------------------------------------------------------
  getTerrainRadiusAt(u) {
    let elevation = 0.0;
    const baseR = this.baseRadius;
    const theta = Math.atan2(u.z, u.x);

    // Continuous scenic road across the miniature globe
    const roadLat = Math.asin(u.y);
    const roadCurve = this.getRoadLat(theta);
    const distRoad = Math.abs(roadLat - roadCurve);

    if (this.type === "Oakhaven") {
      // 1. SNOWPEAK MOUNTAIN SUMMITS
      const peak1 = new THREE.Vector3(-0.72, 0.42, -0.55).normalize();
      const distPeak1 = u.distanceTo(peak1);
      if (distPeak1 < 0.52) {
        elevation += Math.pow(1.0 - distPeak1 / 0.52, 1.8) * 12.5; // Pyramidal alpine summit
      }

      const peak2 = new THREE.Vector3(-0.55, 0.52, -0.65).normalize();
      const distPeak2 = u.distanceTo(peak2);
      if (distPeak2 < 0.45) {
        elevation += Math.pow(1.0 - distPeak2 / 0.45, 1.7) * 9.5;
      }

      // 2. OCEAN BASIN & LAKES
      const oceanDir = new THREE.Vector3(0.65, -0.45, -0.60).normalize();
      if (u.distanceTo(oceanDir) < 0.65) {
        elevation -= (1.0 - u.distanceTo(oceanDir) / 0.65) * 4.2; // Ocean trench
      }

      // 3. MOUNTAIN RIVER STREAM
      const streamCurve = 0.36 * Math.cos(theta * 2.5 + 1.2);
      if (Math.abs(roadLat - streamCurve) < 0.08) {
        elevation = Math.min(elevation, -1.2); // River trench
      }

      // 4. ROLLING EMERALD HILLS
      elevation += (Math.sin(u.x * 7.0) * Math.cos(u.z * 7.0) + 0.4 * Math.sin(u.y * 9.0)) * 2.2;

      // 5. ROAD BED SMOOTHING & LEVELING
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.42, elevation, roadFactor);

    } else if (this.type === "Cinderfell") {
      // Mercury: Sharp basalt fissures and caldera
      const craterDir = new THREE.Vector3(0.45, 0.35, 0.82).normalize();
      if (u.distanceTo(craterDir) < 0.6) {
        elevation -= (1.0 - u.distanceTo(craterDir) / 0.6) * 5.5; // Volcanic caldera
      }
      elevation += (Math.sin(u.x * 8.5) * Math.cos(u.z * 8.5) + 0.6 * Math.sin(u.y * 11.0)) * 2.8;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.35, elevation, roadFactor);

    } else if (this.type === "Aetheria") {
      // Venus: Golden rolling sulfuric dunes
      elevation += (Math.sin(u.x * 5.5) * Math.cos(u.z * 5.5) + 0.4 * Math.sin(u.y * 6.5)) * 2.6;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.32, elevation, roadFactor);

    } else if (this.type === "Rustvale") {
      // Mars: Valles Marineris canyon rift & Olympus Mons
      const canyonDir = new THREE.Vector3(-0.65, 0.25, -0.70).normalize();
      if (u.distanceTo(canyonDir) < 0.55) {
        elevation += Math.pow(1.0 - u.distanceTo(canyonDir) / 0.55, 1.6) * 11.5; // Olympus Mons
      }
      elevation += (Math.sin(u.x * 6.8) * Math.cos(u.z * 6.8) + 0.4 * Math.sin(u.y * 8.0)) * 2.5;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.38, elevation, roadFactor);

    } else if (this.type === "Stormhaven") {
      // Jupiter: Atmospheric gas wave ridges
      elevation += (Math.sin(u.y * 14.0) * 1.8 + Math.cos(theta * 6.0) * 1.2);
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.35, elevation, roadFactor);

    } else if (this.type === "Ringhaven") {
      // Saturn: Glacial ice terraces
      elevation += (Math.sin(u.x * 7.2) * Math.cos(u.z * 7.2) + 0.5 * Math.sin(u.y * 7.5)) * 2.4;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.36, elevation, roadFactor);

    } else if (this.type === "Frostveil") {
      // Uranus: Serrated cyan cryo-pinnacles
      const cryoPeak = new THREE.Vector3(-0.55, 0.58, -0.60).normalize();
      if (u.distanceTo(cryoPeak) < 0.48) {
        elevation += Math.pow(1.0 - u.distanceTo(cryoPeak) / 0.48, 1.5) * 10.0;
      }
      elevation += (Math.sin(u.x * 8.0) * Math.cos(u.z * 8.0) + 0.5 * Math.sin(u.y * 9.5)) * 2.9;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.35, elevation, roadFactor);

    } else if (this.type === "Thalassa") {
      // Neptune: Oceanic wave plateaus & oceanic shelf
      const oceanShelf = new THREE.Vector3(0.55, -0.35, -0.75).normalize();
      if (u.distanceTo(oceanShelf) < 0.65) {
        elevation -= (1.0 - u.distanceTo(oceanShelf) / 0.65) * 4.8;
      }
      elevation += (Math.sin(u.x * 6.2) * Math.cos(u.z * 6.2) + 0.4 * Math.sin(u.y * 7.2)) * 2.3;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.40, elevation, roadFactor);

    } else {
      // Nocturna (Pluto): Cratered nitrogen ice plains
      const craterDir = new THREE.Vector3(0.35, 0.55, 0.75).normalize();
      if (u.distanceTo(craterDir) < 0.52) {
        elevation -= (1.0 - u.distanceTo(craterDir) / 0.52) * 3.8;
      }
      elevation += (Math.sin(u.x * 7.5) * Math.cos(u.z * 7.5) + 0.3 * Math.sin(u.y * 8.5)) * 2.1;
      const roadFactor = THREE.MathUtils.smoothstep(distRoad, 0.065, 0.145);
      elevation = THREE.MathUtils.lerp(0.32, elevation, roadFactor);
    }

    return baseR + elevation;
  }

  // ---------------------------------------------------------------
  // 6. REGION DISCOVERY & PROGRESS TRACKER
  // ---------------------------------------------------------------
  getRegionAt(u) {
    const theta = Math.atan2(u.z, u.x);
    const thetaNorm = theta < 0 ? theta + Math.PI * 2 : theta;
    const totalKm = this.circumference / 1000.0;
    const distKm = (thetaNorm / (Math.PI * 2)) * totalKm;

    let regionName = "";
    if (this.type === "Oakhaven") {
      if (distKm < 0.08) regionName = "Pine Creek Outpost";
      else if (distKm < 0.15) regionName = "Whispering Pines Grove";
      else if (distKm < 0.24) regionName = "Snowpeak Glacial Pass";
      else if (distKm < 0.31) regionName = "Granite Gorge Canyon";
      else if (distKm < 0.37) regionName = "Golden Meadow Plateau";
      else regionName = "River Bend Approach";
    } else if (this.type === "Cinderfell") {
      if (distKm < 0.08) regionName = "Magma Basalt Fissures";
      else if (distKm < 0.15) regionName = "Scorched Obsidian Spire";
      else if (distKm < 0.24) regionName = "Thermal Exhaust Caldera";
      else if (distKm < 0.31) regionName = "Basalt Pillar Canyon";
      else if (distKm < 0.37) regionName = "Smoldering Ash Flats";
      else regionName = "Solar Flare Basin";
    } else if (this.type === "Aetheria") {
      if (distKm < 0.08) regionName = "Amber Sulfuric Dunes";
      else if (distKm < 0.15) regionName = "Sulfuric Glass Rotunda";
      else if (distKm < 0.24) regionName = "Vitrified Glass Arches";
      else if (distKm < 0.31) regionName = "Golden Smog Plateau";
      else if (distKm < 0.37) regionName = "Corrosive Acid Flats";
      else regionName = "The Gilded Sea";
    } else if (this.type === "Rustvale") {
      if (distKm < 0.08) regionName = "Valles Marineris Rift";
      else if (distKm < 0.15) regionName = "Red Oxide Canyons";
      else if (distKm < 0.24) regionName = "Terraforming Bio-Dome";
      else if (distKm < 0.31) regionName = "Crimson Dune Sea";
      else if (distKm < 0.37) regionName = "Olympus Mons Ridge";
      else regionName = "Iron Silt Basin";
    } else if (this.type === "Stormhaven") {
      if (distKm < 0.08) regionName = "Ion Lightning Valley";
      else if (distKm < 0.15) regionName = "Jovian Banded Ridges";
      else if (distKm < 0.24) regionName = "Plasma Relays Alpha";
      else if (distKm < 0.31) regionName = "The Great Red Rift";
      else if (distKm < 0.37) regionName = "Metallic Hydrogen Crags";
      else regionName = "High-Voltage Sea";
    } else if (this.type === "Ringhaven") {
      if (distKm < 0.08) regionName = "Golden Ring Arc Pass";
      else if (distKm < 0.15) regionName = "Butterscotch Glaciers";
      else if (distKm < 0.24) regionName = "Orbital Tracker Spire";
      else if (distKm < 0.31) regionName = "Ice Shard Canyons";
      else if (distKm < 0.37) regionName = "Cassini Rift Terrace";
      else regionName = "Liquid Ethane Basin";
    } else if (this.type === "Frostveil") {
      if (distKm < 0.08) regionName = "Methane Ice Glaciers";
      else if (distKm < 0.15) regionName = "Azure Cryo-Pinnacles";
      else if (distKm < 0.24) regionName = "Sub-Zero Survey Rig";
      else if (distKm < 0.31) regionName = "Cryo-Blizzard Pass";
      else if (distKm < 0.37) regionName = "Perpendicular Ring Gap";
      else regionName = "Liquid Methane Sea";
    } else if (this.type === "Thalassa") {
      if (distKm < 0.08) regionName = "Supersonic Wave Ridge";
      else if (distKm < 0.15) regionName = "Sapphire Oceanic Shelf";
      else if (distKm < 0.24) regionName = "Abyssal Sonic Beacon";
      else if (distKm < 0.31) regionName = "Oceanic Monolith Way";
      else if (distKm < 0.37) regionName = "Bioluminescent Trench";
      else regionName = "The Deep Blue Abyss";
    } else {
      if (distKm < 0.08) regionName = "Frozen Nitrogen Plains";
      else if (distKm < 0.15) regionName = "Cold Starlight Spires";
      else if (distKm < 0.24) regionName = "RTG Power Post Outpost";
      else if (distKm < 0.31) regionName = "Cosmic Void Plateau";
      else if (distKm < 0.37) regionName = "Tombaugh Crater Rim";
      else regionName = "Infinite Obsidian Sea";
    }

    return {
      name: regionName,
      distKm,
      totalKm
    };
  }

  // ---------------------------------------------------------------
  // 7. FACET COLORING
  // ---------------------------------------------------------------
  _getFacetColor(u, elevation, normal) {
    const theta = Math.atan2(u.z, u.x);
    const roadLat = Math.asin(u.y);
    const roadCurve = this.getRoadLat(theta);
    const isRoad = Math.abs(roadLat - roadCurve) < 0.11;

    if (this.type === "Oakhaven") {
      // 1. Crisp White Mountain Snow Peak
      if (elevation > 6.5) {
        return new THREE.Color(0.98, 0.99, 1.0);
      }

      // 2. Sparkling Aqua Crystal River Stream
      const streamCurve = 0.36 * Math.cos(theta * 2.5 + 1.2);
      if (Math.abs(roadLat - streamCurve) < 0.08 && elevation < -0.4) {
        return new THREE.Color(0.38, 0.84, 0.95);
      }

      // 3. Winding Dirt Road (Warm sunlit ochre)
      if (isRoad) {
        return new THREE.Color(0.85, 0.69, 0.48);
      }

      // 4. Rocky Granite Cliffs
      const steepness = 1.0 - normal.dot(u);
      if (elevation > 3.5 || steepness > 0.38) {
        return Math.sin(u.x * 12.0) > 0.0
          ? new THREE.Color(0.55, 0.58, 0.62)
          : new THREE.Color(0.42, 0.45, 0.49);
      }

      // 5. Faceted Emerald Springtime Hills (Photo 1)
      if (elevation > 1.5) {
        return new THREE.Color(0.56, 0.79, 0.29); // Lime green
      } else if (elevation > 0.0) {
        return new THREE.Color(0.39, 0.66, 0.22); // Lush green
      } else {
        return new THREE.Color(0.25, 0.52, 0.17); // Dark forest green
      }

    } else if (this.type === "Cinderfell") {
      // Mercury: Volcanic basalt, glowing magma veins & obsidian spires
      if (isRoad) return new THREE.Color(0.48, 0.44, 0.42); // Distinct crushed basalt road ribbon
      if (elevation < -0.8) return new THREE.Color(0.98, 0.32, 0.08); // Incandescent magma seams
      if (elevation > 1.6) return new THREE.Color(0.12, 0.11, 0.14); // Dark obsidian peaks
      if (elevation > 0.4) return new THREE.Color(0.28, 0.24, 0.26); // Mid-tier scorched basalt
      return new THREE.Color(0.20, 0.17, 0.18); // Low-tier shadow ash floor

    } else if (this.type === "Aetheria") {
      // Venus: Golden amber dunes, silica glasslands & crystalline ridges
      if (isRoad) return new THREE.Color(1.00, 0.96, 0.82); // Pale silica glass road ribbon
      if (elevation > 1.8) return new THREE.Color(0.98, 0.82, 0.42); // Brilliant sunlit silica ridge peaks
      if (elevation > 0.4) return new THREE.Color(0.88, 0.64, 0.22); // Warm golden amber dunes
      return new THREE.Color(0.65, 0.40, 0.14); // Deep bronze canyon shadow floor

    } else if (this.type === "Rustvale") {
      // Mars: Crimson red oxide, butterscotch ridges & iron canyon shadows
      if (isRoad) return new THREE.Color(0.99, 0.89, 0.58); // Packed-sand high-readability road ribbon
      if (elevation > 1.7) return new THREE.Color(0.98, 0.64, 0.16); // Sunlit butterscotch ridge peaks
      if (elevation > 0.3) return new THREE.Color(0.80, 0.28, 0.10); // Rich warm terracotta mid-slopes
      return new THREE.Color(0.34, 0.08, 0.08); // Deep iron-shadow canyon floors

    } else if (this.type === "Stormhaven") {
      // Jupiter: Jovian electric cobalt, neon ionized track & cloud ridges
      if (isRoad) return new THREE.Color(0.38, 0.92, 0.98); // Luminous ionized neon cyan runway ribbon
      if (elevation > 1.8) return new THREE.Color(0.42, 0.46, 0.85); // Electric indigo-lavender cloud crests
      if (elevation > 0.4) return new THREE.Color(0.16, 0.34, 0.68); // Saturated cobalt mid-slopes
      return new THREE.Color(0.08, 0.12, 0.32); // Deep midnight trench shadow floor

    } else if (this.type === "Ringhaven") {
      // Saturn: Golden butterscotch ice, champagne crests & umber ring shadows
      if (isRoad) return new THREE.Color(0.99, 0.94, 0.78); // Polished ivory-gold causeway ribbon
      if (elevation > 1.8) return new THREE.Color(0.96, 0.85, 0.62); // Radiant champagne ice crests
      if (elevation > 0.4) return new THREE.Color(0.82, 0.65, 0.40); // Warm butterscotch ice slopes
      return new THREE.Color(0.48, 0.32, 0.18); // Deep umber ring-shadow floor

    } else if (this.type === "Frostveil") {
      // Uranus: Azure methane ice, crystalline frost peaks & crevasse teal
      if (isRoad) return new THREE.Color(0.96, 0.99, 1.00); // Pure glacial blue-ice road ribbon
      if (elevation > 1.8) return new THREE.Color(0.68, 0.92, 0.98); // Sunlit crystalline frost peaks
      if (elevation > 0.4) return new THREE.Color(0.24, 0.62, 0.82); // Rich azure methane ice mid-slopes
      return new THREE.Color(0.08, 0.28, 0.42); // Deep abyssal crevasse teal shadow floor

    } else if (this.type === "Thalassa") {
      // Neptune: Deep royal sapphire, bioluminescent crests & oceanic trench
      if (isRoad) return new THREE.Color(0.45, 0.88, 0.96); // Luminous aquamarine reef causeway ribbon
      if (elevation > 1.8) return new THREE.Color(0.28, 0.58, 0.92); // Bioluminescent cobalt-cyan crests
      if (elevation > 0.4) return new THREE.Color(0.12, 0.28, 0.62); // Vibrant royal sapphire mid-slopes
      return new THREE.Color(0.04, 0.10, 0.28); // Ultra-deep midnight oceanic trench shadow floor

    } else {
      // Nocturna (Pluto): Charcoal-violet nitrogen plains, silver-lilac frost & obsidian craters
      if (isRoad) return new THREE.Color(0.90, 0.86, 0.98); // Stark nitrogen-frost crystal road ribbon
      if (elevation > 1.8) return new THREE.Color(0.72, 0.60, 0.88); // Luminous silver-lilac frost ridges
      if (elevation > 0.4) return new THREE.Color(0.32, 0.22, 0.46); // Rich amethyst violet mid-slopes
      return new THREE.Color(0.10, 0.08, 0.15); // Deep pitch obsidian crater floor
    }
  }

  // ---------------------------------------------------------------
  // 8. GENERATE FACETED GLOBE GEOMETRY
  // ---------------------------------------------------------------
  _generateFacetedPlanet() {
    const ico = new THREE.IcosahedronGeometry(1.0, 3); // 1280 triangular faces
    const posAttr = ico.attributes.position;
    const numTriangles = posAttr.count / 3;

    const positions = [];
    const colors = [];
    const normals = [];

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const u1 = new THREE.Vector3();
    const u2 = new THREE.Vector3();
    const u3 = new THREE.Vector3();
    const centerUnit = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();

    for (let t = 0; t < numTriangles; t++) {
      u1.fromBufferAttribute(posAttr, t * 3).normalize();
      u2.fromBufferAttribute(posAttr, t * 3 + 1).normalize();
      u3.fromBufferAttribute(posAttr, t * 3 + 2).normalize();

      const r1 = this.getTerrainRadiusAt(u1);
      const r2 = this.getTerrainRadiusAt(u2);
      const r3 = this.getTerrainRadiusAt(u3);

      pA.copy(u1).multiplyScalar(r1);
      pB.copy(u2).multiplyScalar(r2);
      pC.copy(u3).multiplyScalar(r3);

      // Compute flat face normal
      edge1.subVectors(pB, pA);
      edge2.subVectors(pC, pA);
      faceNormal.crossVectors(edge1, edge2).normalize();

      centerUnit.addVectors(u1, u2).add(u3).multiplyScalar(1.0 / 3.0).normalize();
      if (faceNormal.dot(centerUnit) < 0.0) {
        const tmp = pB.clone();
        pB.copy(pC);
        pC.copy(tmp);
        faceNormal.negate();
      }

      const avgElevation = ((r1 + r2 + r3) / 3.0) - this.baseRadius;
      const color = this._getFacetColor(centerUnit, avgElevation, faceNormal);

      for (const p of [pA, pB, pC]) {
        positions.push(p.x, p.y, p.z);
        colors.push(color.r, color.g, color.b);
        normals.push(faceNormal.x, faceNormal.y, faceNormal.z);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05
    });

    this.meshInstance = new THREE.Mesh(geometry, material);
    this.meshInstance.receiveShadow = true;
    this.meshInstance.castShadow = true;
    this.group.add(this.meshInstance);
  }

  // ---------------------------------------------------------------
  // 8.5 PRECISION SURFACE RAYCASTING & NORMAL SNAPPING
  // Raycasts directly against the faceted 3D mesh triangles so models
  // sit 100% flush on the ground with zero floating gaps or hovering.
  // ---------------------------------------------------------------
  getSurfacePlacement(dir, embedOffset = -0.12) {
    if (!this._raycaster) {
      this._raycaster = new THREE.Raycaster();
    }
    const normDir = dir.clone().normalize();
    const origin = normDir.clone().multiplyScalar(this.baseRadius + 45.0);
    const direction = normDir.clone().negate();
    this._raycaster.set(origin, direction);

    if (this.meshInstance) {
      const hits = this._raycaster.intersectObject(this.meshInstance, false);
      if (hits.length > 0) {
        const hit = hits[0];
        const normal = hit.face ? hit.face.normal.clone().normalize() : normDir;
        // Sinks into the terrain facet slightly to guarantee zero edge gaps
        const pos = hit.point.clone().addScaledVector(normDir, embedOffset);
        return { position: pos, normal };
      }
    }

    // Mathematical sphere fallback
    const r = this.getTerrainRadiusAt(normDir) + embedOffset;
    return {
      position: normDir.clone().multiplyScalar(r),
      normal: normDir
    };
  }

  // ---------------------------------------------------------------
  // 9. SPAWN MINIATURE LANDMARKS & SOLID COLLIDERS
  // ---------------------------------------------------------------
  _spawnLandmarks() {
    this.colliders = [];
    this.windmillRotors = [];
    this.spireApexes = [];

    if (this.type === "Oakhaven") {
      // =============================================================
      // OAKHAVEN: 4 CURATED BIOMES & SETTLEMENTS (NO RANDOM SPAM)
      // =============================================================

      // -------------------------------------------------------------
      // BIOME 1: ALPINE VILLAGE & SETTLEMENT (theta ~ 0.15 - 0.70)
      // -------------------------------------------------------------
      // A. Outpost Log Cabin
      const cabinDir = this._getRoadDir(0.28);
      const cabinRight = this._getRoadRight(0.28);
      const cabinWorldDir = new THREE.Vector3().addVectors(cabinDir, cabinRight.clone().multiplyScalar(0.145)).normalize();
      const cabinPlace = this.getSurfacePlacement(cabinWorldDir, -0.15);
      const cabin = buildAlpineCabin();
      cabin.scale.set(0.9, 0.9, 0.9);
      cabin.position.copy(cabinPlace.position);
      this._alignToNormal(cabin, cabinPlace.normal);
      this.group.add(cabin);
      this.addCollider(cabin.position, 2.45, 5.0, "cabin", "Alpine Log Cabin");

      // B. Village Chalet House 1 (Red Roof variant)
      const h1Dir = this._getRoadDir(0.42);
      const h1Right = this._getRoadRight(0.42);
      const h1WorldDir = new THREE.Vector3().addVectors(h1Dir, h1Right.clone().multiplyScalar(-0.145)).normalize();
      const h1Place = this.getSurfacePlacement(h1WorldDir, -0.15);
      const h1 = buildAlpineVillageHouse(0);
      h1.scale.set(1.0, 1.0, 1.0);
      h1.position.copy(h1Place.position);
      this._alignToNormal(h1, h1Place.normal);
      this.group.add(h1);
      this.addCollider(h1.position, 2.15, 4.5, "house", "Alpine Chalet House");

      // C. Village Chalet House 2 (Slate Roof variant)
      const h2Dir = this._getRoadDir(0.56);
      const h2Right = this._getRoadRight(0.56);
      const h2WorldDir = new THREE.Vector3().addVectors(h2Dir, h2Right.clone().multiplyScalar(0.145)).normalize();
      const h2Place = this.getSurfacePlacement(h2WorldDir, -0.15);
      const h2 = buildAlpineVillageHouse(1);
      h2.scale.set(1.0, 1.0, 1.0);
      h2.position.copy(h2Place.position);
      this._alignToNormal(h2, h2Place.normal);
      this.group.add(h2);
      this.addCollider(h2.position, 2.15, 4.5, "house", "Alpine Slate Chalet");

      // D. Village Street Lanterns along the main path
      const lanternThetas = [0.22, 0.35, 0.48, 0.62];
      for (let i = 0; i < lanternThetas.length; i++) {
        const lTh = lanternThetas[i];
        const lDir = this._getRoadDir(lTh);
        const lRight = this._getRoadRight(lTh);
        const sideSign = (i % 2 === 0 ? 1 : -1) * 0.098;
        const lWorldDir = new THREE.Vector3().addVectors(lDir, lRight.clone().multiplyScalar(sideSign)).normalize();
        const lPlace = this.getSurfacePlacement(lWorldDir, -0.12);
        const lantern = buildStreetLanternPost();
        lantern.position.copy(lPlace.position);
        this._alignToNormal(lantern, lPlace.normal);
        this.group.add(lantern);
        this.addCollider(lantern.position, 0.15, 2.5, "lantern", "Street Lantern Post");
      }

      // -------------------------------------------------------------
      // BIOME 2: TIMBER RIVER CROSSINGS & WHISPERING PINES GROVES (theta ~ 0.80 - 2.80)
      // -------------------------------------------------------------
      // Bridges across Aqua River
      const bridgeAngles = [0.75, 1.68];
      for (let i = 0; i < bridgeAngles.length; i++) {
        const bTheta = bridgeAngles[i];
        const bDir = this._getRoadDir(bTheta);
        const bPlace = this.getSurfacePlacement(bDir, 0.08);
        const bridge = buildWoodenBridge();
        bridge.scale.set(0.85, 0.85, 0.85);
        bridge.position.copy(bPlace.position);

        const bTangent = this._getRoadTangent(bTheta);
        const bRight = this._getRoadRight(bTheta);
        const bMat = new THREE.Matrix4().makeBasis(bRight, bDir, bTangent.clone().negate());
        bridge.quaternion.setFromRotationMatrix(bMat);
        this.group.add(bridge);

        const leftRail = bridge.position.clone().add(bRight.clone().multiplyScalar(-2.6));
        const rightRail = bridge.position.clone().add(bRight.clone().multiplyScalar(2.6));
        this.addCollider(leftRail, 0.24, 2.0, "rail", "Bridge Railing");
        this.addCollider(rightRail, 0.24, 2.0, "rail", "Bridge Railing");
      }

      // Clustered Pine Groves (organic natural copses, NOT a uniform conveyor belt)
      const pineClusters = [
        { baseTheta: 0.18, count: 5, sideBase: -0.145, spread: 0.03 },
        { baseTheta: 0.95, count: 6, sideBase: 0.145, spread: 0.04 },
        { baseTheta: 1.35, count: 8, sideBase: -0.150, spread: 0.05 },
        { baseTheta: 2.10, count: 7, sideBase: 0.145, spread: 0.045 },
        { baseTheta: 2.65, count: 6, sideBase: -0.145, spread: 0.035 },
        { baseTheta: 3.75, count: 5, sideBase: 0.145, spread: 0.035 },
        { baseTheta: 5.30, count: 5, sideBase: -0.145, spread: 0.04 }
      ];

      for (const cl of pineClusters) {
        for (let p = 0; p < cl.count; p++) {
          const tTheta = cl.baseTheta + (p - cl.count / 2) * (cl.spread / cl.count);
          const rDir = this._getRoadDir(tTheta);
          const rRight = this._getRoadRight(tTheta);
          const treeOffset = cl.sideBase + ((p % 3) - 1) * 0.025;
          const treeDir = new THREE.Vector3().addVectors(rDir, rRight.clone().multiplyScalar(treeOffset)).normalize();
          const treePlace = this.getSurfacePlacement(treeDir, -0.18);

          const pine = buildPineTree(p % 2 === 0);
          const s = 0.85 + (p % 3) * 0.22;
          pine.scale.set(s, s, s);
          pine.position.copy(treePlace.position);
          this._alignToNormal(pine, treePlace.normal);
          this.group.add(pine);
          this.addCollider(pine.position, 0.56 * s, 6.0 * s, "tree", "Pine Tree");
        }
      }

      // Guardrails on sharp bends
      const guardrailCurves = [
        { start: 1.05, end: 1.45, side: 1 },
        { start: 2.25, end: 2.60, side: -1 },
        { start: 5.05, end: 5.45, side: 1 }
      ];
      for (const gc of guardrailCurves) {
        const posts = 8;
        for (let p = 0; p < posts; p++) {
          const gTheta = gc.start + (p / (posts - 1)) * (gc.end - gc.start);
          const rDir = this._getRoadDir(gTheta);
          const rRight = this._getRoadRight(gTheta);
          const gDir = new THREE.Vector3().addVectors(rDir, rRight.clone().multiplyScalar(gc.side * 0.088)).normalize();
          const gPlace = this.getSurfacePlacement(gDir, -0.05);

          const postGroup = new THREE.Group();
          const postMat = new THREE.MeshStandardMaterial({ color: PALETTE.fenceRail, roughness: 0.9, flatShading: true });
          const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.4, 6), postMat);
          postMesh.position.y = -0.2;
          postGroup.add(postMesh);

          const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 1.8), postMat);
          railMesh.position.y = 0.75;
          postGroup.add(railMesh);

          postGroup.position.copy(gPlace.position);
          this._alignToNormal(postGroup, gPlace.normal);
          this.group.add(postGroup);
          this.addCollider(postGroup.position, 0.24, 1.5, "guardrail", "Timber Guardrail");
        }
      }

      // -------------------------------------------------------------
      // BIOME 3: HIGHLAND WINDMILL VALLEY & FARMSTEAD (theta ~ 3.10 - 4.20)
      // -------------------------------------------------------------
      // A. Highland Windmill with spinning sails
      const wmDir = this._getRoadDir(3.38);
      const wmRight = this._getRoadRight(3.38);
      const wmWorldDir = new THREE.Vector3().addVectors(wmDir, wmRight.clone().multiplyScalar(0.150)).normalize();
      const wmPlace = this.getSurfacePlacement(wmWorldDir, -0.18);
      const windmill = buildWindmill();
      windmill.position.copy(wmPlace.position);
      this._alignToNormal(windmill, wmPlace.normal);
      this.group.add(windmill);
      this.addCollider(windmill.position, 2.25, 7.5, "windmill", "Highland Windmill");

      const rotor = windmill.getObjectByName("WindmillRotor");
      if (rotor) this.windmillRotors.push(rotor);

      // B. Farmstead Barn / Chalet
      const barnDir = this._getRoadDir(3.58);
      const barnRight = this._getRoadRight(3.58);
      const barnWorldDir = new THREE.Vector3().addVectors(barnDir, barnRight.clone().multiplyScalar(-0.150)).normalize();
      const barnPlace = this.getSurfacePlacement(barnWorldDir, -0.15);
      const barn = buildAlpineVillageHouse(1);
      barn.scale.set(1.1, 1.1, 1.1);
      barn.position.copy(barnPlace.position);
      this._alignToNormal(barn, barnPlace.normal);
      this.group.add(barn);
      this.addCollider(barn.position, 2.25, 4.8, "barn", "Farmstead Chalet");

      // C. Third Mountain Brook Bridge
      const b3Dir = this._getRoadDir(3.92);
      const b3Place = this.getSurfacePlacement(b3Dir, 0.08);
      const b3Bridge = buildWoodenBridge();
      b3Bridge.scale.set(0.85, 0.85, 0.85);
      b3Bridge.position.copy(b3Place.position);
      const b3Tangent = this._getRoadTangent(3.92);
      const b3Right = this._getRoadRight(3.92);
      const b3Mat = new THREE.Matrix4().makeBasis(b3Right, b3Dir, b3Tangent.clone().negate());
      b3Bridge.quaternion.setFromRotationMatrix(b3Mat);
      this.group.add(b3Bridge);
      this.addCollider(b3Bridge.position.clone().add(b3Right.clone().multiplyScalar(-2.6)), 0.24, 2.0, "rail", "Bridge Railing");
      this.addCollider(b3Bridge.position.clone().add(b3Right.clone().multiplyScalar(2.6)), 0.24, 2.0, "rail", "Bridge Railing");

      // Lanterns in Windmill Valley
      for (const wlTh of [3.28, 3.70]) {
        const wlDir = this._getRoadDir(wlTh);
        const wlRight = this._getRoadRight(wlTh);
        const wlWorldDir = new THREE.Vector3().addVectors(wlDir, wlRight.clone().multiplyScalar(0.098)).normalize();
        const wlPlace = this.getSurfacePlacement(wlWorldDir, -0.12);
        const lantern = buildStreetLanternPost();
        lantern.position.copy(wlPlace.position);
        this._alignToNormal(lantern, wlPlace.normal);
        this.group.add(lantern);
        this.addCollider(lantern.position, 0.15, 2.5, "lantern", "Street Lantern Post");
      }

      // -------------------------------------------------------------
      // BIOME 4: STARGAZER MOUNTAIN OBSERVATORY (theta ~ 4.70 - 5.80)
      // -------------------------------------------------------------
      const obsDir = this._getRoadDir(4.95);
      const obsRight = this._getRoadRight(4.95);
      const obsWorldDir = new THREE.Vector3().addVectors(obsDir, obsRight.clone().multiplyScalar(0.150)).normalize();
      const obsPlace = this.getSurfacePlacement(obsWorldDir, -0.22);
      const observatory = buildObservatoryDome();
      observatory.position.copy(obsPlace.position);
      this._alignToNormal(observatory, obsPlace.normal);
      this.group.add(observatory);
      this.addCollider(observatory.position, 2.45, 6.0, "observatory", "Stargazer Observatory");

      const obsLanternDir = this._getRoadDir(4.78);
      const obsLanternRight = this._getRoadRight(4.78);
      const obsLWorldDir = new THREE.Vector3().addVectors(obsLanternDir, obsLanternRight.clone().multiplyScalar(-0.098)).normalize();
      const obsLPlace = this.getSurfacePlacement(obsLWorldDir, -0.12);
      const obsLantern = buildStreetLanternPost();
      obsLantern.position.copy(obsLPlace.position);
      this._alignToNormal(obsLantern, obsLPlace.normal);
      this.group.add(obsLantern);
      this.addCollider(obsLantern.position, 0.15, 2.5, "lantern", "Street Lantern Post");

    } else {
      // =============================================================
      // THE 8 PLANETARY SOLAR COMPANIONS: BESPOKE LANDMARKS & COLLIDERS
      // =============================================================
      const angles = [0.38, 0.82, 1.45, 2.15, 2.85, 3.55, 4.35, 5.15];

      for (let i = 0; i < angles.length; i++) {
        const th = angles[i];
        const dir = this._getRoadDir(th);
        const right = this._getRoadRight(th);
        const sideOffset = (i % 2 === 0 ? 0.155 : -0.155);
        const worldDir = new THREE.Vector3().addVectors(dir, right.clone().multiplyScalar(sideOffset)).normalize();
        const place = this.getSurfacePlacement(worldDir, -0.15);

        let landmark = null;
        let colRadius = 1.6;
        let colHeight = 5.0;
        let colName = "Planetary Landmark";

        if (this.type === "Cinderfell") {
          if (i % 2 === 0) {
            landmark = buildObsidianSpire();
            colRadius = 0.8; colHeight = 7.5; colName = "Obsidian Spire";
          } else {
            landmark = buildThermalVent();
            colRadius = 1.2; colHeight = 3.5; colName = "Thermal Vent";
          }
        } else if (this.type === "Aetheria") {
          if (i % 2 === 0) {
            landmark = buildSulfuricGlassDome();
            colRadius = 2.4; colHeight = 4.5; colName = "Sulfuric Glass Dome";
          } else {
            landmark = buildSulfuricArch();
            colRadius = 1.8; colHeight = 5.0; colName = "Sulfuric Basalt Arch";
          }
        } else if (this.type === "Rustvale") {
          if (i % 2 === 0) {
            landmark = buildMarsTerraformDome();
            colRadius = 2.5; colHeight = 4.5; colName = "Terraforming Dome";
          } else {
            landmark = buildMarsCommsTower();
            colRadius = 0.9; colHeight = 6.5; colName = "Mars Comms Tower";
          }
        } else if (this.type === "Stormhaven") {
          if (i % 2 === 0) {
            landmark = buildLightningPylon();
            colRadius = 0.8; colHeight = 8.0; colName = "Lightning Pylon";
          } else {
            landmark = buildPlasmaRod();
            colRadius = 0.7; colHeight = 5.0; colName = "Plasma Relay Rod";
          }
        } else if (this.type === "Ringhaven") {
          if (i % 2 === 0) {
            landmark = buildRingTrackerStation();
            colRadius = 2.2; colHeight = 4.5; colName = "Ring Tracker Station";
          } else {
            landmark = buildIceCrystalArch();
            colRadius = 1.9; colHeight = 5.0; colName = "Golden Ice Arch";
          }
        } else if (this.type === "Frostveil") {
          if (i % 2 === 0) {
            landmark = buildCryoDrill();
            colRadius = 1.4; colHeight = 6.0; colName = "Cryo-Drill Rig";
          } else {
            landmark = buildFrostPinnacle();
            colRadius = 0.9; colHeight = 7.0; colName = "Methane Frost Pinnacle";
          }
        } else if (this.type === "Thalassa") {
          if (i % 2 === 0) {
            landmark = buildAbyssalBeacon();
            colRadius = 0.8; colHeight = 5.5; colName = "Abyssal Sonic Beacon";
          } else {
            landmark = buildOceanicMonolith();
            colRadius = 1.2; colHeight = 6.5; colName = "Oceanic Monolith";
          }
        } else {
          // Nocturna (Pluto)
          if (i % 2 === 0) {
            landmark = buildRtgPowerPost();
            colRadius = 0.6; colHeight = 4.0; colName = "RTG Nuclear Power Post";
          } else {
            landmark = buildVoidIceSpire();
            colRadius = 0.8; colHeight = 6.8; colName = "Nitrogen Ice Spire";
          }
        }

        if (landmark) {
          landmark.position.copy(place.position);
          this._alignToNormal(landmark, place.normal);
          this.group.add(landmark);
          this.addCollider(landmark.position, colRadius, colHeight, "landmark", colName);
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // 9.5 PLANETARY RING SYSTEM (Ringhaven & Frostveil)
  // ---------------------------------------------------------------
  _spawnPlanetaryRings() {
    this.ringsGroup = new THREE.Group();
    this.ringsGroup.name = "PlanetaryRingsLayer";
    this.group.add(this.ringsGroup);

    if (this.type === "Ringhaven") {
      // Magnificent Golden 3D Double-Sided Translucent Ring System
      const ringGeo = new THREE.RingGeometry(82.0, 116.0, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        emissive: 0xD97706,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + 0.47; // ~27 degrees tilt
      ringMesh.rotation.y = 0.22;
      this.ringsGroup.add(ringMesh);

      // Inner thin dust ring
      const innerGeo = new THREE.RingGeometry(74.0, 79.0, 64);
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0xFDE68A,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.rotation.copy(ringMesh.rotation);
      this.ringsGroup.add(innerMesh);

    } else if (this.type === "Frostveil") {
      // Perpendicular Aquamarine Ring System (tilted 82 degrees like Uranus)
      const ringGeo = new THREE.RingGeometry(80.0, 104.0, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x38BDF8,
        emissive: 0x0284C7,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + 1.43; // ~82 degree perpendicular tilt
      ringMesh.rotation.z = 0.35;
      this.ringsGroup.add(ringMesh);
    }
  }

  // Analytical Road Coordinates
  getRoadLat(theta) {
    if (this.type === "Rustvale") {
      // Mars: Dramatic canyon gorge winding around Olympus Mons
      return 0.24 * Math.sin(theta * 3.5 + 0.5) + 0.09 * Math.cos(theta * 2.0);
    } else if (this.type === "Cinderfell") {
      // Mercury: Volcanic caldera rim circuit
      return 0.18 * Math.sin(theta * 3.0 + 0.2) + 0.08 * Math.cos(theta * 4.0);
    } else if (this.type === "Stormhaven") {
      // Jupiter: Jovian equatorial atmospheric runway with wide sweeping curves
      return 0.15 * Math.sin(theta * 2.5 + 0.4) + 0.06 * Math.cos(theta * 3.0);
    } else if (this.type === "Ringhaven") {
      // Saturn: Broad ringway with panoramic view of planetary rings
      return 0.20 * Math.sin(theta * 3.0) + 0.08 * Math.cos(theta * 2.0);
    } else if (this.type === "Frostveil") {
      // Uranus: Glacier pass snaking between cryo-pinnacles
      return 0.22 * Math.sin(theta * 3.5 - 0.3) + 0.08 * Math.cos(theta * 2.0);
    } else if (this.type === "Thalassa") {
      // Neptune: Coastal archipelago oceanic causeway
      return 0.20 * Math.sin(theta * 3.0 + 0.6) + 0.09 * Math.cos(theta * 2.0);
    } else if (this.type === "Nocturna") {
      // Pluto: Starlight crater circuit across nitrogen ice plains
      return 0.22 * Math.sin(theta * 3.0 + 0.1) + 0.07 * Math.cos(theta * 2.0);
    } else if (this.type === "Aetheria") {
      // Venus: Rolling sulfuric dunes highway
      return 0.19 * Math.sin(theta * 3.2 + 0.3) + 0.08 * Math.cos(theta * 2.0);
    }
    // Oakhaven (Alpine Wilderness): Classical scenic mountain route (100% original untouched formula)
    return 0.22 * Math.sin(theta * 4.0 + 0.35) + 0.07 * Math.cos(theta * 2.0);
  }

  getRoadDLatDTheta(theta) {
    if (this.type === "Rustvale") {
      return 0.24 * 3.5 * Math.cos(theta * 3.5 + 0.5) - 0.09 * 2.0 * Math.sin(theta * 2.0);
    } else if (this.type === "Cinderfell") {
      return 0.18 * 3.0 * Math.cos(theta * 3.0 + 0.2) - 0.08 * 4.0 * Math.sin(theta * 4.0);
    } else if (this.type === "Stormhaven") {
      return 0.15 * 2.5 * Math.cos(theta * 2.5 + 0.4) - 0.06 * 3.0 * Math.sin(theta * 3.0);
    } else if (this.type === "Ringhaven") {
      return 0.20 * 3.0 * Math.cos(theta * 3.0) - 0.08 * 2.0 * Math.sin(theta * 2.0);
    } else if (this.type === "Frostveil") {
      return 0.22 * 3.5 * Math.cos(theta * 3.5 - 0.3) - 0.08 * 2.0 * Math.sin(theta * 2.0);
    } else if (this.type === "Thalassa") {
      return 0.20 * 3.0 * Math.cos(theta * 3.0 + 0.6) - 0.09 * 2.0 * Math.sin(theta * 2.0);
    } else if (this.type === "Nocturna") {
      return 0.22 * 3.0 * Math.cos(theta * 3.0 + 0.1) - 0.07 * 2.0 * Math.sin(theta * 2.0);
    } else if (this.type === "Aetheria") {
      return 0.19 * 3.2 * Math.cos(theta * 3.2 + 0.3) - 0.08 * 2.0 * Math.sin(theta * 2.0);
    }
    return 0.22 * 4.0 * Math.cos(theta * 4.0 + 0.35) - 0.07 * 2.0 * Math.sin(theta * 2.0);
  }

  _getRoadDir(theta) {
    const roadLat = this.getRoadLat(theta);
    const x = Math.cos(roadLat) * Math.cos(theta);
    const y = Math.sin(roadLat);
    const z = Math.cos(roadLat) * Math.sin(theta);
    return new THREE.Vector3(x, y, z).normalize();
  }

  _getRoadTangent(theta) {
    const roadLat = this.getRoadLat(theta);
    const dLatDTheta = this.getRoadDLatDTheta(theta);

    const cosLat = Math.cos(roadLat);
    const sinLat = Math.sin(roadLat);
    const cosTh = Math.cos(theta);
    const sinTh = Math.sin(theta);

    const dx = -sinLat * cosTh * dLatDTheta - cosLat * sinTh;
    const dy = cosLat * dLatDTheta;
    const dz = -sinLat * sinTh * dLatDTheta + cosLat * cosTh;
    return new THREE.Vector3(dx, dy, dz).normalize();
  }

  _getRoadRight(theta) {
    const tangent = this._getRoadTangent(theta);
    const normal = this._getRoadDir(theta);
    return new THREE.Vector3().crossVectors(tangent, normal).normalize();
  }

  // ---------------------------------------------------------------
  // 10. ORGANIC 3D CUMULUS CLOUDS WITH MULTI-AXIS SPHERICAL DRIFT
  // Billowing low-poly cloud clusters drifting along independent
  // orbital planes with natural sinusoidal bobbing and gentle billow turns.
  // ---------------------------------------------------------------
  _spawnOrbitingClouds() {
    this.cloudsGroup = new THREE.Group();
    this.cloudsGroup.name = "CloudsLayer";
    this.group.add(this.cloudsGroup);
    this.clouds = [];

    const cloudMat = new THREE.MeshStandardMaterial({
      color: this.type === "Oakhaven" ? 0xffffff : 0xfde8ff,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true
    });

    const numClouds = 14;
    for (let i = 0; i < numClouds; i++) {
      const cloud = new THREE.Group();

      // Billowing 3D Cumulus Silhouette (Central core puff + 6 multi-axis organic lobes)
      const coreR = 2.8 + (i % 3) * 0.7;
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(coreR, 1), cloudMat);
      core.castShadow = true;
      cloud.add(core);

      const lobes = [
        { off: [-1.9, 0.35, -0.7], r: coreR * 0.70 },
        { off: [2.1, 0.25, 0.6], r: coreR * 0.72 },
        { off: [0.2, 1.45, 0.3], r: coreR * 0.65 }, // Fluffy dome crown
        { off: [-1.0, -0.3, 1.6], r: coreR * 0.64 },
        { off: [1.2, -0.2, -1.5], r: coreR * 0.60 },
        { off: [0.1, -0.4, 0.0], r: coreR * 0.82 }  // Flatter base facing planet
      ];

      for (const lobe of lobes) {
        const lMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(lobe.r, 1), cloudMat);
        lMesh.position.set(lobe.off[0], lobe.off[1], lobe.off[2]);
        lMesh.castShadow = true;
        cloud.add(lMesh);
      }

      // Proportional scale variation
      const s = 0.85 + (i % 4) * 0.18;
      cloud.scale.set(s, s * 0.78, s);

      // Independent multi-orbital planes across the globe
      const alt = this.baseRadius + 14.5 + (i % 5) * 2.2; // 79.5m - 88.5m altitude shells
      const phi = (i / numClouds) * Math.PI * 0.85 + 0.15;
      const theta = (i * 2.39996) % (Math.PI * 2.0); // Golden ratio spacing
      const initDir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      // Individual inclined orbital axis (tilted 15-45 degrees from planet Y)
      const tiltX = Math.sin(i * 1.7) * 0.35;
      const tiltZ = Math.cos(i * 2.1) * 0.35;
      const orbitAxis = new THREE.Vector3(tiltX, 1.0, tiltZ).normalize();

      const speed = 0.014 + (i % 4) * 0.0035; // Organic varying drift speeds
      const bobFreq = 0.35 + (i % 3) * 0.15;
      const bobPhase = i * 1.35;

      this.cloudsGroup.add(cloud);
      this.clouds.push({
        group: cloud,
        currentDir: initDir,
        orbitAxis,
        orbitRadius: alt,
        speed,
        bobFreq,
        bobPhase,
        selfSpin: (i % 2 === 0 ? 1 : -1) * 0.018
      });
    }
  }

  // ---------------------------------------------------------------
  // 11. DRIFTING HOT AIR BALLOONS (TINY SKIES DETAIL)
  // ---------------------------------------------------------------
  _spawnHotAirBalloons() {
    const balloonGroup = new THREE.Group();
    balloonGroup.name = "HotAirBalloons";
    this.group.add(balloonGroup);

    const balloonColors = [0xff4444, 0x3388ff, 0xffbb00];
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.1 + 0.8;
      const bDist = this.baseRadius + 22.0;
      const bH = 12.0 + i * 4.0;

      const balloon = new THREE.Group();
      balloon.position.set(Math.cos(angle) * bDist, bH, Math.sin(angle) * bDist);

      // Teardrop balloon envelope
      const envGeo = new THREE.SphereGeometry(2.2, 12, 10);
      envGeo.scale(1.0, 1.35, 1.0);
      const envMat = new THREE.MeshLambertMaterial({ color: balloonColors[i], flatShading: true });
      const envMesh = new THREE.Mesh(envGeo, envMat);
      balloon.add(envMesh);

      // Wicker basket
      const basketGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
      const basketMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
      const basketMesh = new THREE.Mesh(basketGeo, basketMat);
      basketMesh.position.y = -2.4;
      balloon.add(basketMesh);

      balloonGroup.add(balloon);
      this.hotAirBalloons.push({
        group: balloon,
        baseAngle: angle,
        orbitRadius: bDist,
        speed: 0.02 + i * 0.01
      });
    }
  }

  // ---------------------------------------------------------------
  // 12. CELESTIAL MOONS (PHOTO 2)
  // ---------------------------------------------------------------
  _spawnCelestialMoons() {
    const celestialGroup = new THREE.Group();
    celestialGroup.name = "SolariaCelestials";
    this.group.add(celestialGroup);

    const m1Mat = new THREE.MeshBasicMaterial({ color: PALETTE.moonLarge });
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(18.0, 24, 16), m1Mat);
    m1.position.set(160.0, 130.0, 140.0);
    celestialGroup.add(m1);

    const m2Mat = new THREE.MeshBasicMaterial({ color: PALETTE.moonSmall });
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(8.5, 16, 12), m2Mat);
    m2.position.set(200.0, 95.0, 170.0);
    celestialGroup.add(m2);
  }

  _alignToNormal(object, normal) {
    const up = normal.clone().normalize();
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  }

  update(delta) {
    // 1. Organic 3D multi-axis cloud drift (no more straight lines or rigid carousel)
    if (this.clouds && this.clouds.length > 0) {
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        // Advance along tilted spherical orbital axis
        c.currentDir.applyAxisAngle(c.orbitAxis, c.speed * delta);

        // Sinusoidal vertical breathing
        c.bobPhase += delta * c.bobFreq;
        const r = c.orbitRadius + Math.sin(c.bobPhase) * 1.3;

        c.group.position.copy(c.currentDir).multiplyScalar(r);
        this._alignToNormal(c.group, c.currentDir);
        c.group.rotateY(c.selfSpin * delta);
      }
    }

    // Orbit hot air balloons
    for (const b of this.hotAirBalloons) {
      b.baseAngle += delta * b.speed;
      b.group.position.x = Math.cos(b.baseAngle) * b.orbitRadius;
      b.group.position.z = Math.sin(b.baseAngle) * b.orbitRadius;
    }

    // Animate ocean wave glistening
    if (this.oceanMesh) {
      this.oceanMesh.rotation.y += delta * 0.008;
    }

    // Animate Planetary Rings gentle orbital precession
    if (this.ringsGroup) {
      this.ringsGroup.rotation.y += delta * 0.015;
    }

    // Animate Highland Windmill Rotors
    if (this.windmillRotors && this.windmillRotors.length > 0) {
      for (let i = 0; i < this.windmillRotors.length; i++) {
        this.windmillRotors[i].rotation.z += delta * 1.2;
      }
    }

    // Animate Alien Spire floating quantum apexes
    if (this.spireApexes && this.spireApexes.length > 0) {
      for (let i = 0; i < this.spireApexes.length; i++) {
        this.spireApexes[i].rotation.y += delta * 1.5;
      }
    }
  }
}
