# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
# Quy tắc phân việc

Trước khi làm, hãy tự phân loại task:

## GIAO cho Antigravity (/agy:delegate) nếu là một trong hai loại:

2. Việc FRONTEND: giao diện, HTML/CSS, component, layout, màu sắc,
   animation, responsive, các file trong thư mục frontend/
   (React/Vue/Next... nếu dự án dùng)

## Backend / logic xu, đồ: giao Antigravity NHƯNG viết bài kiểm tra trước
1. Claude viết trước bài kiểm tra (script Python nhỏ gọi `economy.handle` với các trường hợp: thành công, thiếu xu, dữ liệu sai, sai khu, lần đầu miễn phí...).
2. Giao Antigravity viết code cho đến khi qua hết bài kiểm tra.
3. Claude chỉ chạy bài kiểm tra: qua hết là xong (không đọc hết code); rớt bài nào thì sửa đúng chỗ đó.

## Cách kiểm tra việc Antigravity làm (tiết kiệm token)
- Đồ họa / giao diện: chụp ảnh bằng Chrome ẩn + xem lỗi JavaScript + `git diff --stat`, không đọc từng dòng.
- Logic: chạy bài kiểm tra.

## TỰ LÀM (không giao):
- Việc nhỏ, sửa lỗi gấp hoặc lỗi chưa rõ nguyên nhân
- Chỗ nối giữa nhiều file liên quan nhau
- Viết bài kiểm tra cho phần backend, review kết quả của Antigravity

## Nếu một task có cả hai phần
Tách ra: phần frontend giao cho Antigravity, phần backend tự làm.
Làm backend xong trước, rồi mới giao frontend để nó dùng đúng API.

## Quy trình bắt buộc
1. Trước khi giao việc: `git add . && git commit -m "trước khi giao Anti"`
2. Giao từng việc một, không để 2 bên sửa cùng file
3. Chờ Antigravity xong, xem `git diff` để kiểm tra
4. Không ổn thì `git restore .` rồi tự làm lại
5. Báo cho tôi biết việc nào đã giao, việc nào tự làm
## Project

"Ngủ Cùng Nhau" is a browser-based 2D multiplayer "virtual life" game (Vietnamese UI). The player is a beginner and talks in Vietnamese. Reply in Vietnamese, explain things briefly, and write code comments in Vietnamese to match the existing code. The README is in Vietnamese and is the source of truth for gameplay features.

## Commands

```
python -m pip install -r requirements.txt   # only dependency: aiohttp
python server.py                            # serves http://localhost:8080 (reads $PORT)
```
`run.bat` installs requirements and runs **`python dev.py`** (dev mode). The user keeps the game open in a browser while Claude edits and watches changes appear live, with no screenshots needed. Dev mode sets `DEV=1`, and then:
- **Editing `static/`**: the server's `dev_watch` sends `{"t":"reload"}`. The page saves its area and channel to sessionStorage (`nc_dev_back`), reloads, and auto-rejoins the same spot.
- **Editing `*.py` or `catalog.json`**: `dev.py` restarts `server.py`. On reconnect the client sees a new `boot` id in `welcome` and reloads.
- **Caching**: responses get `Cache-Control: no-store`.

Production (Render) runs `server.py` directly, so none of this is active there. A server crash in dev mode is printed to the run.bat window, and the server restarts on the next file save.

There is no build step, linter or test suite. The frontend is plain static JS with no bundler. To check a change, run the server and open the page. Phones on the same wifi can connect at `http://<LAN IP>:8080`.

Useful URL params for manual testing: `&gio=21:30` overrides the in-game clock, and `&season=xmas` forces a seasonal event (defined in `SEASONS` in `static/data.js`).

Deployment goes to Render (`render.yaml`, health check `/ping`). The player database is SQLite, at the path in `$GAME_DB` (default `./game.db`, gitignored). Render's free tier wipes it on every redeploy.

## Architecture

**Server: one aiohttp process, all state in memory plus SQLite.**
- `server.py` serves `/`, `/static/*`, `/ping`, `/static/catalog.js` and a single WebSocket endpoint at `/ws`. `ws_handler` is one big `if t == ...` dispatch on the JSON field `t` (`join`, `move`, `go`, `save`, `eco`, `sleep`, `tv`, `music`, `media`, `light`, `chat`, `pomo`, `outfit`, `furn`, `emote`, …). Room changes are pushed to clients with `broadcast(room, msg)`.
- **Area instances ("rooms")**: `pick_instance()` maps an area to a room key in `rooms`. Keys come in three kinds:
  - shared areas (`SHARED`) are split into channels of up to `CHANNEL_CAP` players: `park#1`
  - the dorm is joined by a room code: `sleep@CODE`
  - private areas (`PRIVATE`) get one instance per account: `home~<uid>`, `farm~<uid>`

  A session is in exactly one room at a time. Players move between areas through the map (`{"t":"go"}`), not by walking. To add an area, register it in `AREAS`, `SEATS`, `FLOORS`/`ENTRY` and the client drawing code.
