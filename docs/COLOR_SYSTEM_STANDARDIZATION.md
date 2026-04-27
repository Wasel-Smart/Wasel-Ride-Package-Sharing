# Wasel Color System Standardization

## Brand Colors (Amber/Gold Primary)

### Primary Palette
- **Primary Amber**: `#f59a2c` - Main brand color, used for CTAs, highlights, active states
- **Bright Amber**: `#ffb357` - Secondary accent, hover states, gradients
- **Amber Glow**: `rgba(245, 154, 44, 0.30)` - Borders, subtle highlights
- **Amber Dim**: `rgba(245, 154, 44, 0.15)` - Backgrounds, panels

### Supporting Colors
- **Cyan**: `#47b7e6` - Info, secondary actions
- **Green**: `#79c67d` - Success, completed states
- **Red**: `#ee705d` - Errors, warnings
- **Purple**: `#a78bfa` - Special features

### Gradients
- **CTA Gradient**: `linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)`
- **Amber Gradient**: `linear-gradient(135deg, #f59a2c 0%, #ffb357 100%)`
- **Glass Morphism**: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))`

## Component Color Mapping

### Buttons
- **Primary**: Amber gradient with white text
- **Secondary**: Amber border with amber text
- **Ghost**: Transparent with amber hover

### Cards
- **Background**: `var(--wasel-panel-strong)` with glass morphism gradient
- **Border**: `rgba(245, 154, 44, 0.30)` for active, `#313841` for default
- **Hover**: Add amber glow shadow

### Navigation
- **Active Link**: Amber text with amber underline
- **Inactive Link**: Muted text
- **Background**: Glass morphism with amber tint

### Status Indicators
- **Active**: Amber
- **Completed**: Green
- **Attention**: Amber (not red)
- **Cancelled**: Red

### Form Elements
- **Focus Border**: Amber
- **Error Border**: Red
- **Success Border**: Green
- **Placeholder**: Muted text

## Pages to Update

### ✅ Already Updated
- MobilityOSPage.tsx - Revolutionary quantum map with amber accents
- wasel-page-theme.ts - Core design tokens updated
- globals.css - Glass components updated
- base.css - Navigation updated

### 🔄 Needs Review
- MyTripsPage.tsx - Uses CYAN constant, should use AMBER for primary actions
- FindRidePage.tsx - Check button colors
- PackagesPage.tsx - Check status colors
- BusPage.tsx - Check booking flow colors
- WalletDashboardEnhanced.tsx - Check transaction colors

## Implementation Checklist

### Global Constants
- [x] Update PAGE_DS.cyan to use amber
- [x] Update PAGE_DS.borderH to use amber
- [x] Update PAGE_DS gradients to match landing page
- [x] Update glass component borders

### Component Updates
- [x] Navigation bar - amber accents
- [x] Primary buttons - gradient CTA
- [x] Status cards - amber for active
- [x] Tab navigation - amber for active
- [ ] Filter buttons - amber for selected
- [ ] Form inputs - amber focus states
- [ ] Modal headers - amber accents

### Page-Specific
- [x] Mobility OS - Revolutionary quantum map
- [ ] My Trips - Update CYAN to AMBER for primary
- [ ] Find Ride - Update button colors
- [ ] Packages - Update status indicators
- [ ] Bus - Update booking flow
- [ ] Wallet - Update transaction highlights

## Testing Checklist
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check all button hover states
- [ ] Verify active tab indicators
- [ ] Test form focus states
- [ ] Validate status badge colors
- [ ] Confirm navigation highlights
- [ ] Review card borders
- [ ] Check modal overlays

## Design Philosophy
The amber/gold color represents warmth, trust, and premium service - perfect for a mobility platform in the Jordan market. It creates a cohesive, professional appearance while maintaining high contrast for accessibility.

## Notes
- Always use CSS variables where possible for theme flexibility
- Maintain 4.5:1 contrast ratio for WCAG AA compliance
- Use amber sparingly for maximum impact
- Reserve red only for errors and critical warnings
- Green for success states only
