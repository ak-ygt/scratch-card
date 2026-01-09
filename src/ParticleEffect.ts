import { Application, Assets, Sprite, Texture, TextureSource} from "pixi.js";

export class ParticleEffect {
  private particles: Sprite[] = [];
  private bunnyTexture: Promise<Texture<TextureSource<any>>> | null = null;  

  constructor(private app: Application, private numParticles: number = 50) {
    this.app = app;
    this.bunnyTexture = Assets.load('assets/bunny.png');
    this.numParticles = numParticles;
  }

  getParticles(): readonly Sprite[] {
    return this.particles;
  }

  async createExplosion(x: number, y: number): Promise<void> {
    if (!this.bunnyTexture) {
      throw new Error('Bunny texture not loaded');
    }

    for (let i = 0; i < this.numParticles; i++) {  
      const p = Sprite.from(await this.bunnyTexture);
      p.anchor.set(0.5);
      p.x = x;
      p.y = y;
      p.scale.set(0.3);
      (p as any).vx = (Math.random() - 0.5) * 20;
      (p as any).vy = (Math.random() - 0.5) * 20;
      this.app.stage.addChild(p);
      this.particles.push(p);
    }
  }

  async createScratchingEffect(x: number, y: number, q: number): Promise<void> {
    if (!this.bunnyTexture) {
        throw new Error('Bunny texture not loaded');
      }
  
    for (let i = 0; i < q; i++) {
      const p = Sprite.from(await this.bunnyTexture);
      p.anchor.set(0.5);
      p.x = x;
      p.y = y;
      p.scale.set(0.3);
      // give particles slight horizontal and upward movement so update() can animate them
      (p as any).vx = (Math.random() - 0.5) * 6;
      (p as any).vy = (Math.random() * 2);
      this.app.stage.addChild(p);
      this.particles.push(p)
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (p as any).vx;
      p.y += (p as any).vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        this.app.stage.removeChild(p);
        this.particles.splice(i, 1);
      }
    }
  }
}