/*
  PatternManager는 장애물과 코인의 생성 패턴을 관리합니다.
  Stage 1 PNG 리소스를 직접 사용하며, 이미지 로드 여부를 엄격히 확인합니다.
*/

class PatternManager {
  constructor(assets) {
    this.assets = assets;
    this.lastAerialVariant = "slide02";
  }

  // 패턴 생성 메인 메서드
  createPattern(patternName, startX) {
    let result;
    switch (patternName) {
      case "coinLine":
        result = this.createCoinLine(startX);
        break;
      case "singleObstacleWithCoin":
        result = this.createSingleObstacleWithCoin(startX);
        break;
      case "doubleObstacle":
        result = this.createDoubleObstacle(startX);
        break;
      case "coinArc":
        result = this.createCoinArc(startX);
        break;
      case "jumpObstacle":
        result = this.createJumpObstacle(startX);
        break;
      case "slideObstacle":
        result = this.createSlideObstacle(startX);
        break;
      case "slideThenJump":
        result = this.createSlideThenJump(startX);
        break;
      case "jumpThenSlide":
        result = this.createJumpThenSlide(startX);
        break;
      case "mixedAdvanced":
        result = this.createMixedAdvanced(startX);
        break;
      default:
        result = this.createSingleObstacleWithCoin(startX);
    }

    // 이미지 로드 실패 등으로 null이 포함된 경우 필터링
    return {
      obstacles: result.obstacles.filter(o => o !== null),
      items: result.items.filter(i => i !== null)
    };
  }

  getAvailablePatterns(score) {
    const config = GAME_CONFIG.patterns;

    const easyPatterns = [
      "coinLine",
      "coinLine",
      "singleObstacleWithCoin",
      "coinArc",
      "slideObstacle",
    ];

    const mediumPatterns = [
      "doubleObstacle",
      "jumpObstacle",
    ];

    const hardPatterns = [
      "slideThenJump",
      "jumpThenSlide",
      "mixedAdvanced",
    ];

    if (score >= config.hardScoreThreshold) {
      return [...easyPatterns, ...mediumPatterns, ...hardPatterns, ...hardPatterns];
    }

    if (score >= config.mediumScoreThreshold) {
      return [...easyPatterns, ...mediumPatterns];
    }

    return easyPatterns;
  }

  selectRandomPattern(score) {
    const patterns = this.getAvailablePatterns(score);
    const index = Math.floor(Math.random() * patterns.length);
    return patterns[index];
  }

  // 이미지 로드 상태 확인 헬퍼
  isImageReady(img) {
    return img && img.complete && img.naturalWidth !== 0;
  }

  createItem(x, y) {
    const image = this.assets.getImage("item");
    if (!this.isImageReady(image)) return null;

    return new Item({
      x,
      y,
      image,
    });
  }

  createObstacle(x, type = "normal") {
    const imageKey = type === "double" ? "obstacleDouble" : "obstacleNormal";
    const image = this.assets.getImage(imageKey);
    
    // 이미지 로드 실패 시 보이지 않는 장애물 생성을 방지합니다.
    if (!this.isImageReady(image)) {
      console.warn(`Obstacle image (${imageKey}) not loaded. Skipping creation.`);
      return null;
    }

    return new Obstacle({
      x,
      type,
      image,
    });
  }

  createAerialObstacle(x) {
    const variant = this.lastAerialVariant === "slide02" ? "slide01" : "slide02";
    this.lastAerialVariant = variant;
    const imageKey = variant === "slide02" ? "obstacleSlide2" : "obstacleSlide1";
    const image = this.assets.getImage(imageKey);

    if (!this.isImageReady(image)) {
      console.warn(`Aerial obstacle image (${imageKey}) not loaded. Skipping creation.`);
      return null;
    }

    return new AerialObstacle({
      x,
      image,
    });
  }

  /* --- 패턴 정의 메서드들 --- */

  createCoinLine(startX) {
    const items = [];
    const obstacles = [];
    const gap = GAME_CONFIG.patterns.coinGap;
    const y = GAME_CONFIG.ground.y - 150;

    for (let i = 0; i < 5; i++) {
      items.push(this.createItem(startX + i * gap, y));
    }

    return { obstacles, items };
  }

  createSingleObstacleWithCoin(startX) {
    const obstacles = [];
    const items = [];

    obstacles.push(this.createObstacle(startX, "normal"));
    items.push(this.createItem(startX + 95, GAME_CONFIG.ground.y - 170));
    items.push(this.createItem(startX + 145, GAME_CONFIG.ground.y - 210));

    return { obstacles, items };
  }

  createDoubleObstacle(startX) {
    const obstacles = [];
    const items = [];

    obstacles.push(this.createObstacle(startX, "double"));
    items.push(this.createItem(startX + 120, GAME_CONFIG.ground.y - 245));

    return { obstacles, items };
  }

  createCoinArc(startX) {
    const obstacles = [];
    const items = [];
    const config = GAME_CONFIG.patterns.coinArc;

    for (let i = 0; i < config.count; i++) {
      const progress = i / (config.count - 1);
      const arc = Math.sin(progress * Math.PI) * config.arcHeight;
      const x = startX + i * config.gapX;
      const y = GAME_CONFIG.ground.y - config.baseY - arc;
      items.push(this.createItem(x, y));
    }

    return { obstacles, items };
  }

  createJumpObstacle(startX) {
    const obstacles = [];
    const items = [];

    obstacles.push(this.createObstacle(startX + 80, "normal"));
    items.push(this.createItem(startX, GAME_CONFIG.ground.y - 145));
    items.push(this.createItem(startX + 80, GAME_CONFIG.ground.y - 225));
    items.push(this.createItem(startX + 160, GAME_CONFIG.ground.y - 145));

    return { obstacles, items };
  }

  createSlideObstacle(startX) {
    const obstacles = [];
    const items = [];

    obstacles.push(this.createAerialObstacle(startX));
    items.push(this.createItem(startX + 170, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(startX + 220, GAME_CONFIG.ground.y - 115));

    return { obstacles, items };
  }

  createSlideThenJump(startX) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;

    obstacles.push(this.createAerialObstacle(startX));
    obstacles.push(this.createObstacle(startX + gap, "normal"));
    items.push(this.createItem(startX + 150, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(startX + gap, GAME_CONFIG.ground.y - 220));

    return { obstacles, items };
  }

  createJumpThenSlide(startX) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;

    obstacles.push(this.createObstacle(startX, "normal"));
    obstacles.push(this.createAerialObstacle(startX + gap));
    items.push(this.createItem(startX + 90, GAME_CONFIG.ground.y - 220));
    items.push(this.createItem(startX + gap + 110, GAME_CONFIG.ground.y - 115));

    return { obstacles, items };
  }

  createMixedAdvanced(startX) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;

    obstacles.push(this.createObstacle(startX, "normal"));
    obstacles.push(this.createAerialObstacle(startX + gap));
    obstacles.push(this.createObstacle(startX + gap * 2, "double"));
    items.push(this.createItem(startX + 80, GAME_CONFIG.ground.y - 220));
    items.push(this.createItem(startX + gap + 120, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(startX + gap * 2, GAME_CONFIG.ground.y - 250));

    return { obstacles, items };
  }
}
