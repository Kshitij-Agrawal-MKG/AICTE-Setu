# AICTE Setu - Design Guidelines (Compacted)

## Design Foundation

**System:** Material Design 3 - chosen for enterprise workflow management, information density, and government-grade credibility.

**Core Principles:**
1. Clarity Over Decoration - functional purpose for every element
2. Hierarchical Information Display - progressive disclosure
3. Trustworthy Professionalism - reliability and transparency
4. Efficiency-First Interactions - minimize clicks
5. Consistent Patterns - predictable cross-role behavior

---

## Typography

**Fonts:** Roboto (primary), Roboto Condensed (tables), font-mono (numerical data)

**Scale:**
- H1: `text-4xl font-medium tracking-tight` (36px)
- H2: `text-2xl font-medium` (24px)
- H3: `text-xl font-medium` (20px)
- H4: `text-lg font-medium` (18px)
- Body: `text-base font-normal leading-relaxed` (16px)
- Small: `text-sm` (14px) | Micro: `text-xs` (12px)
- Labels/Tags: `uppercase tracking-wide text-xs`

**Usage:** `font-semibold` for CTAs/active states; `leading-tight` for headings, `leading-relaxed` for body.

---

## Layout & Spacing

**Spacing Scale:** 2, 4, 6, 8, 12, 16, 20, 24 (Tailwind units)

**Common Patterns:**
- Component padding: `p-6` (desktop), `p-4` (mobile)
- Section spacing: `space-y-8` (major), `space-y-4` (within)
- Grid gaps: `gap-6` (cards), `gap-4` (forms)
- Containers: `mx-4` (mobile), `mx-auto max-w-7xl` (desktop)

**Grids:**
- Dashboard: 12-column responsive
- Forms: `grid-cols-1 md:grid-cols-2`
- Cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Tables: Full-width, horizontal scroll (mobile)

**Container Widths:** `max-w-7xl` (main), `max-w-4xl` (forms), `max-w-full` (dashboards)

---

## Components

### Navigation

**Top Nav:**
- `sticky top-0 h-16` with `backdrop-blur`, subtle shadow
- Logo (left), nav links (center), user/notifications (right)
- Mobile: Hamburger → slide-in drawer

**Sidebar (Multi-Role):**
- Desktop: `w-64` fixed, collapsible to `w-16` icon-only
- Mobile: Overlay drawer
- Active state: subtle background + `border-l-4` accent
- Structure: Role indicator (top), nav sections with icons, logout (bottom)

**Breadcrumbs:**
- `px-6 py-4` below nav
- Pattern: Home > Section > Current (chevron separators, last non-clickable)

### Cards

**Application Cards:**
- `rounded-lg border p-6 shadow-sm hover:shadow-md transition`
- Header (title + badge), body (metrics), footer (actions)

**Status Cards:**
- `p-4` compact, timeline indicator (left border/icon), status, timestamp, personnel
- Click to expand details

**Document Cards:**
- Thumbnail/icon, metadata (filename, size, date, status)
- Actions: Download, preview, replace (icon buttons)

### Forms

**Layout:**
- Vertical: `space-y-6` (groups), `space-y-2` (label/input/helper)
- Use `fieldset`/`legend` for grouping

**Text Inputs:**
- `h-12 px-4 py-3 border-2 rounded-md`
- Focus: `focus:border-[accent] focus:ring-4 focus:ring-[accent]/10`
- Helper text: `text-sm` below input with status coloring

**Selects:** Match input styling (`h-12 px-4`), chevron-down icon. Multi-select: checkbox items + count.

**File Upload:**
- Drag-drop zone: dashed border, `rounded-lg p-12 text-center`
- File list with remove + progress bars

**Radio/Checkbox:**
- Vertical: `space-y-3`, each option `flex gap-3 p-3` (larger touch targets)

**Actions:**
- `flex justify-end gap-4` (right-aligned)
- Primary + secondary/cancel pattern
- Sticky footer on long mobile forms

### Buttons

**Primary:** `px-6 py-3 font-medium rounded-md` (strong visual weight)  
**Secondary:** Same dimensions, border treatment  
**Icon:** `w-10 h-10 p-2 rounded-md` (centered icon)  
**Groups:** Joined (`rounded-l`/`rounded-r` on edges) or `gap-2`

