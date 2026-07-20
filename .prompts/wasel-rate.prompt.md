## Prompt: Rate Wasel

Goal: Given a short description or context about the `wasel` project or feature, produce a concise numeric rating out of 10 along with a 1-2 sentence justification and 2 brief suggestions for improvement.

Inputs:
- `context` (required): A short description of the `wasel` project, feature, or artifact to rate. Can include pros/cons, usage notes, or metrics.
- `criteria` (optional): Comma-separated list of evaluation criteria (default: "usability, performance, reliability, documentation").

Output format (strict):
1. Rating: X/10
2. Justification: 1-2 sentences
3. Suggestions: Two bullet points, each 6-12 words

Examples:

- Invocation:
  - context: "Wasel is a lightweight offline-first PWA for delivery tracking; sync succeeds 95% of time, UI is minimal."
  - criteria: "usability, sync reliability"

- Expected output:
  1. Rating: 7/10
  2. Justification: Sync reliability is strong but UI needs polish.
  3. Suggestions:
     - Improve UI affordances for tracking status
     - Add retries and exponential backoff for sync

Notes and guidance:
- Keep the rating concise and defensible.
- Avoid long-form essays; 1-2 sentence justification only.
- When `criteria` provided, weight them in the judgment.

File saved as `.prompts/wasel-rate.prompt.md`
