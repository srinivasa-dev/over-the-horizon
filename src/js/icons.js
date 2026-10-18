// =================================================================
// OVER THE HORIZON: Low-Poly SVG Vector Asset Library
// Bespoke vector emblems matching 3D in-game low-poly geometry
// Zero Emojis Used
// =================================================================

export const ICONS = {
  // ---------------------------------------------------------------
  // Game Mode Vectors
  // ---------------------------------------------------------------
  modes: {
    cosy: `
      <svg viewBox="0 0 28 28" class="svg-icon mode-svg" fill="none">
        <circle cx="21" cy="7" r="3.5" fill="#FBBF24" />
        <polygon points="14,6 23,21 5,21" fill="#22C55E" opacity="0.9" />
        <polygon points="14,6 18,21 5,21" fill="#16A34A" />
        <polygon points="8,12 15,21 1,21" fill="#15803D" opacity="0.95" />
        <polygon points="14,6 16,11 12,11" fill="#FFFFFF" opacity="0.9" />
      </svg>
    `,
    cascade: `
      <svg viewBox="0 0 28 28" class="svg-icon mode-svg" fill="none">
        <ellipse cx="14" cy="14" rx="12" ry="4.5" transform="rotate(-28 14 14)" stroke="#FBBF24" stroke-width="1.8" />
        <ellipse cx="14" cy="14" rx="12" ry="4.5" transform="rotate(45 14 14)" stroke="#67E8F9" stroke-width="1.5" opacity="0.75" />
        <circle cx="14" cy="14" r="4.5" fill="#38BDF8" stroke="#0284C7" stroke-width="1.2" />
        <polygon points="14,2 16,10 24,14 16,18 14,26 12,18 4,14 12,10" fill="#FDE047" opacity="0.65" />
      </svg>
    `,
    crossy: `
      <svg viewBox="0 0 28 28" class="svg-icon mode-svg" fill="none">
        <rect x="3" y="4" width="22" height="20" rx="4" fill="#334155" stroke="#475569" stroke-width="1.4" />
        <line x1="14" y1="4" x2="14" y2="24" stroke="#FBBF24" stroke-width="2" stroke-dasharray="3 2" />
        <circle cx="8" cy="14" r="3.5" fill="#EF4444" stroke="#DC2626" stroke-width="1" />
        <circle cx="20" cy="10" r="3" fill="#64748B" stroke="#94A3B8" stroke-width="1" />
        <line x1="4" y1="14" x2="24" y2="14" stroke="#E2E8F0" stroke-width="1.2" opacity="0.5" />
      </svg>
    `
  },

  // ---------------------------------------------------------------
  // 9 Solar System Worlds (True 3D Low-Poly Planetary Orbs)
  // ---------------------------------------------------------------
  planets: {
    Cinderfell: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-cinderfell" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#F97316"/>
            <stop offset="60%" stop-color="#C2410C"/>
            <stop offset="100%" stop-color="#431407"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-cinderfell)" stroke="#EA580C" stroke-width="1.2"/>
        <polygon points="12,10 15,13 11,15" fill="#FEF08A" opacity="0.9"/>
        <polygon points="18,17 22,19 19,22" fill="#FDE047" opacity="0.85"/>
        <path d="M9 18L13 17L16 21L14 24" stroke="#FBBF24" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="19" cy="11" r="2.5" fill="#7C2D12" stroke="#EA580C" stroke-width="0.8"/>
      </svg>
    `,
    Aetheria: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-aetheria" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FDE047"/>
            <stop offset="55%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#78350F"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-aetheria)" stroke="#F59E0B" stroke-width="1.2"/>
        <path d="M5 12C10 9 22 10 27 12" stroke="#FEF08A" stroke-width="1.8" opacity="0.75" stroke-linecap="round"/>
        <path d="M4 17C11 15 21 17 28 16" stroke="#FEF9C3" stroke-width="2.0" opacity="0.85" stroke-linecap="round"/>
        <path d="M6 22C12 20 20 21 26 21" stroke="#FDE047" stroke-width="1.5" opacity="0.7" stroke-linecap="round"/>
      </svg>
    `,
    Oakhaven: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-oakhaven" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="65%" stop-color="#0284C7"/>
            <stop offset="100%" stop-color="#0C4A6E"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-oakhaven)" stroke="#0284C7" stroke-width="1.2"/>
        <polygon points="9,10 14,8 16,13 11,15" fill="#22C55E"/>
        <polygon points="17,14 24,12 25,18 20,20 16,16" fill="#16A34A"/>
        <polygon points="8,19 12,18 14,23 9,24" fill="#15803D"/>
        <ellipse cx="14" cy="9" rx="4.5" ry="1.5" fill="#FFFFFF" opacity="0.85"/>
        <ellipse cx="20" cy="21" rx="5" ry="1.8" fill="#FFFFFF" opacity="0.85"/>
      </svg>
    `,
    Rustvale: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-rustvale" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FB923C"/>
            <stop offset="60%" stop-color="#EA580C"/>
            <stop offset="100%" stop-color="#7C2D12"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-rustvale)" stroke="#C2410C" stroke-width="1.2"/>
        <path d="M7 16L13 15L17 17L25 15" stroke="#7C2D12" stroke-width="2.2" stroke-linecap="round"/>
        <polygon points="11,10 15,9 13,12" fill="#9A3412"/>
        <polygon points="17,19 22,18 20,22" fill="#9A3412"/>
        <ellipse cx="16" cy="4.5" rx="4.5" ry="1.5" fill="#F8FAFC"/>
      </svg>
    `,
    Stormhaven: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-stormhaven" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FCD34D"/>
            <stop offset="55%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#78350F"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-stormhaven)" stroke="#B45309" stroke-width="1.2"/>
        <path d="M4 11C10 9 22 9 28 11" stroke="#FEF3C7" stroke-width="1.8" opacity="0.85"/>
        <path d="M3 14C11 12 21 12 29 14" stroke="#92400E" stroke-width="2.2"/>
        <path d="M3 18C10 16 22 16 29 18" stroke="#FEF3C7" stroke-width="1.8" opacity="0.85"/>
        <path d="M4 21C11 20 21 20 28 21" stroke="#B45309" stroke-width="1.6"/>
        <ellipse cx="20" cy="18" rx="2.8" ry="1.8" fill="#DC2626" stroke="#EF4444" stroke-width="0.6"/>
      </svg>
    `,
    Ringhaven: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-ringhaven" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FEF08A"/>
            <stop offset="60%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#854D0E"/>
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="15" ry="4.5" transform="rotate(-22 16 16)" stroke="#FDE047" stroke-width="2.2" stroke-dasharray="28 28" opacity="0.55"/>
        <circle cx="16" cy="16" r="9.5" fill="url(#grad-ringhaven)" stroke="#CA8A04" stroke-width="1.2"/>
        <path d="M8 15C12 14 20 14 24 15" stroke="#FEF9C3" stroke-width="1.4" opacity="0.8"/>
        <ellipse cx="16" cy="16" rx="15" ry="4.5" transform="rotate(-22 16 16)" stroke="#FBBF24" stroke-width="2.2" stroke-dasharray="0 28 28 0"/>
      </svg>
    `,
    Frostveil: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-frostveil" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#67E8F9"/>
            <stop offset="60%" stop-color="#06B6D4"/>
            <stop offset="100%" stop-color="#164E63"/>
          </radialGradient>
        </defs>
        <ellipse cx="16" cy="16" rx="4.5" ry="15" transform="rotate(12 16 16)" stroke="#A5F3FC" stroke-width="2.0" opacity="0.45"/>
        <circle cx="16" cy="16" r="9.5" fill="url(#grad-frostveil)" stroke="#0891B2" stroke-width="1.2"/>
        <path d="M9 13C13 14 19 14 23 13" stroke="#CFFAFE" stroke-width="1.2" opacity="0.75"/>
        <ellipse cx="16" cy="16" rx="4.5" ry="15" transform="rotate(12 16 16)" stroke="#E0F2FE" stroke-width="2.0" stroke-dasharray="0 26 26 0"/>
      </svg>
    `,
    Thalassa: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-thalassa" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#60A5FA"/>
            <stop offset="60%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#1E3A8A"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-thalassa)" stroke="#1D4ED8" stroke-width="1.2"/>
        <path d="M4 11C11 9 21 10 28 11" stroke="#93C5FD" stroke-width="1.6" opacity="0.8"/>
        <path d="M5 16C12 15 20 15 27 16" stroke="#BFDBFE" stroke-width="2.0" opacity="0.9"/>
        <path d="M6 21C12 20 20 20 26 21" stroke="#60A5FA" stroke-width="1.5" opacity="0.7"/>
        <ellipse cx="10" cy="14" rx="2" ry="1.2" fill="#1E40AF" stroke="#60A5FA" stroke-width="0.5"/>
      </svg>
    `,
    Nocturna: `
      <svg viewBox="0 0 32 32" class="svg-icon planet-orb-svg" fill="none">
        <defs>
          <radialGradient id="grad-nocturna" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#A855F7"/>
            <stop offset="60%" stop-color="#6B21A8"/>
            <stop offset="100%" stop-color="#2E1065"/>
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="url(#grad-nocturna)" stroke="#7E22CE" stroke-width="1.2"/>
        <polygon points="10,9 14,8 13,13 9,12" fill="#C084FC" opacity="0.8"/>
        <polygon points="16,14 21,12 22,17 17,18" fill="#E9D5FF" opacity="0.85"/>
        <polygon points="9,18 13,17 12,22 8,21" fill="#DDD6FE" opacity="0.75"/>
        <polygon points="19,8 23,9 21,13 18,11" fill="#C084FC" opacity="0.7"/>
      </svg>
    `
  },

  // ---------------------------------------------------------------
  // UI & Action Vectors
  // ---------------------------------------------------------------
  ui: {
    play: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="16" height="16" fill="currentColor">
        <polygon points="7,4 20,12 7,20" />
      </svg>
    `,
    chevronLeft: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    `,
    chevronRight: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    `,
    manual: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    `,
    vehicle: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14l2-6h12l2 6" />
        <rect x="3" y="14" width="18" height="4" rx="1" />
        <circle cx="7" cy="18" r="2.2" fill="currentColor" />
        <circle cx="17" cy="18" r="2.2" fill="currentColor" />
      </svg>
    `,
    heart: `
      <svg viewBox="0 0 24 24" class="svg-icon heart-svg" width="18" height="18" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    `,
    alert: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="16" height="16" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12,2 22,20 2,20" fill="rgba(239,68,68,0.2)" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <circle cx="12" cy="17" r="1" fill="#EF4444" stroke="none" />
      </svg>
    `,
    sun: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="4" fill="#FBBF24" stroke="#F59E0B" />
        <line x1="12" y1="2" x2="12" y2="4" stroke="#FBBF24" />
        <line x1="12" y1="20" x2="12" y2="22" stroke="#FBBF24" />
        <line x1="2" y1="12" x2="4" y2="12" stroke="#FBBF24" />
        <line x1="20" y1="12" x2="22" y2="12" stroke="#FBBF24" />
      </svg>
    `,
    rain: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M19 14a4 4 0 0 0-4-4 6 6 0 0 0-11.3 1.8A4 4 0 0 0 5 18h14" stroke="#60A5FA" fill="rgba(96,165,250,0.15)" />
        <line x1="8" y1="19" x2="7" y2="22" stroke="#38BDF8" stroke-width="2" />
        <line x1="12" y1="19" x2="11" y2="22" stroke="#38BDF8" stroke-width="2" />
        <line x1="16" y1="19" x2="15" y2="22" stroke="#38BDF8" stroke-width="2" />
      </svg>
    `,
    snow: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="#93C5FD" stroke-width="1.8" stroke-linecap="round">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="3.3" y1="7" x2="20.7" y2="17" />
        <line x1="3.3" y1="17" x2="20.7" y2="7" />
        <polyline points="9,3.5 12,6 15,3.5" />
        <polyline points="9,20.5 12,18 15,20.5" />
        <polyline points="4.5,10 7.5,9.5 7.5,6.5" />
        <polyline points="19.5,14 16.5,14.5 16.5,17.5" />
        <polyline points="4.5,14 7.5,14.5 7.5,17.5" />
        <polyline points="19.5,10 16.5,9.5 16.5,6.5" />
      </svg>
    `,
    dust: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="14" height="14" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round">
        <path d="M4 8h12a3 3 0 0 0 0-6H14" />
        <path d="M2 13h17a2.5 2.5 0 0 1 0 5H17" />
        <path d="M6 18h10" />
      </svg>
    `,
    shield: `
      <svg viewBox="0 0 24 24" class="svg-icon shield-svg" width="18" height="18" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l8 4v6c0 5.5-3.8 10-8 11-4.2-1-8-5.5-8-11V6l8-4z" fill="rgba(56,189,248,0.25)"/>
        <path d="M12 6v12" stroke="#FAF6EE" stroke-width="1.5"/>
      </svg>
    `,
    waypoint: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="13" height="13" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" fill="rgba(245,158,11,0.2)"/>
        <circle cx="12" cy="9" r="2.5" fill="#FBBF24"/>
      </svg>
    `,
    nitroBolt: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="12" height="12" fill="#00f0ff">
        <polygon points="13,2 4,14 11,14 10,22 20,10 13,10"/>
      </svg>
    `,
    flag: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 22V3" stroke="#94A3B8" />
        <path d="M4 4h14l-2 5 2 5H4" fill="rgba(56,189,248,0.2)" stroke="#38BDF8" />
      </svg>
    `,
    trophy: `
      <svg viewBox="0 0 24 24" class="svg-icon" width="16" height="16" fill="none" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
        <path d="M18 9h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" />
        <path d="M4 3h16v6a8 8 0 0 1-16 0V3z" fill="rgba(251,191,36,0.2)" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    `
  }
};
