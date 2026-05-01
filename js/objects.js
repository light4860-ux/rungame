/*
  Obstacle: 피해야 하는 장애물
  Item: 먹으면 점수가 오르는 아이템
*/

class GameObject {
  constructor({ x, y, width, height, speed = 0, image }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.image = image;
    this.markedForDelete = false;
  }

  update(worldSpeed) {
    this.x -= worldSpeed;

    if (this.x + this.width < 0) {
      this.markedForDelete = true;
    }
  }

  getHitBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

class Obstacle extends GameObject {
  constructor({ x, type = "normal", image }) {
    const typeConfig = GAME_CONFIG.obstacle.types[type] || GAME_CONFIG.obstacle.types.normal;
    const width = typeConfig.width;
    const height = typeConfig.height;

    // 지상 장애물은 반드시 groundY 기준으로 바닥을 맞춤 (y = groundY - height)
    const y = GAME_CONFIG.ground.y - height + (typeConfig.groundOffset || 0);

    super({
      x,
      y,
      width,
      height,
      image,
    });

    this.type = type;
  }

  getHitBox() {
    const typeConfig = GAME_CONFIG.obstacle.types[this.type] || GAME_CONFIG.obstacle.types.normal;
    const padding = typeConfig.hitBoxPadding || 8;

    return {
      x: this.x + padding,
      y: this.y + padding,
      width: this.width - padding * 2,
      height: this.height - padding,
    };
  }

  draw(ctx) {
    if (!this.image) return;

    // 이미지 렌더링
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

    // 디버그 표시 (hitbox 확인용)
    if (GAME_CONFIG.debug.showHitBox) {
      this.drawHitBox(ctx);
    }

    // double 장애물 전용 정밀 디버그 표시 (lime: draw 영역, red: hitbox 영역)
    if (GAME_CONFIG.debug.showObstacleDebug && this.type === "double") {
      ctx.save();
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);

      const box = this.getHitBox();
      ctx.strokeStyle = "red";
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }
  }

  drawHitBox(ctx) {
    const box = this.getHitBox();
    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}

// 슬라이드로 피해야 하는 공중 장애물 클래스
class AerialObstacle extends GameObject {
  constructor({ x, image }) {
    const config = GAME_CONFIG.obstacle.types.slide;
    const width = config.width;
    const height = config.height;

    const slideClearance = GAME_CONFIG.player.slideHeight ? 
                           GAME_CONFIG.player.slideHeight + (config.clearanceOffset || 8) : 
                           GAME_CONFIG.player.height * 0.45;

    const y = GAME_CONFIG.ground.y - slideClearance - height;

    super({
      x,
      y,
      width,
      height,
      image,
    });

    this.type = "slide";
  }

  getHitBox() {
    const config = GAME_CONFIG.obstacle.types.slide;
    const paddingX = config.hitBoxPaddingX || 12;
    const paddingY = config.hitBoxPaddingY || 8;

    return {
      x: this.x + paddingX,
      y: this.y + paddingY,
      width: this.width - paddingX * 2,
      height: this.height - paddingY * 2,
    };
  }

  draw(ctx) {
    if (!this.image) return;

    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

    if (GAME_CONFIG.debug.showHitBox) {
      this.drawHitBox(ctx);
    }
  }

  drawHitBox(ctx) {
    const box = this.getHitBox();
    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}

class Item extends GameObject {
  constructor({ x, y, image }) {
    const size = GAME_CONFIG.item.size || 40;

    super({
      x,
      y,
      width: size,
      height: size,
      image,
    });

    this.collected = false;
  }

  getHitBox() {
    const padding = GAME_CONFIG.item.collectPadding || 0;

    return {
      x: this.x - padding,
      y: this.y - padding,
      width: this.width + padding * 2,
      height: this.height + padding * 2,
    };
  }

  draw(ctx) {
    if (!this.image) return;

    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

    if (GAME_CONFIG.debug.showHitBox) {
      this.drawHitBox(ctx);
    }
  }

  drawHitBox(ctx) {
    const box = this.getHitBox();
    ctx.save();
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}

class GiantPotion extends GameObject {
  constructor({ x, y, image }) {
    const config = GAME_CONFIG.item.giantPotion;
    super({
      x,
      y,
      width: config.width,
      height: config.height,
      image,
    });
    this.type = "giant_potion";
    this.padding = 8;
  }

  getHitBox() {
    return {
      x: this.x + this.padding,
      y: this.y + this.padding,
      width: this.width - this.padding * 2,
      height: this.height - this.padding * 2,
    };
  }

  draw(ctx) {
    if (!this.image) return;
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    
    if (GAME_CONFIG.debug.showHitBox) {
      this.drawHitBox(ctx);
    }
  }

  drawHitBox(ctx) {
    const box = this.getHitBox();
    ctx.save();
    ctx.strokeStyle = "gold";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}
