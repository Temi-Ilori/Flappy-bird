# Requirements Document

## Introduction

Flappy Kiro is a retro browser-based endless scroller game inspired by Flappy Bird. The player controls a ghost character (Ghosty) that must navigate through gaps between vertically-placed green pipes. The game runs entirely in the browser using vanilla HTML, CSS, and JavaScript with no external frameworks. It features a sketchy retro visual style, sound effects, persistent high score tracking, and a responsive start/game-over overlay.

## Glossary

- **Game**: The Flappy Kiro browser application running in `index.html` + `game.js`
- **Ghosty**: The player-controlled ghost sprite rendered from `assets/ghosty.png`
- **Pipe**: A pair of green rectangular obstacles (top pipe + bottom pipe) with a gap between them that Ghosty must fly through
- **Gap**: The vertical opening between the top and bottom pipe of a Pipe pair that Ghosty must pass through
- **Canvas**: The HTML5 `<canvas>` element on which all game graphics are rendered
- **Overlay**: The semi-transparent HTML panel shown before the game starts and after game over
- **Score**: The count of Pipe pairs successfully passed by Ghosty in the current session
- **High Score**: The highest Score achieved across all sessions, persisted in `localStorage`
- **Flap**: The upward impulse applied to Ghosty when the player presses Space, clicks, or taps
- **Gravity**: The constant downward acceleration applied to Ghosty during gameplay
- **Cloud**: A decorative white rounded-rectangle drawn in the background to suggest sky depth
- **HUD**: The score display bar rendered at the bottom of the Canvas during active gameplay

---

## Requirements

### Requirement 1: Game Initialization and Canvas Setup

**User Story:** As a player, I want the game to load instantly in my browser and fill the screen appropriately, so that I can start playing without any setup.

#### Acceptance Criteria

1. THE Game SHALL render all graphics on a single Canvas element sized to fit the browser viewport on load.
2. WHEN the browser window is resized, THE Game SHALL adjust the Canvas dimensions to match the new viewport size.
3. THE Game SHALL load `assets/ghosty.png`, `assets/jump.wav`, and `assets/game_over.wav` before the first frame is rendered.
4. IF any asset fails to load, THEN THE Game SHALL display the Overlay with an error message indicating which asset could not be loaded.

---

### Requirement 2: Start Screen Overlay

**User Story:** As a player, I want to see a start screen when I open the game, so that I know how to begin playing.

#### Acceptance Criteria

1. WHEN the Game first loads, THE Overlay SHALL be visible and display the title "FLAPPY KIRO", a flap instruction, the current High Score, and a START button.
2. WHEN the player clicks the START button, THE Game SHALL hide the Overlay and begin active gameplay.
3. WHEN the player presses the Space key while the Overlay is visible, THE Game SHALL hide the Overlay and begin active gameplay.
4. WHEN the player taps the Canvas while the Overlay is visible on a touch device, THE Game SHALL hide the Overlay and begin active gameplay.

---

### Requirement 3: Ghosty Physics and Player Input

**User Story:** As a player, I want to control Ghosty with a single button or tap, so that the controls feel simple and responsive.

#### Acceptance Criteria

1. WHILE the Game is in active gameplay, THE Game SHALL apply a constant downward Gravity acceleration to Ghosty on every animation frame.
2. WHEN the player presses the Space key during active gameplay, THE Game SHALL apply an upward Flap velocity to Ghosty and play `assets/jump.wav`.
3. WHEN the player clicks the Canvas during active gameplay, THE Game SHALL apply an upward Flap velocity to Ghosty and play `assets/jump.wav`.
4. WHEN the player taps the Canvas during active gameplay on a touch device, THE Game SHALL apply an upward Flap velocity to Ghosty and play `assets/jump.wav`.
5. THE Game SHALL render Ghosty rotated to visually reflect its current vertical velocity (nose-up when rising, nose-down when falling).
6. WHILE the Game is in active gameplay, THE Game SHALL constrain Ghosty's vertical position so that Ghosty cannot move above the top edge of the Canvas.

---

### Requirement 4: Pipe Generation and Scrolling

**User Story:** As a player, I want an endless stream of pipes to navigate, so that the game provides a continuous challenge.

#### Acceptance Criteria

