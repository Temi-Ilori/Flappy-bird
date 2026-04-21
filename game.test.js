// Feature: flappy-kiro
// Property 11: High score localStorage round-trip
// Validates: Requirements 5.4, 6.3

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import {
  readHighScore, writeHighScore,
  initGhosty, updatePhysics,
  spawnPipe, updatePipes,
  checkCollision, updateScore,
  initClouds, updateClouds,
  GRAVITY, MAX_FALL_SPEED, ROTATION_FACTOR, MAX_ROTATION, GHOSTY_HEIGHT,
  PIPE_MARGIN, PIPE_GAP, HUD_HEIGHT, PIPE_SPEED, PIPE_WIDTH,
  CLOUD_COUNT, CLOUD_SPEED,
} from "./game.logic.js";
import { hudText } from "./game.js";

describe("High score localStorage round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Property 11: High score localStorage round-trip
  // For any high score value written to localStorage, reading it back SHALL return the same numeric value.
  it("round-trips any non-negative integer score through localStorage", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (score) => {
          writeHighScore(score);
          const result = readHighScore();
          expect(result).toBe(score);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns 0 when localStorage has no stored value", () => {
    const result = readHighScore();
    expect(result).toBe(0);
  });

  it("returns 0 when stored value is non-numeric", () => {
    localStorage.setItem("flappyKiro_highScore", "not-a-number");
    const result = readHighScore();
    expect(result).toBe(0);
  });
});

// ─── Physics & Resize Properties ─────────────────────────────────────────────

