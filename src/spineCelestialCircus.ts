import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, Container, Application } from 'pixi.js';

export async function createSpine(parent: Container, app: Application) {

    await Assets.load({alias: "girlData", src: "./assets/celestial-circus-pro.skel"});
    await Assets.load({alias: "girlAtlas", src: "./assets/celestial-circus-pma.atlas"});

     // Create the spine display object
    const girl = Spine.from({skeleton: "girlData", atlas: "girlAtlas", 
    scale: 0.1,
    });

    // Add the girl to the container
    parent.addChild(girl);

    girl.x = -50;
    girl.y = 200;

    // default mix for transitioning between animations.
    girl.state.data.defaultMix = 0.2;

    // Set animation "eyeblink-long" on track 0, looped.
    girl.state.setAnimation(0, "wind-idle", true);
    girl.state.setAnimation(0, "eyeblink-long", true);
    girl.state.setAnimation(0, "stars", true);

    // const track =  girl.state.addAnimation(0, "wings-and-feet", true, 1);
    //track.mixBlend = 
    girl.state.addAnimation(0, "swing", true, 3);

    
    console.log(app.stage.alpha);
}