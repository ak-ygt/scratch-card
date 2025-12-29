import { Application, Assets, Point, 
  Rectangle, 
  RenderTexture, Sprite, Texture, Text} from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import { Stats } from 'pixi-stats';

async function init(){
  // Create a new application
  const app = new Application();
  initDevtools({app});
  // Initialize the application
  await app.init({ resizeTo: window });

  new Stats(app.renderer, app.ticker);

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

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

  //const { width, height } = app.screen;
  const stageSize = { width: black.width, height: black.height };

  const background = Sprite.from(black);
  const imageToReveal = Sprite.from(yellow);

  const renderTexture = RenderTexture.create(stageSize);
  const renderTextureSprite = new Sprite(renderTexture);

  imageToReveal.mask = renderTextureSprite;

  app.stage.addChild(background, imageToReveal, renderTextureSprite);

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
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
        },
    });
  text.anchor.set(0.5, 0.5);
  app.stage.addChild(text);

  text.x = background.width/2;
  text.y = background.height/2;

  let dragging = false;
  let lastDrawnPoint: Point | null = null;

  async function pointerMove(event : any){
    if (!dragging) return 

    let x = event.global.x;
    let y = event.global.y;

    scratch(x,y);
    markCellAsDirty(x,y);
    const percentage = await getScratchPercentage();
  
    if (percentage > 1) { // Hide after 5% is scratched
        text.visible = false;
    }

    if (percentage > 90) {
      console.log("Scratching Completed!!")
    }
  }

  function pointerDown(event: any) {
    dragging = true;
    // Properly create a Point object instead of a plain object to fulfill the type requirement
    lastDrawnPoint = new Point(event.global.x, event.global.y);
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
  const TOTAL_CELLS = GRID_X * GRID_Y;

  // Start all cells as dirty to force an initial calculation (dirty)
  let DirtyGridMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(true)); 

  // Initialize the state maps with 'false' (not scratched)
  let ScratchStatusMap = Array(GRID_Y).fill(0).map(() => Array(GRID_X).fill(false));
  
  function markCellAsDirty(globalX: number, globalY: number) {
    const rt = renderTexture;

    // 1. Calculate the grid index (i, j) based on the input coordinates
    const i = Math.floor(globalX / (rt.width / GRID_X));
    const j = Math.floor(globalY / (rt.height / GRID_Y));

    // 2. Ensure indices are within bounds
    if (i >= 0 && i < GRID_X && j >= 0 && j < GRID_Y) {
        // 3. Set the dirty flag
        DirtyGridMap[j][i] = true;
        console.log("GRID ", i," ", j, " is dirty");
    }
  } 

  async function getScratchPercentage() {
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
                      console.log("index, Alpha: ", index, alpha);
                      if (alpha > 200) transparentPixels++
                }
                
                let isCellCleared = false; // Assume not cleared initially
                console.log(transparentPixels, 4);

               
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
    console.log(ScratchStatusMap);
    let clearedCellsCount = ScratchStatusMap.flat().filter(status => status === true).length;

    let percentage = Math.floor((clearedCellsCount / TOTAL_CELLS) * 100);

    console.log( `Cleared Cells: ${clearedCellsCount}/${TOTAL_CELLS}`);
    console.log( "Percentage: ", percentage + "%");
    
    return percentage;
  }

  
}

init();