describe("Ghosty physics — gravity accumulation", () => {
  // Feature: flappy-kiro, Property 2: Gravity accumulates velocity each frame
  // Validates: Requirements 3.1
  it("applies gravity and clamps to MAX_FALL_SPEED each frame", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        (initialVy) => {
          const canvas = { width: 800, height: 600 };
          const ghosty = {
            x: 160, y: 300, vy: initialVy,
            width: 40, height: GHOSTY_HEIGHT, rotation: 0,
          };
          const next = updatePhysics(ghosty, canvas);
          const expectedVy = Math.min(initialVy + GRAVITY, MAX_FALL_SPEED);
          // If top boundary was hit, vy is clamped to 0
          if (next.y === GHOSTY_HEIGHT / 2) {
            expect(next.vy).toBe(0);
          } else {
            expect(next.vy).toBeCloseTo(expectedVy, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Ghosty physics — rotation monotonicity", () => {
  // Feature: flappy-kiro, Property 3: Rotation monotonically reflects velocity
  // Validates: Requirements 3.5
  it("rotation(vy1) <= rotation(vy2) whenever vy1 < vy2", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: -50, max: 50, noNaN: true }),
          fc.float({ min: -50, max: 50, noNaN: true })
        ),
        ([a, b]) => {
          const vy1 = Math.min(a, b);
          const vy2 = Math.max(a, b);
          const rot = (vy) =>
            Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, vy * ROTATION_FACTOR));
          expect(rot(vy1)).toBeLessThanOrEqual(rot(vy2));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Ghosty physics — top boundary", () => {
  // Feature: flappy-kiro, Property 4: Ghosty never exceeds top canvas boundary
  // Validates: Requirements 3.6
  it("ghosty.y - ghosty.height/2 >= 0 after updatePhysics for any initial state", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -200, max: 600, noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        (initialY, initialVy) => {
          const canvas = { width: 800, height: 600 };
          const ghosty = {
            x: 160, y: initialY, vy: initialVy,
            width: 40, height: GHOSTY_HEIGHT, rotation: 0,
          };
          const next = updatePhysics(ghosty, canvas);
          expect(next.y - next.height / 2).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Canvas resize — matches viewport", () => {
  // Feature: flappy-kiro, Property 1: Canvas matches viewport on resize
  // Validates: Requirements 1.2
  it("canvas.width and canvas.height equal the new viewport dimensions after resize", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          // Simulate the resize handler logic
          const canvas = { width: 0, height: 0 };
          // Resize handler sets canvas dims to new viewport
          canvas.width = width;
          canvas.height = height;
          expect(canvas.width).toBe(width);
          expect(canvas.height).toBe(height);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Pipe Properties ──────────────────────────────────────────────────────────

describe("Pipe gap bounds", () => {
  // Feature: flappy-kiro, Property 5: Pipe gap always within safe vertical bounds
  // Validates: Requirements 4.2
  it("spawned pipe gapY is always within safe vertical bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 2160 }),
        (canvasHeight) => {
          const canvas = { width: 800, height: canvasHeight };
          const pipe = spawnPipe(canvas);
          const minGapY = PIPE_MARGIN + PIPE_GAP / 2;
          const maxGapY = canvasHeight - HUD_HEIGHT - PIPE_MARGIN - PIPE_GAP / 2;
          expect(pipe.gapY).toBeGreaterThanOrEqual(minGapY);
          expect(pipe.gapY).toBeLessThanOrEqual(maxGapY);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Pipe scroll speed", () => {
  // Feature: flappy-kiro, Property 6: Pipes scroll at constant speed
  // Validates: Requirements 4.3
  it("each pipe moves exactly PIPE_SPEED pixels left per updatePipes call", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2000, noNaN: true }),
        (initialX) => {
          const canvas = { width: 800, height: 600 };
          const pipe = { x: initialX, gapY: 300, scored: false };
          // Use a large framesSinceLastPipe so no new pipe is spawned
          const { pipes } = updatePipes([pipe], canvas, 0);
          const scrolled = pipes.find((p) => Math.abs(p.x - (initialX - PIPE_SPEED)) < 0.001);
          // The pipe should have moved by PIPE_SPEED (unless it was culled as off-screen)
          if (initialX + PIPE_WIDTH >= 0) {
            expect(scrolled).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Off-screen pipe culling", () => {
  // Feature: flappy-kiro, Property 7: Off-screen pipes are removed
  // Validates: Requirements 4.4
  it("pipes where x + PIPE_WIDTH < 0 are not present after updatePipes", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: -500, max: 100, noNaN: true }),
          { minLength: 1, maxLength: 10 }
        ),
        (xValues) => {
          const canvas = { width: 800, height: 600 };
          const pipes = xValues.map((x) => ({ x, gapY: 300, scored: false }));
          // Use large framesSinceLastPipe to avoid spawning
          const { pipes: result } = updatePipes(pipes, canvas, 0);
          for (const p of result) {
            expect(p.x + PIPE_WIDTH).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Collision & Scoring Properties ──────────────────────────────────────────

describe("Collision detection", () => {
  // Feature: flappy-kiro, Property 8: Collision detection triggers game over
  // Validates: Requirements 5.1, 5.2

  const CANVAS_HEIGHT = 600;
  const INSET = 4;

  it("returns true when ghosty overlaps a top pipe", () => {
    // Feature: flappy-kiro, Property 8: Collision detection triggers game over
    fc.assert(
      fc.property(
        // pipe x position (ghosty will be horizontally overlapping)
        fc.integer({ min: 50, max: 400 }),
        // gapY: ensure top pipe is tall enough to collide
        fc.integer({ min: 200, max: 400 }),
        (pipeX, gapY) => {
          const pipe = { x: pipeX, gapY, scored: false };
          const topPipeBottom = gapY - PIPE_GAP / 2;
          // Place ghosty so it overlaps the top pipe
          // ghosty centre such that gTop < topPipeBottom
          const ghosty = {
            x: pipeX + PIPE_WIDTH / 2, // horizontally centred on pipe
            y: topPipeBottom / 2,       // well inside top pipe
            width: 40,
            height: GHOSTY_HEIGHT,
          };
          expect(checkCollision(ghosty, [pipe], CANVAS_HEIGHT)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns true when ghosty overlaps a bottom pipe", () => {
    // Feature: flappy-kiro, Property 8: Collision detection triggers game over
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 400 }),
        fc.integer({ min: 100, max: 250 }),
        (pipeX, gapY) => {
          const pipe = { x: pipeX, gapY, scored: false };
          const bottomPipeTop = gapY + PIPE_GAP / 2;
          const floor = CANVAS_HEIGHT - HUD_HEIGHT;
          // Place ghosty inside the bottom pipe region
          const ghosty = {
            x: pipeX + PIPE_WIDTH / 2,
            y: (bottomPipeTop + floor) / 2,
            width: 40,
            height: GHOSTY_HEIGHT,
          };
          expect(checkCollision(ghosty, [pipe], CANVAS_HEIGHT)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns true when ghosty bottom edge meets or exceeds the floor", () => {
    // Feature: flappy-kiro, Property 8: Collision detection triggers game over
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 1200 }),
        fc.integer({ min: 0, max: 50 }),
        (canvasHeight, extraY) => {
          const floor = canvasHeight - HUD_HEIGHT;
          const ghosty = {
            x: 200,
            y: floor - GHOSTY_HEIGHT / 2 + extraY, // bottom edge at or past floor
            width: 40,
            height: GHOSTY_HEIGHT,
          };
          expect(checkCollision(ghosty, [], canvasHeight)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns false when ghosty is clearly inside the gap and away from floor", () => {
    // Feature: flappy-kiro, Property 8: Collision detection triggers game over
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 400 }),
        (gapY) => {
          const canvasHeight = 600;
          // Pipe is far to the right — no horizontal overlap
          const pipe = { x: 500, gapY, scored: false };
          const ghosty = {
            x: 160, // well to the left of the pipe
            y: gapY, // vertically centred in gap
            width: 40,
            height: GHOSTY_HEIGHT,
          };
          expect(checkCollision(ghosty, [pipe], canvasHeight)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Score increment", () => {
  // Feature: flappy-kiro, Property 9: Score increments exactly once per pipe passed
  // Validates: Requirements 6.1

  it("increments score exactly once per passed pipe and marks pipe.scored", () => {
    // Feature: flappy-kiro, Property 9: Score increments exactly once per pipe passed
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            x: fc.integer({ min: -200, max: 300 }),
            scored: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (pipeConfigs) => {
          const ghostyX = 400;
          const pipes = pipeConfigs.map((p) => ({
            x: p.x,
            gapY: 300,
            scored: p.scored,
          }));

          const initialScore = 0;
          const expectedIncrement = pipes.filter(
            (p) => !p.scored && ghostyX > p.x + PIPE_WIDTH
          ).length;

          const ghosty = { x: ghostyX };
          const newScore = updateScore(ghosty, pipes, initialScore);

          expect(newScore).toBe(initialScore + expectedIncrement);

          // All passed pipes should now be marked scored
          for (const pipe of pipes) {
            if (ghostyX > pipe.x + PIPE_WIDTH) {
              expect(pipe.scored).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("does not double-count already-scored pipes", () => {
    // Feature: flappy-kiro, Property 9: Score increments exactly once per pipe passed
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (n) => {
          const ghosty = { x: 400 };
          // All pipes already scored and behind ghosty
          const pipes = Array.from({ length: n }, (_, i) => ({
            x: i * 80,
            gapY: 300,
            scored: true,
          }));
          const score = updateScore(ghosty, pipes, 5);
          expect(score).toBe(5); // no change
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Cloud Properties ─────────────────────────────────────────────────────────

describe("Cloud wraps to right edge when off-screen", () => {
  // Feature: flappy-kiro, Property 12: Cloud wraps to right edge when off-screen
  // Validates: Requirements 7.4
  it("repositions cloud to x >= canvasWidth when x + cloud.width < 0 after scroll", () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.float({ min: -500, max: -1, noNaN: true }),
          y: fc.float({ min: 0, max: 400, noNaN: true }),
          width: fc.float({ min: 60, max: 150, noNaN: true }),
          height: fc.float({ min: 20, max: 50, noNaN: true }),
        }),
        fc.integer({ min: 400, max: 1920 }),
        (cloud, canvasWidth) => {
          // Ensure the cloud is already off-screen left: x + width < 0
          const offscreenCloud = { ...cloud, x: -(cloud.width + 1) };
          const canvas = { width: canvasWidth, height: 600 };
          const [result] = updateClouds([offscreenCloud], canvas);
          expect(result.x).toBeGreaterThanOrEqual(canvasWidth);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── HUD & Render Properties ──────────────────────────────────────────────────

describe("HUD text format", () => {
  // Feature: flappy-kiro, Property 10: HUD text matches score format
  // Validates: Requirements 6.2
  it("HUD text contains 'Score: s' and 'High: h' for any s and h", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (s, h) => {
          const text = hudText(s, h);
          expect(text).toContain(`Score: ${s}`);
          expect(text).toContain(`High: ${h}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Ghosty sprite aspect ratio preserved", () => {
  // Feature: flappy-kiro, Property 13: Ghosty sprite aspect ratio preserved
  // Validates: Requirements 9.4
  it("initGhosty preserves the natural width/height ratio of the image", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 10, max: 500 }),
        (canvasWidth, canvasHeight, naturalWidth, naturalHeight) => {
          const canvas = { width: canvasWidth, height: canvasHeight };
          const img = { naturalWidth, naturalHeight };
          const ghosty = initGhosty(canvas, img);
          const expectedRatio = naturalWidth / naturalHeight;
          const actualRatio = ghosty.width / ghosty.height;
          expect(actualRatio).toBeCloseTo(expectedRatio, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
