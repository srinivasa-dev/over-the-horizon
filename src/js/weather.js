// =================================================================
// OVER THE HORIZON: Physical Weather Simulation with Strict Occlusion
// =================================================================
import * as THREE from 'three';

export class WeatherSystem {
  constructor(scene, planet, vehicle) {
    this.scene = scene;
    this.planet = planet;
    this.vehicle = vehicle;

    this.currentMode = "Clear"; // "Clear", "Rain", "Snow", "Sandstorm"
    this.particleCount = 800; // Natural, comfortable atmospheric density

    this.group = new THREE.Group();
    this.group.name = "WeatherSystem";
    this.scene.add(this.group);

    // Occlusion volumes
    // Vehicle bounding box in local vehicle space
    this.vehBoxMin = new THREE.Vector3(-0.85, 0.15, -1.65);
    this.vehBoxMax = new THREE.Vector3( 0.85, 1.65,  1.65);

    // Inverse vehicle matrix for fast local point testing
    this.invVehMatrix = new THREE.Matrix4();

    // Landmark cabin bounding sphere for Oakhaven
    this.cabinPos = new THREE.Vector3(0.38, 0.58, 0.72).normalize();
    this.cabinPos.multiplyScalar(planet.getTerrainRadiusAt(this.cabinPos) + 1.2);
    this.cabinRadiusSq = 3.2 * 3.2; // Cabin collision zone

    this._initParticles();
    this.setMode("Clear");
  }

  // ---------------------------------------------------------------
  // 1. BUFFER GEOMETRY INITIALIZATION
  // ---------------------------------------------------------------
  _initParticles() {
    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);

    const baseR = this.planet.baseRadius;

