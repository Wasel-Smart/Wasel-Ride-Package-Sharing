# Find a Ride — Visual Unification Checklist

Use this checklist to verify that Find a Ride matches the Landing Page design system exactly.

---

## 🎨 Color Palette Verification

### Background Layers
- [ ] Same dark gradient base (`GRAD_HERO`)
- [ ] Same aurora overlay with radial accents
- [ ] Same screen-blend vignette (opacity 0.28)
- [ ] Same shell background color

### Text Colors
- [ ] Primary text: `LANDING_COLORS.text` (var(--wasel-copy-primary))
- [ ] Muted text: `LANDING_COLORS.muted` (var(--wasel-copy-muted))
- [ ] Soft text: `LANDING_COLORS.soft` (var(--wasel-copy-soft))

### Accent Colors
- [ ] Cyan: #5EF6D8 (from/departure indicator)
- [ ] Gold: #19E7BB (to/arrival indicator)
- [ ] Green: #A7FFE9 (success states)
- [ ] Blue: #3DD8FF (info states)

---

## 📐 Typography Verification

### Headings
- [ ] H1: `LANDING_DISPLAY` font, clamp(2.2rem, 4vw, 3.8rem)
- [ ] H1: Line height 0.94, letter-spacing -0.06em
- [ ] H1: Gradient text fill using `GRAD_SIGNAL`
- [ ] H2: `LANDING_DISPLAY` font, clamp(1.45rem, 3vw, 2rem)

### Body Text
- [ ] Body: `LANDING_FONT` (Plus Jakarta Sans, Cairo, Tajawal)
- [ ] Body: 1rem size, line-height 1.74
- [ ] Subtext: Same font, muted color

---

## 🔲 Component Verification

### Panel/Card Style
- [ ] Border radius: 28px (via `panel(28)`)
- [ ] Background: `var(--wasel-panel-strong)`
- [ ] Border: `1px solid ${LANDING_COLORS.border}`
- [ ] Shadow: `var(--wasel-shadow-lg)`
- [ ] Backdrop filter: `blur(22px)`

### Search Form
- [ ] Input height: 52px
- [ ] Input border radius: 16px
- [ ] Input border: `2px solid ${LANDING_COLORS.border}`
- [ ] Input background: `rgba(255,255,255,0.04)`
- [ ] Icon color: Cyan for "from", Gold for "to"
- [ ] Focus state: Border changes to cyan with glow

### Buttons
- [ ] Primary button: `GRAD_SIGNAL` background
- [ ] Primary button: Color #041521 (dark text on light gradient)
- [ ] Primary button: Border radius 18px
- [ ] Primary button: Shadow `SH.cyanL`
- [ ] Primary button: Font weight 900

### Ride Cards
- [ ] Border radius: 22px
- [ ] Border: `2px solid ${LANDING_COLORS.border}` (cyan if recommended)
- [ ] Background: `rgba(255,255,255,0.04)` (or cyan tint if recommended)
- [ ] Recommended badge: Cyan with gradient top border
- [ ] Driver avatar: Gradient background (cyan to gold)
- [ ] Route indicator: Vertical gradient line (cyan to gold)
- [ ] Price: Cyan color, 1.5rem size, weight 800

---

## 📏 Spacing Verification

### Container
- [ ] Max width: 1380px
- [ ] Padding: 28px 20px 84px
- [ ] Margin: 0 auto

### Section Spacing
- [ ] Hero to search form: 32px
- [ ] Search form to results: 32px
- [ ] Between cards: 16px

### Internal Spacing
- [ ] Panel padding: 24px
- [ ] Card padding: 20px
- [ ] Input padding: 0 16px 0 48px (with icon)
- [ ] Button padding: 0 18px (horizontal)

---

## 🎭 Animation Verification

### Page Load
- [ ] Initial fade-in: opacity 0 → 1, duration 0.5s
- [ ] Hero: y: -20 → 0, delay 0s
- [ ] Search form: y: 20 → 0, delay 0.1s
- [ ] Results: Stagger by 0.05s per card

### Interactions
- [ ] Button hover: No transform (Landing Page style)
- [ ] Card hover: No transform (Landing Page style)
- [ ] Input focus: Border color transition 0.2s

---

## 📱 Responsive Verification

### Mobile (< 640px)
- [ ] H1: Scales down via clamp()
- [ ] Container padding: Maintains 20px sides
- [ ] Search form: Full width
- [ ] Cards: Full width, single column
- [ ] Buttons: Full width on mobile

### Tablet (640px - 900px)
- [ ] Container: Centered with max-width
- [ ] Search form: Centered, max 680px
- [ ] Cards: Single column, max 900px

### Desktop (> 900px)
- [ ] Container: 1380px max
- [ ] All elements centered
- [ ] Optimal reading width maintained

---

## ♿ Accessibility Verification

### Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2)
- [ ] Form labels (via placeholder + aria-label)
- [ ] Button labels (aria-label)
- [ ] List semantics for results

### Keyboard Navigation
- [ ] Tab order: From → To → Time → Date → Search
- [ ] Focus visible on all interactive elements
- [ ] Enter key submits search
- [ ] Escape closes modal

### Screen Reader
- [ ] Page title announced
- [ ] Form fields announced with labels
- [ ] Error messages announced (role="alert")
- [ ] Loading state announced (aria-busy)

---

## 🔍 Side-by-Side Comparison

### Landing Page Reference Points
1. Hero section gradient background
2. Panel card style (e.g., map section)
3. Button styles (primary and secondary)
4. Typography scale and weights
5. Color accents (cyan, gold, green)

### Find a Ride Should Match
1. ✅ Same gradient background layers
2. ✅ Same panel card style
3. ✅ Same button styles
4. ✅ Same typography scale
5. ✅ Same color accents

---

## ✅ Final Verification

- [ ] Open Landing Page in one tab
- [ ] Open Find a Ride in another tab
- [ ] Compare side-by-side
- [ ] Verify: "These look like the same product"
- [ ] No visual discontinuity when navigating between pages

---

## 🐛 Common Issues to Check

- [ ] No custom colors that don't exist in Landing Page
- [ ] No custom fonts that don't exist in Landing Page
- [ ] No custom spacing values outside the system
- [ ] No custom shadows outside the system
- [ ] No custom border radius values outside the system

---

**Pass Criteria:** If you can't tell which page uses which design system, the unification is successful. ✨
