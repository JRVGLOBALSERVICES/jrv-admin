# JRV Admin Documentation

**Latest Version:** `v1.7.5` (Updated Jan 14, 2026)

This document provides a comprehensive technical breakdown of all recent changes made to the JRV Admin platform, organized by component and functional area.

---

## 🕒 Release History

### `v1.7.5` (Scraper Orchestration & Loading Feedback)

- **Targeted Extraction**: Optimized the social scraper to prioritize specific URLs. Creating or editing a post now triggers a focused GitHub Action run for near-instant updates.
- **Scraper Loading Feedback**: Implemented a `"EXTRACTING"` status marker in the database. The admin UI now displays spinning loaders in both the post table and the preview modal during background work.
- **Instant Preview Engine**: Added a lightweight `extract` action to the API that finds and displays cover images instantly using the Googlebot crawl strategy while editing.

### `v1.7.0` (High-Fidelity Social Preview & UI Responsiveness)

- **Social Preview Overhaul**: Rebuilt the Facebook/Instagram post preview modal as a high-fidelity replica of the frontend `StaticNewsCard`.
- **Interactive Micro-animations**:
  - **Hover Actions**: Implemented card lift (-8px), shadow depth growth, and grayscale-to-color transitions.
  - **Slide-up Buttons**: The "Read More" button now animates into view with a smooth slide-up effect on hover.
  - **Video Feedback**: Integrated play button overlays for video and reel content.
- **Consistent Loading States**: Complete audit of admin client components (`Users`, `Cars`, `Agreements`, `Blacklist`, `Marketing`). Implemented unified loading indicators/spinners for all save, delete, and bulk action buttons.
- **Premium UX Styling**: Standardized `p-6` padding for all primary action buttons (New, Import, Save, Preview) across the platform.
- **Legacy Cleanup**: Removed the obsolete `show_text` property from data models and admin UI forms.

### `v1.6.0` (Identity Unification & Social Import)

- **Analytics Identity Unification**: Unified visitor counts via IP/Browser Fingerprinting to prevent session fragmentation (deduplication). Resolves "Jakarta: 1" vs "Jakarta: 4" issues.
- **Location Normalization**: Standardized regional synonyms (Kuala Lumpur, Jakarta) and stripped artifacts like "(GPS)" from addresses.
- **Session Timeline Fix**: Fixed "Zero events captured" by harmonizing identity keys in the detailed session API.
- **AI Marketing Suite**: Added Bulk Import for Facebook & Instagram posts with selective preview.
- **ISP Integrity**: Restored missing ISP names in analytics report cards.
- **Design System Update**: Added `emeraldGreen` and `indigoLight` button variants for consistent branding.
- **Automation**: Integrated `scripts/bump-version.js` into the build process to automate versioning and documentation updates.
- **Design System Update**: Added `emeraldGreen` and `indigoLight` button variants for consistent branding.

### `v1.2.3` (Linear Analytics & Deep Scaling)

- **Linear Additive Logic**: Weekly/Monthly totals are now the exact sum of daily unique counts (100% reconcilable).
- **Custom Mode (Hybrid)**: KPI cards perform **End vs Start** spot-checks, while charts provide a **Combined Summary**.
- **Deep Data Fetching**: Implemented recursive backend loops to process **100,000+ records**, bypassing Supabase's row limits.
- **UI Polishing**: Fixed tooltip overflows and alignment issues for comparison date ranges.
- **Identity Integrity**: All fingerprinting and filters strictly unified to the **6 AM KL Business Day**.

### `v1.2.2` (Real-Time Performance & Hybrid Tracking)

- **Parallel Fetching**: Rewrote the engine to fetch all resources (Events, GPS, Cars, Landing Pages) in parallel, reducing load time by ~60%.
- **Hybrid Location Tracking**: Improved "Top Cities" by prioritizing high-precision GPS and falling back to IP geo-location.
- **Model Normalization**: Fixed automotive model naming duplications (e.g. "CR-V" vs "Cr V").

### `v1.2.1` (Mobile-First KPI Dash)

- **Responsive Grid**: Redesigned KPI cards for any device (7 columns on XL, 2 on Mobile).
- **Interactive Tooltips**: Added date comparisons to all KPI cards for better auditability.
- **Ad Source Attribution**: Added support for "Google Search Partners" traffic tracking.

### `v1.2.0` (Comprehensive Dashboard Engine)

- Initial implementation of the high-speed analytics engine.
- Support for WhatsApp, Phone, and UTM campaign tracking.
- Daily/Weekly/Monthly range presets.

- **6 AM Schedule Standardization**: Unified all dashboard metrics to the 6 AM - 6 AM KL Business Day.
- **"Returning Today" Shortcuts**: Added always-visible **OPEN** buttons for quick agreement access.
- **Agreements Automation**: Implemented `Auto-Extended` status logic and background sync repair.
- **GPS Analytics**: Switched "Top Cities" charts to use Precise Location (GPS) data for 100% accuracy.
- **Plus Code Stripping**: Improved address parsing to clean up Google Plus Codes (e.g., `PXRH+Q4`).

---

## �️ Technical Details by Component

### `src/app/admin/insurance/_components/InsuranceClient.tsx`

- Replaced the simple list with a **High-Fidelity Tabbed Dashboard**.
- Added a `StatBox` component for high-level monitoring.
- Integrated the `Show Untracked` toggle directly into the header for better fleet visibility.

### `src/lib/klTimeWindow.ts`

- Updated `currentWeek6amKlUtc` with an intelligent "Monday-Fallback" to prevent empty weekly metrics.

### `src/app/admin/_components/ExpiringSoon.tsx`

- Modified button visibility states to ensure immediate administrative access.

### `src/app/api/admin/site-events/summary/route.ts`

- Implemented robust `parseAddress` logic and GPS-first location aggregation.

---

**Tip**: Use the **"Show Untracked"** toggle in the Insurance dashboard to identify vehicles that haven't had their insurance or roadtax dates entered!
