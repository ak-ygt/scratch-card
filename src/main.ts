import { 
  Application, 
  Assets, 
  Point, 
  Rectangle, 
  RenderTexture, 
  Sprite, 
  Texture, 
  Text,
  Container,
  TilingSprite,
  BlurFilter
} from 'pixi.js';

import { initDevtools } from '@pixi/devtools';
import { Stats } from 'pixi-stats';

// ============================================================================
// Constants
// ============================================================================

const PERCENTAGE_UPDATE_INTERVAL = 100; // ms
const GRID_X = 10;
const GRID_Y = 10;
const CELL_CLEARANCE_PERCENTAGE = 0.75;
const COMPLETION_THRESHOLD = 80; // percentage

// ============================================================================
// Main Initialization
// ============================================================================

async function init() {
  // Initialize PixiJS Application
  const app = new Application();
  await app.init();
  app.resizeTo = window;
  initDevtools({ app });

  new Stats(app.renderer, app.ticker);

  // Append canvas to DOM
  const pixiContainer = document.getElementById('pixi-container');
  if (pixiContainer) {
    pixiContainer.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  // ========================================================================
  // Background Setup
  // ========================================================================

  const bgTexture = await Assets.load('assets/looping_bg.png');
  const backgroundBlur = new BlurFilter({
    strength: 5
  });
  const loopingBg = new TilingSprite({
    texture: bgTexture,
    width: app.screen.width,
    height: app.screen.height,
    filters: backgroundBlur
  });

// ensure index is 0 so that it stays at the bottom
  app.stage.addChildAt(loopingBg, 0); 

  // Animate background
  app.ticker.add((time) => {
    loopingBg.tilePosition.x += 1 * time.deltaTime;
    loopingBg.tilePosition.y += 0.5 * time.deltaTime;
  });

  // ========================================================================
  // Particle Effects
  // ========================================================================

  const particles: Sprite[] = [];
  const bunnyTexture = await Assets.load('assets/bunny.png');

  function createExplosion(x: number, y: number) {
    for (let i = 0; i < 50; i++) {
      const p = Sprite.from(bunnyTexture);
      p.anchor.set(0.5);
      p.x = x;
      p.y = y;
      p.scale.set(0.3);
      (p as any).vx = (Math.random() - 0.5) * 20;
      (p as any).vy = (Math.random() - 0.5) * 20;
      app.stage.addChild(p);
      particles.push(p);
    }
  }

  // Update particles
  app.ticker.add(() => {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += (p as any).vx;
      p.y += (p as any).vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        app.stage.removeChild(p);
        particles.splice(i, 1);
      }
    }
  });

  // ========================================================================
  // Scratch Card Setup
  // ========================================================================

  // Load assets
  const bunny = await Assets.load<Texture>('assets/bunny.png');
  const black = await Assets.load<Texture>('assets/black.png');
  const yellow = await Assets.load<Texture>('assets/yellow.png');

  // Brush setup
  const brush = Sprite.from(bunny);
  brush.anchor.set(0.5, 0.5);

  // Calculate responsive scale based on device size
  function calculateScale(): number {
    const maxWidth = window.innerWidth * 0.9; // Use 90% of screen width
    const maxHeight = window.innerHeight * 0.7; // Use 70% of screen height
    const scaleX = maxWidth / black.width;
    const scaleY = maxHeight / black.height;
    return Math.min(scaleX, scaleY, 1.5); // Cap at 1.5 to prevent it from being too large
  }

  let FIXED_SCALE = calculateScale();
  const stageSize = {
    width: black.width * FIXED_SCALE,
    height: black.height * FIXED_SCALE
  };

  // Create scratch card sprites
  const background = Sprite.from(black);
  const imageToReveal = Sprite.from(yellow);
  background.scale.set(FIXED_SCALE);
  imageToReveal.scale.set(FIXED_SCALE);

  // Center the sprites
  background.x = (app.screen.width - stageSize.width) / 2;
  background.y = (app.screen.height - stageSize.height) / 2;
  imageToReveal.x = background.x;
  imageToReveal.y = background.y;

  // Create render texture for masking (texture resized on demand)
  let renderTexture = RenderTexture.create(stageSize);
  const renderTextureSprite = new Sprite(renderTexture);
  renderTextureSprite.x = background.x;
  renderTextureSprite.y = background.y;
  renderTextureSprite.scale.set(1);
  imageToReveal.mask = renderTextureSprite;

  app.stage.addChild(background, imageToReveal, renderTextureSprite);

  // Setup text overlay
  const text = new Text({
    text: 'Scratch Here!',
    style: {
      fontFamily: 'Arial',
      fontSize: 32,
      fill: '#ffffff',
      stroke: { color: '#000000', width: 5 },
      dropShadow: {
        alpha: 0.5,
        angle: 2,
        blur: 4,
        color: '0x000000',
        distance: 5,
      },
    },
  });
  text.anchor.set(0.5, 0.5);
  text.x = background.x + stageSize.width / 2;
  text.y = background.y + stageSize.height / 2;
  app.stage.addChild(text);

  // Function to update scratch card size on window resize
  function updateScratchCardSize() {
    const newScale = calculateScale();
    const newStageSize = {
      width: black.width * newScale,
      height: black.height * newScale
    };

    // Rebuild the render texture to the new size while preserving the mask content
    const oldRT = renderTexture;
    const oldRTSprite = new Sprite(oldRT);
    oldRTSprite.scale.set(newStageSize.width / oldRT.width, newStageSize.height / oldRT.height);

    const newRT = RenderTexture.create(newStageSize);
    app.renderer.render({
      container: oldRTSprite,
      target: newRT,
      clear: true,
    });

    renderTexture = newRT;
    renderTextureSprite.texture = newRT;
    renderTextureSprite.scale.set(1);

    FIXED_SCALE = newScale;

    // Update scales
    background.scale.set(FIXED_SCALE);
    imageToReveal.scale.set(FIXED_SCALE);
    text.scale.set(FIXED_SCALE);

    // Re-center
    background.x = (app.screen.width - newStageSize.width) / 2;
    background.y = (app.screen.height - newStageSize.height) / 2;
    imageToReveal.x = background.x;
    imageToReveal.y = background.y;
    renderTextureSprite.x = background.x;
    renderTextureSprite.y = background.y;

    // Update text
    text.x = background.x + newStageSize.width / 2;
    text.y = background.y + newStageSize.height / 2;

    // Update grid cell sizes to match the new RT dimensions
    CELL_WIDTH = renderTexture.width / GRID_X;
    CELL_HEIGHT = renderTexture.height / GRID_Y;

    app.stage.hitArea = background.boundsArea;
  }

  // ========================================================================
  // Grid-based Percentage Calculation
  // ========================================================================

  let CELL_WIDTH = renderTexture.width / GRID_X;
  let CELL_HEIGHT = renderTexture.height / GRID_Y;
  const TOTAL_CELLS = GRID_X * GRID_Y;

  let DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true));
  let ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));

  function markCellAsDirty(localX: number, localY: number) {
    // localX/localY are already in unscaled space
    const halfW = brush.width / 2;
    const halfH = brush.height / 2;

    const startX = localX - halfW;
    const endX = localX + halfW;
    const startY = localY - halfH;
    const endY = localY + halfH;

    const startI = Math.floor(startX / CELL_WIDTH);
    const endI = Math.floor(endX / CELL_WIDTH);
    const startJ = Math.floor(startY / CELL_HEIGHT);
    const endJ = Math.floor(endY / CELL_HEIGHT);

    for (let j = startJ; j <= endJ; j++) {
      for (let i = startI; i <= endI; i++) {
        if (i >= 0 && i < GRID_X && j >= 0 && j < GRID_Y) {
          DirtyGridMap[j][i] = true;
        }
      }
    }
  }

  function getScratchPercentage() {
    const rt = renderTexture;
    const frameWidth = 2;
    const frameHeight = 2;

    for (let j = 0; j < GRID_Y; j++) {
      for (let i = 0; i < GRID_X; i++) {
        if (DirtyGridMap[j][i] === true) {
          const xCenter = Math.floor((i + 0.5) * rt.width / GRID_X);
          const yCenter = Math.floor((j + 0.5) * rt.height / GRID_Y);
          const xFinal = Math.min(Math.max(0, xCenter - 1), rt.width - frameWidth);
          const yFinal = Math.min(Math.max(0, yCenter - 1), rt.height - frameHeight);

          const pixeldata = app.renderer.extract.pixels({
            target: renderTextureSprite,
            frame: new Rectangle(xFinal, yFinal, frameWidth, frameHeight)
          });

          let transparentPixels = 0;
          for (let index = 0; index < pixeldata.pixels.length; index += 4) {
            let alpha = pixeldata.pixels[index + 3];
            if (alpha > 200) transparentPixels++;
          }

          const isCellCleared = transparentPixels / 4 > CELL_CLEARANCE_PERCENTAGE;

          if (ScratchStatusMap[j][i] == false) {
            ScratchStatusMap[j][i] = isCellCleared;
          }

          DirtyGridMap[j][i] = false;
        }
      }
    }

    const clearedCellsCount = ScratchStatusMap.flat().filter(status => status === true).length;
    const percentage = Math.floor((clearedCellsCount / TOTAL_CELLS) * 100);

    console.log("Percentage: ", percentage + "%");

    return percentage;
  }

  // ========================================================================
  // Pointer Event Handlers
  // ========================================================================

  let dragging = false;
  let lastDrawnPoint: Point | null = null;
  let lastPercentage = 0;
  let lastPercentageUpdateTime = 0;

  function scratch(x: number, y: number) {
    if (!lastDrawnPoint) return;

    const dist = Math.hypot(x - lastDrawnPoint.x, y - lastDrawnPoint.y);
    const angle = Math.atan2(y - lastDrawnPoint.y, x - lastDrawnPoint.x);

    // Stamp the brush every 5 pixels along the move path
    for (let i = 0; i < dist; i += 5) {
      const x = lastDrawnPoint.x + Math.cos(angle) * i;
      const y = lastDrawnPoint.y + Math.sin(angle) * i;

      brush.position.set(x, y);
      brush.rotation = Math.random() * Math.PI * 2;
      brush.scale.set(0.5 + Math.random() * 0.4);

      app.renderer.render({
        container: brush,
        target: renderTexture,
        clear: false,
      });
    }

    lastDrawnPoint.x = x;
    lastDrawnPoint.y = y;
  }

  function pointerDown(event: any) {
    dragging = true;
    lastDrawnPoint = new Point(
      event.global.x - background.x,
      event.global.y - background.y,
    );
    pointerMove(event);
  }

  function pointerUp() {
    dragging = false;
    lastDrawnPoint = null;
  }

  function pointerMove(event: any) {
    if (!dragging) return;

    const localX = event.global.x - background.x;
    const localY = event.global.y - background.y;

    scratch(localX, localY);
    markCellAsDirty(localX, localY);

    // Throttle expensive percentage calculation
    const now = performance.now();
    if (now - lastPercentageUpdateTime >= PERCENTAGE_UPDATE_INTERVAL) {
      lastPercentage = getScratchPercentage();
      lastPercentageUpdateTime = now;
      text.text = `Scratched: ${lastPercentage}%`;
    }

    if (lastPercentage > COMPLETION_THRESHOLD) {
      console.log("Scratching Completed!!");

      createExplosion(app.screen.width / 2, app.screen.height / 2);

      imageToReveal.mask = null;
      text.text = "Scratching Completed!";

      app.stage
        .off('pointerdown', pointerDown)
        .off('pointerup', pointerUp)
        .off('pointerupoutside', pointerUp)
        .off('pointermove', pointerMove);
    }
  }

  // Setup event listeners
  app.stage.eventMode = 'static';
  app.stage.hitArea = background.boundsArea;
  app.stage
    .on('pointerdown', pointerDown)
    .on('pointerup', pointerUp)
    .on('pointerupoutside', pointerUp)
    .on('pointermove', pointerMove);

  // ========================================================================
  // Reset Functionality
  // ========================================================================

  function resetScratchCard() {
    // Clear the RenderTexture
    app.renderer.render({
      container: new Container(),
      target: renderTexture,
      clear: true,
    });

    // Re-apply the mask
    imageToReveal.mask = renderTextureSprite;

    // Reset tracking data
    DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true));
    ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));

    // Reset UI
    text.text = 'Scratch Here!';
    text.visible = true;
    dragging = false;
    lastDrawnPoint = null;
    lastPercentage = 0;

    // Re-enable event listeners
    app.stage
      .on('pointerdown', pointerDown)
      .on('pointerup', pointerUp)
      .on('pointerupoutside', pointerUp)
      .on('pointermove', pointerMove);

    console.log("Game Reset");
  }

  // ========================================================================
  // Window Resize Handler
  // ========================================================================

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.resizeTo = window;

    loopingBg.width = app.screen.width;
    loopingBg.height = app.screen.height;

    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      updateScratchCardSize();
    }, 150);
  });

  // ========================================================================
  // UI Setup
  // ========================================================================

  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', resetScratchCard);
  }
}

init();
