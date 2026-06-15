# Mobility OS Production Blueprint

## Public Surface

Mobility OS presents corridor state as a live operational surface for Jordan.

The public-facing page is limited to:

- corridor projections
- live availability
- utilization and pressure signals
- booking controls for seat and cargo capacity
- map-focused runtime status

## Public Rules

- The UI renders corridor projections only.
- Client state does not compute corridor logic.
- Visible copy stays operational and map-focused.
- Internal contracts, event streams, and implementation doctrine are not published on the page layer.

## Runtime Summary

- Corridor projections are derived by the simulation runtime.
- Booking actions feed back into corridor availability and pricing before the next projection is rendered.
- The map remains the primary surface for reading network state.

## Internal-Only Note

Detailed engine contracts, orchestration flows, event definitions, pricing formulas, and transport bindings remain implemented for the simulation runtime but are intentionally omitted from this public blueprint.
