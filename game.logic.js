// game.logic.js — pure/testable logic extracted from game.js
// Feature: flappy-kiro

export const GRAVITY         = 0.5;
export const FLAP_VELOCITY   = 9;
export const MAX_FALL_SPEED  = 12;
export const PIPE_WIDTH      = 60;
export const PIPE_GAP        = 160;
export const PIPE_SPEED      = 3;
export const PIPE_INTERVAL   = 280;
export const PIPE_MARGIN     = 60;
export const CLOUD_SPEED     = 0.8;
export const CLOUD_COUNT     = 6;
export const HUD_HEIGHT      = 36;
export const ROTATION_FACTOR = 0.06;
export const MAX_ROTATION    = Math.PI / 3;

// ─── Ghosty Physics ───────────────────────────────────────────────────────────

/** Fixed render height for Ghosty sprite (px). */
export const GHOSTY_HEIGHT = 40;

/**
 * Initialises a GhostyState for the given canvas.
 * @param {{ width: number, height: number }} canvas
 * @param {{ naturalWidth?: number, naturalHeight?: number }} [img] - optional image for aspect ratio
 * @returns {{ x: number, y: number, vy: number, width: number, height: number, rotation: number }}
 */
export function initGhosty(canvas, img) {
  const height = GHOSTY_HEIGHT;
  let width = height; // default square if no image
  if (img && img.naturalWidth && img.naturalHeight) {
    width = height * (img.naturalWidth / img.naturalHeight);
  }
  return {
    x: canvas.width * 0.2,
    y: canvas.height / 2,
    vy: 0,
    width,
    height,
    rotation: 0,
  };
}

/**
 * Applies one frame of physics to ghosty (gravity, velocity clamp, position, rotation).
 * Does NOT apply flap — flap is handled separately in handleFlap().
 * @param {{ x: number, y: number, vy: number, width: number, height: number, rotation: number }} ghosty
 * @param {{ height: number }} canvas
 * @returns {{ x: number, y: number, vy: number, width: number, height: number, rotation: number }}
 */
export function updatePhysics(ghosty, canvas) {
  let vy = Math.min(ghosty.vy + GRAVITY, MAX_FALL_SPEED);
  let y = ghosty.y + vy;

  // Clamp top edge: y - height/2 >= 0
  const minY = ghosty.height / 2;
  if (y < minY) {
    y = minY;
    vy = 0;
  }

  const rotation = Math.max(
    -MAX_ROTATION,
    Math.min(MAX_ROTATION, vy * ROTATION_FACTOR)
  );

  return { ...ghosty, vy, y, rotation };
}

// ─── Pipe Generation & Scrolling ─────────────────────────────────────────────

/**
 * Spawns a new pipe at the right edge of the canvas with a randomised gap position.
 * @param {{ width: number, height: number }} canvas
 * @returns {{ x: number, gapY: number, scored: boolean }}
 */
export function spawnPipe(canvas) {
  const minGapY = PIPE_MARGIN + PIPE_GAP / 2;
  const maxGapY = canvas.height - HUD_HEIGHT - PIPE_MARGIN - PIPE_GAP / 2;
  const gapY = minGapY + Math.random() * (maxGapY - minGapY);
  return { x: canvas.width, gapY, scored: false };
}

/**
 * Updates all pipes: scrolls left, spawns new pipe at interval, culls off-screen pipes.
 * @param {Array<{ x: number, gapY: number, scored: boolean }>} pipes
 * @param {{ width: number, height: number }} canvas
 * @param {number} framesSinceLastPipe
 * @returns {{ pipes: Array<{ x: number, gapY: number, scored: boolean }>, framesSinceLastPipe: number }}
 */
export function updatePipes(pipes, canvas, framesSinceLastPipe) {
  // Scroll all pipes left
  let updated = pipes.map((p) => ({ ...p, x: p.x - PIPE_SPEED }));

  // Cull off-screen pipes
  updated = updated.filter((p) => p.x + PIPE_WIDTH >= 0);

  // Increment frame counter
  const nextFrames = framesSinceLastPipe + 1;

  // Spawn new pipe when enough distance has accumulated
  if (nextFrames * PIPE_SPEED >= PIPE_INTERVAL) {
    updated = [...updated, spawnPipe(canvas)];
    return { pipes: updated, framesSinceLastPipe: 0 };
  }

  return { pipes: updated, framesSinceLastPipe: nextFrames };
}

