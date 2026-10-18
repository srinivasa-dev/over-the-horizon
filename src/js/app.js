// =================================================================
// OVER THE HORIZON: Main Application Entrypoint & 3D WebGL Loop
// Supports Cosy Exploration Mode & Cataclysm 2012 Escape Mode
// =================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Planet } from './planet.js';
import { VehiclePhysics } from './physics.js';
import { WeatherSystem } from './weather.js';
import { AudioManager } from './audio.js';
import { ComicPostProcessor } from './postprocessing.js';
import { HUDController } from './hud.js';
import { ArcadeEngine } from './arcade_engine.js';

window.THREE = THREE;

class App {
  constructor() {
    window.game = this;
    window.app = this;
    this.canvas = document.getElementById('webgl-canvas');
    this.currentPlanetType = "Oakhaven";
    this.currentVehicleType = "Overland";
    this.currentCameraMode = 0; // 0: Chase POV, 1: Diorama View, 2: Cockpit POV, 3: Drone View
    this.atmosphereHour = 18.25; // Golden Hour default
    this.gameMode = "cosy"; // "cosy", "cascade", or "crossy"
    this.isGameStarted = false;
    this.menuOrbitAngle = 0;

    this.clock = new THREE.Clock();

    // 1. Initialize Core Systems
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLighting();

    // 2. Initialize Planetary & Vehicle Entities (Miniature R=65m globe)
    this._initWorld();

    // 3. Audio & Post-Processing
    this.audio = new AudioManager();
    this.postProcessor = new ComicPostProcessor(this.renderer, window.innerWidth, window.innerHeight);
    this.postProcessor.setComicMode(false);

    // 4. Tri-Mode Arcade Engine (Celestial Cascade & Crossy Odyssey)
    this.arcadeEngine = new ArcadeEngine(this.scene, this.planet, this.vehiclePhysics, this.audio, null);

    // 5. HUD & Input Handling
    this.hud = new HUDController(this);
    this.arcadeEngine.hud = this.hud;
    this._bindKeyboardEvents();
    this._bindResizeObserver();

    // 6. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Expose global references for testing & inspection
    window.app = this;
    window.game = this;
  }

