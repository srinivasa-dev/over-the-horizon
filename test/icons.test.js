import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/js/icons.js';

describe('UI Icon Graphics Library', () => {
  test('Mode vector icons are defined with valid SVG markup', () => {
    const requiredModes = ['cosy', 'cascade', 'tornado'];
    for (const mode of requiredModes) {
      assert.ok(ICONS.modes[mode], `Missing mode icon: ${mode}`);
      assert.ok(ICONS.modes[mode].includes('<svg'), `Mode ${mode} should contain <svg tag`);
      assert.ok(ICONS.modes[mode].includes('</svg>'), `Mode ${mode} should contain </svg> closing tag`);
    }
  });

  test('All 9 planet orb vector icons are defined with valid SVG markup', () => {
    const requiredPlanets = [
      'Cinderfell',
      'Aetheria',
      'Oakhaven',
      'Rustvale',
      'Stormhaven',
      'Ringhaven',
      'Frostveil',
      'Thalassa',
      'Nocturna'
    ];
    for (const planet of requiredPlanets) {
      assert.ok(ICONS.planets[planet], `Missing planet icon: ${planet}`);
      assert.ok(ICONS.planets[planet].includes('<svg'), `Planet ${planet} should contain <svg tag`);
      assert.ok(ICONS.planets[planet].includes('</svg>'), `Planet ${planet} should contain </svg> closing tag`);
    }
  });

  test('UI action icons are defined with valid SVG markup', () => {
    const requiredUI = ['play', 'chevronLeft', 'chevronRight', 'manual', 'vehicle', 'heart', 'alert', 'sun', 'rain'];
    for (const name of requiredUI) {
      assert.ok(ICONS.ui[name], `Missing UI icon: ${name}`);
      assert.ok(ICONS.ui[name].includes('<svg'), `UI icon ${name} should contain <svg tag`);
      assert.ok(ICONS.ui[name].includes('</svg>'), `UI icon ${name} should contain </svg> closing tag`);
    }
  });
});
