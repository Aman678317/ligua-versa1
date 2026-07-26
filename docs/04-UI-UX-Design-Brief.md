# LinguaVersa — UI/UX Design Brief
### Visual direction: Marvel Studios HUD Cinematic Command Center

## 1. Design philosophy
Holographic command center aesthetic (Marvel HUD style): dark depth, glowing line work, voice-amplitude reactive particles, 20px glass blur panels.

## 2. Color Palette
- Base Background: `#05060B` – `#0A0E1A` near-black navy
- Primary Accent: `#5B8CFF` → `#8B5CF6` gradient (electric blue to violet)
- Secondary Accent: `#00E5C7` (holographic teal)
- Glass Surfaces: 4-8% white opacity + 20px blur (`glass-hud`)

## 3. Canvas Components (`src/components/canvas/`)
- `HoloEarth.jsx`: 3D Holographic Earth with glowing connecting arcs.
- `VoiceParticles.jsx`: Voice-amplitude reactive particle field.
- `ChatBotOrb.jsx` / `AIBrain.jsx`: Holographic AI core with pulsing energy rings.

## 4. Accessibility Non-Negotiables
- Contrast ratio ≥ 4.5:1 for body and caption text.
- Minimum 16px font size for dual captions.
- High Contrast and Colorblind modes in `SettingsTab.jsx`.
- `prefers-reduced-motion` CSS compliance.
