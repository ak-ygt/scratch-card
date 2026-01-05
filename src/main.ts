import { Application, Assets, Point, 
  Rectangle, 
  RenderTexture, Sprite, Texture, Text,
  Container} from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import { Stats } from 'pixi-stats';

async function init(){
  // Create a new application
  const app = new Application();
  initDevtools({app});
  // Initialize the application
  await app.init({ resizeTo: window });

  new Stats(app.renderer, app.ticker);

  // Append the application canvas to the pixi container
  const pixiContainer = document.getElementById('pixi-container');
  if (pixiContainer) {
    pixiContainer.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  // prepare circle texture, that will be our brush
  //const brushRadius = 5;
  //const brush = new Graphics().circle(0.5, 0.5, brushRadius).fill({ color: 0xffffff });

  // try a polygon brush
  //const brush = new Graphics().poly([0], true).fill({ color: 0xffffff });
  //const brush = new Graphics().regularPoly(0.5,0.5, brushRadius, brushRadius).fill({ color: 0xffffff });
  //const brush = new Graphics().roundPoly(0.5,0.5, brushRadius, 6, 5, 45).fill({ color: 0xffffff });

  // try rectangle brush
  //const brush = new Graphics().rect(0.5,0.5,brushRadius, brushRadius).fill({ color: 0xffffff });

  // custom texture as brush
  const bunny = await Assets.load<Texture>('assets/bunny.png');
  const brush = Sprite.from(bunny);
  brush.anchor.set(0.5,0.5);

  // Create a line that will interpolate the drawn points
  //const line = new Graphics();

  const black = await Assets.load<Texture>('assets/black.png');
  const yellow = await Assets.load<Texture>('assets/yellow.png');

  // Fixed scale - change this value to adjust the scratch card size
  // 1.0 = original size, 0.5 = half size, 2.0 = double size, etc.
  const FIXED_SCALE = 1.0;

  const stageSize = { 
    width: black.width * FIXED_SCALE, 
    height: black.height * FIXED_SCALE 
  };

  const background = Sprite.from(black);
  const imageToReveal = Sprite.from(yellow);

  // Apply fixed scale to maintain aspect ratio
  background.scale.set(FIXED_SCALE);
  imageToReveal.scale.set(FIXED_SCALE);

  // Center the sprites
  background.x = (app.screen.width - stageSize.width) / 2;
  background.y = (app.screen.height - stageSize.height) / 2;
  imageToReveal.x = background.x;
  imageToReveal.y = background.y;

  const renderTexture = RenderTexture.create(stageSize);
  const renderTextureSprite = new Sprite(renderTexture);
  renderTextureSprite.x = background.x;
  renderTextureSprite.y = background.y;

  imageToReveal.mask = renderTextureSprite;

  app.stage.addChild(background, imageToReveal, renderTextureSprite);

  app.stage.eventMode = 'static';
  app.stage.hitArea = background.boundsArea;
  app.stage
    .on('pointerdown', pointerDown)
    .on('pointerup', pointerUp)
    .on('pointerupoutside', pointerUp)
    .on('pointermove', pointerMove);

  const text = new Text({
      text: 'Scratch Here!',
      style: {
          fontFamily: 'Arial',
          fontSize: 32,
          fill: '#ffffff',
          stroke: { color: '#000000', width: 5 }, // Adds a black outline
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
  app.stage.addChild(text);

  text.x = background.x + stageSize.width / 2;
  text.y = background.y + stageSize.height / 2;

  let dragging = false;
  let lastDrawnPoint: Point | null = null;

  // throttling the getScratchPercentage function to once in 100ms
  let lastPercentage = 0;
  let lastPercentageUpdateTime = 0;
  const PERCENTAGE_UPDATE_INTERVAL = 100; // ms

  function pointerMove(event : any){
    if (!dragging) return 

    let x = event.global.x - background.x;
    let y = event.global.y - background.y;

    scratch(x, y);
    markCellAsDirty(event.global.x, event.global.y);
    // Throttling in JavaScript is a technique that 
    // limits the execution of a function to at most 
    // once within a specified time interval, even if 
    // the event triggering it fires multiple times 
    // in quick succession
    const now = performance.now();
    // Throttle expensive percentage calculation
    if (now - lastPercentageUpdateTime >= PERCENTAGE_UPDATE_INTERVAL) {
      lastPercentage = getScratchPercentage();
      lastPercentageUpdateTime = now;
      text.text = `Scratched: ${lastPercentage}%`;
    }
  
    if (lastPercentage > 1) { 
        // Instead of hiding it at 1%, you might want to wait until it's finished
        // or remove this block so the percentage stays visible.
    }

    if (lastPercentage > 80) {
      console.log("Scratching Completed!!");

      // Remove the mask to reveal the full image instantly
      imageToReveal.mask = null;

      // update text to indicate scratching is completed
      text.text = "Scratching Completed!";

      // disable further scratching
      app.stage
        .off('pointerdown', pointerDown)
        .off('pointerup', pointerUp)
        .off('pointerupoutside', pointerUp)
        .off('pointermove', pointerMove);

    }
  }

  function pointerDown(event: any) {
    dragging = true;
    // Properly create a Point object relative to background position
    lastDrawnPoint = new Point(event.global.x - background.x, event.global.y - background.y);
    pointerMove(event);
  }

  function pointerUp() {
    dragging = false;
    lastDrawnPoint = null;
  }

  function scratch(x: number, y:number ) {
    if (!lastDrawnPoint) return 

    const dist = Math.hypot(x - lastDrawnPoint.x, y - lastDrawnPoint.y);
    const angle = Math.atan2(y - lastDrawnPoint.y, x - lastDrawnPoint.x);

    // Stamp the brush every 5 pixels along the move path
    for (let i = 0; i < dist; i += 5) {
        const x = lastDrawnPoint.x + Math.cos(angle) * i;
        const y = lastDrawnPoint.y + Math.sin(angle) * i;
        
        brush.position.set(x, y);
        brush.rotation = Math.random() * Math.PI * 2;
        brush.scale.set(0.5+Math.random()*0.4); // randomly varies 

        app.renderer.render({
          container: brush,
          target: renderTexture,
          clear: false,
          //skipUpdateTransform: false,
        });
    }
    
    lastDrawnPoint.x = x;
    lastDrawnPoint.y = y;
  } 

  // brute force, calculating alpha for all pixels at once
  /*
  async function getScratchPercentage(){
    let w = background.width;
    let h = background.height;
    let totalpixels = w * h;
    let transparentPixels = 0;

    let  pixels = app.renderer.extract.pixels(imageToReveal).pixels;

    for (let index = 0; index < pixels.length; index+=4) {
      let alpha = pixels[index + 3];
      // console.log("index, Alpha: ", index, alpha);
      if (alpha == 255) transparentPixels++
    }
    
    //console.log(pixels, totalpixels, transparentPixels);
    console.log( "Percentage: ", transparentPixels/totalpixels * 100)
  }*/

  // Whole texture is broken into grids of 5x5 here, 
  // a 2x2 rectangle is chosen from each grid to see if it is scratched
  /*
  async function getScratchPercentage(){
    let gridX = 50;
    let gridY = 50;
    // make sure this is mask/layer
    let rt = renderTextureSprite;

    // if rt.width is 100, xSafe must be <= 98.
    const frameWidth = 2;
    const frameHeight = 2;
    const totalFramePixels = frameHeight*frameHeight;

    let cleared = 0;
    let total = gridX * gridY;

    for (let i = 0; i < gridX; i++) {
        for (let j = 0; j < gridY; j++) {
            // Calculate the intended center point of the grid cell
            const x = Math.floor((i + 0.5) * rt.width / gridX);
            const y = Math.floor((j + 0.5) * rt.height / gridY);

            // Clamp the starting position so the frame is fully inside
            const xFinal = Math.min(x, rt.width - frameWidth);
            const yFinal = Math.min(y, rt.height - frameHeight);

            // 4. Extract pixel data using the safe, correctly positioned frame
            const pixeldata = app.renderer.extract.pixels({
                target: renderTextureSprite, // make sure this is mask/layer
                frame: new Rectangle(xFinal, yFinal, frameWidth, frameHeight)
            });

            let transparentPixels = 0;
            for (let index = 0; index < pixeldata.pixels.length; index+=4) {
                  let alpha = pixeldata.pixels[index + 3];
                  //console.log("index, Alpha: ", index, alpha);
                  if (alpha > 200) transparentPixels++
            }
         
            if (transparentPixels/totalFramePixels > 0.75) cleared++; 
        }
    }   
    console.log( "Percentage: ", (cleared / total) * 100);
  }*/

  
  const GRID_X = 10;
  const GRID_Y = 10;
  const CELL_WIDTH = renderTexture.width / GRID_X;
  const CELL_HEIGHT = renderTexture.height / GRID_Y;
  const TOTAL_CELLS = GRID_X * GRID_Y;

  // Start all cells as dirty to force an initial calculation (dirty)
  let DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true)); 

  // Initialize the state maps with 'false' (not scratched)
  let ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));
  
  function markCellAsDirty(globalX: number, globalY: number) {
    // Convert global coordinates to local coordinates relative to background
    const localX = globalX - background.x;
    const localY = globalY - background.y;

    // Calculate the half-extents of the brush
    const halfW = brush.width / 2;
    const halfH = brush.height / 2;

    // Calculate the bounding box of the brush in pixels
    const startX = localX - halfW;
    const endX = localX + halfW;
    const startY = localY - halfH;
    const endY = localY + halfH;

    // Convert pixel bounds to grid indices
    // We use floor for the start and ceil for the end to catch every cell the brush touches
    const startI = Math.floor(startX / CELL_WIDTH);
    const endI = Math.floor(endX / CELL_WIDTH);
    const startJ = Math.floor(startY / CELL_HEIGHT);
    const endJ = Math.floor(endY / CELL_HEIGHT);

    // Loop through all cells covered by the brush bounds
    for (let j = startJ; j <= endJ; j++) {
        for (let i = startI; i <= endI; i++) {
          if (i >= 0 && i < GRID_X && j >= 0 && j < GRID_Y) {
          // 3. Set the dirty flag
          DirtyGridMap[j][i] = true;
          //console.log("GRID ", i," ", j, " is dirty");
        }
      }
    }
  } 

  function getScratchPercentage() {
    // Parameters (Match your current setup)
    const rt = renderTexture;
    const CELL_CLEARANCE_PERCENTAGE = 0.75;

    // if rt.width is 100, xSafe must be <= 98.
    const frameWidth = 2;
    const frameHeight = 2;
    
    // --- 1. Iterate through the Dirty Grid Map ---
    //5x5 here
    for (let j = 0; j < GRID_Y; j++) {
        for (let i = 0; i < GRID_X; i++) {

            // Check if the cell has been modified since the last check
            if (DirtyGridMap[j][i] === true) {
                
                // 2. Coordinate Calculation 
                const xCenter = Math.floor((i + 0.5) * rt.width / GRID_X);
                const yCenter = Math.floor((j + 0.5) * rt.height / GRID_Y);
                const xFinal = Math.min(Math.max(0, xCenter - 1), rt.width - frameWidth);
                const yFinal = Math.min(Math.max(0, yCenter - 1), rt.height - frameHeight);

                // --- 3. Pixel Extraction 
                
                // Render the texture 
                const pixeldata = app.renderer.extract.pixels({
                    target: renderTextureSprite, // make sure this is mask/layer
                    frame: new Rectangle(xFinal, yFinal, frameWidth, frameHeight)
                });

                // 4. Extract pixel data using the safe, correctly positioned frame
                let transparentPixels = 0;
                for (let index = 0; index < pixeldata.pixels.length; index+=4) {
                      let alpha = pixeldata.pixels[index + 3];
                      //console.log("index, Alpha: ", index, alpha);
                      if (alpha > 200) transparentPixels++
                }
                
                let isCellCleared = false; // Assume not cleared initially
                //console.log(transparentPixels, 4);

               
            if (transparentPixels/4 > CELL_CLEARANCE_PERCENTAGE) 
              isCellCleared = true;
                
            // --- 4. Update State and Clear Flag ---
            
            // Update the persistent scratch status for this cell
            if (ScratchStatusMap[j][i] == false)
            ScratchStatusMap[j][i] = isCellCleared;

            // Mark the cell as clean (no longer needs recalculation)
            DirtyGridMap[j][i] = false;
            }
        }
    }  
    
    // --- 5. Final Tally ---
    
    // Count all cells marked as cleared in the status map
    //console.log(ScratchStatusMap);
    let clearedCellsCount = ScratchStatusMap.flat().filter(status => status === true).length;

    let percentage = Math.floor((clearedCellsCount / TOTAL_CELLS) * 100);

    //console.log( `Cleared Cells: ${clearedCellsCount}/${TOTAL_CELLS}`);
    console.log( "Percentage: ", percentage + "%");
    
    return percentage;
  }

  function resetScratchCard() {
    // 1. Clear the RenderTexture (removes all the "brush" stamps)
    // We do this by rendering an empty container with 'clear: true'
    app.renderer.render({
        container: new Container(), // Use a dummy empty container
        target: renderTexture,
        clear: true,
    });

    // 2. Re-apply the mask
    imageToReveal.mask = renderTextureSprite;

    // 3. Reset tracking data
    DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true)); 
    ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));


    // Reset the text content
    text.text = 'Scratch Here!';
    text.visible = true;

    // 4. Reset UI elements
    dragging = false;
    lastDrawnPoint = null;

    // 5. Re-enable event listeners
    app.stage
        .on('pointerdown', pointerDown)
        .on('pointerup', pointerUp)
        .on('pointerupoutside', pointerUp)
        .on('pointermove', pointerMove);

    console.log("Game Reset");
  } 

  // Expose reset function to the button
  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', resetScratchCard);
  }
  
}

init();