// ─── Collision Detection ─────────────────────────────────────────────────────

/**
 * Checks if Ghosty collides with any pipe or the floor.
 * Uses AABB with a 4px inset on each side for slight forgiveness.
 * @param {{ x: number, y: number, width: number, height: number }} ghosty
 * @param {Array<{ x: number, gapY: number }>} pipes
 * @param {number} canvasHeight
 * @returns {boolean}
 */
export function checkCollision(ghosty, pipes, canvasHeight) {
  const INSET = 4;
  // Ghosty AABB with inset
  const gLeft   = ghosty.x - ghosty.width  / 2 + INSET;
  const gRight  = ghosty.x + ghosty.width  / 2 - INSET;
  const gTop    = ghosty.y - ghosty.height / 2 + INSET;
  const gBottom = ghosty.y + ghosty.height / 2 - INSET;

  // Floor collision
  if (ghosty.y + ghosty.height / 2 >= canvasHeight - HUD_HEIGHT) {
    return true;
  }

  // Pipe collision
  for (const pipe of pipes) {
    const pLeft  = pipe.x;
    const pRight = pipe.x + PIPE_WIDTH;

    // Only check if horizontally overlapping
    if (gRight <= pLeft || gLeft >= pRight) continue;

    // Top pipe: from y=0 to gapY - PIPE_GAP/2
    const topPipeBottom = pipe.gapY - PIPE_GAP / 2;
    if (gTop < topPipeBottom) return true;

    // Bottom pipe: from gapY + PIPE_GAP/2 to canvasHeight - HUD_HEIGHT
    const bottomPipeTop = pipe.gapY + PIPE_GAP / 2;
    if (gBottom > bottomPipeTop) return true;
  }

  return false;
}

// ─── Score Tracking ───────────────────────────────────────────────────────────

/**
 * Updates score by checking which pipes Ghosty has passed.
 * Mutates pipe.scored in place.
 * @param {{ x: number }} ghosty
 * @param {Array<{ x: number, scored: boolean }>} pipes
 * @param {number} score
 * @returns {number} new score
 */
export function updateScore(ghosty, pipes, score) {
  let newScore = score;
  for (const pipe of pipes) {
    if (!pipe.scored && ghosty.x > pipe.x + PIPE_WIDTH) {
      pipe.scored = true;
      newScore += 1;
    }
  }
  return newScore;
}

// ─── Cloud State & Scrolling ─────────────────────────────────────────────────

/**
 * Creates CLOUD_COUNT clouds spread across the canvas with randomised positions and sizes.
 * @param {{ width: number, height: number }} canvas
 * @returns {Array<{ x: number, y: number, width: number, height: number }>}
 */
export function initClouds(canvas) {
  const clouds = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      width: 60 + Math.random() * 90,   // [60, 150]
      height: 20 + Math.random() * 30,  // [20, 50]
    });
  }
  return clouds;
}

/**
 * Scrolls clouds left by CLOUD_SPEED per frame; wraps off-screen clouds to the right edge.
 * @param {Array<{ x: number, y: number, width: number, height: number }>} clouds
 * @param {{ width: number, height: number }} canvas
 * @returns {Array<{ x: number, y: number, width: number, height: number }>}
 */
export function updateClouds(clouds, canvas) {
  return clouds.map((cloud) => {
    const x = cloud.x - CLOUD_SPEED;
    if (x + cloud.width < 0) {
      return {
        ...cloud,
        x: canvas.width + Math.random() * 200,
        y: Math.random() * canvas.height * 0.7,
      };
    }
    return { ...cloud, x };
  });
}

// ─── High Score (localStorage) ────────────────────────────────────────────────
/**
 * Reads the high score from localStorage.
 * @returns {number}
 */
export function readHighScore() {
  try {
    const raw = localStorage.getItem("flappyKiro_highScore");
    const val = Number(raw);
    return Number.isFinite(val) ? val : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Writes the high score to localStorage.
 * @param {number} score
 */
export function writeHighScore(score) {
  try {
    localStorage.setItem("flappyKiro_highScore", String(score));
  } catch (_) {
    // silently ignore
  }
}
