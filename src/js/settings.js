/**
 * Over The Horizon - Game Settings & Accessibility Manager
 * 
 * Handles user preferences, graphics quality presets, reduced-motion accessibility,
 * colorblind hazard indicators, mobile tilt steering with iOS permission handling,
 * and persistent keyboard remapping.
 */

const DEFAULT_KEY_BINDINGS = Object.freeze({
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  boost: 'Space',
  camera: 'KeyC',
  autopilot: 'KeyP',
  horn: 'KeyH',
  recover: 'KeyR',
  menu: 'KeyM'
});

export class SettingsManager {
  constructor() {
    this.STORAGE_KEY = 'oth_settings_v1';
    this.listeners = new Set();

    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.defaults = Object.freeze({
      graphicsQuality: 'high', // 'high' | 'low'
      reducedMotion: Boolean(prefersReducedMotion),
      colorblindMode: false,
      tiltSteering: false,
      keyBindings: DEFAULT_KEY_BINDINGS
    });

    this.state = this._load();
  }

  _load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...this.defaults,
          ...parsed,
          keyBindings: {
            ...DEFAULT_KEY_BINDINGS,
            ...(parsed.keyBindings || {})
          }
        };
      }
    } catch (e) {
      // localStorage may fail in strict private browsing
    }
    return {
      ...this.defaults,
      keyBindings: { ...DEFAULT_KEY_BINDINGS }
    };
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // Graceful private browsing fallback
    }
    this._notify();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.save();
  }

  setKeyBinding(action, code) {
    if (!this.state.keyBindings) this.state.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    this.state.keyBindings[action] = code;
    this.save();
  }

  resetKeys() {
    this.state.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    this.save();
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Settings listener error:', err);
      }
    }
  }

  /**
   * Request iOS DeviceOrientation permission
   * Must be called directly inside a user gesture (e.g. click handler).
   */
  async requestMotionPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.set('tiltSteering', true);
          return { granted: true };
        } else {
          this.set('tiltSteering', false);
          return { granted: false, error: 'Permission denied by iOS user prompt.' };
        }
      } catch (err) {
        this.set('tiltSteering', false);
        return { granted: false, error: err.message || 'Permission request failed.' };
      }
    } else {
      // Non-iOS or standard mobile browser
      this.set('tiltSteering', true);
      return { granted: true };
    }
  }
}

export const settings = new SettingsManager();
