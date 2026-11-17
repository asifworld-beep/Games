# Raja Mantri Chor Sipahi

A four-player courtyard version of Raja Mantri Chor Sipahi. The courtyard, totems, chits, particles, and audio are generated in the browser; the game does not load external models, fonts, textures, or audio files.

## Run the game

From this project folder:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Choose a game mode in the lobby and select **Gather at the table** (online rooms are started by their host).

## Game modes

- **Solo vs. Bots:** play against three palace bots. Bot difficulty is configurable in Settings.
- **Pass & Play:** enter four names and pass the device. Each player gets a private chit screen before public roles are revealed.
- **Online room:** create a room and share its six-character code or invite link, or join an existing room. The host can fill open seats with bots.

Online rooms use PeerJS's public signaling service and require an internet connection. PeerJS provides browser-to-browser connections, not a trusted game server; the host coordinates each match. If a browser or peer disconnects, the host can replace that seat with a bot.

## Settings and play

Open **Settings** from the top bar to choose a nickname, totem appearance, bot difficulty, one of 13 languages, a procedural courtyard theme, sound and ambient music options, graphics quality, round count, and an optional turn timer. These preferences save automatically in this browser. Urdu uses right-to-left layout.

The Raja scores 1,000 points and the Sipahi 500. The Mantri scores 800 for a correct guess; when the guess is wrong, the Chor receives 800 instead. Tied scores share the same leaderboard rank. During the Raja and Mantri reveals, click the active chit or use the on-screen button. As Mantri, click one of the eligible totems or choose a player from the panel.

Use **How to Play** for a step-by-step guide. Audio is activated only after an interaction; use the speaker button or Settings to adjust sound.

## Checks

```sh
npm test       # game rules, scoring, localization
npm run lint   # Oxlint
npm run build  # production build
```
