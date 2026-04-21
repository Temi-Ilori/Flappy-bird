# Implementation Plan: Flappy Kiro

## Overview

Implement Flappy Kiro as a single `game.js` file that pairs with the existing `index.html`. The implementation follows a game-loop architecture using `requestAnimationFrame`, with all game state in a single module-scoped object. Tasks are ordered to build up the game incrementally: asset loading → state + physics → pipes + scoring → rendering → input + overlay wiring → integration.

## Tasks

- [x] 1. Set up game.js skeleton and asset loader
  - Create `game.js` with module-scoped state object and constants (`GRAVITY`, `FLAP_VELOCITY`, `MAX_FALL_SPEED`, `PIPE_WIDTH`, `PIPE_GAP`, `PIPE_SPEED`, `PIPE_INTERVAL`, `PIPE_MARGIN`, `CLOUD_SPEED`, `CLOUD_COUNT`, `HUD_HEIGHT`, `ROTATION_FACTOR`, `MAX_ROTATION`)
  - Implement `loadAssets()` returning a Promise that resolves with `{ img, jumpSnd, gameoverSnd }` — loads `assets/ghosty.png` as an `Image`, references `#snd-jump` and `#snd-gameover` from the DOM
  - Implement `readHighScore()` and `writeHighScore(score)` with try/catch and localStorage key `"flappyKiro_highScore"`
  - Implement `init()` that sizes the canvas to `window.innerWidth × window.innerHeight`, calls `loadAssets()`, reads high score, and wires the `resize` event handler
  - On asset load failure, update `#overlay-msg` text with the error and keep the START button hidden
  - On canvas context unavailable, log a console error and display a static error in the overlay
  - _Requirements: 1.1, 1.3, 1.4, 6.3, 6.4_

  - [ ]* 1.1 Write property test for localStorage round-trip
    - **Property 11: High score localStorage round-trip**
    - **Validates: Requirements 5.4, 6.3**

- [x] 2. Implement Ghosty physics and canvas resize
  - Implement `initGhosty(canvas)` that returns a `GhostyState` with `x` at ~20% canvas width, `y` at canvas centre, `vy = 0`, `height` fixed, `width` derived from image aspect ratio
  - Implement `updatePhysics(ghosty, canvas)` that applies `GRAVITY` to `vy` each frame (clamped to `MAX_FALL_SPEED`), updates `y`, clamps `y` so the top edge never goes below 0, and derives `rotation` from `vy`
  - Implement the `resize` event handler that recalculates canvas dimensions and clamps Ghosty's `y` to the new canvas height
  - _Requirements: 1.2, 3.1, 3.5, 3.6_

  - [ ]* 2.1 Write property test for gravity accumulation
    - **Property 2: Gravity accumulates velocity each frame**
    - **Validates: Requirements 3.1**

  - [ ]* 2.2 Write property test for rotation monotonicity
    - **Property 3: Rotation monotonically reflects velocity**
    - **Validates: Requirements 3.5**

  - [ ]* 2.3 Write property test for top boundary
    - **Property 4: Ghosty never exceeds top canvas boundary**
    - **Validates: Requirements 3.6**

  - [ ]* 2.4 Write property test for canvas resize
    - **Property 1: Canvas matches viewport on resize**
    - **Validates: Requirements 1.2**

- [x] 3. Checkpoint — Ensure physics tests pass, ask the user if questions arise.

- [x] 4. Implement pipe generation, scrolling, and culling
  - Implement `spawnPipe(canvas)` that creates a `PipeState` with `x = canvasWidth`, `gapY` randomised within safe bounds, `scored = false`
  - Implement `updatePipes(pipes, canvas, state)` that scrolls all pipes left by `PIPE_SPEED` per frame, spawns a new pipe when `framesSinceLastPipe * PIPE_SPEED >= PIPE_INTERVAL`, and removes pipes where `x + PIPE_WIDTH < 0`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.1 Write property test for pipe gap bounds
    - **Property 5: Pipe gap always within safe vertical bounds**
    - **Validates: Requirements 4.2**

  - [ ]* 4.2 Write property test for pipe scroll speed
    - **Property 6: Pipes scroll at constant speed**
    - **Validates: Requirements 4.3**

  - [ ]* 4.3 Write property test for pipe culling
    - **Property 7: Off-screen pipes are removed**
    - **Validates: Requirements 4.4**

