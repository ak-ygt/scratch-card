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
import { Constants } from './Constants';
import { ParticleEffect } from './ParticleEffect';
import { createCharacter } from './character';

// ============================================================================
// Constants
// ============================================================================

const PERCENTAGE_UPDATE_INTERVAL = Constants.PERCENTAGE_UPDATE_INTERVAL;
const GRID_X = Constants.GRID_X;
const GRID_Y = Constants.GRID_Y;
const CELL_CLEARANCE_PERCENTAGE = Constants.CELL_CLEARANCE_PERCENTAGE;
const COMPLETION_THRESHOLD = Constants.COMPLETION_THRESHOLD; // percentage

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

  // Particle effect instance for the explosion
  const particleEffect = new ParticleEffect(app);
  app.ticker.add(() => particleEffect.update());

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

  // Create a container for all scratch card elements
  const scratchCardContainer = new Container();

  // Create scratch card sprites (in unscaled space)
  const background = Sprite.from(black);
  const imageToReveal = Sprite.from(yellow);
  // Don't scale individual sprites - container will handle scaling
  background.scale.set(1);
  imageToReveal.scale.set(1);

  // Position sprites at origin (container will handle centering)
  background.x = 0;
  background.y = 0;
  imageToReveal.x = 0;
  imageToReveal.y = 0;

  // Create render texture for masking (use original texture dimensions, container handles scaling)
  let renderTexture = RenderTexture.create({ width: black.width, height: black.height });
  const renderTextureSprite = new Sprite(renderTexture);
  renderTextureSprite.x = 0;
  renderTextureSprite.y = 0;
  renderTextureSprite.scale.set(1);
  imageToReveal.mask = renderTextureSprite;

  // Add elements to container
  scratchCardContainer.addChild(background, imageToReveal, renderTextureSprite);

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
  text.x = black.width / 2;
  text.y = black.height / 2;
  scratchCardContainer.addChild(text);

  // Set initial container scale and position
  scratchCardContainer.scale.set(FIXED_SCALE);
  scratchCardContainer.x = (app.screen.width - stageSize.width) / 2;
  scratchCardContainer.y = (app.screen.height - stageSize.height) / 2;

  // Add container to stage
  app.stage.addChild(scratchCardContainer);

  // Function to update scratch card size on window resize
  function updateScratchCardSize() {
    const newScale = calculateScale();
    const newStageSize = {
      width: black.width * newScale,
      height: black.height * newScale
    };

    FIXED_SCALE = newScale;

    // Scale the container instead of individual elements
    scratchCardContainer.scale.set(FIXED_SCALE);

    // Re-center the container
    scratchCardContainer.x = (app.screen.width - newStageSize.width) / 2;
    scratchCardContainer.y = (app.screen.height - newStageSize.height) / 2;

    // Grid cell sizes remain constant (based on original texture size)
    // since the container handles scaling
    CELL_WIDTH = black.width / GRID_X;
    CELL_HEIGHT = black.height / GRID_Y;

    // Update hit area to match the container's bounds
    const bounds = scratchCardContainer.getBounds();
    app.stage.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  // ========================================================================
  // Grid-based Percentage Calculation
  // ========================================================================

  // Grid cell sizes based on original texture dimensions (container handles scaling)
  let CELL_WIDTH = black.width / GRID_X;
  let CELL_HEIGHT = black.height / GRID_Y;
  const TOTAL_CELLS = GRID_X * GRID_Y;

  let DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true));
  let ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));
  console.log(ScratchStatusMap);

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
  let lastScratchEffectTime = 0;

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
    // Convert global coordinates to local coordinates within the container
    const localPoint = scratchCardContainer.toLocal(event.global);
    lastDrawnPoint = new Point(localPoint.x, localPoint.y);
    pointerMove(event);
  }

  function pointerUp() {
    dragging = false;
    lastDrawnPoint = null;
  }

  function pointerMove(event: any) {
    if (!dragging) return;

    // Convert global coordinates to local coordinates within the container
    const localPoint = scratchCardContainer.toLocal(event.global);
    const localX = localPoint.x;
    const localY = localPoint.y;

    scratch(localX, localY);
    markCellAsDirty(localX, localY);
    const now = performance.now();
    if (now - lastScratchEffectTime > 80) {
      const globalPoint = scratchCardContainer.toGlobal(localPoint);
      particleEffect.createScratchingEffect(globalPoint.x, globalPoint.y, 5)
      .catch((error) => {
        console.error('Error creating scratching effect: ', error);
      });
      lastScratchEffectTime = now;
    }

    // Throttle expensive percentage calculation
    if (now - lastPercentageUpdateTime >= PERCENTAGE_UPDATE_INTERVAL) {
      lastPercentage = getScratchPercentage();
      lastPercentageUpdateTime = now;
      text.text = `Scratched: ${lastPercentage}%`;
    }

    if (lastPercentage > COMPLETION_THRESHOLD) {
      console.log("Scratching Completed!!");

      particleEffect.createExplosion(app.screen.width / 2, app.screen.height / 2)
      .then(() => {
        imageToReveal.mask = null;
        text.text = "Scratching Completed!";

        app.stage
          .off('pointerdown', pointerDown)
          .off('pointerup', pointerUp)
          .off('pointerupoutside', pointerUp)
          .off('pointermove', pointerMove);
      }).catch((error) => {
        console.error('Error creating explosion: ', error);
      });
    }
  }

  // Setup event listeners
  app.stage.eventMode = 'static';
  const initialBounds = scratchCardContainer.getBounds();
  app.stage.hitArea = new Rectangle(initialBounds.x, initialBounds.y, initialBounds.width, initialBounds.height);
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
  // Character Animtaion
  // ========================================================================

  createCharacter(scratchCardContainer, app);

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
    }, 10);
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
