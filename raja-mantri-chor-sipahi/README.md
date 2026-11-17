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

Open **Settings** from the top bar to choose a nickname, totem appearance, bot difficulty, one of 13 languages, a procedural courtyard theme, sound and ambient music options, graphics quality, round count, an optional turn timer, and typography size and style. These preferences save automatically in this browser. Urdu uses right-to-left layout. Mobile layouts account for safe-area insets, use scrollable bottom-sheet dialogs, and reframe the courtyard camera on portrait screens.

The four-player roles are Raja (1,000), Mantri (800), Sipahi (500), and Chor (0); the five-player game adds Rani (900). The Raja calls “Mera Sipahi Kaun?”; in five-player mode, the Rani answers and calls the Sipahi. The Raja (and Rani in five-player mode) chant “Sipahi, Sipahi, Chor ko pakdo!” The Sipahi investigates the two hidden suspects, Mantri and Chor. Everyone earns their role points when the Chor is caught. If the Sipahi arrests the Mantri, the Chor takes the Sipahi’s 500 points while the Mantri keeps 800. Tied scores share the same leaderboard rank. During the Raja, Rani, and Sipahi reveals, click the active chit or use the on-screen button. As Sipahi, click one of the two suspect totems or choose a player from the panel.

Use **How to Play** for a step-by-step guide. Audio is activated only after an interaction; use the speaker button or Settings to adjust sound.

## Checks

```sh
npm test       # game rules, scoring, localization
npm run lint   # Oxlint
npm run build  # production build
```
