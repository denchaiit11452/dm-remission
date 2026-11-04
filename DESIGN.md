---
name: DM Remission
description: Thai-language clinical tracking app for a hospital diabetes remission program. The name and drop mark are provisional.
colors:
  primary: "#115e59"
  primary-hover: "#0f4f4b"
  primary-tint: "#d9ebe8"
  action-teal: "oklch(43.7% 0.078 188.216)"
  action-teal-hover: "oklch(38.6% 0.063 188.416)"
  focus-teal: "oklch(51.1% 0.096 186.391)"
  sidebar: "#0B2F2D"
  sidebar-text: "#CFE6E3"
  sidebar-icon: "#9CC5C0"
  sidebar-muted: "#8FB8B3"
  sidebar-accent: "#5EEAD4"
  brand-tile: "#14B8A6"
  canvas: "oklch(98.4% 0.003 247.858)"
  surface: "#ffffff"
  surface-sunken: "oklch(96.8% 0.007 247.896)"
  hairline: "oklch(92.9% 0.013 255.508)"
  control-border: "oklch(86.9% 0.022 252.894)"
  ink: "oklch(20.8% 0.042 265.755)"
  text-body: "oklch(37.2% 0.044 257.287)"
  text-muted: "oklch(44.6% 0.043 257.281)"
  text-disabled: "oklch(70.4% 0.04 256.788)"
  risk-critical: "#991b1b"
  risk-high: "#dc2626"
  risk-watch: "#ea580c"
  risk-uncontrolled: "#d97706"
  risk-well-controlled: "#15803d"
  no-data: "#94a3b8"
  not-in-remission: "#64748b"
  bar-ink-dark: "#0f172a"
  badge-high-bg: "#fee2e2"
  badge-high-ink: "#7f1d1d"
  badge-watch-bg: "#ffedd5"
  badge-watch-ink: "#7c2d12"
  badge-uncontrolled-bg: "#fef3c7"
  badge-uncontrolled-ink: "#78350f"
  badge-well-bg: "#dcfce7"
  badge-well-ink: "#14532d"
  caution-bg: "oklch(98.7% 0.022 95.277)"
  caution-border: "oklch(87.9% 0.169 91.605)"
  caution-ink: "oklch(27.9% 0.077 45.635)"
  alert-count: "oklch(57.7% 0.245 27.325)"
typography:
  metric:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
  headline:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.333
  metric-text:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.556
  title:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  subtitle:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  input:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.429
  label:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.375
  caption:
    fontFamily: "IBM Plex Sans Thai, Arial, Helvetica, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.375
rounded:
  swatch: "3px"
  bar: "4px"
  badge: "6px"
  button: "8px"
  panel: "10px"
  container: "12px"
  sheet: "16px"
  full: "9999px"
spacing:
  row: "10px"
  panel-gap: "16px"
  panel-padding-compact: "16px"
  panel-padding: "20px"
  page-gap: "20px"
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-teal}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-teal-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  button-danger:
    backgroundColor: "{colors.risk-critical}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.panel}"
    padding: "0 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
  range-preset-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    padding: "0 16px"
    height: "44px"
  nav-item:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-text}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
    height: "44px"
  badge-critical:
    backgroundColor: "{colors.risk-critical}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  badge-high:
    backgroundColor: "{colors.badge-high-bg}"
    textColor: "{colors.badge-high-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  badge-watch:
    backgroundColor: "{colors.badge-watch-bg}"
    textColor: "{colors.badge-watch-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  badge-uncontrolled:
    backgroundColor: "{colors.badge-uncontrolled-bg}"
    textColor: "{colors.badge-uncontrolled-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  badge-well-controlled:
    backgroundColor: "{colors.badge-well-bg}"
    textColor: "{colors.badge-well-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  badge-no-data:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-body}"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "4px 10px"
  threshold-banner:
    backgroundColor: "{colors.caution-bg}"
    textColor: "{colors.caution-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.container}"
    padding: "12px 16px"
