// =================================================================
// OVER THE HORIZON: Spherical Vehicle Physics & Raycast Suspension
// =================================================================
import * as THREE from 'three';
import {
  buildOverlandWagon,
  buildOverlandWheel,
  buildMagmaCrawler,
  buildMagmaWheel,
  buildHazmatStrider,
  buildHazmatWheel,
  buildCrimsonNomad,
  buildCrimsonWheel,
  buildIonSpeeder,
  buildIonWheel,
  buildSolarSkimmer,
  buildSolarWheel,
  buildCryoTrac,
  buildCryoWheel,
  buildHydroRover,
  buildHydroWheel,
  buildVoidSled,
  buildVoidWheel,
  buildCurvedGroundLightPool
} from './models.js';

function createSoftVehicleContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, 256, 256);
  
  // Soft outer ambient occlusion oval
  const outerGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 115);
  outerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.65)');
  outerGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.40)');
  outerGrad.addColorStop(0.80, 'rgba(0, 0, 0, 0.12)');
  outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.ellipse(128, 128, 86, 112, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dense central chassis occlusion core
  const innerGrad = ctx.createRadialGradient(128, 128, 0, 128, 128, 75);
  innerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.55)');
  innerGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
  innerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.ellipse(128, 128, 56, 85, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 Wheel contact occlusion spots
  const wheelSpots = [
    [78, 62],   // Front Left
    [178, 62],  // Front Right
    [78, 194],  // Rear Left
    [178, 194]  // Rear Right
  ];
  for (const [wx, wy] of wheelSpots) {
    const wGrad = ctx.createRadialGradient(wx, wy, 4, wx, wy, 26);
    wGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.75)');
    wGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
    wGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.ellipse(wx, wy, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export class VehiclePhysics {
  constructor(planet, vehicleType = "Overland", app = null) {
    this.planet = planet;
    this.vehicleType = vehicleType;
    this.app = app;

    // Root vehicle group in world space
    this.group = new THREE.Group();
    this.group.name = `Vehicle_${vehicleType}`;

    // Vehicle dimensions & chassis
    this.wheelRadius = 0.44;
    this.suspensionRestLength = 0.55;
    this.springConstant = 180.0;
    this.dampingConstant = 24.0;
    this.mass = 1200.0;

    // 2D Tangent Velocity (Longitudinal forward/back & Lateral drift/slip)
    this.velocityForward = 0.0; // Forward speed (m/s)
    this.velocityLateral = 0.0; // Sideways slip velocity (m/s)
    this.yawRate = 0.0;         // Angular turn rate (rad/s)
    this.driftSlipRatio = 0.0;  // 0.0 (full grip) to 1.0 (power slide)

    this.maxSpeedForward = 18.0; // ~65 km/h
    this.maxSpeedReverse = -7.0;  // ~25 km/h
    this.acceleration = 14.0;
    this.brakeForce = 26.0;
    this.naturalDecel = 6.0;
    this.steerAngle = 0.0;
    this.maxSteerAngle = 0.48; // ~27.5 degrees
    this.steerSpeed = 3.6;

    // Orientation vectors
    this.position = new THREE.Vector3();
    this.radialUp = new THREE.Vector3(0, 1, 0);
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.altitude = 0.0;
    this.isAirborne = false;
    this.verticalVelocity = 0.0;

    // Autopilot state
    this.autopilotActive = false;
    this.cruiseSpeed = 9.5; // Smooth cruising speed
    this.autopilotStallTimer = 0.0;
    this.autopilotLaunchGrace = 3.0;
    this.unstuckTimer = 0.0;
    this.unstuckSteer = 0.0;

    // Nitro Boost state
    this.nitroEnergy = 100.0;
    this.nitroBoostActive = false;
    this.nitroLockout = false;

    // Input state
    this.inputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      handbrake: false,
      boost: false
    };

    // Build 3D vehicle components
    this._buildVehicleAssembly();
    this.teleportToRoad(0.24);
  }

  get speed() {
    return this.velocityForward;
  }

  set speed(val) {
    this.velocityForward = val;
  }

  // ---------------------------------------------------------------
  // 1. VEHICLE MESH & WHEEL SUSPENSION RIGGING
  // ---------------------------------------------------------------
  _buildVehicleAssembly() {
    // 1. Body Chassis
    if (this.vehicleType === "MagmaCrawler") {
      this.body = buildMagmaCrawler();
    } else if (this.vehicleType === "HazmatStrider") {
      this.body = buildHazmatStrider();
    } else if (this.vehicleType === "CrimsonNomad") {
      this.body = buildCrimsonNomad();
    } else if (this.vehicleType === "IonSpeeder") {
      this.body = buildIonSpeeder();
    } else if (this.vehicleType === "SolarSkimmer") {
      this.body = buildSolarSkimmer();
    } else if (this.vehicleType === "CryoTrac") {
      this.body = buildCryoTrac();
    } else if (this.vehicleType === "HydroRover") {
      this.body = buildHydroRover();
    } else if (this.vehicleType === "VoidSled") {
      this.body = buildVoidSled();
    } else {
      // Default / Oakhaven
      this.body = buildOverlandWagon();
    }
    this.group.add(this.body);

    // 2. Wheel Mount Offsets relative to chassis center
    // 4 Wheels: FL, FR, RL, RR
    const xDist = 0.88;
    const zDist = 0.95;
    const mountY = 0.42;

    this.wheelMounts = [
      { name: "FL", isFront: true,  isLeft: true,  localPos: new THREE.Vector3(-xDist, mountY, -zDist) },
      { name: "FR", isFront: true,  isLeft: false, localPos: new THREE.Vector3( xDist, mountY, -zDist) },
      { name: "RL", isFront: false, isLeft: true,  localPos: new THREE.Vector3(-xDist, mountY,  zDist) },
      { name: "RR", isFront: false, isLeft: false, localPos: new THREE.Vector3( xDist, mountY,  zDist) },
    ];

    this.wheelRigs = [];

    for (const mount of this.wheelMounts) {
      // Steer pivot (rotates around local Y)
      const steerPivot = new THREE.Group();
      steerPivot.position.copy(mount.localPos);

      // Wheel assembly with axle
      let wheelMesh;
      if (this.vehicleType === "MagmaCrawler") {
        wheelMesh = buildMagmaWheel();
      } else if (this.vehicleType === "HazmatStrider") {
        wheelMesh = buildHazmatWheel();
      } else if (this.vehicleType === "CrimsonNomad") {
        wheelMesh = buildCrimsonWheel();
      } else if (this.vehicleType === "IonSpeeder") {
        wheelMesh = buildIonWheel();
      } else if (this.vehicleType === "SolarSkimmer") {
        wheelMesh = buildSolarWheel();
      } else if (this.vehicleType === "CryoTrac") {
        wheelMesh = buildCryoWheel();
      } else if (this.vehicleType === "HydroRover") {
        wheelMesh = buildHydroWheel();
      } else if (this.vehicleType === "VoidSled") {
        wheelMesh = buildVoidWheel();
      } else {
        wheelMesh = buildOverlandWheel();
      }

      // Cylinder default is along Y axis; rotate around Z to point axle along local X
      // For left wheels, point outward to -X; for right wheels, point outward to +X
      wheelMesh.rotation.z = mount.isLeft ? Math.PI / 2 : -Math.PI / 2;

      // Spin container (rotates around local X as wheel rolls forward)
      const spinContainer = new THREE.Group();
      spinContainer.add(wheelMesh);
      steerPivot.add(spinContainer);
      this.group.add(steerPivot);

      this.wheelRigs.push({
        ...mount,
        steerPivot,
        spinContainer,
        rollAngle: 0.0,
        compression: 0.0,
        isGrounded: true,
        contactPoint: new THREE.Vector3(),
        contactNormal: new THREE.Vector3()
      });
    }

    // Soft blurred contact ambient occlusion projector under vehicle
    const shadowGeo = new THREE.PlaneGeometry(3.2, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createSoftVehicleContactShadowTexture(),
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.04;
    this.group.add(this.shadowMesh);

    // Active Cornering Headlight Rig
    let lightColor = 0xFFF2D0; // Warm halogen (Oakhaven)
    if (this.vehicleType === "MagmaCrawler") lightColor = 0xFFA040;
    else if (this.vehicleType === "HazmatStrider") lightColor = 0xFFE066;
    else if (this.vehicleType === "CrimsonNomad") lightColor = 0xE0F4FF;
    else if (this.vehicleType === "IonSpeeder") lightColor = 0x40E0FF;
    else if (this.vehicleType === "SolarSkimmer") lightColor = 0xFFE890;
    else if (this.vehicleType === "CryoTrac") lightColor = 0x80D8FF;
    else if (this.vehicleType === "HydroRover") lightColor = 0x38BDF8;
    else if (this.vehicleType === "VoidSled") lightColor = 0xD8B4FE;

    this.headlightRig = new THREE.Group();
    this.headlightRig.position.set(0, 0.48, -0.6);

    // True Dynamic Three.js Headlights with Active Cornering Sweeping
    // Illuminates the 3D terrain and obstacles with soft, feathered, natural light (ZERO clipping/trapezoids)
    const spotL = new THREE.SpotLight(lightColor, 8.5, 48, Math.PI / 4.6, 0.95, 1.15);
    spotL.position.set(-0.48, 0.0, -0.8);
    spotL.target.position.set(-0.48, -1.8, -18.0);
    this.headlightRig.add(spotL);
    this.headlightRig.add(spotL.target);

    const spotR = new THREE.SpotLight(lightColor, 8.5, 48, Math.PI / 4.6, 0.95, 1.15);
    spotR.position.set(0.48, 0.0, -0.8);
    spotR.target.position.set(0.48, -1.8, -18.0);
    this.headlightRig.add(spotR);
    this.headlightRig.add(spotR.target);

    // Soft near-field ground glow (compact bumper wash with 100% feathered radial alpha)
    this.groundLightPool = buildCurvedGroundLightPool(3.6, 4.5, this.planet.baseRadius, lightColor, 0.32);
    this.headlightRig.add(this.groundLightPool);
    this.group.add(this.headlightRig);

    // Nitro exhaust flames
    this.exhaustFlames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.85
    });
    const flameGeo = new THREE.ConeGeometry(0.18, 0.9, 8);
    flameGeo.rotateX(-Math.PI / 2);

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.65, 0.42, 2.1);
    this.exhaustFlames.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.65, 0.42, 2.1);
    this.exhaustFlames.add(rightFlame);

    this.exhaustFlames.visible = false;
    this.group.add(this.exhaustFlames);
  }

  // ---------------------------------------------------------------
  // 2. INITIAL SPAWN / TELEPORT TO ROAD
  // ---------------------------------------------------------------
  teleportToRoad(roadAngle = 0.24) {
    // Position vehicle on the open planet road
    const theta = roadAngle;
    const roadDir = this.planet._getRoadDir(theta);
    this.radialUp.copy(roadDir).normalize();
    const groundR = this.planet.getTerrainRadiusAt(this.radialUp);
    this.altitude = groundR + this.suspensionRestLength;
    this.position.copy(this.radialUp).multiplyScalar(this.altitude);

    // Analytical forward tangent along road
    const roadTangent = this.planet._getRoadTangent(theta);
    this.forward.copy(roadTangent).normalize();
    this.right.crossVectors(this.forward, this.radialUp).normalize();
    this.forward.crossVectors(this.radialUp, this.right).normalize();

    this.velocityForward = 0.0;
    this.velocityLateral = 0.0;
    this.yawRate = 0.0;
    this.driftSlipRatio = 0.0;
    this.verticalVelocity = 0.0;
    this.steerAngle = 0.0;
    this.autopilotStallTimer = 0.0;
    this.autopilotLaunchGrace = 3.0;
    this.unstuckTimer = 0.0;
    this._updateTransformMatrix();
  }

  // ---------------------------------------------------------------
  // 3. SUSPENSION RAYCAST & SURFACE GROUNDING
  // ---------------------------------------------------------------
  _evaluateSuspension(dt) {
    let groundedCount = 0;
    const avgNormal = new THREE.Vector3();
    let maxGroundDist = 0.0;

    for (const rig of this.wheelRigs) {
      // Compute world position of wheel mount
      const mountWorldPos = rig.localPos.clone().applyMatrix4(this.group.matrixWorld);
      const wheelDir = mountWorldPos.clone().normalize();
      const terrainR = this.planet.getTerrainRadiusAt(wheelDir);
      const groundPos = wheelDir.clone().multiplyScalar(terrainR);

      // Distance from mount to ground along radial direction
      const currentDist = mountWorldPos.length() - terrainR;
      const targetDist = this.wheelRadius;

      if (currentDist <= this.suspensionRestLength + this.wheelRadius) {
        rig.isGrounded = true;
        groundedCount++;
        rig.compression = Math.max(0.0, (this.suspensionRestLength + this.wheelRadius) - currentDist);
        rig.steerPivot.position.y = rig.localPos.y - (rig.compression * 0.45);

        // Surface normal approximation
        const norm = this._getTerrainNormal(wheelDir);
        avgNormal.add(norm);
        rig.contactNormal.copy(norm);
        rig.contactPoint.copy(groundPos);
      } else {
        rig.isGrounded = false;
        rig.compression = 0.0;
        rig.steerPivot.position.y = rig.localPos.y;
      }

      maxGroundDist = Math.max(maxGroundDist, currentDist);
    }

    this.isAirborne = (groundedCount === 0);

    if (groundedCount > 0) {
      avgNormal.normalize();
      // Smoothly blend radialUp toward ground contact normal
      this.radialUp.lerp(avgNormal, Math.min(1.0, 12.0 * dt));
    } else {
      // Airborne: up vector points strictly outward from center
      const currentDir = this.position.clone().normalize();
      this.radialUp.lerp(currentDir, Math.min(1.0, 8.0 * dt));
    }

    return groundedCount;
  }

  _getTerrainNormal(dir) {
    const eps = 0.006;
    const u = dir.clone().normalize();
    const t1 = new THREE.Vector3();
    if (Math.abs(u.y) < 0.9) {
      t1.crossVectors(u, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      t1.crossVectors(u, new THREE.Vector3(1, 0, 0)).normalize();
    }
    const t2 = new THREE.Vector3().crossVectors(u, t1).normalize();

    const p0 = u.clone().multiplyScalar(this.planet.getTerrainRadiusAt(u));
    const u1 = u.clone().addScaledVector(t1, eps).normalize();
    const p1 = u1.multiplyScalar(this.planet.getTerrainRadiusAt(u1));
    const u2 = u.clone().addScaledVector(t2, eps).normalize();
    const p2 = u2.multiplyScalar(this.planet.getTerrainRadiusAt(u2));

    const v1 = p1.sub(p0);
    const v2 = p2.sub(p0);
    const n = new THREE.Vector3().crossVectors(v1, v2).normalize();
    if (n.dot(u) < 0) n.negate();
    return n;
  }

  // ---------------------------------------------------------------
  // 4. AUTOPILOT ROAD-FOLLOWING GUIDANCE
  // ---------------------------------------------------------------
  _stepAutopilot(dt) {
    if (!this.autopilotActive) return;

    // Current position spherical angles
    const u = this.position.clone().normalize();
    const theta = Math.atan2(u.z, u.x);
    const currentLat = Math.asin(u.y);
    const roadLat = this.planet.getRoadLat(theta);

    // Cross-track error (how far from center of road)
    const latError = roadLat - currentLat;

    // Unstuck Watchdog: detect stall or obstacle pin
    if (this.unstuckTimer && this.unstuckTimer > 0) {
      this.unstuckTimer -= dt;
      // Reverse and lock steer in opposite direction to pivot away
      this.velocityForward = THREE.MathUtils.lerp(this.velocityForward, -4.5, 6.0 * dt);
      this.steerAngle = this.unstuckSteer || this.maxSteerAngle;
      this.yawRate = (this.velocityForward / 2.8) * Math.tan(this.steerAngle);
      return;
    }

    if (this.autopilotLaunchGrace > 0) {
      this.autopilotLaunchGrace -= dt;
      this.autopilotStallTimer = 0;
    } else if (Math.abs(this.velocityForward) < 1.5) {
      this.autopilotStallTimer = (this.autopilotStallTimer || 0) + dt;
      if (this.autopilotStallTimer > 1.8) {
        // Trigger 0.75s reversing maneuver with opposite steer
        this.unstuckTimer = 0.75;
        this.autopilotStallTimer = 0;
        this.unstuckSteer = (latError >= 0 ? -1 : 1) * this.maxSteerAngle;
        return;
      }
    } else {
      this.autopilotStallTimer = 0;
    }

    // Predictive lookahead: evaluate target tangent ahead of the vehicle
    const planetR = this.planet.baseRadius || 115.0;
    const lookaheadArc = 4.8 / planetR;
    const thetaLookahead = theta + lookaheadArc;
    const lookaheadTangent = this.planet._getRoadTangent(thetaLookahead);

    // Desired heading blends predictive tangent with correction towards road center
    const correction = this.right.clone().multiplyScalar(latError * 5.0);
    const targetHeading = lookaheadTangent.clone().add(correction);

    // Obstacle Proximity Radar: scan for upcoming roadside obstacles in vehicle's path
    if (this.planet.colliders && this.planet.colliders.length > 0) {
      for (let i = 0; i < this.planet.colliders.length; i++) {
        const obs = this.planet.colliders[i];
        const toObs = (obs.pos || obs.position).clone().sub(this.position);
        const forwardDist = toObs.dot(this.forward);
        // Only consider obstacles ahead within 14m
        if (forwardDist > 0.5 && forwardDist < 14.0) {
          const latDist = toObs.dot(this.right);
          const safeMargin = obs.radius + 1.8;
          if (Math.abs(latDist) < safeMargin) {
            // Apply steering bias away from the obstacle
            const avoidDir = latDist > 0 ? -1.0 : 1.0;
            const urgency = (1.0 - forwardDist / 14.0) * (1.0 - Math.abs(latDist) / safeMargin);
            targetHeading.addScaledVector(this.right, avoidDir * urgency * 3.5);
          }
        }
      }
    }
    targetHeading.normalize();

    // Compute steer angle required to align forward with targetHeading
    const steerSide = this.right.dot(targetHeading);
    const desiredSteer = THREE.MathUtils.clamp(-steerSide * 2.4, -this.maxSteerAngle, this.maxSteerAngle);
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, desiredSteer, 6.0 * dt);

    // Dynamic cruise speed: normal 13.5 m/s (~50 km/h), cataclysm/boost 22-26 m/s (~80-95 km/h)
    let targetCruise = 13.5;
    if (this.nitroEnergy <= 0.0) {
      this.nitroEnergy = 0.0;
      this.nitroLockout = true;
      this.nitroBoostActive = false;
    }
    if (this.nitroLockout) {
      // Locked out: strictly refill until 100% full before unlocking
      this.nitroBoostActive = false;
      this.nitroEnergy = Math.min(100.0, this.nitroEnergy + 16.0 * dt);
      if (this.nitroEnergy >= 100.0) {
        this.nitroEnergy = 100.0;
        this.nitroLockout = false;
      }
    } else if (this.inputs.boost || this.app?.gameMode === "cataclysm") {
      targetCruise = 26.5;
      this.nitroBoostActive = true;
      this.nitroEnergy -= 32.0 * dt;
      if (this.nitroEnergy <= 0.0) {
        this.nitroEnergy = 0.0;
        this.nitroLockout = true;
        this.nitroBoostActive = false;
      }
    } else {
      this.nitroBoostActive = false;
      this.nitroEnergy = Math.min(100.0, this.nitroEnergy + 16.0 * dt);
      if (this.nitroEnergy >= 100.0) {
        this.nitroEnergy = 100.0;
        this.nitroLockout = false;
      }
    }

    if (this.exhaustFlames) {
      this.exhaustFlames.visible = this.nitroBoostActive;
      if (this.nitroBoostActive) {
        const s = 0.85 + Math.random() * 0.35;
        this.exhaustFlames.scale.set(s, s, s * 1.4);
      }
    }

    if (this.velocityForward < targetCruise) {
      this.velocityForward = Math.min(targetCruise, this.velocityForward + this.acceleration * 1.5 * dt);
    } else {
      this.velocityForward = THREE.MathUtils.lerp(this.velocityForward, targetCruise, 2.0 * dt);
    }
    this.velocityLateral = THREE.MathUtils.lerp(this.velocityLateral, 0.0, 8.0 * dt);
    this.yawRate = (this.velocityForward / 2.8) * Math.tan(this.steerAngle);
  }

  // ---------------------------------------------------------------
  // 5. MAIN KINEMATIC & 2D DYNAMICS STEP
  // ---------------------------------------------------------------
  update(dt) {
    if (this.isSuckedIn) return;
    if (dt <= 0 || dt > 0.1) dt = 0.016; // Clamp spike frame rates

    // 1. Process Autopilot or Manual Inputs
    if (this.autopilotActive) {
      this._stepAutopilot(dt);
    } else {
      // Manual Steering with speed-sensitive dynamic response
      let targetSteer = 0.0;
      if (this.inputs.left)  targetSteer += this.maxSteerAngle;
      if (this.inputs.right) targetSteer -= this.maxSteerAngle;
      if (typeof this.inputs.tiltSteer === 'number' && Math.abs(this.inputs.tiltSteer) > 0.05) {
        targetSteer -= this.inputs.tiltSteer * this.maxSteerAngle;
      }
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, this.steerSpeed * dt);

      // Manual Throttle & Braking
      const speedMag = Math.abs(this.velocityForward);

    // Nitro lockout recovery: strictly refill until 100% before unlocking
    if (this.nitroEnergy <= 0.0) {
      this.nitroEnergy = 0.0;
      this.nitroLockout = true;
      this.nitroBoostActive = false;
    }

    if (this.nitroLockout) {
      this.nitroBoostActive = false;
      this.nitroEnergy = Math.min(100.0, this.nitroEnergy + 16.0 * dt);
      if (this.nitroEnergy >= 100.0) {
        this.nitroEnergy = 100.0;
        this.nitroLockout = false;
      }
    }

    const canBoost = !this.nitroLockout && this.inputs.boost && speedMag > 0.5;

    if (canBoost) {
      // NITRO BOOST ACTIVATED
      this.nitroBoostActive = true;
      this.nitroEnergy -= 32.0 * dt;
      if (this.nitroEnergy <= 0.0) {
        this.nitroEnergy = 0.0;
        this.nitroLockout = true;
        this.nitroBoostActive = false;
      }
      const boostMax = this.maxSpeedForward * 1.65; // ~107 km/h
      this.velocityForward = Math.min(boostMax, this.velocityForward + this.acceleration * 2.2 * dt);
    } else {
      this.nitroBoostActive = false;
      if (!this.nitroLockout) {
        this.nitroEnergy = Math.min(100.0, this.nitroEnergy + 16.0 * dt);
        if (this.nitroEnergy >= 100.0) {
          this.nitroEnergy = 100.0;
        }
      }

        if (this.inputs.forward) {
          if (this.velocityForward < -0.5) {
            // Braking while in reverse
            this.velocityForward += this.brakeForce * dt;
          } else {
            // Accelerate forward
            this.velocityForward = Math.min(this.maxSpeedForward, this.velocityForward + this.acceleration * dt);
          }
        } else if (this.inputs.backward) {
          if (this.velocityForward > 0.5) {
            // Braking while moving forward
            this.velocityForward = Math.max(0.0, this.velocityForward - this.brakeForce * dt);
          } else {
            // Reverse
            this.velocityForward = Math.max(this.maxSpeedReverse, this.velocityForward - (this.acceleration * 0.55) * dt);
          }
        } else if (this.inputs.brake || this.inputs.handbrake) {
          // Handbrake / emergency brake
          if (this.velocityForward > 0) {
            this.velocityForward = Math.max(0.0, this.velocityForward - this.brakeForce * 1.4 * dt);
          } else if (this.velocityForward < 0) {
            this.velocityForward = Math.min(0.0, this.velocityForward + this.brakeForce * 1.4 * dt);
          }
        } else {
          // Natural rolling resistance and coast deceleration
          if (Math.abs(this.velocityForward) < 0.2) {
            this.velocityForward = 0.0;
          } else if (this.velocityForward > 0) {
            this.velocityForward = Math.max(0.0, this.velocityForward - this.naturalDecel * dt);
          } else {
            this.velocityForward = Math.min(0.0, this.velocityForward + this.naturalDecel * dt);
          }
        }
      }

      // 2D Lateral Tire Dynamics & Controlled Drift Mechanics
      const isHandbrake = (this.inputs.brake || this.inputs.handbrake) && speedMag > 2.0;

      // Desired yaw rate from steering geometry
      const targetYawRate = (this.velocityForward / 2.8) * Math.tan(this.steerAngle) * (1.0 - Math.min(0.5, Math.abs(this.velocityLateral) * 0.1));
      this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYawRate, Math.min(1.0, (isHandbrake ? 16.0 : 10.0) * dt));

      // Equilibrium lateral drift velocity in cornering
      let targetLatVel = 0.0;
      if (speedMag > 2.0 && Math.abs(this.steerAngle) > 0.06) {
        const slipFactor = isHandbrake ? 0.65 : 0.32;
        targetLatVel = -this.velocityForward * Math.sin(this.steerAngle) * slipFactor;
        const maxSlip = speedMag * (isHandbrake ? 0.75 : 0.45);
        targetLatVel = THREE.MathUtils.clamp(targetLatVel, -maxSlip, maxSlip);
      }

      // Smoothly converge lateral velocity toward target cornering slip
      const slipResponseRate = isHandbrake ? 12.0 : 7.0;
      this.velocityLateral = THREE.MathUtils.lerp(this.velocityLateral, targetLatVel, Math.min(1.0, slipResponseRate * dt));

      this.driftSlipRatio = THREE.MathUtils.clamp(Math.abs(this.velocityLateral) / Math.max(2.5, speedMag), 0.0, 1.0);

      // Animate exhaust flames
      if (this.exhaustFlames) {
        this.exhaustFlames.visible = this.nitroBoostActive;
        if (this.nitroBoostActive) {
          const s = 0.85 + Math.random() * 0.35;
          this.exhaustFlames.scale.set(s, s, s * 1.4);
        }
      }
    }

    // 2. Suspension & Grounding Check
    const groundedCount = this._evaluateSuspension(dt);

    // 3. Turning & Momentum Carving (Yaw rotation around radialUp)
    if (Math.abs(this.velocityForward) > 0.05 || Math.abs(this.velocityLateral) > 0.1) {
      const yawAngle = this.yawRate * dt;
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(this.radialUp, yawAngle);
      this.forward.applyQuaternion(rotQuat).normalize();
      this.right.crossVectors(this.forward, this.radialUp).normalize();
      this.forward.crossVectors(this.radialUp, this.right).normalize();
    }

    // 4. Sub-Stepped Position Translation & Continuous Spine-Capsule Collision (Anti-Tunneling)
    const speedMagnitude = Math.abs(this.velocityForward) + Math.abs(this.velocityLateral);
    const subSteps = Math.min(4, Math.max(1, Math.ceil(speedMagnitude / 7.5)));
    const subDt = dt / subSteps;
    const vehRadius = 0.94; // Transverse envelope radius (car half-width 0.84m + 0.10m buffer)

    for (let step = 0; step < subSteps; step++) {
      // 4a. Position Translation across Sphere (Longitudinal + Lateral Slip)
      const displacement = this.forward.clone().multiplyScalar(this.velocityForward * subDt)
        .add(this.right.clone().multiplyScalar(this.velocityLateral * subDt));
      this.position.add(displacement);

      // 4b. Continuous Spine-Capsule Obstacle Collision with Impulse Deflection
      if (this.planet.getNearbyColliders) {
        const nearby = this.planet.getNearbyColliders(this.position, 35.0);

        for (let iter = 0; iter < 2; iter++) {
          for (let i = 0; i < nearby.length; i++) {
            const obs = nearby[i];
            const toObs = obs.pos.clone().sub(this.position);
            const radialDist = toObs.dot(this.radialUp);

            // Project obstacle onto vehicle's tangential plane
            const tangentToObs = toObs.clone().sub(this.radialUp.clone().multiplyScalar(radialDist));

            // Find closest point along vehicle's longitudinal spine [-1.2m (rear) to +1.35m (front)]
            const spineT = THREE.MathUtils.clamp(tangentToObs.dot(this.forward), -1.20, 1.35);
            const closestSpinePos = this.position.clone().add(this.forward.clone().multiplyScalar(spineT));

            // Vector from obstacle to closest point on vehicle spine
            const diff = closestSpinePos.sub(obs.pos);
            const diffRad = diff.dot(this.radialUp);
            const tangentDiff = diff.clone().sub(this.radialUp.clone().multiplyScalar(diffRad));
            const tangentDist = tangentDiff.length();
            const minSafeDist = vehRadius + obs.radius;

            if (tangentDist < minSafeDist && Math.abs(radialDist) < obs.height) {
              // Push vehicle away from obstacle along separation normal
              const pushDir = tangentDiff.lengthSq() > 0.0001 ? tangentDiff.normalize() : this.right.clone();
              const penetration = minSafeDist - tangentDist;
              this.position.addScaledVector(pushDir, penetration);

              // World velocity vector
              const worldVel = this.forward.clone().multiplyScalar(this.velocityForward)
                .add(this.right.clone().multiplyScalar(this.velocityLateral));

              // Normal velocity component into obstacle
              const normalVel = worldVel.dot(pushDir);

              if (normalVel < 0) {
                // Deflect normal component with restitution e = 0.22 (smooth barrier slide)
                const normalImpulse = -normalVel * 1.22;
                worldVel.addScaledVector(pushDir, normalImpulse);

                // Friction on tangential sliding velocity
                worldVel.multiplyScalar(0.82);

                // Re-project back onto forward and right axes
                this.velocityForward = worldVel.dot(this.forward);
                this.velocityLateral = worldVel.dot(this.right);

                if (Math.abs(normalVel) > 2.0 && iter === 0) {
                  this.app?.audio?.playCrashSound();
                  this.app?.hud?.showBanner("DEFLECTION!", `Glanced off ${obs.name}`, 1200);
                }
              }
            }
          }
        }
      }
    }

    // Snap to spherical terrain elevation
    const currentDir = this.position.clone().normalize();
    const terrainR = this.planet.getTerrainRadiusAt(currentDir);

    // Radial suspension spring integration
    const targetAltitude = terrainR + this.wheelRadius + 0.04;
    const currentR = this.position.length();

    if (currentR < targetAltitude) {
      this.position.copy(currentDir).multiplyScalar(targetAltitude);
      this.verticalVelocity = 0.0;
    } else if (currentR > targetAltitude + 0.1) {
      this.verticalVelocity -= 24.0 * dt; // Gravity
      const newR = currentR + this.verticalVelocity * dt;
      if (newR <= targetAltitude) {
        this.position.copy(currentDir).multiplyScalar(targetAltitude);
        this.verticalVelocity = 0.0;
      } else {
        this.position.copy(currentDir).multiplyScalar(newR);
      }
    } else {
      const smoothR = THREE.MathUtils.lerp(currentR, targetAltitude, Math.min(1.0, 18.0 * dt));
      this.position.copy(currentDir).multiplyScalar(smoothR);
      this.verticalVelocity = 0.0;
    }

    // Keep radialUp strictly aligned with sphere normal
    this.radialUp.copy(currentDir);
    this.right.crossVectors(this.forward, this.radialUp).normalize();
    this.forward.crossVectors(this.radialUp, this.right).normalize();

    // 4c. Update Expedition Odometer & Biome Region on HUD
    if (this.app?.hud && this.planet.getRegionAt) {
      const reg = this.planet.getRegionAt(this.radialUp);
      this.app.hud.updateOdometer(reg.distKm, reg.totalKm, reg.name);
    }

    // 5. Wheel Visual Animations: Steering & Axle Rolling
    const rollDelta = (this.velocityForward * dt) / this.wheelRadius;

    for (const rig of this.wheelRigs) {
      if (rig.isFront) {
        rig.steerPivot.rotation.y = this.steerAngle;
      }
      rig.rollAngle += rollDelta;
      rig.spinContainer.rotation.x = rig.rollAngle;
    }

    // 6. Dynamic Chassis Body Pitch & Roll Suspension Lean
    const speedNorm = Math.abs(this.velocityForward) / this.maxSpeedForward;
    const rollTarget = THREE.MathUtils.clamp(-this.yawRate * speedNorm * 0.18, -0.16, 0.16);
    const pitchTarget = THREE.MathUtils.clamp(
      (this.inputs.forward ? -0.06 : 0) + 
      (this.inputs.backward || this.inputs.brake ? 0.07 : 0) + 
      (this.nitroBoostActive ? -0.06 : 0),
      -0.12, 0.10
    );

    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, rollTarget, Math.min(1.0, 10.0 * dt));
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, pitchTarget, Math.min(1.0, 10.0 * dt));

    // 7. Active Cornering Headlights (Swivels beam dynamically into turns)
    if (this.headlightRig) {
      this.headlightRig.rotation.y = this.steerAngle * 0.72;
    }

    // 8. Update Transform Matrix
    this._updateTransformMatrix();
  }

  // ---------------------------------------------------------------
  // 6. ORIENTATION & MATRIX TRANSFORMATION
  // ---------------------------------------------------------------
  _updateTransformMatrix() {
    this.group.position.copy(this.position);

    // Three.js convention:
    // +X = right
    // +Y = up
    // +Z = -forward (rear)
    const rear = this.forward.clone().negate();
    const m = new THREE.Matrix4();
    m.makeBasis(this.right, this.radialUp, rear);
    this.group.quaternion.setFromRotationMatrix(m);
    this.group.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------
  // 7. PUBLIC INTERACTION METHODS
  // ---------------------------------------------------------------
  toggleAutopilot() {
    this.autopilotActive = !this.autopilotActive;
    return this.autopilotActive;
  }

  setInputs(forward, backward, left, right, brake = false, boost = false) {
    this.inputs.forward = forward;
    this.inputs.backward = backward;
    this.inputs.left = left;
    this.inputs.right = right;
    this.inputs.brake = brake;
    this.inputs.boost = boost;

    if (forward || backward || left || right || boost) {
      // Manual input overrides and deactivates autopilot
      this.autopilotActive = false;
    }
  }

  getSpeedKmh() {
    return Math.abs(Math.round(this.speed * 3.6));
  }

  getNitroPercent() {
    return Math.round(this.nitroEnergy);
  }

  refillNitro(amount = 25.0) {
    this.nitroEnergy = Math.min(100.0, this.nitroEnergy + amount);
    if (this.nitroEnergy >= 100.0) {
      this.nitroLockout = false;
    }
  }

  isNitroLockedOut() {
    return this.nitroLockout;
  }

  get mesh() {
    return this.body || this.group;
  }

  isBoosting() {
    return this.nitroBoostActive;
  }

  isReversing() {
    return this.speed < -0.1;
  }
}

