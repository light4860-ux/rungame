/*
  Main Game Logic (Runner Game)
*/

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.width = GAME_CONFIG.canvas.width;
    this.canvas.height = GAME_CONFIG.canvas.height;

    this.assets = new AssetLoader();
    
    this.input = {
      space: false,
      up: false,
      down: false,
    };

    // 화면 상태 관리
    this.currentScreen = SCREEN.MAIN_MENU;
    this.state = GAME_STATE.WAITING;

    // 메뉴 관리
    this.mainMenuIndex = 0;
    this.mainMenuItems = ["게임 시작", "캐릭터 선택", "난이도 선택"];
    
    // 선택 값 관리
    this.selectedDifficulty = "normal";
    this.selectedCharacterIndex = 0;
    this.characterSelectIndex = 0;
    this.characterSelectMessage = "";
    this.characterSelectMessageTimer = 0;

    // config.js의 전체 캐릭터 설정을 그대로 사용합니다.
    // 축약 배열을 만들면 drawWidth/offset 누락으로 캐릭터가 사라질 수 있습니다.
    this.characters = characters.map((character) => ({ ...character }));

    this.score = 0;
    this.distance = 0;
    this.worldSpeed = GAME_CONFIG.world.baseSpeed;

    this.player = null;
    this.background = null;
    this.patternManager = null;
    
    this.obstacles = [];
    this.items = [];
    this.particles = [];
    this.input.down = false;
    this.particles = [];
    this.score = 0;
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getRandomSpawnInterval();
    this.lastPatternName = "";
    this.lastTime = 0;

    this.bindEvents();
    this.init();
  }

  async init() {
    try {
      await this.assets.loadAll(GAME_CONFIG.assets.images);

      this.player = new Player(this.assets, this.characters[this.selectedCharacterIndex]);
      this.background = new Background(this.assets);
      this.patternManager = new PatternManager(this.assets);

      this.animate(0);
    } catch (error) {
      console.error("[Game Init Error]", error);
      if (!this.player) this.player = new Player(this.assets);
      if (!this.background) this.background = new Background(this.assets);
      if (!this.patternManager) this.patternManager = new PatternManager(this.assets);
      this.animate(0);
    }
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => {
      if (this.state === GAME_STATE.CHARACTER_SELECT) {
        if (this.handleCharacterSelectKeyDown(event)) {
          return;
        }
      }

      // 메뉴 상태에서는 기본 브라우저 동작 방지 (특히 Backspace)
      if (this.currentScreen !== SCREEN.PLAYING) {
        if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", "Backspace"].includes(event.code)) {
          event.preventDefault();
        }
      }

      // 1. 메인 메뉴 조작
      if (this.currentScreen === SCREEN.MAIN_MENU) {
        if (event.code === "ArrowUp") {
          this.mainMenuIndex = (this.mainMenuIndex - 1 + this.mainMenuItems.length) % this.mainMenuItems.length;
        } else if (event.code === "ArrowDown") {
          this.mainMenuIndex = (this.mainMenuIndex + 1) % this.mainMenuItems.length;
        } else if (event.code === "Enter" || event.code === "Space") {
          this.selectMenu();
        }
        return;
      }

      // 3. 난이도 선택 조작
      if (this.currentScreen === SCREEN.DIFFICULTY_SELECT) {
        const diffs = Object.keys(difficultyConfig);
        let currentIndex = diffs.indexOf(this.selectedDifficulty);

        if (event.code === "ArrowLeft" || event.code === "ArrowUp") {
          currentIndex = (currentIndex - 1 + diffs.length) % diffs.length;
          this.selectedDifficulty = diffs[currentIndex];
        } else if (event.code === "ArrowRight" || event.code === "ArrowDown") {
          currentIndex = (currentIndex + 1) % diffs.length;
          this.selectedDifficulty = diffs[currentIndex];
        } else if (event.code === "Enter" || event.code === "Space") {
          this.currentScreen = SCREEN.MAIN_MENU;
        } else if (event.code === "Escape" || event.code === "Backspace") {
          this.currentScreen = SCREEN.MAIN_MENU;
        }
        return;
      }

      // 4. 게임 오버 조작
      if (this.currentScreen === SCREEN.GAME_OVER) {
        if (event.code === "Enter" || event.code === "Space") {
          this.currentScreen = SCREEN.MAIN_MENU;
        }
        return;
      }

      // 5. 게임 중 조작
      if (this.currentScreen === SCREEN.PLAYING) {
        if (event.code === "Space" || event.code === "ArrowUp") {
          if (this.player) this.player.jump(this.worldSpeed, this.selectedDifficulty);
        } else if (event.code === "ArrowDown") {
          this.input.down = true;
        }
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "ArrowDown") {
        this.input.down = false;
      }
    });

    // 마우스 클릭 지원
    this.canvas.addEventListener("click", (event) => {
      if (this.currentScreen === SCREEN.MAIN_MENU) {
        const rect = this.canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const menuCenterY = this.canvas.height / 2;
        
        if (y > menuCenterY - 60 && y < menuCenterY - 20) this.mainMenuIndex = 0;
        else if (y > menuCenterY - 10 && y < menuCenterY + 30) this.mainMenuIndex = 1;
        else if (y > menuCenterY + 40 && y < menuCenterY + 80) this.mainMenuIndex = 2;
        
        this.selectMenu();
      }
    });
  }

  selectMenu() {
    if (this.mainMenuIndex === 0) {
      this.reset();
      this.currentScreen = SCREEN.PLAYING;
    } else if (this.mainMenuIndex === 1) {
      this.state = GAME_STATE.CHARACTER_SELECT;
      this.currentScreen = SCREEN.CHARACTER_SELECT;
      this.characterSelectIndex = this.selectedCharacterIndex || 0;
      this.characterSelectMessage = "";
      this.characterSelectMessageTimer = 0;
    } else if (this.mainMenuIndex === 2) {
      this.currentScreen = SCREEN.DIFFICULTY_SELECT;
    }
  }

  getRandomSpawnInterval() {
    const diff = difficultyConfig[this.selectedDifficulty] || difficultyConfig.normal;

    // difficultyConfig의 간격은 거리 기준이고, spawnTimer는 프레임 단위입니다.
    // /5.2로 변환하여 장애물/패턴 등장 빈도가 너무 낮아진 문제를 복구합니다.
    const min = Math.max(55, Math.floor(diff.obstacleMinGap / 5.2));
    const max = Math.max(min + 10, Math.floor(diff.obstacleMaxGap / 5.2));

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  reset() {
    const diff = difficultyConfig[this.selectedDifficulty];
    
    this.score = 0;
    this.distance = 0;
    this.worldSpeed = diff.initialSpeed; // 초기 속도 적용
    this.state = GAME_STATE.PLAYING;

    if (this.player) {
      this.player.characterData = this.characters[this.selectedCharacterIndex];
      this.player.initAnimations(this.player.characterData);
      this.player.reset();
    }
    this.obstacles = [];
    this.items = [];
    this.particles = [];
    this.input.down = false;
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getRandomSpawnInterval();
    this.lastPatternName = "";
    
    // 자이언트 물약 스폰 관리 초기화
    this.gameStartTime = performance.now();
    this.lastGiantPotionSpawnTime = 0;
    this.nextGiantPotionCooldown = GAME_CONFIG.item.giantPotion.firstSpawnDelay;
    
    // deltaTime 폭주 방지를 위해 시간 기준점 초기화
    this.lastTime = performance.now();
  }

  update(deltaTime) {
    if (this.state === GAME_STATE.CHARACTER_SELECT) {
      if (this.characterSelectMessageTimer > 0) {
        this.characterSelectMessageTimer--;
      }
      return;
    }

    if (this.currentScreen !== SCREEN.PLAYING) return;

    const diff = difficultyConfig[this.selectedDifficulty];

    // 속도 점진적 증가 (해당 난이도의 maxSpeed까지만 제한)
    if (this.worldSpeed < diff.maxSpeed) {
      this.worldSpeed += diff.speedIncrease * deltaTime;
      // 혹시라도 deltaTime 때문에 넘어가면 maxSpeed로 고정
      if (this.worldSpeed > diff.maxSpeed) this.worldSpeed = diff.maxSpeed;
    }

    // 거리 및 점수 계산
    this.distance += this.worldSpeed * 0.1;
    this.score += this.worldSpeed * GAME_CONFIG.score.distanceScoreRate;

    if (this.background) this.background.update(this.worldSpeed);
    this.player.update(this.input, this.worldSpeed, deltaTime, this.selectedDifficulty);
    this.updateParticles(deltaTime);

    // 패턴 단위 생성 관리
    this.spawnTimer++;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnPattern();
      this.spawnTimer = 0;
      this.nextSpawnInterval = this.getRandomSpawnInterval();
    }

    // 장애물 업데이트 및 충돌 체크
    this.obstacles.forEach((obstacle) => {
      obstacle.update(this.worldSpeed);
      if (this.checkCollision(this.player, obstacle)) {
        if (this.player.isGiantMode) {
          // 거대화 중 장애물 파괴
          obstacle.markedForDelete = true;
          // 파괴 이펙트 생성
          this.createObstacleBreakEffect(obstacle);
          
          // 보너스 점수
          let bonus = 50;
          if (obstacle.type === "double") bonus = 80;
          if (obstacle.type === "slide") bonus = 60;
          this.score += bonus;
        } else if (this.player.isPostGiantInvincible) {
          // 거대화 종료 후 깜빡임 보호 상태 - 데미지 없음, 파괴 없음
        } else {
          // 난이도별 데미지 적용
          const damaged = this.player.takeDamage(diff.damage);
          if (damaged && this.player.isDead()) {
            this.currentScreen = SCREEN.GAME_OVER;
          }
        }
      }
    });

    // 아이템 업데이트 및 획득 체크
    this.items.forEach((item) => {
      item.update(this.worldSpeed);
      if (!item.collected && this.checkCollision(this.player, item)) {
        item.collected = true;
        item.markedForDelete = true;
        
        if (item.type === "giant_potion") {
          // 거대화 물약 획득
          const duration = 5000 + Math.random() * 2000; // 5~7초
          this.player.activateGiantMode(duration);
          this.score += GAME_CONFIG.item.giantPotion.score;
        } else {
          // 일반 코인 획득
          this.score += GAME_CONFIG.item.score;
        }
      }
    });

    this.obstacles = this.obstacles.filter((o) => !o.markedForDelete);
    this.items = this.items.filter((i) => !i.markedForDelete);
  }

  spawnPattern() {
    if (!this.patternManager) return;
    const startX = GAME_CONFIG.canvas.width + 100;
    const patternName = this.patternManager.selectRandomPattern(this.score);
    const pattern = this.patternManager.createPattern(patternName, startX, this.obstacles, this.canvas.width);
    if (pattern.obstacles) this.obstacles.push(...pattern.obstacles);
    if (pattern.items) this.items.push(...pattern.items);

    // 거대화 물약 스폰 로직 (쿨타임 및 확률 적용)
    const currentTime = performance.now();
    const elapsed = currentTime - this.gameStartTime;
    const potionConfig = GAME_CONFIG.item.giantPotion;

    // 1. 최소 대기 시간 확인
    if (elapsed >= potionConfig.firstSpawnDelay) {
      // 2. 쿨타임 확인
      if (currentTime - this.lastGiantPotionSpawnTime >= this.nextGiantPotionCooldown) {
        // 3. 거대화/보호 상태 확인
        if (!this.player.isGiantMode && !this.player.isPostGiantInvincible) {
          // 4. 화면 내 중복 생성 방지
          const hasGiantPotionOnScreen = this.items.some(item => item instanceof GiantPotion || item.type === "giant_potion");
          if (!hasGiantPotionOnScreen) {
            // 5. 확률 검사
            if (Math.random() <= potionConfig.spawnChance) {
              const potionImage = this.assets.getImage("giantPotion");
              if (potionImage) {
                const rand = Math.random();
                let potionY;
                if (rand < 0.45) potionY = GAME_CONFIG.ground.y - 85;
                else if (rand < 0.85) potionY = GAME_CONFIG.ground.y - 130;
                else potionY = GAME_CONFIG.ground.y - 175;

                const potionX = startX + 400 + Math.random() * 600;
                this.items.push(new GiantPotion({ x: potionX, y: potionY, image: potionImage }));

                // 쿨타임 재설정
                this.lastGiantPotionSpawnTime = currentTime;
                const difficulty = this.selectedDifficulty || "normal";
                const cooldownRange = potionConfig.cooldown[difficulty] || potionConfig.cooldown.normal;
                this.nextGiantPotionCooldown = cooldownRange.min + Math.random() * (cooldownRange.max - cooldownRange.min);
              }
            }
          }
        }
      }
    }

    this.lastPatternName = patternName;
  }

  checkCollision(player, obj) {
    if (!player || !obj) return false;
    const pBox = player.getHitBox();
    const oBox = obj.getHitBox();
    return (
      pBox.x < oBox.x + oBox.width &&
      pBox.x + pBox.width > oBox.x &&
      pBox.y < oBox.y + oBox.height &&
      pBox.y + pBox.height > oBox.y
    );
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.background) {
      this.background.draw(this.ctx);
    }

    if (this.state === GAME_STATE.CHARACTER_SELECT || this.currentScreen === SCREEN.CHARACTER_SELECT) {
      this.drawCharacterSelect();
      return;
    }

    switch (this.currentScreen) {
      case SCREEN.MAIN_MENU:
        this.drawMainMenu();
        break;
      case SCREEN.DIFFICULTY_SELECT:
        this.drawDifficultySelect();
        break;
      case SCREEN.PLAYING:
        this.drawGame();
        break;
      case SCREEN.GAME_OVER:
        this.drawGame();
        this.drawGameOver();
        break;
    }
  }

  drawGame() {
    this.obstacles.forEach((o) => o.draw(this.ctx));
    this.drawParticles();
    this.items.forEach((i) => i.draw(this.ctx));
    if (this.player) this.player.draw(this.ctx);
    this.drawUI();
  }

  drawUI() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 32px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, 40, 60);
    this.drawHpBar();
    
    // 현재 난이도 표시
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(`DIFFICULTY: ${difficultyConfig[this.selectedDifficulty].label}`, this.canvas.width - 40, 60);

    // 거대화 남은 시간 표시
    if (this.player && this.player.isGiantMode) {
      this.ctx.fillStyle = "#FFD700";
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "right";
      const remaining = (this.player.giantModeTimer / 1000).toFixed(1);
      this.ctx.fillText(`GIANT: ${remaining}s`, this.canvas.width - 40, 100);
    } else if (this.player && this.player.isPostGiantInvincible) {
      this.ctx.fillStyle = "#A8FFD6";
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "right";
      const remaining = (this.player.postGiantInvincibleTimer / 1000).toFixed(1);
      this.ctx.fillText(`SAFE: ${remaining}s`, this.canvas.width - 40, 100);
    }
  }

  // 장애물 파괴 파티클 생성
  createObstacleBreakEffect(obstacle) {
    const box = obstacle.getHitBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    let count = 10;
    if (obstacle.type === "double") count = 18;
    if (obstacle.type === "slide") count = 14;

    const colors = ["#b77cff", "#d6a8ff", "#7f5aa8", "#8e7a9d", "#c7b2d8"];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.7) * 12,
        size: Math.random() * 6 + 4,
        life: 500 + Math.random() * 300,
        maxLife: 800,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }
  }

  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // 중력
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawParticles() {
    this.ctx.save();
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.roundRect(p.x, p.y, p.size, p.size, 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawHpBar() {
    if (!this.player) return;
    const config = GAME_CONFIG.ui.hpBar;
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    this.ctx.fillRect(config.x, config.y, config.width, config.height);
    this.ctx.fillStyle = "#e53935";
    this.ctx.fillRect(config.x, config.y, config.width * hpRatio, config.height);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.strokeRect(config.x, config.y, config.width, config.height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 14px Arial";
    this.ctx.fillText(config.label, config.x + 8, config.y + config.height / 2 + 5);
    this.ctx.restore();
  }

  drawMainMenu() {
    this.drawOverlayBackground();
    this.ctx.fillStyle = "#E0B0FF";
    this.ctx.font = "bold 84px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("PASTEL GOTHIC RUN", this.canvas.width / 2, 200);

    this.mainMenuItems.forEach((item, index) => {
      const isSelected = this.mainMenuIndex === index;
      this.ctx.fillStyle = isSelected ? "#FFD700" : "white";
      this.ctx.font = isSelected ? "bold 48px Arial" : "40px Arial";
      
      if (isSelected) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
      }
      
      this.ctx.fillText(item, this.canvas.width / 2, 350 + index * 70);
      this.ctx.shadowBlur = 0;
    });

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.font = "24px Arial";
    this.ctx.fillText("↑ ↓ 선택 / ENTER 또는 SPACE 결정", this.canvas.width / 2, 600);
  }

  drawCharacterSelect() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    const centerX = canvas.width / 2;
    const titleY = 90;

    const cardWidth = 260;
    const cardHeight = 360;
    const cardY = 170;
    const gap = 80;

    const leftCardX = centerX - cardWidth - gap / 2;
    const rightCardX = centerX + gap / 2;

    ctx.save();

    ctx.fillStyle = "rgba(20, 10, 38, 0.48)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 54px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(220, 190, 255, 0.85)";
    ctx.shadowBlur = 14;
    ctx.fillText("캐릭터 선택", centerX, titleY);

    ctx.shadowBlur = 0;

    ctx.textAlign = "right";
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#eee6ff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 6;
    ctx.fillText("ESC : 뒤로가기", canvas.width - 32, 36);

    ctx.shadowBlur = 0;
    ctx.textAlign = "center";

    this.drawCharacterCard({
      x: leftCardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      index: 0,
      name: "지에엥",
      selectable: true,
      isSelected: this.characterSelectIndex === 0
    });

    this.drawCharacterCard({
      x: rightCardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      index: 1,
      name: this.characters[1]?.name || "스노우메이지",
      selectable: this.characters[1]?.selectable !== false,
      isSelected: this.characterSelectIndex === 1
    });

    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#eee6ff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 5;
    ctx.fillText("← → 선택 / ENTER 선택 / ESC 또는 BACKSPACE 뒤로가기", centerX, cardY + cardHeight + 48);

    if (this.characterSelectMessage && this.characterSelectMessageTimer > 0) {
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = "#ffd86b";
      ctx.shadowColor = "rgba(255, 216, 107, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(this.characterSelectMessage, centerX, cardY + cardHeight + 86);
    }

    ctx.restore();
  }

  drawCharacterCard({ x, y, width, height, index, name, selectable, isSelected }) {
    const ctx = this.ctx;
    const character = this.characters[index];
    const isSelectable = character?.selectable !== false && selectable !== false;
    const displayName = character?.name || name || "";

    const cardFillColor = isSelectable
      ? "rgba(70, 42, 86, 0.58)"
      : "rgba(28, 22, 42, 0.68)";

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fillStyle = cardFillColor;
    ctx.fill();
    ctx.strokeStyle = isSelectable
      ? "rgba(238, 230, 255, 0.55)"
      : "rgba(160, 145, 180, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 18);
      ctx.strokeStyle = "#ffd600";
      ctx.lineWidth = 5;
      ctx.shadowColor = "rgba(255, 214, 0, 0.85)";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(48, 32, 70, 0.55)";
    ctx.beginPath();
    ctx.roundRect(x + 34, y + 34, width - 68, 190, 16);
    ctx.fill();
    ctx.restore();

    const cardImage = character?.cardAssetKey
      ? this.assets.getImage(character.cardAssetKey)
      : null;

    if (cardImage && cardImage.complete !== false) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";

      let srcX = 0;
      let srcY = 0;
      let srcW = cardImage.width;
      let srcH = cardImage.height;

      // 카드 전용 이미지가 아닌 스프라이트 시트를 카드에 쓰는 경우에는 첫 프레임만 사용합니다.
      const isCardOnlyImage = character.cardAssetKey?.includes("Card");
      if (!isCardOnlyImage) {
        const frameCount = character.runFrameCount || 1;
        srcW = cardImage.width / frameCount;
      }

      const maxPreviewWidth = 190;
      const maxPreviewHeight = 210;
      
      // 캐릭터별 렌더링 비율을 고려하여 aspect ratio 결정
      const renderRatio = character.normalDrawWidth / character.normalDrawHeight;
      const imageRatio = srcW / srcH;

      let previewWidth = maxPreviewWidth;
      let previewHeight = previewWidth / imageRatio;

      if (previewHeight > maxPreviewHeight) {
        previewHeight = maxPreviewHeight;
        previewWidth = previewHeight * imageRatio;
      }

      const previewX = x + width / 2 - previewWidth / 2;
      const previewY = y + 44 + (maxPreviewHeight - previewHeight) / 2;

      ctx.drawImage(
        cardImage,
        srcX,
        srcY,
        srcW,
        srcH,
        previewX,
        previewY,
        previewWidth,
        previewHeight
      );

      ctx.restore();
    } else if (!isSelectable) {
      ctx.save();
      const silhouetteX = x + width / 2;
      const silhouetteY = y + 150;
      ctx.fillStyle = "rgba(20, 14, 34, 0.75)";
      ctx.beginPath();
      ctx.ellipse(silhouetteX, silhouetteY - 40, 34, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(silhouetteX - 48, silhouetteY - 4, 96, 120, 42);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.font = "bold 96px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", silhouetteX, silhouetteY + 16);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = isSelectable ? "#ffffff" : "rgba(238, 230, 255, 0.72)";
    ctx.fillText(displayName, x + width / 2, y + height - 72);

    ctx.font = "bold 18px Arial";
    ctx.fillStyle = isSelectable ? "#ffd86b" : "rgba(255, 216, 107, 0.6)";
    ctx.fillText(isSelectable ? "SELECTABLE" : "LOCKED", x + width / 2, y + height - 38);
    ctx.restore();
  }

  handleCharacterSelectKeyDown(event) {
    if (event.code === "Escape" || event.code === "Backspace") {
      event.preventDefault();
      this.state = GAME_STATE.WAITING;
      this.currentScreen = SCREEN.MAIN_MENU;
      return true;
    }

    if (event.code === "ArrowLeft") {
      event.preventDefault();
      this.characterSelectIndex = 0;
      return true;
    }

    if (event.code === "ArrowRight") {
      event.preventDefault();
      this.characterSelectIndex = 1;
      return true;
    }

    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();

      const selectedChar = this.characters[this.characterSelectIndex];
      if (selectedChar && selectedChar.selectable) {
        this.selectedCharacterIndex = this.characterSelectIndex;
        this.state = GAME_STATE.WAITING;
        this.currentScreen = SCREEN.MAIN_MENU;
        return true;
      }
    }

    return false;
  }

  drawDifficultySelect() {
    this.drawOverlayBackground();
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 64px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("난이도 선택", this.canvas.width / 2, 150);

    const diffs = Object.keys(difficultyConfig);
    diffs.forEach((key, index) => {
      const isSelected = this.selectedDifficulty === key;
      const config = difficultyConfig[key];
      
      this.ctx.fillStyle = isSelected ? "#FFD700" : "white";
      this.ctx.font = isSelected ? "bold 48px Arial" : "40px Arial";
      this.ctx.fillText(config.label, this.canvas.width / 2, 300 + index * 80);
    });

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.font = "24px Arial";
    this.ctx.fillText("↑ ↓ 변경 / ENTER 확정 / ESC 뒤로", this.canvas.width / 2, 600);
  }

  drawGameOver() {
    this.drawOverlayBackground();
    this.ctx.fillStyle = "#e53935";
    this.ctx.font = "bold 92px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, 250);
    
    this.ctx.fillStyle = "white";
    this.ctx.font = "48px Arial";
    this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, this.canvas.width / 2, 380);
    
    this.ctx.font = "32px Arial";
    this.ctx.fillText("ENTER 또는 SPACE 키를 눌러 메뉴로", this.canvas.width / 2, 550);
  }

  drawOverlayBackground() {
    this.ctx.fillStyle = "rgba(40, 10, 60, 0.7)"; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  animate(timeStamp) {
    let deltaTime = timeStamp - this.lastTime;
    // 탭 이동이나 랙으로 인해 deltaTime이 비정상적으로 커지는 것을 방지 (최대 50ms 제한)
    if (deltaTime > 50) deltaTime = 50;
    
    this.lastTime = timeStamp;
    this.update(deltaTime);
    this.draw();
    requestAnimationFrame((t) => this.animate(t));
  }
}

window.onload = () => {
  new Game();
};