---

# Design System: DM Remission

## Overview

**Creative North Star: "The Honest Chart"**

The app reads like a well-kept ward chart: quiet paper, thin rules, and a mark on the page only where a reading exists. A dark green sidebar frames a pale slate canvas, and white hairline panels hold counts, bars, and short notes in Thai. Colour is spent on clinical meaning, and everything else stays neutral so that a critical badge is the loudest thing on the page.

Density is working density. A clinician scans badges, bars, and tabular numbers in rows at least 44px tall, on a desktop, a tablet, or a phone during a home visit. Secondary facts stay on screen as small slate captions instead of hiding behind interaction.

The chart is honest about what it does not know. Old data looks faded rather than current, unset thresholds say they are waiting rather than showing zero, and a thing that cannot be assessed says so in words. The recorded scope is the signed-in app: the shell, shared components, and the dashboard. The login route is its own surface with its own font and photograph, and it is not part of these tokens.

**Key Characteristics:**
- Flat white panels with 1px hairlines on a pale slate canvas, framed by a dark green sidebar.
- A five-level risk scale always shown with its Thai label.
- A faded segment marks stale data inside each risk bar.
- Waiting and insufficient-data states written in words, never drawn as zero.
- Inline SVG line icons and charts, with no raster imagery in the shell or dashboard.
- Light theme only in the signed-in app.

## Colors

The palette is teal and slate for structure, with a red-to-green clinical scale carrying all risk meaning.

