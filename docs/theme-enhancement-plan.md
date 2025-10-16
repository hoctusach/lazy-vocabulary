# Theme Enhancement Rollout Plan

## Objectives
- Polish the refreshed Mint Breeze, Morning Glow, Ocean Depth, Sakura Dream, and Cyber Night themes across light and dark modes.
- Ensure supporting components (background canvas, surface cards, button set, and form fields) adopt theme tokens without regressions.
- Provide a structured QA and release checklist so the design refinements ship confidently.

## Phase 1 – Visual QA Sweep
1. **Layout Smoke Test**
   - Open the dashboard, lesson view, and review queue in each theme (light and dark).
   - Capture screenshots for regression comparison, focusing on page background gradients and card contrast.
2. **Typography & Legibility**
   - Validate heading, body, and helper text colors against AA contrast guidelines using the new palette values.
   - Confirm inline links and accent text remain legible over the updated card tones.
3. **Iconography and Illustrations**
   - Audit themed emoji buttons and SVG icons to ensure they feel balanced with the new gradients.

## Phase 2 – Component Hardening
1. **Buttons**
   - Align hover/pressed states with the refreshed `--lv-accent-soft` tokens.
   - Ensure focus rings adopt the new ring color per theme for both keyboard and pointer interactions.
2. **Form Inputs**
   - Update any hard-coded field backgrounds to reference `--lv-field-bg` and `--lv-field-border`.
   - Verify placeholder and helper text pull from `--lv-helper-text` in every mode.
3. **Card Surfaces**
   - Revisit secondary cards (e.g., progress stats, celebration badges) to consume the new tone tokens for subtle elevation.

## Phase 3 – Accessibility & Performance
1. **Dark Mode Review**
   - Test in a low-light environment to ensure glare is reduced, especially for Cyber Night and Ocean Depth.
   - Confirm modal overlays use the stronger opacity levels introduced in the redesign.
2. **Motion & Performance**
   - Measure paint timings with the gradients to verify no noticeable jank on low-end devices.
   - Consider adding `prefers-reduced-motion` guards to heavy shimmer effects if necessary.

## Phase 4 – Release Checklist
- [ ] Finish component styling updates referenced above.
- [ ] Run automated visual regression tests or Storybook snapshots across both color modes.
- [ ] Publish updated design tokens to the internal design system documentation.
- [ ] Communicate rollout notes to the QA and product teams.

Document owner: Frontend platform team