### Data Display

**Tables:**
- `overflow-x-auto` wrapper, full-width
- Header: Sticky, `font-semibold text-sm uppercase tracking-wide`
- Rows: Zebra/hover (`hover:bg-[subtle]`), `px-6 py-4`, `border-b`
- Sortable: chevron indicators

**Status Badges:**
- `inline-flex items-center gap-1 px-3 py-1 rounded-full`
- `text-xs font-medium uppercase tracking-wide`
- Optional: leading dot (`w-2 h-2 rounded-full`)

**Timeline:**
- Vertical with connecting line (`border-l-2`)
- Each stage: `flex` with icon (left), content (right)
- Differentiate completed/current/pending + timestamps

**Metrics:**
- Card grid, large number (`text-3xl font-bold`), label (`text-sm uppercase tracking-wide`)
- Optional: trend indicator

**Progress:**
- Linear: `h-2 rounded-full overflow-hidden` + percentage text
- Multi-step: Stepped circles with connecting lines

### Modals & Overlays

**Modals:**
- Centered, `max-w-2xl rounded-lg shadow-xl p-6`
- Backdrop: semi-transparent + `backdrop-blur`
- Header (title + close ×), footer (right-aligned actions)

**Slide-Out Panels:**
- Right-side: `fixed w-96` or `w-1/3`, full-height, overlay backdrop
- Close button + scrollable content

**Toasts:**
- `fixed top-right`, stack vertically (`gap-2`)
- `p-4 rounded-lg shadow-lg`, auto-dismiss (5s)
- Icon + message + close button

### Communication

**Message Threads:**
- Chat interface, alternating alignment (sent/received)
- Avatar (left), message bubble + timestamp
- Inline attachment previews, input at bottom

**Query/Ticket:**
- Card: header (ID, status, priority)
- Collapsible response thread
- Response form (bottom, authorized users)

---

## Dashboard Layouts

**Institution:**
- Hero: Welcome + quick stats (applications, pending, activity)
- 3-col card grid (desktop), 1-col (mobile)
- Right sidebar notifications (1/4 width)
- Quick actions: "New Application", "View Documents", "Track Status"

**Evaluator:**
- Assigned applications table (filters: status, deadline, location)
- Workload summary cards (top)
- Calendar (site visits), quick access to evaluation forms

**Admin:**
- Metrics: total applications, approval rate, avg. time, bottlenecks
- Workflow funnel visualization
- Activity feed, system health, user management quick actions

---

## Images

**Usage:**
- Small illustrative icons/minimal graphics (institutional dashboard banner, max 200px height)
- Login/Landing: Abstract geometric background (low opacity)
- Document thumbnails (`aspect-ratio-[3/4] object-cover rounded-lg`)
- User avatars (`rounded-full ring-2`)
- Infrastructure photos (`aspect-ratio-video rounded-lg`, click to zoom)

**No large hero images** - utility-focused, dashboard-first approach.

---

## Color & Visual Hierarchy

**Color Application:**
- Status badges: Color-coded (pending/approved/rejected)
- Form validation: Error/success states with appropriate coloring
- Timeline: Visual differentiation by stage status
- Active navigation: Accent `border-l-4` + subtle background

---

## Accessibility

**Requirements:**
- Min 44×44px touch targets
- Focus: `ring-4 ring-offset-2`
- Skip navigation links
- ARIA labels on icon-only buttons
- Inline form errors with ARIA live regions
- Keyboard shortcuts (document with `?` key overlay)
- Screen reader announcements for status/notification changes

---

## Responsive Behavior

**Breakpoints:**
- Mobile (<768px): Single column, stacked, hamburger nav, bottom action bar
- Tablet (768-1024px): 2-col grids, condensed sidebar
- Desktop (>1024px): Full layouts, 3+ col grids, expanded sidebar

**Mobile-Specific:**
- Bottom sticky nav for primary actions
- Accordion/collapsible long forms
- Swipe gestures for card actions
- Full-screen modals (not centered overlays)

---

**Implementation Priority:** Consistency > novelty. All patterns must serve information clarity and workflow efficiency. Test with real data density scenarios.