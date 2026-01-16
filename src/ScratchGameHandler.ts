import { 
  Container, Sprite, RenderTexture, Text, Point, 
  Texture, Application 
} from 'pixi.js';
import { Constants } from './Constants';

export class ScratchGameHandler {
  public container: Container;
  private app: Application;
  private brush!: Sprite;
  private imageToReveal!: Sprite;
  private renderTexture!: RenderTexture;
  private renderTextureSprite!: Sprite;
  private text!: Text;
  
  private lastDrawnPoint: Point | null = null;
  public lastPercentage = 0;
  
  private dirtyGridMap: boolean[][];
  private scratchStatusMap: boolean[][];

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.dirtyGridMap = Array(Constants.GRID_Y).fill(0).map(() => Array(Constants.GRID_X).fill(true));
    this.scratchStatusMap = Array(Constants.GRID_Y).fill(0).map(() => Array(Constants.GRID_X).fill(false));
  }

  public async setup(bunnyTex: Texture, blackTex: Texture, yellowTex: Texture) {
    this.brush = Sprite.from(bunnyTex);
    this.brush.anchor.set(0.5);

    const background = Sprite.from(blackTex);
    this.imageToReveal = Sprite.from(yellowTex);

    this.renderTexture = RenderTexture.create({ width: blackTex.width, height: blackTex.height });
    this.renderTextureSprite = new Sprite(this.renderTexture);
    this.imageToReveal.mask = this.renderTextureSprite;

    this.text = new Text({
      text: 'Scratch Here!',
      style: { 
        fontFamily: 'Arial', fontSize: 24, fill: '#ffffff', 
        stroke: { color: '#000000', width: 5 } 
      }
    });
    this.text.anchor.set(0.5);
    this.text.position.set(blackTex.width / 2, blackTex.height / 2);

    this.container.addChild(background, this.imageToReveal, this.renderTextureSprite, this.text);
  }

  public scratch(globalPoint: Point) {
    const localPoint = this.container.toLocal(globalPoint);
    if (!this.lastDrawnPoint) {
      this.lastDrawnPoint = new Point(localPoint.x, localPoint.y);
      return;
    }

    const dist = Math.hypot(localPoint.x - this.lastDrawnPoint.x, localPoint.y - this.lastDrawnPoint.y);
    const angle = Math.atan2(localPoint.y - this.lastDrawnPoint.y, localPoint.x - this.lastDrawnPoint.x);

    for (let i = 0; i < dist; i += 5) {
      this.brush.position.set(this.lastDrawnPoint.x + Math.cos(angle) * i, this.lastDrawnPoint.y + Math.sin(angle) * i);
      this.brush.rotation = Math.random() * Math.PI * 2;
      this.brush.scale.set(0.5 + Math.random() * 0.4);
      this.app.renderer.render({ container: this.brush, target: this.renderTexture, clear: false });
    }
    
    this.markCellAsDirty(localPoint.x, localPoint.y);
    this.lastDrawnPoint.copyFrom(localPoint);
  }

  private markCellAsDirty(x: number, y: number) {
    const cellW = this.imageToReveal.width / Constants.GRID_X;
    const cellH = this.imageToReveal.height / Constants.GRID_Y;
    const i = Math.floor(x / cellW);
    const j = Math.floor(y / cellH);
    if (i >= 0 && i < Constants.GRID_X && j >= 0 && j < Constants.GRID_Y) {
      this.dirtyGridMap[j][i] = true;
    }
  }

  public updatePercentage(): number {
    // ... insert the pixel-extraction logic from your getScratchPercentage here ...
    // Update this.lastPercentage and return it
    return this.lastPercentage;
  }

  public reset() {
    this.app.renderer.render({ container: new Container(), target: this.renderTexture, clear: true });
    this.imageToReveal.mask = this.renderTextureSprite;
    this.dirtyGridMap = Array(Constants.GRID_Y).fill(0).map(() => Array(Constants.GRID_X).fill(true));
    this.scratchStatusMap = Array(Constants.GRID_Y).fill(0).map(() => Array(Constants.GRID_X).fill(false));
    this.text.text = 'Scratch Here!';
    this.lastPercentage = 0;
  }
}