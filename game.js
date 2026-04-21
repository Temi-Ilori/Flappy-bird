// Flappy Kiro — game.js
// Feature: flappy-kiro

import {
  GRAVITY, FLAP_VELOCITY, MAX_FALL_SPEED, PIPE_WIDTH, PIPE_GAP,
  PIPE_SPEED, PIPE_INTERVAL, PIPE_MARGIN, CLOUD_SPEED, CLOUD_COUNT,
  HUD_HEIGHT, ROTATION_FACTOR, MAX_ROTATION,
  initGhosty, updatePhysics,
  updatePipes, updateClouds, updateScore, checkCollision, initClouds,
  readHighScore, writeHighScore,
} from "./game.logic.js";

// ─── Constants (re-exported from game.logic.js, kept here for reference) ─────
// All constants are now imported above.

// ─── Module-scoped state ─────────────────────────────────────────────────────
const state = {
  phase: /** @type {"idle"|"playing"|"gameover"} */ ("idle"),
  ghosty: null,
  pipes: [],
  clouds: [],
  score: 0,
  highScore: 0,
  framesSinceLastPipe: 0,
  assets: null,
  rafId: null,
};

// ─── Asset Loader ─────────────────────────────────────────────────────────────
/**
 * Loads all game assets.
 * @returns {Promise<{img: HTMLImageElement, jumpSnd: HTMLAudioElement, gameoverSnd: HTMLAudioElement}>}
 */
function loadAssets() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const jumpSnd     = document.getElementById("snd-jump");
      const gameoverSnd = document.getElementById("snd-gameover");
      resolve({ img, jumpSnd, gameoverSnd });
    };
    img.onerror = () => {
      reject(new Error("Failed to load: assets/ghosty.png"));
    };
    img.src = "assets/ghosty.png";
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
/**
 * Initialises the game: sizes canvas, loads assets, reads high score, wires resize.
 */
function init() {
  const canvas  = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const msg     = document.getElementById("overlay-msg");
  const startBtn = document.getElementById("start-btn");
  const bestEl  = document.getElementById("best-score");

  // Size canvas to viewport
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Verify 2D context is available
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Flappy Kiro: canvas 2D context unavailable.");
    if (msg)      msg.textContent = "Error: your browser does not support Canvas 2D.";
    if (startBtn) startBtn.style.display = "none";
    return;
  }

  // Read persisted high score
  state.highScore = readHighScore();

  // Set up start screen overlay content
  const titleEl = overlay && overlay.querySelector("h1");
  if (titleEl)  titleEl.textContent  = "👻 FLAPPY KIRO";
  if (msg)      msg.textContent      = "Press Space or tap to flap!";
  if (bestEl)   bestEl.textContent   = `Best: ${state.highScore}`;
  if (startBtn) startBtn.textContent = "START";

  // Load assets
  loadAssets()
    .then((assets) => {
      state.assets = assets;
      // Initialise Ghosty now that we have the image for aspect ratio
      state.ghosty = initGhosty(canvas, assets.img);
      // Show start button now that assets are ready
      if (startBtn) startBtn.style.display = "";
    })
    .catch((err) => {
      if (msg)      msg.textContent = String(err.message || err);
      if (startBtn) startBtn.style.display = "none";
    });

  // Wire input events
  wireInput();

  // Wire resize handler
  window.addEventListener("resize", () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clamp Ghosty's y to new canvas bounds if currently in use
    if (state.ghosty) {
      const minY = state.ghosty.height / 2;
      const maxY = canvas.height - HUD_HEIGHT - state.ghosty.height / 2;
      if (state.ghosty.y < minY) state.ghosty.y = minY;
      if (state.ghosty.y > maxY) state.ghosty.y = maxY;
    }
  });
}

// ─── Render Functions ─────────────────────────────────────────────────────────

/**
 * Renders a solid light-blue background covering the full canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number, height: number }} canvas
 */
export function renderBackground(ctx, canvas) {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Renders clouds as white rounded rectangles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ x: number, y: number, width: number, height: number }>} clouds
 */
