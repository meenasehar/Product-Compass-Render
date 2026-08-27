# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary authors:** Product managers on the Prisma SD-WAN team — they create, maintain, and update feature records, track commitments, and flag at-risk items.

**Primary consumers:** Executive stakeholders and cross-functional leadership who use the app to read release health, understand delivery progress, and make prioritization decisions in reviews and QBRs.

Field-facing use (AEs, SEs) is not confirmed; the app is currently internal to the product organization.

## Product Purpose

Product Compass is the single source of truth for Prisma SD-WAN product intelligence. It gives the PM team and leadership real-time visibility into what is committed, in development, at risk, or deferred across a release cycle — so misaligned expectations, missed commitments, and poorly prepared executive narratives are caught before they become problems.

Success means: any stakeholder can open the app and know, without asking a PM, what is shipping in v7.0, what is at risk, and why.

## Positioning

An internal-only, custom-built PM intelligence layer purpose-built for the Prisma SD-WAN release cycle — not a generic project tracker, Jira dashboard, or off-the-shelf roadmap tool. It organizes features by the four strategic pillars of Prisma SD-WAN and tracks the full lifecycle from concept to delivery within a specific release scope.

## Operating Context

- Used during Q4 FY26 planning and execution for the v7.0 release
- Feature tracking spans four pillars: Next-Gen Platforms & Compliance, Scalable Networking, On-box Security & SASE, AI Powered Operations & Agentic NetOps
- Each feature has a Jira key, PM owner, engineering owner, engineering team, customer problem statement, business value narrative, and release target(s)
- Status lifecycle: concept → committed → indev → validation → delivered | deferred
- At-risk features are flagged explicitly and surfaced on the Dashboard and sidebar
- The CC Deck Builder page generates customer conversation materials from the feature data
- Feature Intake is the mechanism for requesting new features into the backlog

## Capabilities and Constraints

- **Pages:** Dashboard, Roadmap, Features, Customers, Backlog, CC Deck Builder, Feature Intake
- **Data:** Currently static (features.ts hardcoded dataset); no backend or live Jira integration yet
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Radix UI (shadcn/ui pattern) + lucide-react icons
- **Visual style:** Dark theme with glass-morphism sidebar; blue-purple gradient brand accent; Prisma green (#00c896) for delivered/positive status; red for at-risk
- **Undecided:** Whether data will be live-fetched from Jira or remain static; multi-release support beyond v7.0

## Brand Commitments

None required. This is an internal tool; aesthetics are flexible. The current dark/glass visual direction is the incumbent but is not locked.

## Evidence on Hand

- Feature data file at `src/data/features.ts` with full feature dataset for v7.0
- Four confirmed product pillars with mapped product areas (10 areas total)
- Existing UI implementation across all seven pages

## Product Principles

1. **No ambiguity at a glance.** Every feature's status, owner, and risk must be scannable without drilling in.
2. **Exec-ready at all times.** The app should always be presentation-worthy — data surfaced in QBR-quality visual form, not raw table rows.
3. **PM-authored, stakeholder-consumed.** The authoring experience is secondary; the reading experience for non-PM stakeholders is the design priority.
4. **Pillar-native organization.** All feature work maps to one of the four strategic pillars — no orphaned features, no arbitrary groupings.
5. **Risk is a first-class signal.** At-risk features are never buried; they surface at the top level and demand attention.