### Primary
- **Deep Clinical Teal** (#115e59): Selected range presets, the custom-range trigger, calendar endpoints, the picker's apply button, the remission series in charts, and the sparkline end dot.
- **Teal Hover** (#0f4f4b): Hover on the picker's apply button.
- **Range Tint** (#d9ebe8): Days between the two selected calendar endpoints.
- **Action Teal** (Tailwind teal-800): Shared form buttons and all teal text links. It renders almost identically to Deep Clinical Teal but is a separate value.
- **Focus Teal** (Tailwind teal-700): The 2px focus outline on every light surface.

### Secondary
- **Sidebar Forest** (#0B2F2D): The sidebar and rail background, and the tablet top bar's brand text and menu icon.
- **Sidebar Text** (#CFE6E3): Inactive menu labels and the logout control.
- **Sidebar Icon** (#9CC5C0): Inactive menu icons.
- **Sidebar Muted** (#8FB8B3): Group labels, the tagline, the role line, and the idle-logout note.
- **Sidebar Accent** (#5EEAD4): The active menu icon, and the focus outline on the dark sidebar.
- **Brand Tile** (#14B8A6): The tile behind the placeholder drop mark and the user avatar. It is reserved for the shell.

### Tertiary
Fills are used for bars, swatches, and chart lines. Each badge pairs a pale background with its own dark ink, except Critical, which is a white label on the full fill.
- **Critical Oxblood** (#991b1b): The critical bar and badge fill, the diabetes lab band, the danger button, and the required-field mark.
- **High Red** (#dc2626): The high-risk bar.
- **Watch Orange** (#ea580c): The watch bar, plus the lost-remission series and segment.
- **Uncontrolled Amber** (#d97706): The uncontrolled bar and the at-risk lab band.
- **Controlled Green** (#15803d): The well-controlled bar and the normal lab band.
- **No-Data Slate** (#94a3b8): The no-data bar and the insufficient-data remission segment.
- **Not-In-Remission Slate** (#64748b): The not-in-remission segment and sparkline strokes.
- **Bar Ink** (#0f172a): Percentages on the light fills: orange, amber, and no-data slate.
- **Caution Amber** (Tailwind amber-50, amber-300, amber-950): The threshold banner's background, border, and text.
- **Alert Count Red** (Tailwind red-600): The unacknowledged count pill on the sidebar and bottom navigation.

### Neutral
- **Canvas** (Tailwind slate-50): The page background and row hover wash.
- **Surface** (#ffffff): Panels, controls, and menus.
- **Sunken Surface** (Tailwind slate-100): The empty segment bar and hover on quiet calendar controls.
- **Hairline** (Tailwind slate-200): Panel borders, row dividers, and the strip's 1px cell gaps.
- **Control Border** (Tailwind slate-300): Fields and secondary buttons.
- **Ink** (Tailwind slate-900): Page and panel titles, counts, and key values.
- **Body Text** (Tailwind slate-700): Row labels and body notes.
- **Muted Text** (Tailwind slate-600): Subtitles, captions, column headings, and units.
- **Disabled Text** (Tailwind slate-400): Unavailable calendar days, months, and navigation arrows.

### Named Rules
**The Label Carries It Rule.** Risk identity is always carried by a text label, never by colour alone. Watch Orange and Uncontrolled Amber failed colour-blind separation, so every risk bar sits in a row with its RiskBadge, and every swatch sits beside its written name.

**The Faded Stale Rule.** The stale part of a risk bar is the same hue as the fresh part at 0.32 opacity, separated by a 2px gap. Staleness never gets its own hue, because the patient's level has not changed, only the confidence in it.

**The Waiting Is Not Zero Rule.** A risk level whose threshold is unset shows "รอแพทย์กำหนดเกณฑ์" with a dash for its count, and never a zero or an empty bar. A summary figure that depends on it shows "ยังประเมินไม่ได้". A true zero is the only thing that may show 0.

## Typography

**Display Font:** None. Headings use the body stack.
**Body Font:** IBM Plex Sans Thai (with Arial, Helvetica, sans-serif), weights 400, 500, 600, loaded through next/font. The login page keeps its own Prompt face.

**Character:** A clear Thai and Latin sans that matches the Figma file. It was chosen by the user on 2026-11-04, and its files ship with the app, so Thai letterforms no longer differ between devices.

**Known gap:** The login page still forces Prompt through its own stylesheet, loaded from Google Fonts.

### Hierarchy
- **Metric** (600, 30px, 1.2): The large counts in the summary strip, always followed by a small unit in Muted Text.
- **Headline** (600, 24px, 1.333): The page title.
- **Metric Text** (600, 18px, 1.556): A summary cell's value when it is words instead of a number, and the mobile sheet title.
- **Title** (600, 17px, 1.375): Panel titles.
- **Subtitle** (600, 15px, 1.5): Lab group names, calendar month headings, and state headings inside a panel.
- **Input** (400, 16px, 1.5): Text inside form fields.
- **Body** (400, 14px, 1.429): Row text, field labels at weight 500, and button labels at weight 500.
- **Label** (500, 13px, 1.375): Risk badges and range controls. Panel subtitles use the same size at weight 400.
- **Caption** (400, 12.5px, 1.375): Column headings at weight 500, plus notes, patient metadata, and calendar weekdays.

### Named Rules
**The Tabular Count Rule.** Counts, percentages, and calendar days that sit in columns use tabular numerals, so a row of figures can be compared without re-reading.

**The Thai Date Rule.** Full dates render in Thai short form with the Buddhist-era year, such as "4 พ.ย. 2569". Chart axes may shorten to the day and month or the month alone.

## Layout

The signed-in shell changes navigation by width. At 1440px and above it shows a 256px sidebar, from 1024 to 1439px an 80px icon rail, from 768 to 1023px a sticky top bar with a drawer, and below 768px a 56px bottom bar whose fourth item opens the same drawer.

Page content sits in a centred column up to 1280px wide, with 16px gutters on mobile, 24px at tablet, and 32px from 1024px. Mobile content keeps 112px of bottom padding to clear the bottom bar.

Dashboard sections stack with a steady 20px gap. Paired panels share a row from 1200px up, with a flexible left column and a fixed 400px right column, and both panels stretch to equal height. Below 1200px they stack in one column. The summary strip is four cells from 1024px and two by two below that.

On phones the rows reflow rather than scroll sideways. A risk row places its badge and count on one line and its bar below. The metrics table collapses its values into the first column beside a sparkline. Range presets fill a three-column control.

Spacing inside a panel is 16px between blocks, with 16px padding on mobile and 20px from 768px. List rows use 10px of vertical padding and a hairline between them.

### Named Rules
**The 44 Floor Rule.** Every interactive target is at least 44px tall on every viewport, including links inside compact captions, which extend their hit area past the text.

## Elevation & Depth

The system is flat at rest. Panels, strips, and banners separate through 1px hairlines and the step from Canvas to Surface, with no shadow. Shadow appears only on things that float above the page: a soft 4px 12px shadow on the chart tooltip, a soft 8px 24px shadow on the desktop calendar popover, and a large shadow on the navigation drawer. Modal sheets and the drawer also dim the page behind them with a dark slate backdrop.

### Shadow Vocabulary
- **Tooltip** (`box-shadow: 0 4px 12px rgba(15,23,42,0.12)`): The chart's value tooltip.
- **Popover** (`box-shadow: 0 8px 24px rgba(15,23,42,0.16)`): The date range popover at 768px and up.
- **Drawer** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`): The slide-over navigation drawer.

### Named Rules
**The Only-What-Floats Rule.** A surface gets a shadow only if it floats over other content. Anything resting in the page flow uses a hairline.

## Shapes

Corners are gently rounded and scale with the size of the object: 3px on legend swatches, 4px on bars and segments, 6px on badges and row hovers, 8px on buttons and range controls, 10px on dashboard panels and form fields, 12px on banners, popovers, and the white containers of other signed-in surfaces, and 16px on the top of the mobile sheet. Full pills are kept for count badges and avatars.

Risk bars keep a square left edge against the column start and round only their right end. Calendar ranges read as one continuous band, rounded only on the outer edges of the two endpoints.

Icons are 16-unit line drawings in inline SVG that take the current text colour.

## Components

### Buttons
Plain, solid, and legible, with no motion.
- **Shape:** Softly rounded (8px), at least 44px tall.
- **Primary:** Action Teal with white text, 20px side padding, and a 14px weight 500 label.
- **Hover / Focus:** Hover darkens one Tailwind step. Focus shows a 2px Focus Teal outline at a 2px offset.
- **Secondary:** White with a Control Border stroke and Ink text, with a Canvas wash on hover.
- **Danger:** Critical Oxblood with white text, hovering darker.
- **Pending:** The label changes to words such as "กำลังโหลด..." and the previous data stays on screen.

### Risk Badge
The app's most repeated element, and the carrier of the Label Carries It Rule.
- **Style:** 13px weight 500 text at a tighter 1.25 line height and 6px radius, in a pale fill with matching dark ink for four levels.
- **Critical:** The only badge with a solid fill and white text, so it is the strongest on the page.
- **No data:** White with a slate-400 stroke and the text "ยังไม่มีข้อมูล", so it does not read as any level.
- **Stale tag:** A sibling tag, white with a slate-500 stroke, saying "ข้อมูลเก่า N วัน" or "ไม่มีค่าน้ำตาล".

### Risk Level Row (Signature)
The system's signature: a row reading badge, bar, count, and stale count.
- **Bar:** 18px tall, scaled to the largest level, with a fresh segment and a faded stale segment per the Faded Stale Rule.
- **Awaiting threshold:** The bar is replaced by "รอแพทย์กำหนดเกณฑ์" and both counts become a dash.
- **True zero:** The bar space stays empty and the count shows 0.
- **Behaviour:** The whole row is a link to the filtered patient list, with a Canvas hover.
- **Legend:** A key under the rows explains "ข้อมูลล่าสุด" and "ข้อมูลเก่า".

### Segment Bar
A 28px proportional bar for groups that sum to a whole, such as remission status and lab bands.
- **Segments:** 4px radius, 2px gaps, and zero-count groups are not drawn.
- **Labels:** A percentage appears only on segments of 15% or more. White or Bar Ink is chosen per fill.
- **Companion list:** Every bar is followed by a list of swatch, written name, and count, so a narrow segment stays readable.

### Cards / Containers
- **Corner Style:** Softly rounded, 10px on dashboard panels and 12px on containers elsewhere in the app.
- **Background:** Surface on the Canvas page.
- **Shadow Strategy:** None, per the Only-What-Floats Rule.
- **Border:** 1px Hairline.
- **Internal Padding:** 16px on mobile, 20px from 768px, with a Title and optional Muted subtitle at the top.

### Summary Strip
Four cells in one bordered container, separated by 1px Hairline gaps. Each cell holds a label, a Metric with a unit, and a caption. When a value cannot be computed, the cell uses Metric Text words instead of a number.

### Threshold Banner
A status banner shown when clinical thresholds are incomplete. It uses the Caution Amber set at 12px radius, and shows a link to settings only to roles that may open it.

### Charts
Hand-drawn inline SVG, with fixed type size at any width.
- **Trend chart:** 2px lines with round caps, a 10% teal area under the remission series, hairline gridlines, and direct value labels at the line ends.
- **Sparkline:** A neutral slate line with a teal end dot, scaled per row, so it is always shown with its figures.
- **Access:** Arrow keys step through points, a tooltip shows values, and a visually hidden table holds the data.

### Date Range Picker
A native dialog anchored to the range trigger. From 768px it is a 682px two-month popover. Below that it is a bottom sheet with one month, a grab handle, and a start and end summary. Selected endpoints use Deep Clinical Teal, the range between uses Range Tint, and today has a 1px teal ring. The header opens a month and year grid.

### Inputs / Fields
- **Style:** White, 1px Control Border, 10px radius, 44px tall, with 16px text.
- **Focus:** 2px Focus Teal outline at a 1px offset.
- **Error / Disabled:** An error turns the border red and adds a red message below. Disabled fields use a Canvas fill.

### Navigation
- **Sidebar:** Sidebar Forest, with 15px labels and line icons in rows at least 44px tall and 10px radius.
- **States:** Active is a 12% white wash, white weight 600 text, and a Sidebar Accent icon. Hover is an 8% white wash.
- **Rail:** Icon-only 48px targets with the label as a native tooltip.
- **Mobile:** A white bottom bar with a hairline top border, 24px icons, and 12px labels. Active is Action Teal at weight 600.
- **Alert count:** A red pill with a white count on the alerts item in every variant.

## Do's and Don'ts

### Do:
- **Do** pair every risk colour with its Thai label, using RiskBadge in rows and a written name beside each swatch.
- **Do** draw stale data as the same hue at 0.32 opacity, beside the fresh segment.
- **Do** write "รอแพทย์กำหนดเกณฑ์" or "ยังประเมินไม่ได้" when a threshold or rule set is missing.
- **Do** keep interactive targets at least 44px tall on every viewport.
- **Do** keep panels flat with a 1px hairline, and reserve shadow for floating surfaces.
- **Do** use the Focus Teal outline on light surfaces and the Sidebar Accent outline on the dark sidebar.
- **Do** treat "DM Remission" and the drop mark as placeholders, and replace them when the hospital supplies its real name and logo.

### Don't:
- **Don't** tell Watch Orange and Uncontrolled Amber apart by hue alone; they failed colour-blind separation.
- **Don't** render an unset threshold as 0, an empty bar, or a normal-looking row.
- **Don't** give stale data a separate hue or hide it inside the fresh count.
- **Don't** claim IBM Plex Sans Thai in specs or handoffs until a build actually loads it.
- **Don't** use a risk colour for decoration; each hue is a clinical signal.
- **Don't** add raster imagery to the signed-in shell or dashboard, which ship inline SVG only, apart from the hospital's real logo once it is supplied.