export function renderClouds(ctx, clouds) {
  ctx.fillStyle = "#ffffff";
  for (const cloud of clouds) {
    const r = cloud.height / 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(cloud.x, cloud.y, cloud.width, cloud.height, r);
    } else {
      // Manual arc-based rounded rectangle fallback
      ctx.moveTo(cloud.x + r, cloud.y);
      ctx.lineTo(cloud.x + cloud.width - r, cloud.y);
      ctx.arcTo(cloud.x + cloud.width, cloud.y, cloud.x + cloud.width, cloud.y + r, r);
      ctx.lineTo(cloud.x + cloud.width, cloud.y + cloud.height - r);
      ctx.arcTo(cloud.x + cloud.width, cloud.y + cloud.height, cloud.x + cloud.width - r, cloud.y + cloud.height, r);
      ctx.lineTo(cloud.x + r, cloud.y + cloud.height);
      ctx.arcTo(cloud.x, cloud.y + cloud.height, cloud.x, cloud.y + cloud.height - r, r);
      ctx.lineTo(cloud.x, cloud.y + r);
      ctx.arcTo(cloud.x, cloud.y, cloud.x + r, cloud.y, r);
      ctx.closePath();
    }
    ctx.fill();
  }
}

/**
 * Renders all pipe pairs as green rectangles with a darker border.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ x: number, gapY: number }>} pipes
 * @param {{ height: number }} canvas
 */
export function renderPipes(ctx, pipes, canvas) {
  const fillColor   = "#5a9e3a";
  const borderColor = "#3d6e28";
  const floor = canvas.height - HUD_HEIGHT;

  for (const pipe of pipes) {
    const topPipeBottom    = pipe.gapY - PIPE_GAP / 2;
    const bottomPipeTop    = pipe.gapY + PIPE_GAP / 2;

    // Top pipe: y=0 to gapY - PIPE_GAP/2
    ctx.fillStyle = fillColor;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeBottom);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, topPipeBottom);

    // Bottom pipe: gapY + PIPE_GAP/2 to canvasHeight - HUD_HEIGHT
    const bottomHeight = floor - bottomPipeTop;
    ctx.fillStyle = fillColor;
    ctx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, bottomHeight);
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(pipe.x, bottomPipeTop, PIPE_WIDTH, bottomHeight);
  }
}

/**
 * Renders Ghosty sprite centred on (ghosty.x, ghosty.y), rotated by ghosty.rotation.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, width: number, height: number, rotation: number }} ghosty
 * @param {{ img: HTMLImageElement }} assets
 */
export function renderGhosty(ctx, ghosty, assets) {
  ctx.save();
  ctx.translate(ghosty.x, ghosty.y);
  ctx.rotate(ghosty.rotation);
  ctx.drawImage(
    assets.img,
    -ghosty.width / 2,
    -ghosty.height / 2,
    ghosty.width,
    ghosty.height
  );
  ctx.restore();
}

/**
 * Returns the HUD display text for the given score and high score.
 * Exported for testing purposes.
 * @param {number} score
 * @param {number} highScore
 * @returns {string}
 */
export function hudText(score, highScore) {
  return `Score: ${score} | High: ${highScore}`;
}

/**
 * Renders the HUD: dark strip at bottom, centred white monospace score text.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} score
 * @param {number} highScore
 * @param {{ width: number, height: number }} canvas
 */
