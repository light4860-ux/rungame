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
  createPattern(patternName, startX, existingObstacles = [], canvasWidth = 1280) {
    let result;
    switch (patternName) {
      case "coinLine":
        result = this.createCoinLine(startX, existingObstacles, canvasWidth);
        break;
      case "singleObstacleWithCoin":
        result = this.createSingleObstacleWithCoin(startX, existingObstacles, canvasWidth);
        break;
      case "doubleObstacle":
        result = this.createDoubleObstacle(startX, existingObstacles, canvasWidth);
        break;
      case "coinArc":
        result = this.createCoinArc(startX, existingObstacles, canvasWidth);
        break;
      case "jumpObstacle":
        result = this.createJumpObstacle(startX, existingObstacles, canvasWidth);
        break;
      case "slideObstacle":
        result = this.createSlideObstacle(startX, existingObstacles, canvasWidth);
        break;
      case "slideThenJump":
        result = this.createSlideThenJump(startX, existingObstacles, canvasWidth);
        break;
      case "jumpThenSlide":
        result = this.createJumpThenSlide(startX, existingObstacles, canvasWidth);
        break;
      case "mixedAdvanced":
        result = this.createMixedAdvanced(startX, existingObstacles, canvasWidth);
        break;
      default:
        result = this.createSingleObstacleWithCoin(startX, existingObstacles, canvasWidth);
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
      "singleObstacleWithCoin",
      "singleObstacleWithCoin",
      "jumpObstacle",
      "slideObstacle",
      "coinLine",
      "coinArc",
    ];

    const mediumPatterns = [
      "doubleObstacle",
      "doubleObstacle",
      "jumpObstacle",
      "slideObstacle",
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

  // --- 간격 보정 헬퍼 메서드 ---
  getObstacleSafeGap(prevObstacle, nextObstacle) {
    const prevType = prevObstacle.type;
    const nextType = nextObstacle.type;

    if (prevType === "slide" && nextType === "slide") {
      return 620;
    }

    if (prevType === "slide" || nextType === "slide") {
      return 560;
    }

    if (prevType === "double" && nextType === "double") {
      return 460;
    }

    if (prevType === "double" || nextType === "double") {
      return 420;
    }

    return 340;
  }

  getObstacleRightEdge(obstacle) {
    const width =
      obstacle.width ||
      obstacle.drawWidth ||
      (GAME_CONFIG.obstacle.types[obstacle.type]
        ? GAME_CONFIG.obstacle.types[obstacle.type].width
        : 0);

    return obstacle.x + width;
  }

  resolveObstacleOverlap(newObstacle, obstacles, canvasWidth) {
    if (!newObstacle) return newObstacle;

    // 5. 화면 밖 spawn 보정
    if (canvasWidth && newObstacle.x < canvasWidth + 40) {
      newObstacle.x = canvasWidth + 40;
    }

    if (!obstacles || obstacles.length === 0) {
      return newObstacle;
    }

    let adjustedX = newObstacle.x;

    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      if (obstacle.destroyed) continue;

      const obstacleRight = this.getObstacleRightEdge(obstacle);
      const safeGap = this.getObstacleSafeGap(obstacle, newObstacle);
      const minX = obstacleRight + safeGap;

      if (adjustedX < minX) {
        adjustedX = minX;
      }
    }

    newObstacle.x = adjustedX;
    return newObstacle;
  }

  /* --- 패턴 정의 메서드들 --- */

  createCoinLine(startX, existingObstacles, canvasWidth) {
    const items = [];
    const obstacles = [];
    const gap = GAME_CONFIG.patterns.coinGap;
    const y = GAME_CONFIG.ground.y - 150;

    for (let i = 0; i < 5; i++) {
      items.push(this.createItem(startX + i * gap, y));
    }

    return { obstacles, items };
  }

  createSingleObstacleWithCoin(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createObstacle(startX, "normal");
    if (o1) addObstacle(o1);

    items.push(this.createItem(startX + 95, GAME_CONFIG.ground.y - 170));
    items.push(this.createItem(startX + 145, GAME_CONFIG.ground.y - 210));

    return { obstacles, items };
  }

  createDoubleObstacle(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createObstacle(startX, "double");
    if (o1) addObstacle(o1);

    items.push(this.createItem(startX + 120, GAME_CONFIG.ground.y - 245));

    return { obstacles, items };
  }

  createCoinArc(startX, existingObstacles, canvasWidth) {
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

  createJumpObstacle(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createObstacle(startX + 80, "normal");
    if (o1) addObstacle(o1);

    items.push(this.createItem(startX, GAME_CONFIG.ground.y - 145));
    items.push(this.createItem(startX + 80, GAME_CONFIG.ground.y - 225));
    items.push(this.createItem(startX + 160, GAME_CONFIG.ground.y - 145));

    return { obstacles, items };
  }

  createSlideObstacle(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createAerialObstacle(startX);
    if (o1) addObstacle(o1);

    items.push(this.createItem(startX + 170, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(startX + 220, GAME_CONFIG.ground.y - 115));

    return { obstacles, items };
  }

  createSlideThenJump(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createAerialObstacle(startX);
    if (o1) o1 = addObstacle(o1);

    let nextX = startX + gap;
    if (o1) {
      nextX = this.getObstacleRightEdge(o1) + gap;
    }

    let o2 = this.createObstacle(nextX, "normal");
    if (o2) o2 = addObstacle(o2);

    items.push(this.createItem(startX + 150, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(nextX - 80, GAME_CONFIG.ground.y - 220));

    return { obstacles, items };
  }

  createJumpThenSlide(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    let o1 = this.createObstacle(startX, "normal");
    if (o1) o1 = addObstacle(o1);

    let nextX = startX + gap;
    if (o1) {
      nextX = this.getObstacleRightEdge(o1) + gap;
    }

    let o2 = this.createAerialObstacle(nextX);
    if (o2) o2 = addObstacle(o2);

    items.push(this.createItem(startX + 90, GAME_CONFIG.ground.y - 220));
    items.push(this.createItem(nextX - 80, GAME_CONFIG.ground.y - 115));

    return { obstacles, items };
  }

  createMixedAdvanced(startX, existingObstacles, canvasWidth) {
    const obstacles = [];
    const items = [];
    const gap = GAME_CONFIG.patterns.comboObstacleGap;
    
    const addObstacle = (obs) => {
      if (!obs) return null;
      const checkList = existingObstacles.concat(obstacles);
      obs = this.resolveObstacleOverlap(obs, checkList, canvasWidth);
      obstacles.push(obs);
      return obs;
    };

    // 장애물 2개로 줄이고 간격 충분히 확보
    let o1 = this.createObstacle(startX, "normal");
    if (o1) o1 = addObstacle(o1);

    let nextX = startX + gap;
    if (o1) {
      nextX = this.getObstacleRightEdge(o1) + gap;
    }

    let o2 = this.createAerialObstacle(nextX);
    if (o2) o2 = addObstacle(o2);

    items.push(this.createItem(startX + 90, GAME_CONFIG.ground.y - 220));
    items.push(this.createItem(nextX - 80, GAME_CONFIG.ground.y - 115));
    items.push(this.createItem(nextX + 120, GAME_CONFIG.ground.y - 180));

    return { obstacles, items };
  }
}
