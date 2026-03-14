# AGENTS.md

## Project Identity

AXIS is a mobile-first personal operating system.

It is not a generic productivity app, not a dashboard, and not a habit gamification product.

AXIS exists to:
- synthesize signals across Time, Body, and Mind
- interpret the user's current state
- relate that state to a chosen goal
- guide small, high-impact adjustments
- eventually help reshape the day safely

The product should feel:
- calm
- narrative-first
- explainable
- intentional
- non-judgmental
- non-dashboard

AXIS should read like:
"the system understands how your life systems interact today"

not:
"here are more metrics"

---

## Product Principles

### 1. Deterministic first
Prefer deterministic, rule-based, explainable systems before any AI assistance.

Do not introduce AI/LLM logic when deterministic scoring, thresholds, or rules can solve the problem.

### 2. Narrative at the edge
Core engines produce structured outputs.
Narrative belongs in UI-facing model builders, not in scoring engines.

### 3. Trust over cleverness
Never fake precision.
If signal quality is weak, lower confidence or return unclear.
Do not silently treat missing critical inputs as neutral.

### 4. Calm compression
The product should reduce mental noise, not increase it.
Prefer one strong read and two meaningful actions over many weak suggestions.

### 5. Review-first adaptation
When AXIS proposes changes to the day, it must do so through preview/review flows first.
No hidden autonomous rescheduling.
No silent writes.

### 6. Safety and reversibility
Any action that mutates user state, time blocks, or plans must support validation and undo where appropriate.

---

## Architecture Principles

### Core Life OS pipeline
AXIS should preserve this layered flow:

Engine summaries
-> LifeOsContextSnapshot
-> LifeOsObservation[]
-> GoalAlignmentSnapshot
-> UI-facing model builders
-> screens/components

Do not collapse these layers.

### Engine boundaries
- Engines compute truth
- Model builders shape truth for presentation
- UI components present models
- UI components must not score, interpret, or recompute engine logic

### Source of truth
Always prefer raw snapshot fields and canonical engine outputs over convenience booleans or UI-derived values.

Example:
Use real summary values for scoring.
Do not score from `...OnTarget` convenience flags unless explicitly intended.

### Snapshot-first, observations-second
Goal-relative and adaptive systems should use snapshots as primary structured input.
Observations should act as supporting evidence or modifiers, not replace structured scoring.

---

## Domain Model

AXIS currently revolves around these life engines:

### Time Engine
Captures:
- planned load
- busy time
- deep work
- fragmentation
- deadline pressure
- focus load

### Body Engine
Captures:
- sleep
- hydration
- nutrition
- workout/recovery
- readiness
- recovery risk

### Mind Engine
Captures:
- mood
- habit adherence
- journaling
- stability / volatility / trend

### Life OS
Synthesizes cross-engine state and produces:
- current state
- observations
- course corrections
- engine navigation priorities

### Goal Alignment
Evaluates whether today's cross-engine state supports the active goal.

Supported v1 archetypes:
- perform
- lose
- maintain
- gain

Goal Alignment rules:
- deterministic
- confidence-aware
- generic across archetypes
- integrated into Today through compact UI contracts
- detail screens may explain, but not reinterpret, the engine

---

## Current Product Direction

AXIS has moved from:
multiple isolated trackers

to:
a behavioral operating system foundation

The next major direction is:
- adaptive day reshaping
- weekly reflection / trend awareness
- narrow natural language capture

This must be built without breaking the deterministic core.

---

## Coding Rules

### General
- Use strict TypeScript
- Prefer small composable functions
- Keep functions single-purpose
- Add types close to the domain that owns them
- Avoid giant files unless clearly justified
- Avoid hidden side effects

### Do not do these
- Do not put scoring logic in React components
- Do not put UI copy generation inside engine math functions
- Do not mix persistence concerns into scoring engines
- Do not mutate upstream observations or snapshots
- Do not bypass confidence handling
- Do not add generic abstraction layers without clear reuse

### Confidence handling
When signals are incomplete:
- lower confidence
- narrow claims
- prefer `unclear` over fake certainty

Never:
- invent neutral values for missing critical inputs
- imply strong support with low-confidence evidence

### Recommendation logic
Recommendations must:
- be deterministic
- be deduped
- prefer removing friction before adding demand
- avoid saying the same fix twice in different words
- respect system-critical warnings over goal-following suggestions

Priority order:
1. urgent system stability
2. goal-relevant guidance
3. supportive nudges

### Adaptive scheduling / reshaping
Life OS may propose.
Time engine validates and applies.

Rules:
- never silently mutate the day
- never move external calendar events
- never move locked blocks
- always support preview
- always support undo for applied reshapes
- do not pretend to optimize work the system cannot see

---

## UI Rules

### Product tone
Copy should feel:
- calm
- grounded
- precise
- non-moralizing
- non-prophetic

Good:
- "Recovery is thinner than the workload your day is carrying."
- "The current path is supported, but strain is rising."

Bad:
- "You are failing your goal."
- "You will miss your target unless..."
- "Crush your day."
- "Optimize everything."

### Today screen
Today is the command surface.
It should stay compact and narrative-first.

It should answer:
- what state am I in
- what matters most today
- what should I do next

Do not bloat Today with raw engine internals.