export function renderHUD(ctx, score, highScore, canvas) {
  const y = canvas.height - HUD_HEIGHT;

  // Dark background strip
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, y, canvas.width, HUD_HEIGHT);

  // Centred white monospace text
  ctx.fillStyle = "#ffffff";
  ctx.font = `18px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(hudText(score, highScore), canvas.width / 2, y + HUD_HEIGHT / 2);
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

/**
 * Main game loop — called every animation frame while phase === "playing".
 * @param {DOMHighResTimeStamp} _timestamp
 */
function gameLoop(_timestamp) {
  const canvas = document.getElementById("canvas");
  const ctx    = canvas.getContext("2d");

  // Update physics
  state.ghosty = updatePhysics(state.ghosty, canvas);

  // Update pipes
  const pipesResult = updatePipes(state.pipes, canvas, state.framesSinceLastPipe);
  state.pipes = pipesResult.pipes;
  state.framesSinceLastPipe = pipesResult.framesSinceLastPipe;

  // Update clouds
  state.clouds = updateClouds(state.clouds, canvas);

  // Update score
  state.score = updateScore(state.ghosty, state.pipes, state.score);

  // Check collision
  if (checkCollision(state.ghosty, state.pipes, canvas.height)) {
    triggerGameOver();
    return;
  }

  // Render
  renderBackground(ctx, canvas);
  renderClouds(ctx, state.clouds);
  renderPipes(ctx, state.pipes, canvas);
  renderGhosty(ctx, state.ghosty, state.assets);
  renderHUD(ctx, state.score, state.highScore, canvas);

  // Schedule next frame
  state.rafId = requestAnimationFrame(gameLoop);
}

// ─── Start Game ───────────────────────────────────────────────────────────────

/**
 * Resets all game state and starts the game loop.
 */
function startGame() {
  const canvas  = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");

  // Reset state
  state.ghosty.y  = canvas.height / 2;
  state.ghosty.vy = 0;
  state.pipes     = [];
  state.score     = 0;
  state.framesSinceLastPipe = 0;
  state.clouds    = initClouds(canvas);
  state.phase     = "playing";

  // Hide overlay
  if (overlay) overlay.style.display = "none";

  // Cancel any existing RAF
  if (state.rafId) cancelAnimationFrame(state.rafId);

  // Start loop
  state.rafId = requestAnimationFrame(gameLoop);
}

// ─── Trigger Game Over ────────────────────────────────────────────────────────

/**
 * Stops the game loop, updates high score, and shows the game-over overlay.
 */
function triggerGameOver() {
  // Cancel animation frame
  cancelAnimationFrame(state.rafId);
  state.rafId = null;
  state.phase = "gameover";

  // Play game over sound
  if (state.assets && state.assets.gameoverSnd) {
    state.assets.gameoverSnd.play().catch(() => {});
  }

  // Update high score
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }

  // Update overlay DOM
  const overlay   = document.getElementById("overlay");
  const titleEl   = overlay && overlay.querySelector("h1");
  const msgEl     = document.getElementById("overlay-msg");
  const bestEl    = document.getElementById("best-score");
  const startBtn  = document.getElementById("start-btn");

  if (titleEl)  titleEl.textContent  = "💀 GAME OVER";
  if (msgEl)    msgEl.textContent    = `Score: ${state.score}`;
  if (bestEl)   bestEl.textContent   = `Best: ${state.highScore}`;
  if (startBtn) startBtn.textContent = "RESTART";

  // Show overlay
  if (overlay) overlay.style.display = "";
}

// ─── Input Handlers ───────────────────────────────────────────────────────────

/**
 * Applies an upward flap impulse to Ghosty and plays the jump sound.
 * Only works when phase === "playing".
 */
function handleFlap() {
  if (state.phase !== "playing") return;
  state.ghosty.vy = -FLAP_VELOCITY;
  if (state.assets && state.assets.jumpSnd) {
    state.assets.jumpSnd.currentTime = 0;
    state.assets.jumpSnd.play().catch(() => {});
  }
}

/**
 * Starts or restarts the game.
 * Only works when phase === "idle" or "gameover".
 */
function handleStart() {
  if (state.phase !== "idle" && state.phase !== "gameover") return;
  startGame();
}

// ─── Input Wiring ─────────────────────────────────────────────────────────────

/**
 * Wires all input events: keyboard, canvas click, canvas touch, and start button.
 */
function wireInput() {
  const canvas = document.getElementById("canvas");

  // Space key
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (state.phase === "playing") handleFlap();
      else if (state.phase === "idle" || state.phase === "gameover") handleStart();
    }
  });

  // Canvas click
  canvas.addEventListener("click", () => {
    if (state.phase === "playing") handleFlap();
    else if (state.phase === "idle" || state.phase === "gameover") handleStart();
  });

  // Canvas touch
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (state.phase === "playing") handleFlap();
    else if (state.phase === "idle" || state.phase === "gameover") handleStart();
  }, { passive: false });

  // Start button
  document.getElementById("start-btn").addEventListener("click", handleStart);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Only auto-init when running in a real browser (canvas element present in DOM).
if (typeof document !== "undefined" && document.getElementById("canvas")) {
  init();
}
