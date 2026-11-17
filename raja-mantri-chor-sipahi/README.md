# Raja Mantri Chor Sipahi

A four- or five-player courtyard version of Raja Mantri Chor Sipahi. The courtyard, totems, chits, particles, and audio are generated in the browser; the game does not load external models, textures, or audio files. Optional Google Fonts are loaded for the selected type style and writing system.

## Run the game

From this project folder:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Choose a game mode in the lobby and select **Gather at the table** (online rooms are started by their host).

## Game modes

- **Solo vs. Bots:** play against palace bots in a four- or five-player court. Bot difficulty is configurable in Settings.
- **Pass & Play:** choose four or five players, enter their names, and pass the device. Each player gets a private chit screen before public roles are revealed.
- **Online room:** create a room and share its six-character code or invite link, or join an existing room. The host can choose four or five seats and fill open seats with bots.

Online rooms use PeerJS's public signaling service and require an internet connection. PeerJS provides browser-to-browser connections, not a trusted game server; the host coordinates each match. If a browser or peer disconnects, the host can replace that seat with a bot.

## Settings and play

Open **Settings** from the top bar to choose the four- or five-player variant, nickname, character style, skin tone and outfit, bot difficulty, one of 14 language options, courtyard theme, audio, graphics, round count (3, 5 or 7), investigation timer (20, 25 or 30 seconds), and typography. These preferences save automatically in this browser. Urdu uses right-to-left layout. Mobile layouts account for safe-area insets, use scrollable bottom-sheet dialogs, and reframe the courtyard camera on portrait screens.

Typography presets range from Extra Small (50%) to Large (112%); the custom slider covers 70–125% in 5% steps, so 50% and 112% are preset-only. The trophy button opens the live leaderboard, with current-round awards and cumulative totals. Final standings remain available until a fresh game or reset.

Choose a game mode from the lobby dock or the Game Rules section of Settings; mode changes are available in the lobby. In Pass & Play, scroll the name chips horizontally to edit each player; seat labels update immediately. Settings groups language, world, table and music selections into searchable menus. It offers four engraved table styles and five courtyard worlds, with a river, lotus pond, trees and drifting clouds. Monsoon and twilight bring rain; torch flames follow the day or night theme.

Drag to orbit the courtyard, and pinch or scroll to zoom. The lobby slowly rotates automatically, pauses when you interact, and resumes after four seconds of inactivity. It does not auto-rotate during play; use **Reset camera** in Settings to return to your seat. Short landscape viewports scroll vertically. The dealer rotates each round and tosses the chits before they settle at the seats.

The camera orbits around the center of the table without panning, with a wider field of view on narrow screens. Rani's localized call prefers a matching female voice, then an English female voice. If the device has no recognized female voice or speech synthesis, the call cannot be spoken; the procedural chime still plays when audio is enabled.

The player variant and Game Rules & Variant are at the top of Settings. Open chat and scroll the single quick-action row from quick messages to reactions; game controls remain available above it, and round points can be expanded from the compact result.

The optional procedural music has four tracks: Royal Darbar, Moonlit Sarod & Flute, Sacred Temple, and Silent Courtyard. Music has its own volume and mute control in Settings, separate from sound effects; the top-bar speaker mutes all audio. Music ducks briefly during the chant and role reveal. Audio starts after a user interaction, and the nature track changes between daytime birds and nighttime crickets.

The four-player roles are Raja (1,000), Mantri (800), Sipahi (500), and Chor (0); the five-player game adds Rani (900). The Raja calls “Mera Sipahi Kaun?”; in five-player mode, the Rani answers and calls the Sipahi. The Raja (and Rani in five-player mode) chant “Sipahi, Sipahi, Chor ko pakdo!” The Sipahi investigates the two hidden suspects, Mantri and Chor. Everyone earns their role points when the Chor is caught. If the Sipahi arrests the Mantri, the Chor takes the Sipahi’s 500 points while the Mantri keeps 800. Tied scores share the same leaderboard rank. Open your private chit and let the reveal sequence play. As Sipahi, select a suspect and confirm the arrest; at zero the selected suspect, or a random suspect if none is selected, is arrested automatically.

Roles and suspects are revealed in sequence before the round summary. The sequence waits for its minimum holds and spoken lines; the chant also waits for connected players' speech to finish. A quick arrest can finish a round in under 45 seconds, while a full human investigation, additional pass-and-play peeks, or longer speech can make it exceed 60 seconds. Use **How to Play** for a step-by-step guide. Audio is activated only after an interaction; use the speaker button or Settings to adjust sound. The chant uses a matching installed browser voice when available, with a procedural percussion and horn fallback when a voice is unavailable. Speech voices and availability depend on the browser and device.

## Checks

```sh
npm test       # game rules, scoring, localization
npm run lint   # Oxlint
npm run build  # production build
```