- [x] 5. Implement collision detection and scoring
  - Implement `checkCollision(ghosty, pipes, canvasHeight)` using AABB with a 4px inset; returns `true` if Ghosty overlaps any pipe rectangle or Ghosty's bottom edge meets/exceeds `canvasHeight - HUD_HEIGHT`
  - Implement `updateScore(ghosty, pipes)` that iterates pipes, marks `pipe.scored = true` and increments score when `ghosty.x > pipe.x + PIPE_WIDTH` and `!pipe.scored`
  - _Requirements: 5.1, 5.2, 6.1_

  - [ ]* 5.1 Write property test for collision detection
    - **Property 8: Collision detection triggers game over**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 5.2 Write property test for score increment
    - **Property 9: Score increments exactly once per pipe passed**
    - **Validates: Requirements 6.1**

- [x] 6. Checkpoint — Ensure collision and scoring tests pass, ask the user if questions arise.

- [x] 7. Implement cloud state and scrolling
  - Implement `initClouds(canvas)` that creates `CLOUD_COUNT` clouds with randomised `x`, `y`, `width`, `height` spread across the canvas
  - Implement `updateClouds(clouds, canvas)` that scrolls each cloud left by `CLOUD_SPEED` per frame and repositions any cloud with `x + cloud.width < 0` to `x >= canvasWidth` with a new randomised `y`
  - _Requirements: 7.3, 7.4_

  - [ ]* 7.1 Write property test for cloud wrap
    - **Property 12: Cloud wraps to right edge when off-screen**
    - **Validates: Requirements 7.4**

- [x] 8. Implement all render functions
  - Implement `renderBackground(ctx, canvas)` — solid light-blue fill covering the full canvas
  - Implement `renderClouds(ctx, clouds)` — white rounded rectangles using `ctx.roundRect` or manual arc-based approach
  - Implement `renderPipes(ctx, pipes, canvas)` — green filled rectangles with darker border for top and bottom pipe of each pair; top pipe from `y=0` to `gapY - PIPE_GAP/2`, bottom pipe from `gapY + PIPE_GAP/2` to `canvasHeight - HUD_HEIGHT`
  - Implement `renderGhosty(ctx, ghosty, assets)` — draw `assets/ghosty.png` centred on `(ghosty.x, ghosty.y)` at `(ghosty.width × ghosty.height)`, rotated by `ghosty.rotation`, preserving aspect ratio
  - Implement `renderHUD(ctx, score, highScore, canvas)` — dark strip at bottom `HUD_HEIGHT` px, white monospace text `"Score: X | High: X"` centred
  - _Requirements: 7.1, 7.2, 4.5, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 8.1 Write property test for HUD text format
    - **Property 10: HUD text matches score format**
    - **Validates: Requirements 6.2**

  - [ ]* 8.2 Write property test for Ghosty aspect ratio
    - **Property 13: Ghosty sprite aspect ratio preserved**
    - **Validates: Requirements 9.4**

- [x] 9. Implement the game loop and state transitions
  - Implement `gameLoop(timestamp)` that calls `updatePhysics`, `updatePipes`, `updateClouds`, `updateScore`, `checkCollision`, then all render functions in order; schedules next frame via `requestAnimationFrame`
  - Implement `startGame()` that resets state (`ghosty.y` = canvas centre, `ghosty.vy = 0`, `pipes = []`, `score = 0`, `framesSinceLastPipe = 0`, fresh clouds), sets `phase = "playing"`, hides the overlay, and starts the game loop
  - Implement `triggerGameOver()` that cancels the animation frame, plays `#snd-gameover`, updates high score in localStorage if current score exceeds it, and shows the overlay with "GAME OVER", final score, and high score
  - _Requirements: 5.3, 5.4, 8.1, 8.2_

- [x] 10. Implement input handlers and overlay wiring
  - Implement `handleFlap()` — sets `ghosty.vy = -FLAP_VELOCITY`, plays `#snd-jump` (with `.catch()` to silence errors)
  - Implement `handleStart()` — calls `startGame()` when `phase` is `"idle"` or `"gameover"`
  - Wire `keydown` (Space), `click` (canvas), and `touchstart` (canvas) events: call `handleFlap()` when `phase === "playing"`, call `handleStart()` when `phase === "idle"` or `"gameover"`
  - Wire the `#start-btn` click to `handleStart()`
  - Update overlay DOM nodes: on start screen show title, flap instruction, high score, and START button; on game over show "GAME OVER", final score, high score, and RESTART button label
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4_

- [x] 11. Final checkpoint — Ensure all tests pass and the full game loop runs correctly in the browser, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with `numRuns: 100`; tag each test with `// Feature: flappy-kiro, Property N: <text>`
- All rendering functions operate on a mock canvas context in tests — no real browser required for unit/property tests
- High score is never reset on restart; only game state (Ghosty, pipes, clouds, score) is reset
- `CLOUD_SPEED` must always be less than `PIPE_SPEED` to maintain the parallax effect
