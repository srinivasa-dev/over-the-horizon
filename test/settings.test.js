import './setup.js';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsManager } from '../src/js/settings.js';

describe('Settings & Accessibility Manager', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test('SettingsManager initializes with defaults', () => {
    const mgr = new SettingsManager();

    assert.equal(mgr.get('graphicsQuality'), 'high');
    assert.equal(mgr.get('colorblindMode'), false);
    assert.equal(mgr.get('tiltSteering'), false);
    assert.ok(mgr.get('keyBindings'));
    assert.equal(mgr.get('keyBindings').forward, 'KeyW');
    assert.equal(mgr.get('keyBindings').backward, 'KeyS');
    assert.equal(mgr.get('keyBindings').boost, 'Space');
  });

  test('Mutating settings persists to localStorage', () => {
    const mgr = new SettingsManager();
    mgr.set('graphicsQuality', 'low');
    mgr.set('colorblindMode', true);

    assert.equal(mgr.get('graphicsQuality'), 'low');
    assert.equal(mgr.get('colorblindMode'), true);

    // Verify persistence across new manager instance
    const newMgr = new SettingsManager();
    assert.equal(newMgr.get('graphicsQuality'), 'low');
    assert.equal(newMgr.get('colorblindMode'), true);
  });

  test('Key remapping updates actions and resets cleanly', () => {
    const mgr = new SettingsManager();
    mgr.setKeyBinding('forward', 'ArrowUp');
    mgr.setKeyBinding('boost', 'ShiftLeft');

    assert.equal(mgr.get('keyBindings').forward, 'ArrowUp');
    assert.equal(mgr.get('keyBindings').boost, 'ShiftLeft');

    mgr.resetKeys();
    assert.equal(mgr.get('keyBindings').forward, 'KeyW');
    assert.equal(mgr.get('keyBindings').boost, 'Space');
  });

  test('Change listeners receive updates on setting changes', () => {
    const mgr = new SettingsManager();
    let notifiedState = null;

    const unsubscribe = mgr.onChange((state) => {
      notifiedState = state;
    });

    mgr.set('graphicsQuality', 'low');
    assert.ok(notifiedState);
    assert.equal(notifiedState.graphicsQuality, 'low');

    unsubscribe();
    notifiedState = null;
    mgr.set('graphicsQuality', 'high');
    assert.equal(notifiedState, null, 'Unsubscribed listener should not be notified');
  });
});
