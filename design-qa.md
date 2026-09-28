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

## Thai typography overlap iteration (2026-09-28)

### Source visual truth

- Meal-name report: `C:/Users/chinn/AppData/Local/Temp/codex-clipboard-343b5677-fbe2-4586-8533-cbd86e21168e.png` (617×412 px). The focused issue is compressed Thai ascenders/tone marks in the next-meal eyebrow and `มื้อเช้า` display text.
- Summary/Settings report: `C:/Users/chinn/AppData/Local/Temp/codex-clipboard-872a356e-6953-4417-a7b7-2aa5f0d046ab.png` (662×507 px). The focused issue is tight Thai display typography and insufficient separation between the title and tabs.

### Rendered implementation evidence

- Desktop Home: `work/qa-captures/thai-type-home-desktop.png`, viewport and screenshot 1180×820 px, density approximately 1×.
- Desktop Settings: `work/qa-captures/thai-type-settings-desktop.png`, viewport and screenshot 1180×820 px, density approximately 1×.
- Mobile Home: `work/qa-captures/thai-type-home-mobile.png`, viewport and screenshot 390×844 px, density approximately 1×.
- Mobile Settings: `work/qa-captures/thai-type-settings-mobile.png`, viewport and screenshot 390×844 px, density approximately 1×.
- Tablet landscape Settings: `work/qa-captures/thai-type-settings-tablet-landscape.png`, viewport and screenshot 844×390 px, density approximately 1×.
- Focused combined comparisons: `work/qa-comparisons/thai-type-meal-before-after.png` and `work/qa-comparisons/thai-type-settings-before-after.png`. The user reports are cropped source evidence, so fidelity judgement is limited to typography clearance, hierarchy, and containment rather than whole-page proportions.

### Findings and comparison history

- P2 resolved — Thai meal names used a `line-height` of `1`, leaving inadequate room for Thai vowels and tone marks. Fix: increased the next-meal display line box to `1.22`, removed negative letter spacing, allowed visible glyph overflow, and added small block padding. Post-fix evidence shows an 8 px eyebrow-to-name gap and a 20 px name-to-time gap on mobile.
- P2 resolved — page titles inherited a negative bottom margin and a tight `1.06` line height. Fix: removed the negative margin, raised the Thai title line height to `1.2`, added glyph-safe block padding, and retained an 8 px title-to-tabs gap.
- P2 resolved — Summary/Settings supporting headings and labels had inconsistent Thai line boxes. Fix: applied `1.45` line height to progress-card headings, field labels, section titles, and tabs.
- No regression — all three Settings time fields remain inside the card at 390×844 and 844×390; horizontal overflow is 0 px.

### Required fidelity surfaces

- Typography: Kanit loaded successfully at weight 700. Thai marks are no longer visually clipped or merged, display tracking is neutralized where necessary, and hierarchy remains unchanged.
- Spacing/layout: next-meal content and Summary/Settings title rhythm now have explicit non-overlapping gaps. Cards, responsive grids, and navigation geometry are unchanged.
- Colors/tokens: no color tokens changed.
- Image quality/assets: existing MealMate logo and food imagery are unchanged and remain sharp at the tested sizes.
- Copy/content: no user-facing copy changed.

### Interaction and console checks

- Home and Settings navigation were exercised at desktop, mobile portrait, and tablet landscape widths.
- Browser font status was `loaded`; `document.fonts.check('700 32px Kanit')` returned true.
- Browser console warning/error check returned no entries.
- JavaScript syntax checks passed for the app, service worker, and server.

final result: passed
