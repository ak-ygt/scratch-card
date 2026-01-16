import { AnimatedSprite, Assets, Container, Application } from 'pixi.js';

export async function createCharacter(parent: Container, app: Application) {
    const sheet = await Assets.load('assets/character.json');
    const character = new AnimatedSprite(sheet.animations["character/walk"]);

    character.animationSpeed = 0.167;
    character.anchor.set(0.5);
    character.scale.set(0.3);
    character.position.set(30, -80);
    character.play();

    parent.addChild(character);
    
  character.onComplete = () => console.log('Animation finished!');

    let speed = 2;
    app.ticker.add((delta) => {
        character.x += speed * delta.deltaTime;
        if (character.x >= 230 || character.x <= 30) {
            speed *= -1;
            character.scale.x = speed > 0 ? 0.3 : -0.3;
        }
    });

    return character;
}