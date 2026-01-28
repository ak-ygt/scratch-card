import {Assets, Sprite, Container, Text } from 'pixi.js';

export class GameHUD {
    app: any;
    container: any;
    public elements: { [key: string]: Container } = {};
    
    constructor(app: any) {
        this.app = app;
        this.container = new Container();
        this.elements = {}; // Reference to UI elements by name
    }

    async load() {
        // 1. Load the Assets
        // Pixi will automatically look for Hud_00.png because it's linked in Hud_00.json
        const assets = await Assets.load([
            { alias: 'hudSprites', src: 'assets/Hud_00/Hud_00.json' },
            { alias: 'hudLayout', src: 'assets/Hud_00/Hud_Layout.json' },
            { alias: 'hudTextures', src: 'assets/Hud_00/Hud_00.webp' }
        ]);

        this.setupLayout(assets.hudLayout);
        this.app.stage.addChild(this.container);
        this.container.scale.set(this.app.screen.width / 3840);
        this.container.position.z = 0;
    }

    setupLayout(layoutData: { objects: any[]; }) {
        // layoutData is based on your Hud_Layout.json "objects" array
        layoutData.objects.forEach(obj => {
            let element;
            // Use the specific naming convention found in your Hud_00.json
            const frameName = `${obj.name}00.png`; 

            if (obj.type === "Sprite" || obj.type === "Button") {
                // Pixi keeps the .png extension in the frame name even if source is .webp
                element = Sprite.from(frameName);
            } else if (obj.type.includes("Text")) {
                element = new Text({
                    text: obj.name,
                    style: { fontSize: obj.style.fontSize, fill: obj.style.fill.replace('0x', '#') }
                });
            }

            if (element) {
                element.x = obj.x;
                element.y = obj.y;
                this.elements[obj.name] = element;
                this.container.addChild(element);
            }
        });
    }
}