- **Accounts** (`store.py`): `join` logs in with a token stored in the browser, or creates an account. Each uid may only have one connection, so a newer connection kicks the older one. Per-player data is a single JSON blob (`load_data`/`save_data`). `kv_get`/`kv_set` hold global state such as the stock market.
- **Economy is server-authoritative** (`economy.py`). Every coin or item change arrives as `{"t":"eco","a":<action>,"rid":…}`. `economy.handle()` looks up `ACTIONS[a]` and runs it as `fn(st, data, d)`, where `st` is the session and `data` is the player blob. A handler raises `EcoError` to reject the request, and `handle()` then rolls `data` back from a snapshot. Handlers queue side-broadcasts in `st["out"]`, and `flush_out` sends them. All randomness uses `economy.RNG` (SystemRandom). Clients never decide outcomes. The `save` message only accepts stat changes clamped by `clean_stats`, never coins or items.
- **Zone modules** `arcade.py`, `stock.py` and `dating.py` each export an `ACTIONS` dict. `server.py` merges these into `economy.ACTIONS` at import time. `stock_loop` and the bầu cua loop (`bc_loop`) are background asyncio tasks. `dating.SESSIONS` and `dating.FILTER` are injected in `start_background`. Dating enforces age groups (under 16 blocked, 16–17 and 18+ matched only within their group) and masks personal info with a regex. Keep those safety rules when changing it.
- **Salon (V6, `salon.py`)**: hairstyles and dyes come from `salon/hair_catalog.json`. Prices there are 1/100 of the V6 spec, chosen by the user to match the economy. `salon.py` loads it into `economy.CAT["SALON"]` and registers the `salonApply` eco action. It hooks into `economy.ENSURE_HOOKS` to migrate the pre-V6 `hair_*`/`hc_*` ids and to add `data["hairs"]` and `data["salonFree"]`, and it sets `economy.HAIR` so that `valid_outfit` only accepts owned styles and ignores client-sent hair colors. Dyes are paid per change and never owned. Hair is no longer part of `CLOTHES`.
- **`catalog.json`** is the single source for prices, rewards, crops, fish, clothes, furniture, quiz questions and zone config. The server loads it once at startup, so restart after editing. The client gets it as the global `CATALOG` through `/static/catalog.js` with quiz answers (`c`) removed.

**Client: `static/index.html` plus four script files that share globals (no modules).**
Load order is `catalog.js` → `data.js` (NPCS, SEASONS, display constants) → `life.js` (`Life`: stats, clock, shop/quiz UI, `Life.eco(action, params)` which returns a promise of the server's reply) → the main game script in `index.html` → `areas.js` (`Areas`: avatar layers, NPCs, farm, fishing, shops, wardrobe, home) → `zones.js` (`Zones`: arcade, stock and dating scenes and UIs) → `salon.js` (`Salon`: the hair salon area and the "Gương" mirror UI). `hair.js` (`Hair`: draws all 16 hairstyles in back, front and back-view layers, plus dye lookup) loads before `areas.js`, whose `drawAvatar` calls it.

`salon.js` adds its area by wrapping the `Zones.*` hooks (`has/draw/seat/tap/act/actLabel/npcAct/holes/over/onArea`) instead of touching `index.html`. A new area can follow the same pattern. NPC auto-lines use `Areas.say(id, text)`.

`index.html` holds the WebSocket client, input handling, the canvas render loop and a `draw<Area>()` function per area. Areas are drawn in landscape on a canvas of about 1000–1120×600. All graphics are drawn in code and all music is synthesized with WebAudio, so there are no image or audio assets yet.

## Godot client (`godot/`, paused: the web version is the active client)
The game is being rebuilt as a Godot 4.7 app (GDScript, GL Compatibility renderer, landscape) so it can ship on Google Play. It uses the same WebSocket protocol as the web client and connects to the same `server.py`, so web and app players share rooms. Work proceeds in phases. Phase 1 covers the lobby, joining, the park, movement (tap or WASD) and other players. Later phases add chat, map, channels, avatar, each area, then Android export with AdMob and Billing.
- `scripts/net.gd` is the `Net` autoload: a `WebSocketPeer` wrapper with `opened`, `closed` and `message` signals.
- `scripts/main.gd` builds the UI and world in code. `player.gd` and `park.gd` draw placeholder shapes with `_draw()`.
- The app keeps its own token in `user://save.cfg`, separate from the web client's localStorage, so it creates its own account.
- Default server is `ws://127.0.0.1:8080/ws`. Don't use `localhost`, which can resolve to IPv6 on Windows while the server listens on IPv4 only.
- Headless check (server must be running): `Godot_v4.7.2-stable_win64_console.exe --headless --path godot -- --test` joins the park, prints `TEST OK…` and exits 0. Run with `--import` first after adding files. Godot was installed via winget, and its path is in the user's memory notes.

## Other files
- `mota.md` (untracked), `laylout.md`, `venhanvat.md` and `tiemtoc/*.md` are design specs and notes written by the player. `mota.md` describes a Phaser/Vite plan that the current code does **not** follow. Treat these files as feature ideas, not as the architecture.
- The `*.zip` and `tiemtoc/*.png` files are sprite packs that are not wired into the game yet. The exception is the salon NPC portraits, which are copied to `static/salon/`.
- `art/characters/*.svg` are standalone chibi character illustrations in the style of `nu_01_mia.svg`, with animated copies in `art/characters/anim/`.