1. WHILE the Game is in active gameplay, THE Game SHALL spawn a new Pipe pair at a fixed horizontal interval measured in pixels of scroll distance.
2. WHEN a Pipe pair is spawned, THE Game SHALL assign it a Gap position chosen at random within safe vertical bounds that keep the Gap fully within the Canvas height.
3. WHILE the Game is in active gameplay, THE Game SHALL scroll all Pipe pairs from right to left at a constant speed measured in pixels per frame.
4. WHEN a Pipe pair has scrolled entirely off the left edge of the Canvas, THE Game SHALL remove it from the active Pipe list.
5. THE Game SHALL render each Pipe pair as a top pipe rectangle and a bottom pipe rectangle in a green retro style consistent with the sketchy visual theme.

---

### Requirement 5: Collision Detection and Game Over

**User Story:** As a player, I want the game to end when Ghosty hits a pipe or the ground, so that the challenge feels fair and consistent.

#### Acceptance Criteria

1. WHEN Ghosty's bounding box overlaps with any Pipe rectangle, THE Game SHALL trigger game over.
2. WHEN Ghosty's vertical position reaches or exceeds the bottom edge of the Canvas, THE Game SHALL trigger game over.
3. WHEN game over is triggered, THE Game SHALL stop all game loop updates, play `assets/game_over.wav`, and display the Overlay with the final Score and the updated High Score.
4. WHEN game over is triggered and the current Score exceeds the stored High Score, THE Game SHALL update the High Score in `localStorage` before displaying the Overlay.

---

### Requirement 6: Scoring

**User Story:** As a player, I want to see my score increase as I pass pipes, so that I have a clear sense of progress.

#### Acceptance Criteria

1. WHEN Ghosty's horizontal position passes the right edge of a Pipe pair's Gap without a collision, THE Game SHALL increment the Score by 1.
2. WHILE the Game is in active gameplay, THE HUD SHALL display the current Score and the current High Score in the format "Score: X | High: X" at the bottom of the Canvas.
3. THE Game SHALL persist the High Score using `localStorage` so that it survives page reloads.
4. WHEN the Game first loads, THE Game SHALL read the High Score from `localStorage` and display it in the Overlay.

---

### Requirement 7: Background and Cloud Decorations

**User Story:** As a player, I want a visually appealing sky background with floating clouds, so that the game feels polished and immersive.

#### Acceptance Criteria

1. THE Game SHALL render a solid light-blue background on the Canvas on every frame.
2. THE Game SHALL render a fixed set of Cloud shapes as white rounded rectangles at varying positions across the Canvas.
3. WHILE the Game is in active gameplay, THE Game SHALL scroll Cloud shapes from right to left at a speed slower than the Pipe scroll speed to create a parallax depth effect.
4. WHEN a Cloud scrolls off the left edge of the Canvas, THE Game SHALL reposition it to the right edge of the Canvas at a randomised vertical position to maintain continuous cloud coverage.

---

### Requirement 8: Game Over and Restart Flow

**User Story:** As a player, I want to restart the game quickly after losing, so that I can try to beat my high score without friction.

#### Acceptance Criteria

1. WHEN the Overlay is displayed after game over, THE Overlay SHALL show the message "GAME OVER", the final Score, the High Score, and a RESTART button.
2. WHEN the player clicks the RESTART button, THE Game SHALL reset all game state (Ghosty position, Score, Pipe list, Cloud positions) and begin active gameplay immediately.
3. WHEN the player presses the Space key while the game-over Overlay is visible, THE Game SHALL reset all game state and begin active gameplay immediately.
4. WHEN the player taps the Canvas while the game-over Overlay is visible on a touch device, THE Game SHALL reset all game state and begin active gameplay immediately.

---

### Requirement 9: Retro Visual Style

**User Story:** As a player, I want the game to have a consistent retro/sketchy aesthetic, so that the visual experience matches the game's personality.

#### Acceptance Criteria

1. THE Game SHALL render all text using a monospace font consistent with the `Courier New` font family defined in the page stylesheet.
2. THE Game SHALL render Pipe pairs using a green colour palette with a darker border to produce a sketchy outlined appearance.
3. THE Game SHALL render the HUD bar using a dark background strip at the bottom of the Canvas with white or light-coloured text.
4. THE Game SHALL render Ghosty using the `assets/ghosty.png` sprite without stretching or distorting the sprite's aspect ratio.
