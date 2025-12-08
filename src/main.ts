import {Application,Assets,Graphics,Point,RenderTexture,Sprite, Texture} from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import PixiFps from 'pixi-fps';

async function init(){
  // Create a new application
  const app = new Application();
  // Initialize the application
  await app.init({ resizeTo: window });

  initDevtools({app});
  const fpsCounter = new PixiFps();
  app.stage.addChild(fpsCounter);

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

  // prepare circle texture, that will be our brush
  const brush = new Graphics().circle(0.5, 0.5, 50).fill({ color: 0xffffff });

  // Create a line that will interpolate the drawn points
  const line = new Graphics();

  const black = await Assets.load<Texture>('assets/black.png');
  const yellow = await Assets.load<Texture>('assets/yellow.png');

  const { width, height } = app.screen;
  const stageSize = { width, height };

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

  async function getScratchPercentage(){
    let w = background.width;
    let h = background.height;
    let totalpixels = w * h;
    let traparentPixels = 0;

    let  pixels = app.renderer.extract.pixels(imageToReveal).pixels;

    for (let index = 0; index < pixels.length; index+=4) {
      let alpha = pixels[index + 3];
      //console.log("index, Alpha: ", index, alpha);
      if (alpha == 255) traparentPixels++
    }

    //console.log(pixels, totalpixels, traparentPixels);
    console.log( "Percentage: ", traparentPixels/totalpixels * 100)
  }
}

init();
