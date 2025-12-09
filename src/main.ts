import { Application, Assets, Graphics, Point, 
  Rectangle, 
  RenderTexture, Sprite, Texture} from 'pixi.js';
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
  const brush = new Graphics().circle(0.5, 0.5, 50).fill({ color: 0xffffff });

  // Create a line that will interpolate the drawn points
  const line = new Graphics();

  const black = await Assets.load<Texture>('assets/black.png');
  const yellow = await Assets.load<Texture>('assets/yellow.png');

  //const { width, height } = app.screen;
  const stageSize = { width: 256, height: 256 };

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

  let dragging = false;
  let lastDrawnPoint: Point | null = null;

  function pointerMove(event : any){
    let x = event.global.x;
    let y = event.global.y;
    if (dragging) {
      brush.position.set(x, y);
      app.renderer.render({
        container: brush,
        target: renderTexture,
        clear: false,
        //skipUpdateTransform: false,
      });
      // Smooth out the drawing a little bit to make it look nicer
      // this connects the previous drawn point to the current one
      // using a line
      if (lastDrawnPoint) {
        line
          .clear()
          .moveTo(lastDrawnPoint.x, lastDrawnPoint.y)
          .lineTo(x, y)
          .stroke({ width: 10, color: 0xffffff });
        app.renderer.render({
          container: line,
          target: renderTexture,
          clear: false,
          //skipUpdateTransform: false,
        });
      }
      lastDrawnPoint = lastDrawnPoint || new Point();
      lastDrawnPoint.set(x, y);
      getScratchPercentage();
      //if (getScratchPercentage()>10) console.log("DONE");
    }
  }

  function pointerDown(event:any) {
    dragging = true;
    pointerMove(event);
  }

  function pointerUp() {
    dragging = false;
    lastDrawnPoint = null;
  }

  // // brute force, calculating alpha for all pixels at once
  // async function getScratchPercentage(){
  //   let w = background.width;
  //   let h = background.height;
  //   let totalpixels = w * h;
  //   let traparentPixels = 0;

  //   let  pixels = app.renderer.extract.pixels(imageToReveal).pixels;

  //   for (let index = 0; index < pixels.length; index+=4) {
  //     let alpha = pixels[index + 3];
  //     // console.log("index, Alpha: ", index, alpha);
  //     if (alpha == 255) traparentPixels++
  //   }
    
  //   //console.log(pixels, totalpixels, traparentPixels);
  //   console.log( "Percentage: ", traparentPixels/totalpixels * 100)
  // }

  // FPS drops to 42
  async function getScratchPercentage(){
    let gridX = 5;
    let gridY = 5;
    // make sure this is mask/layer
    let rt = renderTextureSprite;

    let cleared = 0;
    let total = gridX * gridY;

    for (let i = 0; i < gridX; i++) {
        for (let j = 0; j < gridY; j++) {

            // ... inside the inner loop ...
            // Calculate the intended center point of the grid cell
            const x = Math.floor((i + 0.5) * rt.width / gridX);
            const y = Math.floor((j + 0.5) * rt.height / gridY);

            // NOTE: You should also check if the 2x2 frame extends past the right/bottom edge.
            // For example, if rt.width is 100, xSafe must be <= 98.
            const frameWidth = 2;
            const frameHeight = 2;

            // Clamp the starting position so the frame is fully inside
            const xFinal = Math.min(x, rt.width - frameWidth);
            const yFinal = Math.min(y, rt.height - frameHeight);

            // 4. Extract pixel data using the safe, correctly positioned frame
            const pixeldata = app.renderer.extract.pixels({
                target: renderTextureSprite, 
                // make sure this is mask/layer
                frame: new Rectangle(xFinal, yFinal, frameWidth, frameHeight)
            });

            let traparentPixels = 0;
            for (let index = 0; index < pixeldata.pixels.length; index+=4) {
                  let alpha = pixeldata.pixels[index + 3];
                  //console.log("index, Alpha: ", index, alpha);
                  if (alpha > 200) traparentPixels++
            }
            //console.log(xFinal, yFinal, traparentPixels/4 * 100);
         
            if (traparentPixels/4 > 0.75) 
            cleared++; 
          // }
        }
    }   
    console.log( "Percentage: ", (cleared / total) * 100);
  }
}

init();