    // Distribute particles randomly around planet atmosphere
    for (let i = 0; i < this.particleCount; i++) {
      this._respawnParticle(i, true);
    }

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    // Particle Material with Soft Alpha
    this.mat = new THREE.PointsMaterial({
      color: 0xE0F4FF,
      size: 0.35,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.group.add(this.points);
  }

  // ---------------------------------------------------------------
  // 2. PARTICLE RESPAWN & LIFECYCLE
  // ---------------------------------------------------------------
  _respawnParticle(i, initialRandom = false) {
    const idx = i * 3;
    const baseR = this.planet.baseRadius;

    // Altitude in cloud layer above planet terrain
    const alt = initialRandom
      ? baseR + 3.0 + Math.random() * 16.0
      : baseR + 12.0 + Math.random() * 8.0;

    // Broad atmospheric distribution across planet and active quadrant
    let dir = new THREE.Vector3();
    if (this.vehicle && this.vehicle.position && Math.random() < 0.55) {
      // Broad regional weather front around vehicle sector
      const vehDir = this.vehicle.position.clone().normalize();
      const spread = 0.85; // Broad regional coverage (not a tiny 5-meter cloud!)
      dir.set(
        vehDir.x + (Math.random() - 0.5) * spread,
        vehDir.y + (Math.random() - 0.5) * spread,
        vehDir.z + (Math.random() - 0.5) * spread
      ).normalize();
    } else {
      // Planetary atmospheric distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      dir.set(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize();
    }

    this.positions[idx]     = dir.x * alt;
    this.positions[idx + 1] = dir.y * alt;
    this.positions[idx + 2] = dir.z * alt;

    // Fall velocity directed inward toward planet center + lateral wind drift
    const inward = dir.clone().negate();
    const speed = this.currentMode === "Rain" ? 14.0 + Math.random() * 4.0
                : this.currentMode === "Snow" ? 2.2 + Math.random() * 1.2
                : 7.0 + Math.random() * 3.0; // Sandstorm

    let drift = new THREE.Vector3();
    if (this.currentMode === "Snow") {
      drift.set((Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.0);
    } else if (this.currentMode === "Sandstorm") {
      // Tangential desert wind
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      drift.copy(tangent).multiplyScalar(10.0);
    }

    const vel = inward.multiplyScalar(speed).add(drift);
    this.velocities[idx]     = vel.x;
    this.velocities[idx + 1] = vel.y;
    this.velocities[idx + 2] = vel.z;
    this.alphas[i] = 1.0;
  }

  // ---------------------------------------------------------------
  // 3. SET WEATHER MODE & PALETTE
  // ---------------------------------------------------------------
  setMode(mode) {
    this.currentMode = mode;

    switch (mode) {
      case "Clear":
        this.mat.opacity = 0.0;
        this.mat.size = 0.2;
        break;

      case "Rain":
        this.mat.opacity = 0.45; // Soft gentle drizzle
        this.mat.color.setHex(0xA0D0F8);
        this.mat.size = 0.38;
        break;

      case "Snow":
        this.mat.opacity = 0.65; // Soft fluffy flakes
        this.mat.color.setHex(0xFFFFFF);
        this.mat.size = 0.50;
        break;

      case "Sandstorm":
      case "Dust":
        this.mat.opacity = 0.40; // Soft desert haze
        this.mat.color.setHex(0xE8A870);
        this.mat.size = 0.45;
        break;

      case "SolarFlare":
        this.mat.opacity = 0.48; // Amber thermal radiation
        this.mat.color.setHex(0xF97316);
        this.mat.size = 0.40;
        break;

      case "SulfuricMist":
        this.mat.opacity = 0.45; // Golden sulfur smog
        this.mat.color.setHex(0xFBBF24);
        this.mat.size = 0.42;
        break;

      case "DustDevil":
        this.mat.opacity = 0.45; // Crimson oxide dust
        this.mat.color.setHex(0xEF4444);
        this.mat.size = 0.42;
        break;

      case "IonEMP":
        this.mat.opacity = 0.55; // Ion sparks
        this.mat.color.setHex(0x06B6D4);
        this.mat.size = 0.46;
        break;

      case "DiamondShimmer":
        this.mat.opacity = 0.52; // Ring ice crystal dust
        this.mat.color.setHex(0xFDE68A);
        this.mat.size = 0.44;
        break;

      case "CryoBlizzard":
        this.mat.opacity = 0.60; // Methane ice flakes
        this.mat.color.setHex(0x7DD3FC);
        this.mat.size = 0.48;
        break;

      case "MethaneTorrent":
        this.mat.opacity = 0.50; // Sapphire mist
        this.mat.color.setHex(0x38BDF8);
        this.mat.size = 0.44;
        break;

      case "CosmicDust":
        this.mat.opacity = 0.45; // Faint astral purple dust
        this.mat.color.setHex(0xC084FC);
        this.mat.size = 0.38;
        break;

      default:
        this.mat.opacity = 0.0;
        this.mat.size = 0.2;
    }
  }

  // ---------------------------------------------------------------
  // 4. SIMULATION STEP WITH PHYSICAL OCCLUSION
  // ---------------------------------------------------------------
  update(dt) {
    if (this.currentMode === "Clear") return;
    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // Cache vehicle transform inverse for physical cab occlusion
    if (this.vehicle && this.vehicle.group) {
      this.invVehMatrix.copy(this.vehicle.group.matrixWorld).invert();
    }

    const pos = this.positions;
    const vel = this.velocities;
    const pWorld = new THREE.Vector3();
    const pLocal = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Translate particle by velocity
      pos[idx]     += vel[idx] * dt;
      pos[idx + 1] += vel[idx + 1] * dt;
      pos[idx + 2] += vel[idx + 2] * dt;

      pWorld.set(pos[idx], pos[idx + 1], pos[idx + 2]);
      const currentR = pWorld.length();
      const dir = pWorld.clone().normalize();
      const groundR = this.planet.getTerrainRadiusAt(dir);

      // A. Ground Collision Occlusion: Particles terminate on planet surface
      if (currentR <= groundR) {
        this._respawnParticle(i);
        continue;
      }

      // B. Vehicle Cab Physical Occlusion:
      // Prevent precipitation from penetrating inside vehicle interior
      if (this.vehicle && this.vehicle.group) {
        pLocal.copy(pWorld).applyMatrix4(this.invVehMatrix);
        if (
          pLocal.x >= this.vehBoxMin.x && pLocal.x <= this.vehBoxMax.x &&
          pLocal.y >= this.vehBoxMin.y && pLocal.y <= this.vehBoxMax.y &&
          pLocal.z >= this.vehBoxMin.z && pLocal.z <= this.vehBoxMax.z
        ) {
          // Droplet hits vehicle roof/windshield! Occlude & respawn
          this._respawnParticle(i);
          continue;
        }
      }

      // C. Cabin Landmark Roof Occlusion (Oakhaven)
      if (this.planet.type === "Oakhaven") {
        if (pWorld.distanceToSquared(this.cabinPos) < this.cabinRadiusSq) {
          // Hits cabin roof - occlude
          this._respawnParticle(i);
          continue;
        }
      }
    }

    this.geo.attributes.position.needsUpdate = true;
  }
}
