import { Application, Assets} from 'pixi.js';
import { createBackground } from './Background';
import { createCharacter } from './character';
import { ParticleEffect } from './ParticleEffect';
import { ScratchGameHandler } from './ScratchGameHandler';

async function init() {
  const app = new Application();
  await app.init();
  app.resizeTo = window;
  document.getElementById('pixi-container')?.appendChild(app.canvas);

  const [bunny, black, yellow] = await Promise.all([
    Assets.load('assets/bunny.png'),
    Assets.load('assets/black.png'),
    Assets.load('assets/yellow.png')
  ]);

  const loopingBG = await createBackground(app);
  const particleEffect = new ParticleEffect(app);
  const gameHandler = new ScratchGameHandler(app);
  
  await gameHandler.setup(bunny, black, yellow);
  createCharacter(gameHandler.container, app);
  
  app.stage.addChild(gameHandler.container);
  app.ticker.add(() => particleEffect.update());

  // Interactions
  let dragging = false;
  app.stage.eventMode = 'static';

  const onMove = (e: any) => {
    if (!dragging) return;
    gameHandler.scratch(e.global);
    // Add particle and throttle percentage updates here
  };

  app.stage.on('pointerdown', (e) => { dragging = true; onMove(e); });
  app.stage.on('pointermove', onMove);
  app.stage.on('pointerup', () => { dragging = false; });

  // Resize Handler
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    loopingBG.resize();
    // Update gameHandler.container scale/position logic
  });
}

init();