  // ---------------------------------------------------------------
  // 1. WEBGL RENDERER SETUP
  // ---------------------------------------------------------------
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0a2a);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      56,
      window.innerWidth / window.innerHeight,
      0.05,
      3500
    );

    // Initial camera position looking down at miniature globe (Diorama framing)
    this.camera.position.set(0, 85, 125);
    this.camera.lookAt(0, 0, 0);

    // Orbit controls for Diorama Mode
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.minDistance = 75;
    this.orbitControls.maxDistance = 320;
    this.orbitControls.enabled = false;
  }

  // ---------------------------------------------------------------
  // 2. ATMOSPHERIC LIGHTING & SUN SYSTEM
  // ---------------------------------------------------------------
  _initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xFFE4C4, 1.0);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xFFF2D6, 2.5);
    this.sunLight.position.set(120, 180, 95);
    this.scene.add(this.sunLight);

    // Moonlight Directional Light (Illuminates terrain surface softly at night)
    this.moonLight = new THREE.DirectionalLight(0xB5D2FF, 0.0);
    this.moonLight.position.set(-80, 160, -60);
    this.scene.add(this.moonLight);

    // Rim fill light for shadow sides
    this.rimLight = new THREE.DirectionalLight(0x7EC5F2, 0.50);
    this.rimLight.position.set(-110, -85, -110);
    this.scene.add(this.rimLight);

    this.setAtmosphereTime(this.atmosphereHour);
  }

  setAtmosphereTime(hourDecimal) {
    this.atmosphereHour = hourDecimal;
    this.hud?.updateTimeLabel(hourDecimal);

    const sunAngle = (hourDecimal / 24.0) * Math.PI * 2 - Math.PI / 2;
    const sunDist = 240.0;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 120.0;

    this.sunLight.position.set(sunX, sunY, sunZ);

    const pType = this.currentPlanetType;
    let ambHex = 0xE2F2FF, sunHex = 0xFFF9E6;
    let sunIntensity = 2.4, ambIntensity = 1.05, moonIntensity = 0.0;
    let moonHex = 0xB5D2FF;

    if (pType === "Cinderfell") {
      ambHex = 0x451A03; sunHex = 0xF97316; moonHex = 0xEF4444;
    } else if (pType === "Aetheria") {
      ambHex = 0x713F12; sunHex = 0xFDE047; moonHex = 0xFEF08A;
    } else if (pType === "Rustvale") {
      ambHex = 0x450A0A; sunHex = 0xEF4444; moonHex = 0xFCA5A5;
    } else if (pType === "Stormhaven") {
      ambHex = 0x083344; sunHex = 0x22D3EE; moonHex = 0x67E8F9;
    } else if (pType === "Ringhaven") {
      ambHex = 0x451A03; sunHex = 0xFBBF24; moonHex = 0xFDE68A;
    } else if (pType === "Frostveil") {
      ambHex = 0x082F49; sunHex = 0x38BDF8; moonHex = 0xBAE6FD;
    } else if (pType === "Thalassa") {
      ambHex = 0x1E1B4B; sunHex = 0x6366F1; moonHex = 0xA5B4FC;
    } else if (pType === "Nocturna") {
      ambHex = 0x18181B; sunHex = 0xA855F7; moonHex = 0xD8B4FE;
    }

    let ambCol, sunCol;
    if (hourDecimal >= 6 && hourDecimal < 16.5) {
      ambCol = new THREE.Color(ambHex).lerp(new THREE.Color(0xFFFFFF), 0.45);
      sunCol = new THREE.Color(sunHex);
      sunIntensity = 2.4;
      ambIntensity = 1.05;
      moonIntensity = 0.0;
    } else if (hourDecimal >= 16.5 && hourDecimal < 19.5) {
      ambCol = new THREE.Color(ambHex).lerp(new THREE.Color(0xF97316), 0.35);
      sunCol = new THREE.Color(sunHex).lerp(new THREE.Color(0xEA580C), 0.5);
      sunIntensity = 2.1;
      ambIntensity = 0.95;
      moonIntensity = 0.15;
    } else if (hourDecimal >= 19.5 && hourDecimal < 21.5) {
      ambCol = new THREE.Color(ambHex).lerp(new THREE.Color(0x18181B), 0.6);
      sunCol = new THREE.Color(sunHex).multiplyScalar(0.4);
      sunIntensity = 0.9;
      ambIntensity = 0.85;
      moonIntensity = 0.6;
    } else {
      ambCol = new THREE.Color(ambHex).multiplyScalar(0.35);
      sunCol = new THREE.Color(sunHex).multiplyScalar(0.1);
      sunIntensity = 0.2;
      ambIntensity = 0.90;
      moonIntensity = 1.25;
    }

    this.ambientLight.color = ambCol;
    this.ambientLight.intensity = ambIntensity;
    this.sunLight.color = sunCol;
    this.sunLight.intensity = sunIntensity;
    if (this.moonLight) {
      this.moonLight.color.setHex(moonHex);
      this.moonLight.intensity = moonIntensity;
    }

    // Dynamic Celestial Skybox Gradient & Star Field Update
    if (this.planet && this.planet.updateAtmosphere) {
      this.planet.updateAtmosphere(hourDecimal, this.weather?.currentMode || "Clear");
    }
  }

  // ---------------------------------------------------------------
  // 3. PLANETARY & VEHICLE INITIALIZATION
  // ---------------------------------------------------------------
  _initWorld() {
    // 1. Build Miniature Planet (R = 65m)
    this.planet = new Planet(this.currentPlanetType, 65.0);
    this.scene.add(this.planet.group);

    // 2. Build Vehicle
    this.vehiclePhysics = new VehiclePhysics(this.planet, this.currentVehicleType, this);
    this.scene.add(this.vehiclePhysics.group);

    // 3. Build Weather System
    this.weather = new WeatherSystem(this.scene, this.planet, this.vehiclePhysics);

    this.setAtmosphereTime(this.atmosphereHour);
    this.hud?.updatePlanetLabel(this.currentPlanetType);
    this._snapCameraToMenuFraming();
  }

  _snapCameraToMenuFraming() {
    if (!this.vehiclePhysics) return;
    const vehPos = this.vehiclePhysics.position;
    const vehUp = this.vehiclePhysics.radialUp;
    const vehFwd = this.vehiclePhysics.forward;
    const vehRight = this.vehiclePhysics.right;
    const isPortrait = window.innerWidth < window.innerHeight;
    const fwdOffset = isPortrait ? -22.0 : -19.0;
    const upOffset = isPortrait ? 13.5 : 11.0;
    const rightOffset = isPortrait ? -14.0 : -16.0;

    const targetCamPos = vehPos.clone()
      .add(vehUp.clone().multiplyScalar(upOffset))
      .add(vehFwd.clone().multiplyScalar(fwdOffset))
      .add(vehRight.clone().multiplyScalar(rightOffset));

    this.camera.position.copy(targetCamPos);
    this.camera.up.copy(vehUp);
    const lookTarget = vehPos.clone()
      .add(vehUp.clone().multiplyScalar(2.0))
      .add(vehFwd.clone().multiplyScalar(3.5));
    this.camera.lookAt(lookTarget);
  }

  switchPlanet(planetType) {
    if (this.currentPlanetType === planetType) return;
    this.currentPlanetType = planetType;

    this.scene.remove(this.planet.group);
    this.planet = new Planet(planetType, 65.0);
    this.scene.add(this.planet.group);

    // Planet-to-Vehicle Auto-Deployment
    const PLANET_VEHICLE_MAP = {
      "Cinderfell": "MagmaCrawler",
      "Aetheria": "HazmatStrider",
      "Oakhaven": "Overland",
      "Rustvale": "CrimsonNomad",
      "Stormhaven": "IonSpeeder",
      "Ringhaven": "SolarSkimmer",
      "Frostveil": "CryoTrac",
      "Thalassa": "HydroRover",
      "Nocturna": "VoidSled"
    };

    const targetVehicle = PLANET_VEHICLE_MAP[planetType] || "Overland";
    this.switchVehicle(targetVehicle);

    this.vehiclePhysics.planet = this.planet;
    this.vehiclePhysics.teleportToRoad(0.24);

    if (!this.isGameStarted) {
      this._snapCameraToMenuFraming();
    }

    this.scene.remove(this.weather.group);
    this.weather = new WeatherSystem(this.scene, this.planet, this.vehiclePhysics);

    if (this.arcadeEngine) {
      this.arcadeEngine.planet = this.planet;
      if (this.gameMode !== "cosy") {
        this.arcadeEngine.start(this.gameMode);
      }
    }

    this.setAtmosphereTime(this.atmosphereHour);
    this.audio.startPlanetMusic(planetType);
    this.hud.updatePlanetLabel(planetType);

    const PLANET_SUBTITLES = {
      "Cinderfell": "Volcanic Basalt & Magma Calderas",
      "Aetheria": "Sulfuric Glasslands & Acid Dunes",
      "Oakhaven": "Alpine Forests & Whispering Pines",
      "Rustvale": "Crimson Canyons & Iron Dunes",
      "Stormhaven": "Gas Giant Ridges & Lightning Pylons",
      "Ringhaven": "Golden Ringed Horizon & Solar Arrays",
      "Frostveil": "Azure Methane Glaciers & Tilted Rings",
      "Thalassa": "Deep Abyssal Seas & Oceanic Monoliths",
      "Nocturna": "Frozen Nitrogen Peaks & Void Spires"
    };

    this.hud.showBanner(
      `WARPED TO ${planetType.toUpperCase()}`,
      PLANET_SUBTITLES[planetType] || "Planetary Diorama"
    );
  }

  setGameMode(gameMode) {
    this.gameMode = gameMode;
    if (this.arcadeEngine) {
      if (gameMode === "cascade" || gameMode === "crossy") {
        this.vehiclePhysics.teleportToRoad();
      }
      this.arcadeEngine.start(gameMode);
    }
  }

  restartArcadeMode() {
    this.vehiclePhysics.teleportToRoad();
    if (this.arcadeEngine) {
      this.arcadeEngine.start(this.gameMode);
    }
  }

  switchVehicle(vehicleType) {
    this.currentVehicleType = vehicleType;

    this.scene.remove(this.vehiclePhysics.group);
    this.vehiclePhysics = new VehiclePhysics(this.planet, vehicleType, this);
    this.scene.add(this.vehiclePhysics.group);

    this.weather.vehicle = this.vehiclePhysics;
    if (this.arcadeEngine) {
      this.arcadeEngine.vehiclePhysics = this.vehiclePhysics;
    }

    const VEHICLE_NAMES = {
      "Overland": "TrailScout 4x4 Rig",
      "MagmaCrawler": "MagmaCrawler 8x8",
      "HazmatStrider": "HazmatStrider ATV",
      "CrimsonNomad": "CrimsonNomad Rover",
      "IonSpeeder": "IonSpeeder Aero-Skimmer",
      "SolarSkimmer": "SolarSkimmer Ring Cruiser",
      "CryoTrac": "CryoTrac Half-Track",
      "HydroRover": "HydroRover Amphibian",
      "VoidSled": "VoidSled Ion Glider"
    };

    this.hud?.showBanner(
      `VEHICLE DEPLOYED`,
      VEHICLE_NAMES[vehicleType] || vehicleType
    );
  }

  setWeather(weatherMode) {
    this.weather.setMode(weatherMode);
    this.audio.setWeatherSound(weatherMode);
    if (this.planet && this.planet.updateAtmosphere) {
      this.planet.updateAtmosphere(this.atmosphereHour, weatherMode);
    }
  }

  startGame() {
    this.isGameStarted = true;
    this.audio.init();
    this.setCameraMode(0); // Firmly snap to Chase POV
    this.vehiclePhysics.teleportToRoad();
    if (this.arcadeEngine) {
      this.arcadeEngine.start(this.gameMode);
    }
    if (this.gameMode === "cosy") {
      this.audio.startPlanetMusic(this.currentPlanetType);
      this.hud.showBanner("COSY EXPLORATION", "Cruise through pine forests, coastal bridges, and peaks!");
    }
  }

  // ---------------------------------------------------------------
  // 4. CAMERA SYSTEM (CHASE POV vs DIORAMA vs COCKPIT)
  // ---------------------------------------------------------------
  setCameraMode(mode) {
    this.currentCameraMode = mode;
    this.orbitControls.enabled = false;
    if (mode === 1) {
      const vehPos = this.vehiclePhysics.position;
      const vehNorm = vehPos.clone().normalize();
      const orbitDir = vehNorm.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 0.65, 0)).normalize();
      this.camera.position.copy(orbitDir.multiplyScalar(120.0));
      this.camera.lookAt(vehPos.clone().multiplyScalar(0.35));
    } else if (mode === 0) {
      const vehPos = this.vehiclePhysics.position;
      const vehUp = this.vehiclePhysics.radialUp;
      const vehFwd = this.vehiclePhysics.forward;
      const camOffset = vehFwd.clone().multiplyScalar(-7.6).add(vehUp.clone().multiplyScalar(3.2));
      this.camera.position.copy(vehPos).add(camOffset);
      this.camera.up.copy(vehUp);
      const lookTarget = vehPos.clone().add(vehFwd.clone().multiplyScalar(5.5)).add(vehUp.clone().multiplyScalar(0.75));
      this.camera.lookAt(lookTarget);
    }
  }

  cycleCameraMode() {
    const nextMode = (this.currentCameraMode + 1) % 4;
    this.setCameraMode(nextMode);
    const names = [
      "Chase POV (Behind Vehicle)",
      "Smart Diorama (Full Miniature Globe Tracking)",
      "Cockpit POV (Driver Windshield)",
      "Drone Track (Cinematic Orbit)"
    ];
    this.hud.showBanner("CAMERA MODE", names[this.currentCameraMode]);
  }

  _updateCamera(dt) {
    const vehPos = this.vehiclePhysics.position;
    const vehUp = this.vehiclePhysics.radialUp;
    const vehFwd = this.vehiclePhysics.forward;
    const vehRight = this.vehiclePhysics.right;

    // Start Menu Live 3D Cinematic Showcase (Diegetic Carousel Camera framing miniature planet)
    const isMenuOpen = this.hud && this.hud.welcomeModal && !this.hud.welcomeModal.classList.contains('hidden');
    if (!this.isGameStarted && isMenuOpen) {
      this.menuOrbitAngle = (this.menuOrbitAngle || 0) + 0.14 * dt;
      const isPortrait = window.innerWidth < window.innerHeight;
      
      // Medium diorama camera framing: showcase vehicle on the curved horizon
      const fwdOffset = isPortrait ? -22.0 : -19.0;
      const upOffset = isPortrait ? 13.5 : 11.0;
      const rightOffset = (isPortrait ? -14.0 : -16.0) + Math.sin(this.menuOrbitAngle) * 2.5;

      const targetCamPos = vehPos.clone()
        .add(vehUp.clone().multiplyScalar(upOffset))
        .add(vehFwd.clone().multiplyScalar(fwdOffset))
        .add(vehRight.clone().multiplyScalar(rightOffset));

      this.camera.position.lerp(targetCamPos, Math.min(1.0, 4.0 * dt));
      this.camera.up.lerp(vehUp, Math.min(1.0, 4.0 * dt));

      // Look toward vehicle and winding road crest
      const lookTarget = vehPos.clone()
        .add(vehUp.clone().multiplyScalar(2.0))
        .add(vehFwd.clone().multiplyScalar(3.5));
      this.camera.lookAt(lookTarget);
      return;
    }

    if (this.currentCameraMode === 1) {
      // MODE 1: MINIATURE GLOBE DIORAMA (Centered on vehicle, looking in travel direction)
      const dioramaElev = 48.0; // Elevated high above surface normal for toybox miniature perspective
      const dioramaBack = 36.0; // Pulled back along forward direction so road ahead is framed
      const targetCamPos = vehPos.clone()
        .add(vehUp.clone().multiplyScalar(dioramaElev))
        .sub(vehFwd.clone().multiplyScalar(dioramaBack));

      this.camera.position.lerp(targetCamPos, Math.min(1.0, 5.0 * dt));
      this.camera.up.lerp(vehUp, Math.min(1.0, 5.0 * dt));
      
      const focusTarget = vehPos.clone().add(vehUp.clone().multiplyScalar(0.6));
      this.camera.lookAt(focusTarget);
      return;
    }

    if (this.currentCameraMode === 0) {
      // MODE 0: CHASE POV (Framing the curved horizon with dynamic portrait scaling)
      const isPortrait = window.innerWidth < window.innerHeight;
      const backDist = isPortrait ? -9.2 : -7.6;
      const upDist = isPortrait ? 3.8 : 3.2;
      const lookFwd = isPortrait ? 6.5 : 5.5;

      const camOffset = vehFwd.clone().multiplyScalar(backDist).add(vehUp.clone().multiplyScalar(upDist));
      const targetCamPos = vehPos.clone().add(camOffset);

      this.camera.position.lerp(targetCamPos, Math.min(1.0, 16.0 * dt));
      this.camera.up.lerp(vehUp, Math.min(1.0, 16.0 * dt));

      const lookTarget = vehPos.clone().add(vehFwd.clone().multiplyScalar(lookFwd)).add(vehUp.clone().multiplyScalar(0.75));
      this.camera.lookAt(lookTarget);

      // Apply Arcade Camera Shake
      if (this.arcadeEngine) {
        const shake = this.arcadeEngine.getCameraShake();
        if (shake > 0.0) {
          this.camera.position.x += (Math.random() - 0.5) * shake * 12.0;
          this.camera.position.y += (Math.random() - 0.5) * shake * 12.0;
          this.camera.position.z += (Math.random() - 0.5) * shake * 12.0;
        }
      }

    } else if (this.currentCameraMode === 2) {
      // MODE 2: COCKPIT / HOOD POV
      // Positioned above dashboard looking out over the hood and road with zero interior clipping
      const cockpitOffset = vehFwd.clone().multiplyScalar(0.48).add(vehUp.clone().multiplyScalar(1.08));
      this.camera.position.copy(vehPos).add(cockpitOffset);
      this.camera.up.copy(vehUp);

      const lookTarget = vehPos.clone().add(vehFwd.clone().multiplyScalar(14.0)).add(vehUp.clone().multiplyScalar(0.70));
      this.camera.lookAt(lookTarget);

    } else if (this.currentCameraMode === 3) {
      // MODE 3: CINEMATIC DRONE TRACK
      const time = this.clock.getElapsedTime() * 0.35;
      const droneOffset = vehFwd.clone().multiplyScalar(-9.0 + Math.sin(time) * 3.0)
        .add(vehRight.clone().multiplyScalar(Math.cos(time) * 5.0))
        .add(vehUp.clone().multiplyScalar(4.5));

      this.camera.position.lerp(vehPos.clone().add(droneOffset), Math.min(1.0, 6.0 * dt));
      this.camera.up.lerp(vehUp, Math.min(1.0, 6.0 * dt));
      this.camera.lookAt(vehPos);
    }
  }

  // ---------------------------------------------------------------
  // 5. USER INPUT & KEYBOARD BINDINGS
  // ---------------------------------------------------------------
  _bindKeyboardEvents() {
    const keyMap = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      Space: 'boost',
      ShiftLeft: 'boost', ShiftRight: 'boost'
    };

    window.addEventListener('keydown', (e) => {
      const isMenuOpen = !this.isGameStarted || (this.hud?.welcomeModal && !this.hud.welcomeModal.classList.contains('hidden'));
      if (isMenuOpen) {
        // While start menu is open, forbid all driving controls
        if ((e.code === 'KeyM' || e.code === 'Escape') && this.isGameStarted) {
          this.hud.toggleWelcomeModal();
        }
        return;
      }

      if (!this.audio.ctx) this.audio.init();

      if (keyMap[e.code]) {
        if (keyMap[e.code] === 'boost' && !this.vehiclePhysics.inputs.boost && !this.vehiclePhysics.isNitroLockedOut()) {
          this.audio.playNitroSound();
        }
        this.vehiclePhysics.inputs[keyMap[e.code]] = true;
        this.vehiclePhysics.autopilotActive = false;
        this.hud.setAutopilotStatus(false);
      }

      if (e.code === 'KeyC') {
        this.cycleCameraMode();
      } else if (e.code === 'KeyP') {
        const isAuto = this.vehiclePhysics.toggleAutopilot();
        this.hud.setAutopilotStatus(isAuto);
        this.hud.showBanner("AUTOPILOT", isAuto ? "Autonomous Road Cruise Active" : "Manual Control Restored");
      } else if (e.code === 'KeyH') {
        this.audio.playHorn();
        this.hud.showBanner("HORN", "Beep beep!");
      } else if (e.code === 'KeyR') {
        this.vehiclePhysics.teleportToRoad();
        this.hud.showBanner("RECOVERED", "Vehicle uprighted on road");
      } else if (e.code === 'KeyB') {
        const isComic = this.postProcessor.toggleComicMode();
        this.hud.showBanner("COMIC SHADER", isComic ? "Moebius Ligne-Claire Inking Enabled" : "Flat-Shaded Natural 3D");
      } else if (e.code === 'KeyM' || e.code === 'Escape') {
        this.hud.toggleWelcomeModal();
      }
    });

    window.addEventListener('keyup', (e) => {
      const isMenuOpen = !this.isGameStarted || (this.hud?.welcomeModal && !this.hud.welcomeModal.classList.contains('hidden'));
      if (isMenuOpen) {
        if (keyMap[e.code]) {
          this.vehiclePhysics.inputs[keyMap[e.code]] = false;
        }
        return;
      }

      if (keyMap[e.code]) {
        this.vehiclePhysics.inputs[keyMap[e.code]] = false;
      }
    });
  }

  _bindResizeObserver() {
    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      this.camera.aspect = aspect;
      // In narrow portrait viewports, dynamically expand vertical FOV to maintain wide horizon visibility
      if (aspect < 1.0) {
        this.camera.fov = 52 + (1.0 - aspect) * 15.0; // Smoothly scales 52 to ~60 deg
      } else {
        this.camera.fov = 52;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.postProcessor.setSize(w, h);
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // Initialize on boot
  }

  // ---------------------------------------------------------------
  // 6. MAIN ANIMATION & GAME LOOP
  // ---------------------------------------------------------------
  animate() {
    requestAnimationFrame(this.animate);

    let dt = this.clock.getDelta();
    if (dt > 0.1) dt = 0.016;

    const isMenuOpen = !this.isGameStarted || (this.hud?.welcomeModal && !this.hud.welcomeModal.classList.contains('hidden'));

    // 1. Update Physics (Frozen / parked showcase state while in menu)
    if (isMenuOpen) {
      this.vehiclePhysics.velocityForward = 0.0;
      this.vehiclePhysics.velocityLateral = 0.0;
      this.vehiclePhysics.yawRate = 0.0;
      this.vehiclePhysics.steerAngle = 0.0;
      this.vehiclePhysics.nitroBoostActive = false;
      this.vehiclePhysics.inputs.forward = false;
      this.vehiclePhysics.inputs.backward = false;
      this.vehiclePhysics.inputs.left = false;
      this.vehiclePhysics.inputs.right = false;
      this.vehiclePhysics.inputs.brake = false;
      this.vehiclePhysics.inputs.boost = false;
      this.vehiclePhysics.autopilotActive = false;
      this.vehiclePhysics._evaluateSuspension(dt);
      this.vehiclePhysics._updateTransformMatrix();
    } else {
      this.vehiclePhysics.update(dt);
    }

    // 2. Update Planet Elements (Clouds, Ocean, Balloons)
    this.planet.update(dt);

    // 3. Update Weather Simulation
    this.weather.update(dt);

    // 4. Update Arcade Engine (Celestial Cascade / Crossy Odyssey)
    if (this.arcadeEngine && this.arcadeEngine.active && !isMenuOpen) {
      this.arcadeEngine.update(dt, this.vehiclePhysics.position);
    }

    // 5. Update Audio SFX
    const speedKmh = isMenuOpen ? 0 : this.vehiclePhysics.getSpeedKmh();
    const isAccel = !isMenuOpen && (this.vehiclePhysics.inputs.forward || this.vehiclePhysics.inputs.boost);
    this.audio.updateEngine(speedKmh, isAccel);

    // 6. Update HUD Speedometer & Nitro Boost Gauge
    this.hud.updateSpeedometer(speedKmh, this.vehiclePhysics.isReversing());
    this.hud.updateNitroGauge(this.vehiclePhysics.getNitroPercent(), this.vehiclePhysics.isNitroLockedOut());

    // 7. Update Camera
    this._updateCamera(dt);

    // 8. Render via Fullscreen Post-Processing Shader
    this.postProcessor.render(this.scene, this.camera);
  }
}

// Instantiate on document ready
function initGame() {
  if (!window.__GAME_APP__) {
    try {
      window.__GAME_APP__ = new App();
    } catch (err) {
      console.error("FATAL App init error:", err);
      window.__INIT_ERROR__ = err.stack || err.message;
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
