# WalkBass

Four-bar walking bass desk for bedroom producers and AI-music finishers.

Suno and loop DAWs put the upright on the root and leave it there. Session players walk the bass so the loop finally moves. WalkBass seats live FluidR3 chairs on that decision: roots vs walk, then exports the MIDI and WAV that drop on bar 1 of a DAW.

Live samples only — FluidR3 upright bass, piano, nylon guitar, trumpet, violin, and acoustic kit from the PreEight bank pinned to commit `d58301e4a494555f411a2afbc448b724136eee76`. No oscillators. Audio never leaves the tab.

## Distinct from yesterday and the rest of the line

| Tool | Job |
|------|-----|
| TagFour | Four-bar last-line tag after the money chorus |
| PreEight | Eight-bar musical pre-chorus climb |
| LiftTwo | Two bars of climb into the hook |
| AfterHook | Post-chorus vamp |
| EndEight | Last eight bars of the record |
| LastHook | Last chorus is the money chorus |
| **WalkBass** | Four bars that walk the bass under the loop you already have |

Yesterday's form desks write a section. WalkBass does not write a pre, a tag, a lift, or a key change. It seats an upright that walks.

## Pricing

One-time **$19** on Lemon Squeezy. Mirror on Gumroad. Do not subscribe; Forge Pass stays $24 for the cloud tools. This is a finite desk.

## License

MIT. workinwithai-create.

## Milestone 2026-10-12

Implemented production WAV export using OfflineAudioContext. Length is exactly Math.round(bars * 4 * 60 / bpm * 48000) samples at 48 kHz. First downbeat at sample 0. Peak limited to ≤ -1 dBFS. Filename walkbass-<recipe>-<bpm>bpm-<key>.wav. MIDI export stub remains; full multi-track SMF is the next milestone. Live deployment pending GitHub-Vercel integration link.

## Acceptance

(1) Export length exact for bars × 4 × 60 / bpm × 48000. (2) Loop seamless. (3) Background tab stops cleanly. (4) Live changes apply next step. (5) Missing samples named. (6) Sustains hold. (7) No @main, no Math.random in export.