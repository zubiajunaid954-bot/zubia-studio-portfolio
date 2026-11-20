# Zubia's Studio: Interactive 3D Portfolio

**Live site:** https://zubia-junaid-portfolio.vercel.app

A portfolio presented as a miniature 3D game studio. When the site opens, my avatar walks into the lobby and welcomes the visitor. As you scroll, the camera glides from room to room while the avatar guides you through each area:

| # | Studio area | Section |
|---|---|---|
| 01 | Lobby | Home: name, introduction, availability, CV |
| 02 | About Room | About me |
| 03 | Skills Station | Skills and technologies |
| 04 | Career Path | Education and experience |
| 05 | Project Gallery | Projects with filter, search and trailers |
| 06 | Trophy Wall | Achievements, certifications, memberships |
| 07 | Screening Room | Promo video (Module 3) |
| 08 | Contact Desk | Contact details and form (sending arrives in Module 5) |

## Features (Module 1)

- **3D studio**: a procedurally built isometric diorama in Three.js / React Three Fiber, with eight furnished rooms, a glowing path, animated details (server lights, floating signs, paper planes, spinning trophies) and a stage light that follows the tour.
- **Cinematic intro**: letterbox bars, a title card and a camera swoop. It lasts about 5 seconds, plays once per visit, and can be skipped with the button, Esc, Enter or by scrolling.
- **Avatar guide**: walks between rooms, faces the visitor, turns with the cursor and speaks a line in each room. Module 2 replaces the static model with a rigged, animated one.
- **Four themes** from the reference palettes: Amber Night, Violet, Lime & Forest and Mono Light. The choice is remembered.
- **Content stays usable**: every section is plain, accessible HTML on top of the 3D. The 3D code is lazy-loaded, with a progress chip while it loads.
- **Simple 2D view**: one-click toggle, and the default on devices without WebGL or with very low memory or CPU. The quality drops automatically if the frame rate falls.
- **Responsive**: desktop (card on the left, room on the right, studio map on the right edge), tablet and phone (room on top, card below, menu button).
- **Accessibility**: skip link, keyboard focus styles, ARIA labels and live regions, focus-trapped project dialog, and `prefers-reduced-motion` support.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # production build in dist/
```

## Customising

**Text, projects and links**: everything is in [`src/data/content.js`](src/data/content.js): profile, stats, about, skills, education, experience, achievements, certifications, projects and the promo video. To add a project, copy an existing entry, give it a unique `id`, and put its poster and trailer in `public/media/`.

**Studio areas**: [`src/data/zones.js`](src/data/zones.js) holds the area names, menu labels and the line the avatar says in each room.

**Themes**: [`src/themes.js`](src/themes.js). `ui` sets the page colours and `scene` sets the 3D colours and lights. Add a new key to create another theme; it appears in the theme picker automatically.

**3D rooms**: [`src/three/Rooms.jsx`](src/three/Rooms.jsx). Each room is built from the small kit in [`src/three/kit.jsx`](src/three/kit.jsx) (`Box`, `Cyl`, `Ball`, `Plant`, `Sign`), using theme colour names such as `'accent'`, `'wood'` or `'fabric'`. The gallery posters are listed in `GALLERY`.

**Avatar (Module 2)**: see [Blender avatar pipeline](#blender-avatar-pipeline-module-2) below. The source model is `blender/avatar_meshy_source.glb`. [`blender/optimize_avatar.py`](blender/optimize_avatar.py) reduces it to about 32k triangles, fixes the materials, shrinks the textures and writes `public/models/avatar.glb` plus `blender/avatar_static.blend`:

```bash
blender -b --factory-startup -P blender/optimize_avatar.py
```

To use a different avatar, replace `avatar_meshy_source.glb` and run the script again. Its scale and position are set in [`src/three/Avatar.jsx`](src/three/Avatar.jsx).

**CV**: replace `public/Zubia_Junaid_Resume.pdf`.

## Blender avatar pipeline (Module 2)

The avatar is my own character: generated as a base mesh in Meshy AI from a reference image, then prepared, rigged, skinned, textured and animated in Blender 5.0 with Python scripts, so every step can be repeated.

| Step | Script | Result |
|---|---|---|
| 1. Optimise | `blender/optimize_avatar.py` | 134k → 32k triangles, fabric-like material (Meshy's export was fully metallic), 1024px textures, feet on the floor → `avatar_static.blend` |
| 2. Measure | `blender/analyze.py` | Horizontal slices of the mesh, used to place every joint (hips, knees, shoulders, elbows, wrists) |
| 3. Rig + skin | `blender/rig_avatar.py` | 19-bone skeleton (spine, neck, head, shoulders, arms, hands, legs, feet). Blender's heat weighting fails on AI meshes, so weights are computed per body region by distance to the bones, then smoothed and normalised. Hoodie faces get their own material so the website can tint it → `avatar_rigged.blend` |
| 4. Animate + export | `blender/animate_avatar.py` | Seven keyframed clips, exported as `public/models/avatar.glb` (1.8 MB) → `avatar_animated.blend` |
| Check | `blender/preview_poses.py` | Renders key poses to verify deformation |

```bash
blender -b --factory-startup -P blender/optimize_avatar.py
blender -b --factory-startup -P blender/rig_avatar.py
blender -b --factory-startup -P blender/animate_avatar.py
```

**Animations**

| Clip | Length | Used for |
|---|---|---|
| Idle | 4 s loop | Breathing, weight shift and a slight head turn while standing |
| Walk | 1.1 s loop | Walking between rooms; plays faster for longer distances |
| Wave | 2.9 s | Welcome in the Lobby and at the Contact Desk, and when she is clicked |
| Point | 2 s | Pointing at the Skills Station desk and the Project Gallery wall |
| Guide | 1.9 s | "This way" arm sweep along the Career Path |
| Present | 2 s | Left hand, open palm towards the room, in the About Room and Screening Room |
| Celebrate | 1.9 s | Double fist-pump at the Trophy Wall |

**On the website** ([`src/three/Avatar.jsx`](src/three/Avatar.jsx)): clips crossfade through a `THREE.AnimationMixer`, her head and body turn towards the mouse on top of the animation, clicking her plays the wave with a random line, and the hoodie is tinted with the active theme's colour.

**Submission files**: `blender/avatar_animated.blend` (rig and animations), `blender/avatar_rigged.blend`, `blender/avatar_static.blend`, and `public/models/avatar.glb`.

## Promo video (Module 3)

**"Behind the Doors"**: a 48-second promo built in Adobe After Effects 2026 (1920×1080, 30 fps, H.264 + AAC).

A dark 3D corridor of glowing arched doors. A real AE camera glides up to each door, the door swings open on its hinge, light floods out and we fly through into what is behind it.

| Time | Scene |
|---|---|
| 0–6 s | A door frame draws itself in light ("Every game starts behind a door") and opens |
| 6–12 s | The 3D studio and avatar: "Hi, I'm Zubia Junaid" with a swapping role pill |
| 12–16 s | The corridor: Unity, Unreal, VR/XR and Web & C++ doors ("Magic happens behind the doors") |
| 16–33 s | Through each door: two project trailers per area with titles |
| 33–40 s | "Let's go back in time": 2023 NED → 2025 TechCami → 2026 Treeobit → 2026 Game Storm |
| 40–44 s | A golden Trophies door opens onto the trophy wall: GameCon runner-up, 3 internships, 16 projects |
| 44–48 s | End card with name, roles and contact links |

The website footage was recorded in the site's Violet theme so it contrasts with the amber titles and doors.

| File | What it is |
|---|---|
| `after-effects/Zubia_Junaid_Promo.aep` | Editable After Effects project (submission) |
| `after-effects/behind_the_doors.jsx` | ExtendScript that builds the project: 3D door precomps, camera moves, text animators, effects, music |
| `media-src/render/Zubia_Junaid_Promo_master.mp4` | Full-quality render (submission) |
| `public/media/promo.mp4` | Compressed web copy, played in the Showreel section and on the 3D cinema screen |
| `media-src/clips/` | Website footage recorded with `scripts/record-clips.mjs` (site "film mode": `?film=1`) |

**Techniques**: 3D layers and a two-node camera with eased position and point-of-interest keys, depth of field, hinged door rotation (anchor on the door edge), shape layers with Trim Paths draw-on, Glow, Fractal Noise fog, Linear Wipe shades, text animators (per-character opacity, blur and tracking reveals), expression-driven shapes, letterbox, vignette and grain, and an audio fade.

**Music**: "Trailer" by PaulYudin, from Pixabay, used under the Pixabay Content License (free to use, no attribution required).

**Rebuild**: open `behind_the_doors.jsx` with File > Scripts > Run Script File in After Effects. It saves the `.aep` with a render-queue item. Then render without the AE window, so Windows can't close it as "not responding":

```bash
"C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe" -project "D:\My_Website_v2\after-effects\Zubia_Junaid_Promo.aep" -rqindex 1
```

## RAG chatbot (Module 4)

"Ask Zubia" answers visitors' questions about me from my CV and project notes, using retrieval-augmented generation with Google Gemini (free tier).

| Step | Where | What happens |
|---|---|---|
| 1. Collect | `knowledge/*.md`, `src/data/content.js` | CV facts (about, education, experience, skills, achievements, certifications, contact, this website) and every project's details |
| 2. Chunk | `scripts/build-index.mjs` | Paragraphs packed into chunks of up to 700 characters, each prefixed with its document title → 40 chunks |
| 3. Embed | `api/_lib/gemini.js` | `gemini-embedding-001`, 768 dimensions, normalised (`RETRIEVAL_DOCUMENT` task type) |
| 4. Store | `api/_data/index.json` | The vector index: text, title, section anchor and vector for each chunk |
| 5. Retrieve | `api/_lib/rag.js` | The question (plus the previous one, for follow-ups) is embedded and ranked by cosine similarity with a small keyword bonus; the top 3–6 passages are kept |
| 6. Generate | `api/chat.js` | `gemini-3.5-flash-lite` (fallback `gemini-3.8-flash`) answers in first person **only from the passages**, returning JSON with the answer, the passage ids it used, and topics |
| 7. Cite | `src/components/ChatPanel.jsx` | The sources it used appear as chips; clicking one jumps to that section or opens that project |

**Guardrails**: if the answer isn't in the documents, it says "That's not in my records". It never shares my phone number (email and LinkedIn instead), treats passages as data rather than instructions, replies in English (Urdu or Roman Urdu only when asked in Urdu), and limits each visitor to 30 questions per 10 minutes.

**Bonus features**: voice questions (🎤, Web Speech API), spoken answers (🔊 toggle, plus a speaker button on each answer), clickable source citations, suggested questions, and multilingual replies.

**Setup**: put `GEMINI_API_KEY=...` in `.env` (never committed). Run `npm run index` after editing `knowledge/` or projects. `npm run dev` serves `/api/chat` locally through a small Vite plugin, using the same handler that runs as a serverless function on Vercel.

## Free Roam Mode (bonus game)

An optional game on top of the site. Nothing changes for visitors who don't play.

- **Start**: pick FREE ROAM from the ZJ Arcade menu (see below). The coin is already in, so play starts right where the avatar stands.
- **Play**: the visitor controls my avatar around the miniature studio. Use WASD or the arrow keys (Shift to run), the on-screen thumb joystick on phones and touch screens (push it far to run), or click/tap the floor to walk there. The camera follows her, the room she's in lifts and lights up, and walls, partitions and furniture have collision (`src/game/world.js`).
- **Talk**: 8 glowing spots (reception, portrait, workstation, career path, poster wall, trophy podium, cinema screen, mailbox). Walk up and press E, or tap the spot. An RPG-style dialogue box opens with my avatar's face and a typewriter intro; she turns and presents the object, and the visitor picks a suggested question or types or speaks their own. Answers come from the same RAG assistant (`/api/chat`).
- **Progress**: a HUD tracks discoveries (0/8), with a toast and sound for each new one. Finding all 8 shows a "STUDIO COMPLETE" card with stats, Download CV and Contact buttons.
- **Exit**: Esc (or the Exit button) returns to the normal tour exactly where you were.
- Sound effects are tiny WebAudio synth blips (no audio files). There's an optional "read answers aloud" toggle, and the game only appears in the 3D view.

Files: `src/game/world.js` (collision, spots, input, sound), `src/three/GameLayer.jsx` (rings, prompts, tap-to-walk), `src/components/GameUI.jsx` (start screen, HUD, dialogue, completion), plus the game branch in `src/three/Avatar.jsx` and the follow camera in `src/three/Studio.jsx`.

## ZJ Arcade (bonus mini games)

Optional mini games, opened from the arcade machines in the Project Gallery or the 🎮 Arcade button in the top bar.

- **Coins**: every visitor gets 1 free coin, and each room they visit for the first time earns a bonus coin (a gold coin pops above the avatar with a "ching"). The counter only shows inside the arcade. Coins never block play: at 0 the arcade shows FREE PLAY.
- **Insert-coin scene** (3D): the avatar walks to the front machine and turns to face it. She plays a Blender clip (`InsertCoin` in `blender/animate_avatar.py`): she reaches into her hoodie pocket, pulls out a spinning gold "ZJ" coin attached to her right hand bone (`src/three/coin.js`), winds up and flicks it. The coin arcs into the glowing slot with a metallic clink. Then the slot flashes, the marquee chase lights race, the screen boots and the camera dives into it. A CRT power-on effect opens the game menu. Skip and Esc are always available. Without the 3D view, or with reduced motion, a 2D coin drops into a slot instead.
- **FIT CHECK** (online): "Is Zubia right for your studio?" There are 10 requirement cards (Unity, VR/XR, Enemy AI, Unreal, Multiplayer, 3D & animation, Teamwork, Consistency, Fast learner, Ships on deadlines) plus an "Other: type your own" card.
  - Flipping a card shows a score out of 10 with a bar, a verdict, the evidence from her CV and an honest gap. A live Match Meter averages the checked cards.
  - `api/fit.js` gives Gemini her whole knowledge base as evidence, with a strict scoring rubric that forbids inventing anything. The 10 preset cards are scored ahead of time with `npm run fit` (saved to `api/_data/fit.json`, re-run after `npm run index`), so they flip instantly even when Gemini is slow.
  - Custom requirements are length-limited and rate-limited, and are treated as data, not instructions.
  - Labelled "AI estimate based on Zubia's CV". Download CV and Contact are always at hand.
- **Offline**: online games show a themed "📡 SIGNAL LOST" screen.
- **HOW WELL DO YOU KNOW ZUBIA?** (works offline):
  - 5 rounds drawn from a pool of 17 questions written from her CV and projects (`src/game/quiz.js`). Each question card flips in, and the 4 answer cards deal in and flip to show ✔ or ✘.
  - A 15-second timer that ticks down the last 3 seconds. Points come from speed × combo (×1.5, ×2, ×3 for streaks).
  - Ranks: Legendary Recruiter (5/5), Talent Scout (3–4) and Rookie. The best score is saved.
  - Getting 3 or more right unlocks Zubia's holographic player card, which tilts with the pointer and has a rainbow foil and game-style ratings.
  - Every answer shows a fact. When online, it also adds a "Zubia says" line from the RAG assistant.
- **CRUNCH TIME: Squash the Bugs** (works offline): a tower-defense board in the studio's miniature style, in its own 3D canvas. The studio behind it pauses while you play.
  - Bugs, fast Glitches and armoured Crashes crawl along the glowing path from the BUG TRACKER door to RELEASE DAY. Wave 10 brings the MERGE CONFLICT boss.
  - **You do all the firing:** towers never shoot on their own. Tap a bug and the nearest tower fires its own shot at it, auto-aimed to the closest bug: a Unity fireball, an instant C# laser beam, a Blender frost blast that slows, or an Unreal cannon shell with a big splash. With no towers built, the shot comes from the Release Day pad.
  - **Fireballs:** you start with 1. Squashing bugs earns score, and each milestone (60, 180, 380, 650, 1000) adds one more fireball slot, up to 6. Used fireballs recharge one at a time. Every wave raises the fire power: more damage, bigger blasts, faster recharge. Balanced with a simulated player (`src/game/crunch.js`): an active player wins, while slow tapping or a single tower type loses.
  - Spend ☕ coffee on 4 towers: Unity Turret (fast shots), C# Laser (beam), Blender Freeze (slowing frost pulse) and Unreal Cannon (splash shells). Each can be upgraded to Lv 3 or sold.
  - 20 deadline health, ×2 speed, pause, and keys (1–4 towers, Space next wave, P, F, Esc). Phones get a side view so the board is bigger.
  - The rules are pure JS in `src/game/crunch.js`, balanced with a headless simulation: random placement usually loses around waves 6–9, and sensible placement wins.
  - The game's code is prefetched in the background, so it still works if the connection drops.
- **Sound**: a synthesised arcade sound pack (`src/game/sound.js`: coin, glint, flick, clink, boot jingle, menu blips, card flip, score arpeggio, signal lost), with a mute toggle that is remembered.

Files: `src/components/Arcade.jsx` + `src/arcade.css` (HUD, coin drop, boot, menu, Fit Check), `src/game/fit.js`, `api/fit.js`, the `Arcade` machine in `src/three/Rooms.jsx`, and the arcade branches in `src/three/Avatar.jsx` and `src/three/Studio.jsx`.

## Trailer music

Most project trailers were recorded without sound, so each one has an original music bed generated by `scripts/trailer_music.py`. It's a small numpy synthesizer with oscillators, drums, filters and reverb, so there are no downloads and no copyright issues. Each mood matches its game:

- **Horror:** The Abduction
- **Mystery:** VR Escape Room
- **Sci-fi pulse:** Warp, VR-UAVSim
- **Chiptune:** Spikes Rush, Germ Runner, Snake
- **Board game:** Ludo
- **Lofi:** Cyber Cafe

Every track is generated to the exact length of its video, then mixed in with ffmpeg (`-c:v copy`, AAC 160k). The silent originals are kept in `media-src/trailers-original/`. The Unbroken Oath and The Masked Regime keep their own audio.

## Contact form and email (Module 5)

The Contact Desk form sends real email through **Resend**. The server code is `api/contact.js`, and the form is `src/components/ContactForm.jsx`.

- **Validation, twice:** the browser gives instant hints, and the server re-checks every field: name 2–80 characters, a valid email, subject 3–120, message 10–3000. Server errors are shown under the right field.
- **Clean input:** control characters and line breaks are removed from one-line fields, which blocks email header injection. Everything is HTML-escaped in the email.
- **Invisible spam protection** (no puzzle for visitors):
  - A hidden honeypot field that bots fill in.
  - A "too fast to be human" timer (under 3 seconds).
  - Rate limits: 3 messages per visitor per 10 minutes, and 30 per hour overall.
  - At most 3 links, a spam-phrase filter, and duplicate-message detection.

  Bots receive a normal-looking success, so they can't tell what blocked them.
- **Sending:** the email goes to `CONTACT_TO` with `reply_to` set to the visitor, so pressing Reply answers them. The subject is `[Portfolio] …` with a formatted HTML body and a plain-text fallback.
- **Messages to the visitor:**
  - A "Sending…" spinner.
  - A success card with an animated check mark. In 3D, the avatar also celebrates and says thanks.
  - Friendly errors for validation, rate limit, duplicates, offline, timeout and server problems. Each error gives the email address as a fallback.
- **Keys:** `RESEND_API_KEY` (a sending-only key) and `CONTACT_TO` are in `.env`, which is never committed. See `.env.example`.
- **Delivery evidence:** every sent email is logged with Resend's message ID, for example `contact: sent id=01a1e855-… subject="Module 5 delivery test"`. The visitor's address and message text are not logged. The rest of the evidence is the email in the inbox plus screenshots of each form state.
- **Limit:** without a verified domain, Resend's `onboarding@resend.dev` sender can only deliver to the Resend account owner's address. Visitors therefore don't get an automatic reply email; they get the on-site confirmation instead.

## Deployment (Module 6)

The site runs on Vercel: the Vite build is served as static files and the three files in `api/` run as serverless functions (`vercel.json` sets their time limits and bundles `api/_data/` with them). `.vercelignore` keeps source material and secrets out of the upload.

- API keys (`GEMINI_API_KEY`, `RESEND_API_KEY`) are set in the Vercel dashboard under Settings → Environment Variables, never in the repo.
- Deploy from this folder with the Vercel CLI installed in the project: `npx vercel deploy --prod` (a preview without `--prod`).

## Tech stack

React 19 · Vite · Three.js · React Three Fiber · drei · Zustand · Blender (avatar preparation)

## Project structure

```
blender/        avatar source, optimisation script, .blend
public/         avatar GLB, project posters/trailers, profile photo, CV
src/data/       content.js (all text), zones.js (studio areas)
src/three/      Studio (canvas, camera, lights), Rooms, Avatar, kit, layout
src/components/ Header, Intro, Sections, ProjectModal, ContactForm, ZoneRail
src/themes.js   colour themes
```
