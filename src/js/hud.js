import { ICONS } from './icons.js';
import { settings } from './settings.js';

const PLANET_KEYS = [
  "Cinderfell", "Aetheria", "Oakhaven", "Rustvale",
  "Stormhaven", "Ringhaven", "Frostveil", "Thalassa", "Nocturna"
];

export class HUDController {
  constructor(app) {
    this.app = app;

    // DOM Elements
    this.speedEl = document.getElementById('speed-indicator');
    this.autopilotPill = document.getElementById('autopilot-pill');
    this.timeDisplay = document.getElementById('time-display');
    this.timeSlider = document.getElementById('atmosphere-slider');
    this.banner = document.getElementById('banner-notification');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSubtitle = document.getElementById('banner-subtitle');
    this.welcomeModal = document.getElementById('welcome-modal');
    this.aboutModal = document.getElementById('about-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.planetStatusLabel = document.getElementById('label-planet-status');

    // Headers
    this.cosyHeader = document.getElementById('cosy-hud-header');
    this.arcadeHeader = document.getElementById('arcade-hud-header');
    this.atmosphereBox = document.getElementById('atmosphere-box');
    this.dangerVignette = document.getElementById('danger-vignette');

    // Arcade Header Elements
    this.arcadeHearts = document.getElementById('arcade-hearts');
    this.arcadeScore = document.getElementById('arcade-score');
    this.arcadeHighScore = document.getElementById('arcade-high-score');
    this.arcadeComboBadge = document.getElementById('arcade-combo-badge');
    this.arcadeComboFill = document.getElementById('arcade-combo-fill');
    this.toastContainer = document.getElementById('arcade-toast-container');
    this.lockonBadge = document.getElementById('lockon-warning-badge');

    // Game Over Summary Elements
    this.gameOverModal = document.getElementById('gameover-modal');
    this.goModeTitle = document.getElementById('go-mode-title');
    this.goFinalScore = document.getElementById('go-final-score');
    this.goHighScore = document.getElementById('go-high-score');
    this.goRank = document.getElementById('go-rank');
    this.goNewHighBadge = document.getElementById('go-new-high-badge');

    // Nitro elements
    this.nitroFill = document.getElementById('nitro-fill');

    // Mode cards
    this.cardCosy = document.getElementById('card-mode-cosy');
    this.cardCascade = document.getElementById('card-mode-cascade');
    this.cardTornado = document.getElementById('card-mode-tornado');

    // Overlays
    this.countdownOverlay = document.getElementById('arcade-countdown-overlay');
    this.tornadoWarningPill = document.getElementById('tornado-proximity-warning');

    this.bannerTimeout = null;
    this.lastRenderedToasts = "";

    this._bindEvents();
    this._initVectorIcons();
    this.setGameMode("cosy"); // Default mode
  }

  _bindEvents() {
    // 1. Atmosphere Slider
    if (this.timeSlider) {
      this.timeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.app?.setAtmosphereTime(val);
      });
    }

