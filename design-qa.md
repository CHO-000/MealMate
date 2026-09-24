# MealMate Option A — Design QA

## Visual source

- Desktop: `outputs/mealmate-option-a-minimal-clean.png`, `mealmate-option-a-planner.png`, `mealmate-option-a-log.png`, `mealmate-option-a-summary-settings.png`
- Responsive: `outputs/mealmate-option-a-responsive-dashboard.png`, `mealmate-option-a-responsive-planner.png`, `mealmate-option-a-responsive-log.png`, `mealmate-option-a-responsive-summary-settings.png`
- Source image sizes: desktop set 1487×1058 px; responsive set 1487×1058 or 1536×1024 px.

## Implementation evidence

- Local implementation: `http://localhost:3000/`
- Captures: `work/qa-captures/*-final.png` in the implementation task workspace.
- Logical viewports tested: desktop 1440×1024, tablet 834×1194, mobile 390×844; browser density approximately 1×.
- Screenshot bytes returned by the in-app browser excluded browser chrome and were 1425×1013 (desktop), 488×1055 (tablet capture), and 375×811 (mobile).
- State: guest/local mode. Three sample food logs were used to verify populated dashboard, log, and summary states.

## Comparison and findings

- Full-view comparison completed for Home, Planner, Food Log, and Summary/Settings against the Option A references.
- Desktop preserves the dark-green sidebar, warm off-white canvas, white cards, orange primary actions, information density, and two-column task flows from the selected direction.
- Mobile preserves the five-destination navigation, single-column task order, touch-sized controls, and content hierarchy.
- Tablet uses a compact sidebar and fluid single/two-column layouts without horizontal page overflow.
- Dynamic database/menu copy can differ from the static mock while layout, hierarchy, visual tokens, and interaction intent remain aligned.

### Resolved during QA

- P2: Summary cards could force horizontal overflow on narrow mobile widths — fixed with shrinkable grid/card constraints.
- P2: Floating AI control could collide with mobile bottom navigation — hidden on mobile; the in-page AI entry remains available.
- P2: Planner result state did not surface the submitted criteria — added a concise criteria strip above results.
- P2: Summary lacked a direct schedule overview — added a schedule preview linked to Settings.
- P3: Native date/time controls vary by device locale — added a Thai human-readable date display while retaining native input behavior.

## Functional verification

- Planner submission returns three menu cards; AI is the primary planner and the ranked local database is a clearly labelled fallback.
- Food log form and existing persisted entries render correctly.
- Summary metrics, five-food-group controls, monthly history, schedule preview, and Settings tab render correctly.
- Existing same-origin AI endpoints and server-side environment configuration were not replaced.
- `node --check` passed for `public/app.js` and `public/service-worker.js`.
- Browser console warning/error check returned no entries.
- Horizontal overflow check returned 0 px at desktop, tablet, and mobile widths.
- Reduced-motion behavior and keyboard-visible focus styles remain present.

## AI Planner + iOS containment iteration (2026-09-24)

### Source visual truth

- iOS report: `C:/Users/chinn/AppData/Local/Temp/codex-clipboard-07007a86-a65c-4368-a421-5fbbc695e5d4.png` (2732×2048 px). The visible issue is the intrinsic-width time controls extending beyond the Settings card boundary in landscape.
- Planner report: `C:/Users/chinn/AppData/Local/Temp/codex-clipboard-5c1bf1cb-d5f6-420f-b418-cbd04fb4e038.png` (1097×802 px). The requested intentional change is to remove the meal images and let AI create the menu set from the submitted criteria.

### Rendered implementation evidence

- Desktop planner: `work/qa-captures/ai-planner-desktop.png` (1165×810 px), logical viewport 1180×820, density approximately 1×.
- Mobile planner: `work/qa-captures/ai-planner-mobile.png` (375×811 px), logical viewport 390×844, density approximately 1×.
- Settings landscape: `work/qa-captures/settings-tablet-landscape.png` (1180×820 px), logical viewport 1180×820, density approximately 1×.
- Settings portrait: `work/qa-captures/settings-mobile.png` (375×811 px), logical viewport 390×844, density approximately 1×.
- Combined full-view evidence: `work/qa-comparisons/ai-planner-text-only-comparison.png` and `work/qa-comparisons/ios-settings-containment-comparison.png`. Browser chrome in the user iOS capture was excluded from fidelity judgement.
- Focused evidence: computed rectangles confirmed all three time inputs are fully inside the Settings card at 1180×820, 844×390, and 390×844; document overflow was 0 px. Planner result region contained 3 cards and 0 images.

### Findings and comparison history

- P2 resolved — iOS time-input overflow. Fix: every Settings grid/card/form/field is shrinkable; time inputs have explicit physical and logical width constraints plus a constrained WebKit date/time value; the card clips any native-control paint overflow. Post-fix evidence shows all controls inset evenly inside the card.
- P2 resolved — planner still depended on database matching. Fix: the submit action now calls `/api/ai/plan-menu` with text criteria and renders the returned structured menus; the local database is invoked only after an API or validation failure.
- P2 resolved — decorative result images contradicted the requested lean AI flow. Fix: Planner cards are text-only and display the AI reason, numeric estimates, food groups, and save action. No image field is requested, sent, or rendered.
- P3 accepted — native time text appears as 12-hour values in the Chromium capture but may appear as 24-hour values on iOS according to device locale; containment and saved values are unaffected.

### Required fidelity surfaces

- Typography: Kanit hierarchy, weights, wrapping, and compact metadata remain aligned with Option A.
- Spacing/layout: card insets, divider rhythm, criteria chips, and responsive stacks remain consistent; Settings inputs no longer cross card edges.
- Colors/tokens: existing green/orange semantic palette and focus states are unchanged.
- Image quality/assets: Planner intentionally uses no images; no placeholder or substitute imagery was introduced. Other MealMate imagery is unchanged.
- Copy/content: CTA and supporting copy now state that AI creates the recommendations; fallback copy is explicit and non-blocking.

### Interaction and console checks

- Planner form validation, loading state, local fallback, three-card render, and save buttons were exercised.
- Settings Summary/Settings navigation and portrait/landscape resizing were exercised.
- Browser console warning/error check returned no entries attributable to the UI changes.
- Syntax checks passed for frontend, service worker, server route, and AI wrapper.

final result: passed
