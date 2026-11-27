/**
 * EGGFIRE - Minimapa Radar 2D Tático (Fase 3)
 * Renderiza no canto superior esquerdo um radar circular rotacionado pelo yaw do jogador:
 * - Sempre aponta a direção do olhar do jogador para cima ("Heading-Up")
 * - Exibe as paredes/pilares próximos da matriz 19x19
 * - Exibe os Power-Ups ativos na arena como pontos coloridos pulsantes (Dourado=Rifle, Ciano=Escudo, Verde=Cura)
 * - Exibe o cone de visão e o marcador central do Egg-Man
 */
export class Radar {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} arenaInfo - ({ grid, rows, cols, tileSize })
   */
  constructor(canvas, arenaInfo) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.arenaInfo = arenaInfo;

    this.size = canvas.width; // 170px
    this.center = this.size / 2;
    this.radius = this.center - 6;

    // Escala: quantos pixels equivalem a 1 unidade de mundo (metro)
    this.scale = 3.2;
    this.pulseTimer = 0;
  }

  /**
   * Renderiza o frame atual do radar
   * @param {import('./player.js').Player} player
   * @param {Array} powerUps - Lista de power-ups da arena
   * @param {Array} enemies - Lista de ovos inimigos vivos
   */
  render(player, powerUps = [], enemies = []) {
    this.pulseTimer += 0.08;
    const ctx = this.ctx;
    const { grid, rows, cols, tileSize } = this.arenaInfo;
    const halfWidth = (cols * tileSize) / 2;
    const halfDepth = (rows * tileSize) / 2;

    ctx.clearRect(0, 0, this.size, this.size);

    ctx.save();
    // Clipping circular do radar
    ctx.beginPath();
    ctx.arc(this.center, this.center, this.radius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Fundo translúcido escuro do radar
    const bgGrad = ctx.createRadialGradient(
      this.center,
      this.center,
      8,
      this.center,
      this.center,
      this.radius
    );
    bgGrad.addColorStop(0, 'rgba(16, 26, 40, 0.92)');
    bgGrad.addColorStop(1, 'rgba(9, 14, 22, 0.96)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.size, this.size);

    // 2. Anéis concêntricos de distância
    ctx.strokeStyle = 'rgba(144, 224, 239, 0.14)';
    ctx.lineWidth = 1;
    for (const rRing of [this.radius * 0.38, this.radius * 0.72]) {
      ctx.beginPath();
      ctx.arc(this.center, this.center, rRing, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Cone de visão fixo apontando para o topo do radar (-Y no canvas)
    ctx.save();
    ctx.translate(this.center, this.center);
    const fovRad = (75 * Math.PI) / 180;
    const coneGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius * 0.85);
    coneGrad.addColorStop(0, 'rgba(255, 183, 3, 0.28)');
    coneGrad.addColorStop(1, 'rgba(255, 183, 3, 0.0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.radius * 0.85, -Math.PI / 2 - fovRad / 2, -Math.PI / 2 + fovRad / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Desenha paredes, Power-Ups e Ovos Inimigos rotacionados pelo ângulo yaw do jogador
    ctx.save();
    ctx.translate(this.center, this.center);
    ctx.rotate(player.yaw);

    const px = player.position.x;
    const pz = player.position.z;
    const pxSize = tileSize * this.scale;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== 1) continue;

        const minX = c * tileSize - halfWidth;
        const minZ = r * tileSize - halfDepth;

        const relX = (minX - px) * this.scale;
        const relY = (minZ - pz) * this.scale;

        if (
          relX + pxSize < -this.radius ||
          relX > this.radius ||
          relY + pxSize < -this.radius ||
          relY > this.radius
        ) {
          continue;
        }

        const isOuter = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        ctx.fillStyle = isOuter ? 'rgba(115, 138, 170, 0.85)' : 'rgba(255, 196, 70, 0.88)';
        ctx.fillRect(relX, relY, pxSize + 0.4, pxSize + 0.4);
      }
    }

    // 4.1. Marcadores Pulsantes dos Power-Ups Ativos na Arena
    const pulseRadius = 4.0 + Math.sin(this.pulseTimer) * 1.1;
    for (const p of powerUps) {
      if (!p.active) continue;

      const relX = (p.x - px) * this.scale;
      const relY = (p.z - pz) * this.scale;

      if (relX * relX + relY * relY > this.radius * this.radius) continue;

      let dotColor = '#2ec4b6'; // HEAL (Verde)
      if (p.type === 'RIFLE') dotColor = '#ffb703'; // RIFLE (Dourado)
      else if (p.type === 'SHIELD') dotColor = '#00e5ff'; // SHIELD (Ciano)

      // Halo externo pulsante
      ctx.fillStyle = dotColor;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(relX, relY, pulseRadius + 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Ponto sólido central
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#0b1018';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(relX, relY, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 4.2. Marcadores Vermelhos dos Ovos Inimigos Ativos
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const ex = enemy.root.position.x;
      const ez = enemy.root.position.z;
      const relX = (ex - px) * this.scale;
      const relY = (ez - pz) * this.scale;

      if (relX * relX + relY * relY > this.radius * this.radius) continue;

      const isAttacking = enemy.state === 'ATTACK';

      // Halo vermelho de alerta (mais intenso se estiver em ATTACK)
      ctx.fillStyle = '#ff3b30';
      ctx.globalAlpha = isAttacking ? 0.52 : 0.28;
      ctx.beginPath();
      ctx.arc(relX, relY, isAttacking ? pulseRadius + 3.0 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Ponto vermelho vivo central
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = isAttacking ? '#ff5e57' : '#ff3b30';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(relX, relY, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore(); // Fim do clip circular

    // 5. Moldura circular externa do Radar
    ctx.strokeStyle = player.shieldTimer > 0 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 183, 3, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.center, this.center, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Marcador de proa (topo do radar)
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(this.center, 2);
    ctx.lineTo(this.center - 5, 9);
    ctx.lineTo(this.center + 5, 9);
    ctx.closePath();
    ctx.fill();

    // 6. Ícone central do Egg-Man (Seta Dourada + Halo Ciano se o escudo estiver ativo)
    ctx.save();
    ctx.translate(this.center, this.center);

    if (player.shieldTimer > 0) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffb703';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff5dc';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
