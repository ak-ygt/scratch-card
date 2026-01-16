import { TilingSprite, BlurFilter, Assets, Application } from 'pixi.js';

export async function createBackground(app: Application) {
    const bgTexture = await Assets.load('assets/looping_bg.png');
    
    const backgroundBlur = new BlurFilter({
        strength: 5
    });

    const loopingBg = new TilingSprite({
        texture: bgTexture,
        width: app.screen.width,
        height: app.screen.height,
        filters: [backgroundBlur]
    });

    app.stage.addChildAt(loopingBg, 0);

    // Animation logic
    const animation = (time: any) => {
        loopingBg.tilePosition.x += 1 * time.deltaTime;
        loopingBg.tilePosition.y += 0.5 * time.deltaTime;
    };
    
    app.ticker.add(animation);

    // The Resize Function
    const resize = () => {
        loopingBg.width = app.screen.width;
        loopingBg.height = app.screen.height;
    };

    // Return the object and the resize method so main.ts can call it
    return {
        sprite: loopingBg,
        resize: resize
    };
}