    // 2. Weather Buttons
    const weatherBtns = document.querySelectorAll('.btn-weather');
    weatherBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        weatherBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const modeId = btn.getAttribute('data-weather');
        const modes = ["Clear", "Rain", "Snow", "Sandstorm"];
        const mode = modes[parseInt(modeId)] || "Clear";
        this.app?.setWeather(mode);
        this.showBanner(`WEATHER: ${mode.toUpperCase()}`, `Atmospheric precipitation updated`);
      });
    });

    // Helper for robust pointerup + click handling
    const attachButton = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let lastTrigger = 0;
      const trigger = (e) => {
        const now = Date.now();
        if (now - lastTrigger < 250) return;
        lastTrigger = now;
        e.preventDefault();
        e.stopPropagation();
        handler();
      };
      el.addEventListener('pointerup', trigger);
      el.addEventListener('click', trigger);
    };

    // 3. Tri-Mode Selection Cards
    if (this.cardCosy) {
      this.cardCosy.addEventListener('click', () => this.setGameMode("cosy"));
    }
    if (this.cardCascade) {
      this.cardCascade.addEventListener('click', () => this.setGameMode("cascade"));
    }
    if (this.cardTornado) {
      this.cardTornado.addEventListener('click', () => this.setGameMode("tornado"));
    }

    // 4. Welcome Modal Controls
    attachButton('btn-start-game', () => {
      this.hideWelcomeModal();
      this.app.startGame();
    });

    // 9-Planet Solar Quick Strip Selection
    const planetCards = document.querySelectorAll('.planet-card');
    planetCards.forEach(card => {
      const planetType = card.getAttribute('data-planet');
      const select = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.selectPlanet(planetType);
      };
      card.addEventListener('pointerup', select);
      card.addEventListener('click', select);
    });

    // Prev / Next Planet Chevrons
    const cyclePlanet = (delta) => {
      const current = this.app.currentPlanetType || this.app.planet?.type || "Oakhaven";
      let idx = PLANET_KEYS.indexOf(current);
      if (idx === -1) idx = 2; // Oakhaven
      idx = (idx + delta + PLANET_KEYS.length) % PLANET_KEYS.length;
      this.selectPlanet(PLANET_KEYS[idx]);
    };
    this.cyclePlanet = cyclePlanet;

    attachButton('btn-prev-planet', () => cyclePlanet(-1));
    attachButton('btn-next-planet', () => cyclePlanet(1));

    // Keyboard navigation (ArrowLeft / ArrowRight) and Enter to start
    window.addEventListener('keydown', (e) => {
      if (!this.welcomeModal || this.welcomeModal.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cyclePlanet(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cyclePlanet(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.hideWelcomeModal();
        this.app.startGame();
      }
    });

    // Swipe gesture support across the 3D globe / menu for mobile
    const swipeSurface = this.welcomeModal || document.body;
    if (swipeSurface) {
      let touchStartX = 0;
      let touchStartY = 0;
      swipeSurface.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, input, textarea, select, #carousel-audio-popover, .carousel-audio-popover, #carousel-volume-container, #about-modal')) return;
        if (e.touches && e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      swipeSurface.addEventListener('touchend', (e) => {
        if (e.target.closest('button, input, textarea, select, #carousel-audio-popover, .carousel-audio-popover, #carousel-volume-container, #about-modal')) return;
        if (e.changedTouches && e.changedTouches.length > 0) {
          const diffX = e.changedTouches[0].clientX - touchStartX;
          const diffY = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) {
              cyclePlanet(1); // Swipe left -> Next planet
            } else {
              cyclePlanet(-1); // Swipe right -> Previous planet
            }
            if (navigator.vibrate) navigator.vibrate(10);
          }
        }
      }, { passive: true });
    }

    // 4A. Menu Audio & Volume Calibration Controls (Menu Screen Only)
    this._bindMenuVolumeControls();

    // 4B. Expedition Field Guide & Creator Dev Dossier Modal
    attachButton('btn-open-about', () => {
      this.aboutModal?.classList.remove('hidden');
    });

    attachButton('btn-close-about', () => {
      this.aboutModal?.classList.add('hidden');
    });

    attachButton('btn-close-about-2', () => {
      this.aboutModal?.classList.add('hidden');
    });

    const tabGuide = document.getElementById('tab-btn-guide');
    const tabDev = document.getElementById('tab-btn-dev');
    const panelGuide = document.getElementById('panel-handbook-guide');
    const panelDev = document.getElementById('panel-handbook-dev');

    if (tabGuide && tabDev && panelGuide && panelDev) {
      tabGuide.addEventListener('click', () => {
        tabGuide.classList.add('active');
        tabGuide.setAttribute('aria-selected', 'true');
        tabDev.classList.remove('active');
        tabDev.setAttribute('aria-selected', 'false');
        panelGuide.classList.remove('hidden');
        panelDev.classList.add('hidden');
      });

      tabDev.addEventListener('click', () => {
        tabDev.classList.add('active');
        tabDev.setAttribute('aria-selected', 'true');
        tabGuide.classList.remove('active');
        tabGuide.setAttribute('aria-selected', 'false');
        panelDev.classList.remove('hidden');
        panelGuide.classList.add('hidden');
      });
    }

    // In-Game Title Card opens About & Dev Dossier
    const inGameTitleCard = document.querySelector('.top-bar .title-card');
    if (inGameTitleCard) {
      inGameTitleCard.style.cursor = 'pointer';
      inGameTitleCard.setAttribute('title', 'Explore Creator Dossier & Expedition Field Guide');
      inGameTitleCard.addEventListener('click', () => {
        this.aboutModal?.classList.remove('hidden');
      });
    }

    // 5. Game Over Modal Controls & Score Sharing
    attachButton('btn-retry-arcade', () => {
      this.hideGameOverModal();
      this.app.restartArcadeMode();
    });

    attachButton('btn-change-mode', () => {
      this.hideGameOverModal();
      this.showWelcomeModal();
    });

    attachButton('btn-share-score', () => {
      const score = this.goFinalScore ? this.goFinalScore.textContent : '0';
      const rank = this.goRank ? this.goRank.textContent : 'RANK A';
      const planet = this.app.currentPlanetType || 'Oakhaven';
      const mode = this.app.gameMode === 'cascade' ? 'Celestial Cascade' : (this.app.gameMode === 'tornado' ? 'Tornado Chase' : 'Cosy Cruise');
      const shareText = `Over The Horizon — Planetary Driving Odyssey\nScore: ${score} pts (${rank})\nPlanet: ${planet} | Mode: ${mode}\nPlay free in your browser: https://overthehorizon.srinivasa.dev`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Over The Horizon Score Card',
          text: shareText,
          url: 'https://overthehorizon.srinivasa.dev'
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          this.showBanner('SCORE CARD COPIED', 'Expedition score card copied to clipboard.');
        }).catch(() => {});
      } else {
        this.showBanner('EXPEDITION SCORE', `${score} PTS (${rank})`);
      }
    });

    // 5b. Settings Modal Controls
    attachButton('btn-menu-settings', () => {
      this.toggleSettingsModal();
    });

    attachButton('btn-hud-settings', () => {
      this.toggleSettingsModal();
    });

    attachButton('btn-close-settings', () => {
      this.settingsModal?.classList.add('hidden');
    });

    this._bindSettingsControls();

    // 6. Mobile Virtual Controls & Quick Actions
    const touchLeft = document.getElementById('btn-touch-left');
    const touchRight = document.getElementById('btn-touch-right');
    const touchGas = document.getElementById('btn-touch-gas');
    const touchBrake = document.getElementById('btn-touch-brake');
    const touchBoost = document.getElementById('btn-touch-boost');

    const bindTouch = (el, onStart, onEnd, vib = 10) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const isMenuOpen = !this.app.isGameStarted || (this.welcomeModal && !this.welcomeModal.classList.contains('hidden'));
        if (isMenuOpen) return;
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        if (navigator.vibrate) navigator.vibrate(vib);
        onStart();
      });
      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        onEnd();
      });
      el.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        onEnd();
      });
    };

    const cancelAutopilot = () => {
      if (this.app.vehiclePhysics && this.app.vehiclePhysics.autopilotActive) {
        this.app.vehiclePhysics.autopilotActive = false;
        this.setAutopilotStatus(false);
      }
    };

    bindTouch(touchLeft,  () => { cancelAutopilot(); this.app.vehiclePhysics.inputs.left = true; },     () => this.app.vehiclePhysics.inputs.left = false, 8);
    bindTouch(touchRight, () => { cancelAutopilot(); this.app.vehiclePhysics.inputs.right = true; },    () => this.app.vehiclePhysics.inputs.right = false, 8);
    bindTouch(touchGas,   () => { cancelAutopilot(); this.app.vehiclePhysics.inputs.forward = true; },  () => this.app.vehiclePhysics.inputs.forward = false, 12);
    bindTouch(touchBrake, () => { cancelAutopilot(); this.app.vehiclePhysics.inputs.backward = true; }, () => this.app.vehiclePhysics.inputs.backward = false, 15);
    bindTouch(touchBoost, () => this.app.vehiclePhysics.inputs.boost = true,    () => this.app.vehiclePhysics.inputs.boost = false, 25);

    // Mobile Virtual Autopilot Button
    const toggleAutopilot = () => {
      if (!this.app.vehiclePhysics) return;
      const isAuto = this.app.vehiclePhysics.toggleAutopilot();
      this.setAutopilotStatus(isAuto);
      this.showBanner("AUTOPILOT", isAuto ? "Autonomous Road Cruise Active" : "Manual Control Restored");
      if (navigator.vibrate) navigator.vibrate(20);
    };

    attachButton('btn-touch-auto-drive', toggleAutopilot);

    // Mobile Quick Actions Bar (CAM POV, MAP Menu, Climate/Time Drawer)
    attachButton('btn-touch-cam', () => this.app.cycleCameraMode());
    attachButton('btn-touch-menu', () => this.toggleWelcomeModal());
    attachButton('btn-touch-atmo', () => this.toggleAtmosphereDrawer());
    attachButton('btn-close-atmo', () => this.toggleAtmosphereDrawer(false));
  }

  setGameMode(mode) {
    this.currentMode = mode;
    this.app?.setGameMode(mode);

    // Update Mode Cards Active State
    if (this.cardCosy) this.cardCosy.classList.toggle('active', mode === "cosy");
    if (this.cardCascade) this.cardCascade.classList.toggle('active', mode === "cascade");
    if (this.cardTornado) this.cardTornado.classList.toggle('active', mode === "tornado");

    const MODE_DESCS = {
      "cosy": {
        title: "SCENIC DIORAMA EXPEDITION",
        tagline: "Freeform Exploration • No Time Pressure",
        text: "Explore winding mountain trails, deliver cargo between remote outposts, and soak in dynamic time-of-day atmospheres with zero time limits."
      },
      "cascade": {
        title: "ORBITAL HAZARD SURVIVAL",
        tagline: "5-Second Countdown • Falling Stars • Multipliers",
        text: "Starts with an audible 5-second radar lock countdown. Dodge incoming stellar impacts, collect fallen stardust shards, and build 5x combo multipliers before shields deplete."
      },
      "tornado": {
        title: "ATMOSPHERIC TWISTER PURSUIT",
        tagline: "Relentless Twisters • Gravitational Pull • Permadeath",
        text: "Chasing atmospheric tornados hunt your rover across the planetary surface. If sucked into the funnel vortex, your vehicle is destroyed. No respawns: 1 life only!"
      }
    };

    const descData = MODE_DESCS[mode] || MODE_DESCS["cosy"];
    const titleEl = document.getElementById('mode-desc-title');
    const tagEl = document.getElementById('mode-desc-tagline');
    const textEl = document.getElementById('mode-desc-text');
    const summaryEl = document.getElementById('mode-summary-text');

    if (titleEl) titleEl.textContent = descData.title;
    if (tagEl) tagEl.textContent = descData.tagline;
    if (textEl) textEl.textContent = descData.text;
    if (summaryEl) summaryEl.textContent = descData.text;

    const startBtnText = document.getElementById('btn-start-text');
    const startBtn = document.getElementById('btn-start-game');
    const label = mode === "cosy" ? "LAUNCH COSY CRUISE" : (mode === "cascade" ? "LAUNCH CELESTIAL CASCADE" : "LAUNCH TORNADO CHASE");
    if (startBtnText) {
      startBtnText.textContent = "DRIVE";
    }
    if (startBtn) {
      startBtn.setAttribute('aria-label', label);
    }

    // Toggle HUD Headers
    if (this.cosyHeader && this.arcadeHeader) {
      if (mode === "cosy") {
        this.cosyHeader.classList.remove('hidden');
        this.arcadeHeader.classList.add('hidden');
        if (this.atmosphereBox) this.atmosphereBox.classList.remove('hidden');
        if (this.dangerVignette) this.dangerVignette.classList.remove('danger-high');
        if (this.lockonBadge) this.lockonBadge.classList.add('hidden');
      } else {
        this.cosyHeader.classList.add('hidden');
        this.arcadeHeader.classList.remove('hidden');
        if (this.atmosphereBox) this.atmosphereBox.classList.add('hidden');
      }
    }
  }

  updateArcadeStats({ mode, hearts, score, highScore, combo, comboProgress, toasts = [], lockonWarning = false }) {
    // 0. Update Lock-on Alarm Badge
    if (this.lockonBadge) {
      if (lockonWarning) {
        this.lockonBadge.classList.remove('hidden');
      } else {
        this.lockonBadge.classList.add('hidden');
      }
    }

    // 1. Update Hearts (Vector SVG Hearts, Zero Emojis)
    if (this.arcadeHearts) {
      const heartSpans = this.arcadeHearts.querySelectorAll('.heart-icon');
      heartSpans.forEach((span, idx) => {
        span.innerHTML = ICONS.ui.shield || ICONS.ui.heart;
        // In Tornado Chase mode: only 1 life is available
        if (mode === 'tornado' && idx > 0) {
          span.style.display = 'none';
        } else {
          span.style.display = '';
        }

        if (idx < hearts) {
          span.classList.remove('lost');
        } else {
          span.classList.add('lost');
        }
      });
    }

    // Danger vignette warning if on last heart (only for multi-heart modes)
    if (this.dangerVignette) {
      if (mode !== 'tornado' && hearts === 1) {
        this.dangerVignette.classList.add('danger-high');
      } else {
        this.dangerVignette.classList.remove('danger-high');
      }
    }

    // 2. Update Score & High Score
    if (this.arcadeScore) {
      this.arcadeScore.textContent = Number(score).toLocaleString();
    }
    if (this.arcadeHighScore) {
      this.arcadeHighScore.textContent = Number(highScore).toLocaleString();
    }

    // 3. Update Combo Multiplier & Decay Bar
    if (this.arcadeComboBadge) {
      this.arcadeComboBadge.textContent = combo > 1 ? `COMBO x${combo}` : `COMBO x1`;
    }
    if (this.arcadeComboFill) {
      this.arcadeComboFill.style.width = `${Math.max(0, Math.min(100, comboProgress))}%`;
    }

    // 4. Update Floating Toasts
    if (this.toastContainer && toasts.length > 0) {
      const toastKey = toasts.map(t => t.id + t.text).join('|');
      if (toastKey !== this.lastRenderedToasts) {
        this.lastRenderedToasts = toastKey;
        this.toastContainer.innerHTML = toasts.map(t => `
          <div class="arcade-toast" style="color: ${t.color}; border-color: ${t.color}66;">
            <div>${t.text}</div>
            ${t.subtext ? `<div class="toast-sub">${t.subtext}</div>` : ''}
          </div>
        `).join('');
      }
    } else if (this.toastContainer && toasts.length === 0 && this.lastRenderedToasts !== "") {
      this.lastRenderedToasts = "";
      this.toastContainer.innerHTML = "";
    }
  }

  showGameOverModal({ modeName, score, highScore, rank, isNewHighScore }) {
    if (!this.gameOverModal) return;

    if (this.goModeTitle) this.goModeTitle.textContent = modeName;
    if (this.goFinalScore) this.goFinalScore.textContent = Number(score).toLocaleString();
    if (this.goHighScore) this.goHighScore.textContent = Number(highScore).toLocaleString();
    if (this.goRank) this.goRank.textContent = rank;

    if (this.goNewHighBadge) {
      this.goNewHighBadge.classList.toggle('hidden', !isNewHighScore);
    }

    this.gameOverModal.classList.remove('hidden');
  }

  hideGameOverModal() {
    if (this.gameOverModal) {
      this.gameOverModal.classList.add('hidden');
    }
  }

  showCountdown(seconds) {
    if (!this.countdownOverlay) {
      this.countdownOverlay = document.getElementById('arcade-countdown-overlay');
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.remove('hidden');
      const numEl = this.countdownOverlay.querySelector('.countdown-number');
      const subEl = this.countdownOverlay.querySelector('.countdown-sub');
      if (numEl) numEl.textContent = seconds > 0 ? seconds : 'IMPACTS!';
      if (subEl) subEl.textContent = 'METEOR SALVO RADAR LOCK';
    }
  }

  updateCountdown(seconds, subtitleText) {
    if (!this.countdownOverlay) {
      this.countdownOverlay = document.getElementById('arcade-countdown-overlay');
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.remove('hidden');
      const numEl = this.countdownOverlay.querySelector('.countdown-number');
      const subEl = this.countdownOverlay.querySelector('.countdown-sub');
      if (numEl) {
        numEl.textContent = seconds > 0 ? seconds : 'ESCAPE!';
        numEl.classList.remove('pulse');
        void numEl.offsetWidth;
        numEl.classList.add('pulse');
      }
      if (subEl) {
        if (subtitleText) {
          subEl.textContent = subtitleText;
        } else {
          subEl.textContent = seconds > 0 ? 'CALIBRATING ORBITAL TRAJECTORIES' : 'METEORS INCOMING!';
        }
      }
    }
  }

  showCountdown(seconds, subtitleText) {
    this.updateCountdown(seconds, subtitleText);
  }

  hideCountdown() {
    if (!this.countdownOverlay) {
      this.countdownOverlay = document.getElementById('arcade-countdown-overlay');
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
  }

  showTornadoWarning(distanceM) {
    if (!this.tornadoWarningPill) {
      this.tornadoWarningPill = document.getElementById('tornado-proximity-warning');
    }
    if (this.tornadoWarningPill) {
      this.tornadoWarningPill.classList.remove('hidden');
      const distEl = this.tornadoWarningPill.querySelector('.tornado-dist-text');
      const alertEl = this.tornadoWarningPill.querySelector('.tornado-alert-status');
      if (distEl) distEl.textContent = `${distanceM}m`;
      if (alertEl) {
        if (distanceM <= 15) {
          alertEl.textContent = 'SUCTION WARNING! BOOST!';
          this.tornadoWarningPill.classList.add('suction-danger');
        } else if (distanceM <= 25) {
          alertEl.textContent = 'TWISTER CLOSING IN';
          this.tornadoWarningPill.classList.remove('suction-danger');
        } else {
          alertEl.textContent = 'TWISTER PURSUING';
          this.tornadoWarningPill.classList.remove('suction-danger');
        }
      }
    }
  }

  hideTornadoWarning() {
    if (!this.tornadoWarningPill) {
      this.tornadoWarningPill = document.getElementById('tornado-proximity-warning');
    }
    if (this.tornadoWarningPill) {
      this.tornadoWarningPill.classList.add('hidden');
    }
  }

  updateNitroGauge(percent, isLockedOut = false) {
    const clamped = Math.max(0, Math.min(100, percent));
    if (this.nitroFill) {
      this.nitroFill.style.width = `${clamped}%`;
      this.nitroFill.classList.toggle('lockout', isLockedOut);
    }
    const nitroLabel = document.querySelector('.nitro-label');
    const nitroHint = document.querySelector('.nitro-hint');
    if (nitroLabel) {
      if (isLockedOut) {
        nitroLabel.textContent = `RECHARGING (${percent}%)`;
        nitroLabel.classList.add('lockout');
        if (nitroHint) nitroHint.style.display = 'none';
      } else {
        nitroLabel.textContent = 'NITRO BOOST';
        nitroLabel.classList.remove('lockout');
        if (nitroHint) nitroHint.style.display = '';
      }
    }

    // Depict nitro progress directly on the mobile touch button
    const touchMeter = document.getElementById('touch-nitro-meter');
    if (touchMeter) {
      touchMeter.style.width = `${clamped}%`;
    }

    const touchBoost = document.getElementById('btn-touch-boost');
    if (touchBoost) {
      touchBoost.classList.toggle('lockout', isLockedOut);
      const span = document.getElementById('label-touch-nitro') || touchBoost.querySelector('span');
      if (span) {
        span.textContent = isLockedOut ? `${percent}%` : 'NITRO';
      }
    }
  }

  _bindMenuVolumeControls() {
    const btnMenuMute = document.getElementById('btn-menu-mute');
    const audioPopover = document.getElementById('carousel-audio-popover');
    const sliderMaster = document.getElementById('slider-master-volume');
    const sliderMusic = document.getElementById('slider-music-volume');
    const sliderSfx = document.getElementById('slider-sfx-volume');
    const valMaster = document.getElementById('val-master-volume');
    const valMusic = document.getElementById('val-music-volume');
    const valSfx = document.getElementById('val-sfx-volume');
    const menuVolText = document.getElementById('menu-vol-btn-text');
    const iconHigh = document.getElementById('menu-vol-icon-high');
    const iconMuted = document.getElementById('menu-vol-icon-muted');
    const btnPopoverMute = document.getElementById('btn-popover-mute');

    // Stop touch/pointer events from bubbling to carousel swipe
    const stopPropagation = (e) => {
      e.stopPropagation();
    };
    [audioPopover, btnMenuMute].forEach(el => {
      if (!el) return;
      ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup'].forEach(evt => {
        el.addEventListener(evt, stopPropagation, { passive: true });
      });
    });

    this._updateMenuAudioUI = () => {
      const audio = this.app.audio;
      const masterPct = Math.round((Number.isFinite(audio?.masterVolume) ? audio.masterVolume : 0.85) * 100);
      const musicPct = Math.round((Number.isFinite(audio?.musicVolume) ? audio.musicVolume : 0.75) * 100);
      const sfxPct = Math.round((Number.isFinite(audio?.sfxVolume) ? audio.sfxVolume : 0.70) * 100);
      const isMuted = audio ? audio.isMuted : false;

      if (sliderMaster) sliderMaster.value = masterPct;
      if (sliderMusic) sliderMusic.value = musicPct;
      if (sliderSfx) sliderSfx.value = sfxPct;

      if (valMaster) valMaster.textContent = `${masterPct}%`;
      if (valMusic) valMusic.textContent = `${musicPct}%`;
      if (valSfx) valSfx.textContent = `${sfxPct}%`;

      if (menuVolText) {
        menuVolText.textContent = isMuted ? 'MUTED' : `${masterPct}%`;
      }

      if (iconHigh && iconMuted) {
        if (isMuted) {
          iconHigh.classList.add('hidden');
          iconMuted.classList.remove('hidden');
          btnMenuMute?.classList.add('is-muted');
          if (btnPopoverMute) {
            btnPopoverMute.textContent = 'UNMUTE';
            btnPopoverMute.classList.add('active');
          }
        } else {
          iconHigh.classList.remove('hidden');
          iconMuted.classList.add('hidden');
          btnMenuMute?.classList.remove('is-muted');
          if (btnPopoverMute) {
            btnPopoverMute.textContent = 'MUTE';
            btnPopoverMute.classList.remove('active');
          }
        }
      }
    };

    // Toggle popover on button click
    if (btnMenuMute) {
      btnMenuMute.addEventListener('click', (e) => {
        e.stopPropagation();
        this.app.audio?.init();
        audioPopover?.classList.toggle('hidden');
        btnMenuMute.classList.toggle('active', !audioPopover?.classList.contains('hidden'));
        this._updateMenuAudioUI();
      });
    }

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
      if (audioPopover && !audioPopover.classList.contains('hidden')) {
        if (!audioPopover.contains(e.target) && !btnMenuMute?.contains(e.target)) {
          audioPopover.classList.add('hidden');
          btnMenuMute?.classList.remove('active');
        }
      }
    });

    // Mute toggle inside popover
    if (btnPopoverMute) {
      btnPopoverMute.addEventListener('click', (e) => {
        e.stopPropagation();
        this.app.audio?.init();
        this.app.audio?.toggleMute();
        this._updateMenuAudioUI();
      });
    }

    // Generic slider binder with full mobile touch, pointer, and input support
    const bindSlider = (slider, setter, type) => {
      if (!slider) return;
      const onMove = (e) => {
        this.app.audio?.init();
        const raw = parseInt(e.target.value, 10);
        const val = Number.isFinite(raw) ? raw : (type === 'master' ? 85 : (type === 'music' ? 75 : 70));
        setter(val / 100);
        if (type === 'master' && this.app.audio?.isMuted && val > 0) {
          this.app.audio?.setMuted(false);
        }
        this._updateMenuAudioUI();
      };

      slider.addEventListener('input', onMove);
      slider.addEventListener('change', (e) => {
        onMove(e);
        this.app.audio?.playCalibrationBlip(type);
      });
      slider.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.app.audio?.init();
      });
      slider.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.app.audio?.init();
      }, { passive: true });
    };

    bindSlider(sliderMaster, (v) => this.app.audio?.setMasterVolume(v), 'master');
    bindSlider(sliderMusic, (v) => this.app.audio?.setMusicVolume(v), 'music');
    bindSlider(sliderSfx, (v) => this.app.audio?.setSfxVolume(v), 'sfx');

    // Initialize UI values
    this._updateMenuAudioUI();
  }

  showWelcomeModal() {
    if (this.welcomeModal) this.welcomeModal.classList.remove('hidden');
    document.getElementById('hud-layer')?.classList.add('hidden');
    document.getElementById('mobile-controls')?.classList.add('hidden');
    document.getElementById('banner-notification')?.classList.remove('visible');
    this._updateMenuAudioUI?.();
  }

  hideWelcomeModal() {
    if (this.welcomeModal) this.welcomeModal.classList.add('hidden');
    document.getElementById('hud-layer')?.classList.remove('hidden');
    document.getElementById('mobile-controls')?.classList.remove('hidden');
    document.getElementById('carousel-audio-popover')?.classList.add('hidden');
    document.getElementById('btn-menu-mute')?.classList.remove('active');
  }

  toggleWelcomeModal() {
    if (this.welcomeModal) {
      if (this.welcomeModal.classList.contains('hidden')) {
        this.showWelcomeModal();
      } else {
        this.hideWelcomeModal();
      }
    }
  }

  toggleAtmosphereDrawer(force) {
    if (!this.atmosphereBox) return;
    if (typeof force === 'boolean') {
      this.atmosphereBox.classList.toggle('mobile-open', force);
    } else {
      this.atmosphereBox.classList.toggle('mobile-open');
    }
  }

  updateSpeedometer(speedKmh, isReversing) {
    if (this.speedEl) {
      this.speedEl.textContent = speedKmh;
    }
  }

  setAutopilotStatus(isActive) {
    if (this.autopilotPill) {
      if (isActive) {
        this.autopilotPill.textContent = "AUTOPILOT ENGAGED";
        this.autopilotPill.classList.add('active');
      } else {
        this.autopilotPill.textContent = "MANUAL DRIVING";
        this.autopilotPill.classList.remove('active');
      }
    }

    const btnAutoDrive = document.getElementById('btn-touch-auto-drive');
    if (btnAutoDrive) {
      btnAutoDrive.classList.toggle('active', !!isActive);
    }
  }

  updateTimeLabel(hourDecimal) {
    if (!this.timeDisplay) return;
    const hour = Math.floor(hourDecimal);
    const min = Math.floor((hourDecimal - hour) * 60);
    const minStr = min < 10 ? `0${min}` : `${min}`;

    let phase = "Daylight";
    if (hourDecimal >= 5 && hourDecimal < 8) phase = "Dawn";
    else if (hourDecimal >= 8 && hourDecimal < 17) phase = "Midday Sun";
    else if (hourDecimal >= 17 && hourDecimal < 19.5) phase = "Golden Hour";
    else if (hourDecimal >= 19.5 && hourDecimal < 21) phase = "Twilight";
    else phase = "Starry Night";

    this.timeDisplay.textContent = `${phase} (${hour}:${minStr})`;
  }

  showBanner(title, subtitle, durationMs = 3500) {
    if (!this.banner) return;
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);

    this.bannerTitle.textContent = title;
    this.bannerSubtitle.textContent = subtitle;
    this.banner.classList.add('visible');

    this.bannerTimeout = setTimeout(() => {
      this.banner.classList.remove('visible');
    }, durationMs);
  }

  selectPlanet(planetType) {
    const planetCards = document.querySelectorAll('.planet-card');
    planetCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-planet') === planetType);
    });

    const orbitPaths = document.querySelectorAll('.orbit-path');
    orbitPaths.forEach(o => {
      o.classList.toggle('active', o.getAttribute('data-planet') === planetType);
    });

    // Update dynamic leader line to docket if available
    const leaderLine = document.getElementById('orbit-leader-line');
    if (leaderLine) {
      const PLANET_COORDS = {
        "Cinderfell": [230, 325],
        "Aetheria":   [390, 135],
        "Oakhaven":   [641, 162],
        "Rustvale":   [430, 360],
        "Stormhaven": [180, 162],
        "Ringhaven":  [280, 429],
        "Frostveil":  [620, 452],
        "Thalassa":   [740, 429],
        "Nocturna":   [880, 394]
      };
      const coords = PLANET_COORDS[planetType] || [641, 162];
      leaderLine.setAttribute('points', `${coords[0]},${coords[1]} ${Math.round((coords[0]+720)/2)},170 720,170`);
    }

    this.app.switchPlanet(planetType);
    this.updateDestinationRibbon(planetType);
  }

  updateDestinationRibbon(planetType) {
    const destEl = document.getElementById('ribbon-dest-text');
    const vehEl = document.getElementById('ribbon-veh-text');
    const heroIconSvg = document.getElementById('planet-hero-icon-svg');
    const heroName = document.getElementById('planet-hero-name');
    const heroTag = document.getElementById('planet-hero-tag');
    const heroVeh = document.getElementById('planet-hero-vehicle');
    const heroFeat = document.getElementById('planet-hero-feature');
    const heroDesc = document.getElementById('planet-hero-desc');
    const specTerrain = document.getElementById('spec-terrain');
    const specAtmo = document.getElementById('spec-atmosphere');
    const previewImg = document.getElementById('planet-preview-img');

    const PLANET_DATA = {
      "Cinderfell": {
        label: "Cinderfell (Mercury)",
        veh: "MagmaCrawler 8x8",
        name: "Cinderfell",
        tag: "Volcanic Calderas",
        feature: "Basalt Calderas",
        terrain: "Basalt Calderas & Lava Fissures",
        atmosphere: "Scorched Ash & Magma Glow",
        desc: "Scorched volcanic badlands with basalt calderas and glowing magma fissures. Deploying heavy 8x8 MagmaCrawler with heat-resistant tread articulation."
      },
      "Aetheria": {
        label: "Aetheria (Venus)",
        veh: "HazmatStrider ATV",
        name: "Aetheria",
        tag: "Sulfuric Glasslands",
        feature: "Sulfuric Mist",
        terrain: "Sulfuric Dunes & Glasslands",
        atmosphere: "Dense Acid Mist & Vapors",
        desc: "Dense sulfuric glasslands and rolling acid dunes. Deploying pressurized HazmatStrider ATV with sealed hazard dome."
      },
      "Oakhaven": {
        label: "Oakhaven (Earth)",
        veh: "TrailScout 4x4 Rig",
        name: "Oakhaven",
        tag: "Alpine Wilderness",
        feature: "Cumulus Clouds",
        terrain: "Alpine Forests & Cascades",
        atmosphere: "Whispering Pines & Cumulus Clouds",
        desc: "Lush alpine diorama with towering pine forests, rustic wooden bridges, cascading waterfalls, and authentic cumulus clouds."
      },
      "Rustvale": {
        label: "Rustvale (Mars)",
        veh: "CrimsonNomad Rover",
        name: "Rustvale",
        tag: "Crimson Canyons",
        feature: "Crimson Canyons",
        terrain: "Crimson Canyons & Iron Dunes",
        atmosphere: "Oxide Dust & Research Domes",
        desc: "Crimson oxide canyons, iron plateaus, and geodesic research domes navigated by the high-speed desert CrimsonNomad."
      },
      "Stormhaven": {
        label: "Stormhaven (Jupiter)",
        veh: "IonSpeeder Aero-Skimmer",
        name: "Stormhaven",
        tag: "Tempestuous Gas Giant",
        feature: "Ion Storms",
        terrain: "Tempestuous Gas Giant Ridge",
        atmosphere: "Lightning Pylons & Ion Bands",
        desc: "Tempestuous gas giant ridge with lightning discharge pylons and ion relay stations, patrolled by the high-velocity IonSpeeder."
      },
      "Ringhaven": {
        label: "Ringhaven (Saturn)",
        veh: "SolarSkimmer Ring Cruiser",
        name: "Ringhaven",
        tag: "Golden Orbital Rings",
        feature: "Golden 3D Rings",
        terrain: "Luminous Orbital Plains",
        atmosphere: "Magnificent Golden 3D Rings",
        desc: "Luminous orbital plains beneath magnificent golden 3D planetary rings, skimmed by the solar-winged SolarSkimmer."
      },
      "Frostveil": {
        label: "Frostveil (Uranus)",
        veh: "CryoTrac Half-Track",
        name: "Frostveil",
        tag: "Azure Methane Glaciers",
        feature: "82° Tilted Rings",
        terrain: "Azure Methane Glaciers",
        atmosphere: "Cryo Crags & 82° Tilted Rings",
        desc: "Deep azure methane glaciers encircled by steep 82° tilted rings, navigated by the CryoTrac half-track."
      },
      "Thalassa": {
        label: "Thalassa (Neptune)",
        veh: "HydroRover Amphibian",
        name: "Thalassa",
        tag: "Cobalt Abyssal Ocean",
        feature: "Abyssal Seas",
        terrain: "Deep Cobalt Ocean Waters",
        atmosphere: "Abyssal Mist & Monolith Beacons",
        desc: "Abyssal cobalt oceans with monolith sonic beacons, navigated by the amphibious HydroRover."
      },
      "Nocturna": {
        label: "Nocturna (Pluto)",
        veh: "VoidSled Ion Glider",
        name: "Nocturna",
        tag: "Frozen Nitrogen Peaks",
        feature: "Nitrogen Spikes",
        terrain: "Frozen Nitrogen Peaks & Chasms",
        atmosphere: "Starry Void & Cosmic Dark Matter",
        desc: "Frozen nitrogen peaks and cosmic dark matter spires on the frontier of the void, crossed by the VoidSled."
      }
    };
    const REAL_CELESTIAL_NAMES = {
      "Cinderfell": "Mercury",
      "Aetheria": "Venus",
      "Oakhaven": "Earth",
      "Rustvale": "Mars",
      "Stormhaven": "Jupiter",
      "Ringhaven": "Saturn",
      "Frostveil": "Uranus",
      "Thalassa": "Neptune",
      "Nocturna": "Pluto"
    };
    const realName = REAL_CELESTIAL_NAMES[planetType] || "Earth";
    const data = PLANET_DATA[planetType] || PLANET_DATA["Oakhaven"];
    if (destEl) destEl.textContent = data.label;
    if (vehEl) vehEl.textContent = data.veh;
    if (heroIconSvg && ICONS.planets[planetType]) heroIconSvg.innerHTML = ICONS.planets[planetType];
    if (heroName) {
      heroName.innerHTML = `${data.name.toUpperCase()} <span class="planet-hero-real" id="planet-hero-real">(${realName})</span>`;
    }
    if (heroTag) heroTag.textContent = data.tag;
    if (heroVeh) heroVeh.textContent = data.veh;
    if (heroFeat) heroFeat.textContent = data.feature;
    if (heroDesc) heroDesc.textContent = data.desc;
    if (specTerrain) specTerrain.textContent = data.terrain;
    if (specAtmo) specAtmo.textContent = data.atmosphere;

    // Update Live Scenic Map Preview Image
    if (previewImg) {
      const imgKey = planetType.toLowerCase();
      previewImg.src = `assets/previews/map_${imgKey}.jpg`;
      previewImg.alt = `Scenic preview of planet ${data.name}`;
    }
  }

  updatePlanetLabel(planetName) {
    const DESCS = {
      "Cinderfell": "Planet Cinderfell • Basalt Calderas & Magma Seams",
      "Aetheria": "Planet Aetheria • Sulfuric Glasslands & Acid Dunes",
      "Oakhaven": "Planet Oakhaven • Alpine Miniature Diorama & Whispering Pines",
      "Rustvale": "Planet Rustvale • Crimson Canyons & Iron Dunes",
      "Stormhaven": "Planet Stormhaven • Tempestuous Gas Peaks & Ion Pylons",
      "Ringhaven": "Planet Ringhaven • Golden Ringed Horizon & Solar Skimmers",
      "Frostveil": "Planet Frostveil • Azure Methane Glaciers & Tilted Rings",
      "Thalassa": "Planet Thalassa • Deep Cobalt Ocean & Abyssal Monoliths",
      "Nocturna": "Planet Nocturna • Frozen Nitrogen Spikes & Starry Void"
    };
    if (this.planetStatusLabel) {
      this.planetStatusLabel.textContent = DESCS[planetName] || `Planet ${planetName}`;
    }
  }

  _initVectorIcons() {
    const cosySvg = document.getElementById('icon-mode-cosy');
    const cascadeSvg = document.getElementById('icon-mode-cascade');
    const tornadoSvg = document.getElementById('icon-mode-tornado');

    if (cosySvg) cosySvg.innerHTML = ICONS.modes.cosy;
    if (cascadeSvg) cascadeSvg.innerHTML = ICONS.modes.cascade;
    if (tornadoSvg) tornadoSvg.innerHTML = ICONS.modes.tornado;

    PLANET_KEYS.forEach(p => {
      const orb = document.getElementById(`orb-${p}`);
      const pill = document.getElementById(`pill-${p}`);
      if (orb && ICONS.planets[p]) {
        orb.innerHTML = ICONS.planets[p];
      } else if (pill && ICONS.planets[p]) {
        pill.innerHTML = ICONS.planets[p];
      }
    });

    this.updateDestinationRibbon("Oakhaven");
  }

  updateOdometer(distKm, totalKm, regionName) {
    const regEl = document.getElementById('region-badge');
    const odoEl = document.getElementById('odometer-badge');
    if (regEl && regionName) {
      regEl.textContent = regionName.toUpperCase();
    }
    if (odoEl) {
      odoEl.textContent = `ODOMETER: ${distKm.toFixed(2)} KM / ${totalKm.toFixed(2)} KM`;
    }
  }

  _bindSettingsControls() {
    const qHigh = document.getElementById('btn-quality-high');
    const qLow = document.getElementById('btn-quality-low');
    const motionToggle = document.getElementById('btn-motion-toggle');
    const cbToggle = document.getElementById('btn-colorblind-toggle');
    const tiltToggle = document.getElementById('btn-tilt-toggle');
    const iosRow = document.getElementById('ios-permission-row');
    const btnIos = document.getElementById('btn-request-ios-motion');
    const btnResetKeys = document.getElementById('btn-reset-keys');

    if (qHigh) {
      qHigh.addEventListener('click', () => {
        settings.set('graphicsQuality', 'high');
        this._updateSettingsUI();
        this.showBanner('GRAPHICS SETTING', 'High Quality (Retina + Full Shadows)');
      });
    }
    if (qLow) {
      qLow.addEventListener('click', () => {
        settings.set('graphicsQuality', 'low');
        this._updateSettingsUI();
        this.showBanner('GRAPHICS SETTING', 'Performance Mode (1x DPR, Low Power)');
      });
    }

    if (motionToggle) {
      motionToggle.addEventListener('click', () => {
        const next = !settings.get('reducedMotion');
        settings.set('reducedMotion', next);
        this._updateSettingsUI();
        this.showBanner('REDUCED MOTION', next ? 'Enabled (No Camera Shakes)' : 'Disabled');
      });
    }

    if (cbToggle) {
      cbToggle.addEventListener('click', () => {
        const next = !settings.get('colorblindMode');
        settings.set('colorblindMode', next);
        this._updateSettingsUI();
        this.showBanner('COLORBLIND HAZARDS', next ? 'Enabled (High-Contrast Markers)' : 'Disabled');
      });
    }

    if (tiltToggle) {
      tiltToggle.addEventListener('click', async () => {
        const current = settings.get('tiltSteering');
        if (!current) {
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            if (iosRow) iosRow.style.display = 'block';
            const res = await settings.requestMotionPermission();
            if (res.granted) {
              if (iosRow) iosRow.style.display = 'none';
              this.showBanner('TILT STEERING', 'Motion steering active. Tilt device to steer.');
            }
          } else {
            settings.set('tiltSteering', true);
            this.showBanner('TILT STEERING', 'Motion steering active. Tilt device to steer.');
          }
        } else {
          settings.set('tiltSteering', false);
          if (iosRow) iosRow.style.display = 'none';
          this.showBanner('TILT STEERING', 'Disabled (Touch / Keyboard steering restored)');
        }
        this._updateSettingsUI();
      });
    }

    const tiltInvertToggle = document.getElementById('btn-tilt-invert-toggle');
    if (tiltInvertToggle) {
      tiltInvertToggle.addEventListener('click', () => {
        const next = !settings.get('invertTiltSteering');
        settings.set('invertTiltSteering', next);
        this._updateSettingsUI();
        this.showBanner('TILT STEERING', next ? 'Inverted Direction Enabled' : 'Standard Direction Restored');
      });
    }

    if (btnIos) {
      btnIos.addEventListener('click', async () => {
        const res = await settings.requestMotionPermission();
        if (res.granted) {
          if (iosRow) iosRow.style.display = 'none';
          this.showBanner('PERMISSION GRANTED', 'iOS motion sensor enabled.');
        } else {
          this.showBanner('PERMISSION DENIED', res.error || 'Permission denied.');
        }
        this._updateSettingsUI();
      });
    }

    if (btnResetKeys) {
      btnResetKeys.addEventListener('click', () => {
        settings.resetKeys();
        this._updateSettingsUI();
        this.showBanner('CONTROLS RESET', 'Keyboard controls restored to defaults.');
      });
    }

    const rebindItems = document.querySelectorAll('.rebind-item');
    rebindItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        rebindItems.forEach(i => i.classList.remove('listening'));
        item.classList.add('listening');
        const keySpan = item.querySelector('.rebind-key');
        if (keySpan) keySpan.textContent = 'PRESS KEY...';

        const onKey = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.removeEventListener('keydown', onKey, true);
          item.classList.remove('listening');
          settings.setKeyBinding(action, e.code);
          this._updateSettingsUI();
          this.showBanner('CONTROL BOUND', `${action.toUpperCase()} -> ${e.code}`);
        };
        window.addEventListener('keydown', onKey, { once: true, capture: true });
      });
    });

    this._updateSettingsUI();
  }

  _updateSettingsUI() {
    const q = settings.get('graphicsQuality') || 'high';
    const qHigh = document.getElementById('btn-quality-high');
    const qLow = document.getElementById('btn-quality-low');
    if (qHigh && qLow) {
      qHigh.classList.toggle('active', q === 'high');
      qLow.classList.toggle('active', q === 'low');
    }

    const motion = settings.get('reducedMotion');
    const motionBtn = document.getElementById('btn-motion-toggle');
    if (motionBtn) {
      motionBtn.classList.toggle('active', Boolean(motion));
      motionBtn.textContent = motion ? 'ON' : 'OFF';
      motionBtn.setAttribute('aria-pressed', motion ? 'true' : 'false');
    }

    const cb = settings.get('colorblindMode');
    const cbBtn = document.getElementById('btn-colorblind-toggle');
    if (cbBtn) {
      cbBtn.classList.toggle('active', Boolean(cb));
      cbBtn.textContent = cb ? 'ON' : 'OFF';
      cbBtn.setAttribute('aria-pressed', cb ? 'true' : 'false');
    }

    const tilt = settings.get('tiltSteering');
    const tiltBtn = document.getElementById('btn-tilt-toggle');
    if (tiltBtn) {
      tiltBtn.classList.toggle('active', Boolean(tilt));
      tiltBtn.textContent = tilt ? 'ON' : 'OFF';
      tiltBtn.setAttribute('aria-pressed', tilt ? 'true' : 'false');
    }

    const tiltInvert = settings.get('invertTiltSteering');
    const tiltInvertBtn = document.getElementById('btn-tilt-invert-toggle');
    if (tiltInvertBtn) {
      tiltInvertBtn.classList.toggle('active', Boolean(tiltInvert));
      tiltInvertBtn.textContent = tiltInvert ? 'ON' : 'OFF';
      tiltInvertBtn.setAttribute('aria-pressed', tiltInvert ? 'true' : 'false');
    }

    const bindings = settings.get('keyBindings') || {};
    const keyLabels = {
      forward: bindings.forward || 'KeyW',
      backward: bindings.backward || 'KeyS',
      left: bindings.left || 'KeyA',
      right: bindings.right || 'KeyD',
      boost: bindings.boost || 'Space',
      camera: bindings.camera || 'KeyC',
      autopilot: bindings.autopilot || 'KeyP',
      horn: bindings.horn || 'KeyH'
    };
    for (const [action, code] of Object.entries(keyLabels)) {
      const el = document.getElementById(`key-bind-${action}`);
      if (el) {
        el.textContent = code.replace('Key', '').replace('Arrow', '');
      }
    }
  }

  toggleSettingsModal() {
    if (!this.settingsModal) return;
    const isHidden = this.settingsModal.classList.toggle('hidden');
    if (!isHidden) {
      this._updateSettingsUI();
    }
  }
}