### Detail screens
Detail screens are trust surfaces.
They explain:
- blockers
- supports
- current path
- more aligned path
- recommended shifts

They must not introduce new scoring logic.

---

## Data / Persistence Rules

When adding new systems, prefer explicit persisted summaries over recomputing everything ad hoc from raw data.

If a feature needs trends, history, or weekly reasoning:
- introduce a dedicated history layer
- store normalized summaries
- do not bury trend logic in UI hooks

If current DB rows are incomplete for a domain contract:
- use an adapter layer
- centralize defaults there
- do not scatter fallback assumptions across the codebase

---

## Testing Rules

Every new engine or interpretation layer should have:
- deterministic fixture coverage
- aligned / at_risk / misaligned / unclear cases where applicable
- missing-data coverage
- strictness / threshold edge-case coverage
- integration tests for UI model contracts where relevant

Prefer widening the validation layer before rewriting engine logic.

When adding a new archetype or planner:
- prove genericity through shared fixtures
- avoid archetype-specific UI branching unless absolutely necessary

---

## How to Work on Tasks in This Repo

When given a task:

### 1. First understand the architecture
Before coding:
- inspect existing types
- inspect model builders
- inspect relevant tests
- find the correct layer boundary

### 2. Make the smallest safe change
Prefer:
- additive modules
- narrow file edits
- explicit contracts

Avoid broad rewrites unless required.

### 3. Preserve architecture
If the task touches:
- engine scoring
- observations
- goal alignment
- today model
- day reshaping

be careful not to collapse domain boundaries.

### 4. State uncertainty honestly
If a required field or source is unclear:
- add a targeted TODO
- keep contracts explicit
- do not invent false certainty

### 5. Validate
After changes, run the relevant checks if available:
- typecheck
- lint
- engine tests
- targeted tests for the edited subsystem

---

## Preferred File Organization Patterns

Examples of good patterns:

### Engine module
- types.ts
- helpers.ts / score-helpers.ts
- mapping.ts / signal-mapping.ts
- rules.ts
- planner.ts / alignment.ts
- explain.ts
- index.ts

### Feature module
- model.ts or detail-model.ts
- hook file
- presentational sections/components
- route file

### Test structure
- shared fixtures
- engine tests
- recommendation tests
- UI model tests

---

## Anti-Patterns to Avoid

- feature-heavy dashboards
- raw metric dumps on primary surfaces
- AI inserted where deterministic logic is sufficient
- recommendation spam
- hidden state mutation
- brittle one-off code for a single archetype
- UI components depending on raw engine internals
- “smart” logic without confidence semantics
- premature multi-goal optimization
- overengineering for hypothetical future modules

---

## Current Strategic Priorities

In order of importance:

1. Adaptive Day Reshaping v1
   - review-first
   - deterministic
   - preview/apply/undo
   - no hidden changes

2. Weekly Reflection / trend layer
   - based on persisted daily summaries
   - recurring blockers/supports
   - alignment trends
   - consistency trends

3. Narrow Natural Language Capture
   - only for high-frequency, low-ambiguity inputs first
   - must map to real write paths
   - do not build vague universal parsing too early

---

## Definition of "Done Enough to Be Real"

AXIS Alpha Complete means the system can:

1. Understand today
2. Explain why
3. Relate today to the user's goal
4. Recommend small high-impact shifts
5. Help reshape the day safely
6. Show meaningful weekly patterns
7. Keep input friction low enough to sustain signal quality

Until then, optimize for:
- structural clarity
- determinism
- trust
- reversibility
- narrative compression

---

## Instruction to Future Coding Agents

Do not optimize AXIS for feature count.

Optimize it for:
- clarity
- trust
- correctness
- calmness
- useful action

When in doubt:
- preserve architecture
- reduce noise
- prefer explainability
- choose the smaller safe step

---

## Repo Appendix

### Workspace commands
- Package manager: `pnpm`
- Root dev: `pnpm dev`
- Root iOS: `pnpm ios`
- Root Android: `pnpm android`
- Root lint: `pnpm lint`
- Root typecheck: `pnpm typecheck`
- Root engine tests: `pnpm test:engines`
- Mobile engine tests: `pnpm --dir apps/mobile test:engines`

### Important paths
- Mobile app: `apps/mobile`
- Time engine: `apps/mobile/src/engines/time`
- Body engine: `apps/mobile/src/engines/body`
- Mind engine: `apps/mobile/src/engines/mind`
- Life OS engine: `apps/mobile/src/engines/life-os`
- Goal Alignment feature: `apps/mobile/src/features/goal-alignment`
- Today command surface: `apps/mobile/src/features/today`

### Sensitive files and modules
- Do not casually rewrite `apps/mobile/src/engines/life-os/context.ts`
- Do not casually rewrite `apps/mobile/src/engines/life-os/observations.ts`
- Do not casually rewrite `apps/mobile/src/engines/life-os/goal-alignment/*`
- Do not casually rewrite `apps/mobile/src/engines/life-os/day-reshaping/*`
- Do not casually rewrite `apps/mobile/src/features/today/life-os-model.ts`
- Do not casually rewrite `apps/mobile/src/features/today/useLifeOsHomeData.ts`

### Local environment notes
- Supabase credentials live in `apps/mobile/.env`
- Expo-generated `.expo` output should remain local-only
- The mobile package expects Node `>=20.0.0 <24`
