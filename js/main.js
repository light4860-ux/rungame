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

    this.characters = [
      {
        id: "jieeng",
        name: "지에엥",
        selectable: true,
        assetKey: "playerRun",
        cardAssetKey: "characterJieengCard"
      },
      {
        id: "empty",
        name: "Coming Soon",
        selectable: false,
        assetKey: null,
        cardAssetKey: null
      }
    ];

    this.score = 0;
    this.distance = 0;
    this.worldSpeed = GAME_CONFIG.world.baseSpeed;

    this.player = null;
    this.background = null;
    this.patternManager = null;
    
    this.obstacles = [];
    this.items = [];

    this.lastTime = 0;
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getRandomSpawnInterval();
    this.lastPatternName = "";

    this.bindEvents();
    this.init();
  }

  async init() {
    try {
      await this.assets.loadAll(GAME_CONFIG.assets.images);

      this.player = new Player(this.assets);
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
          if (this.player) this.player.jump(this.worldSpeed);
        }
        if (event.code === "ArrowDown") {
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
      this.characterSelectIndex = 0;
      this.characterSelectMessage = "";
      this.characterSelectMessageTimer = 0;
    } else if (this.mainMenuIndex === 2) {
      this.currentScreen = SCREEN.DIFFICULTY_SELECT;
    }
  }

  getRandomSpawnInterval() {
    const diff = difficultyConfig[this.selectedDifficulty];
    const config = GAME_CONFIG.patterns;
    
    // 난이도에 따른 생성 간격 보정
    const min = diff.obstacleMinGap / 3; // 단순화된 틱 단위 변환
    const max = diff.obstacleMaxGap / 3;

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  reset() {
    const diff = difficultyConfig[this.selectedDifficulty];
    
    this.score = 0;
    this.distance = 0;
    this.worldSpeed = diff.initialSpeed; // 초기 속도 적용
    this.state = GAME_STATE.PLAYING;

    if (this.player) this.player.reset();
    this.obstacles = [];
    this.items = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getRandomSpawnInterval();
    this.lastPatternName = "";
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

    // 속도 점진적 증가 (난이도별 가중치 적용)
    if (this.worldSpeed < GAME_CONFIG.world.maxSpeed) {
      this.worldSpeed += diff.speedIncrease * deltaTime;
    }

    // 거리 및 점수 계산
    this.distance += this.worldSpeed * 0.1;
    this.score += this.worldSpeed * GAME_CONFIG.score.distanceScoreRate;

    if (this.background) this.background.update(this.worldSpeed);
    if (this.player) this.player.update(this.input, this.worldSpeed, deltaTime);

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
        // 난이도별 데미지 적용
        const damaged = this.player.takeDamage(diff.damage);
        if (damaged && this.player.isDead()) {
          this.currentScreen = SCREEN.GAME_OVER;
        }
      }
    });

    // 아이템 업데이트 및 획득 체크
    this.items.forEach((item) => {
      item.update(this.worldSpeed);
      if (!item.collected && this.checkCollision(this.player, item)) {
        item.collected = true;
        item.markedForDelete = true;
        this.score += GAME_CONFIG.item.score;
      }
    });

    this.obstacles = this.obstacles.filter((o) => !o.markedForDelete);
    this.items = this.items.filter((i) => !i.markedForDelete);
  }

  spawnPattern() {
    if (!this.patternManager) return;
    const startX = GAME_CONFIG.canvas.width + 100;
    const patternName = this.patternManager.selectRandomPattern(this.score);
    const pattern = this.patternManager.createPattern(patternName, startX);
    if (pattern.obstacles) this.obstacles.push(...pattern.obstacles);
    if (pattern.items) this.items.push(...pattern.items);
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

    if (this.state === GAME_STATE.CHARACTER_SELECT) {
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
        this.drawGameOver();
        break;
    }
  }

  drawGame() {
    this.obstacles.forEach((o) => o.draw(this.ctx));
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
      name: "Coming Soon",
      selectable: false,
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

    // 1. 카드 배경 색상 정의 (선택 여부와 관계없이 동일하게 유지하여 이미지 오염 방지)
    const cardFillColor = selectable
      ? "rgba(70, 42, 86, 0.58)"
      : "rgba(28, 22, 42, 0.68)";

    // 2. 카드 기본 배경 및 테두리 그리기
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fillStyle = cardFillColor;
    ctx.fill();
    ctx.strokeStyle = selectable
      ? "rgba(238, 230, 255, 0.55)"
      : "rgba(160, 145, 180, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 3. 선택된 카드 강조 (외곽 Glow 효과만 별도로 추가)
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

    // 4. 캐릭터 이미지 및 텍스트 렌더링
    if (index === 0) {
      // 캐릭터 이미지 뒤에 중립 보라색 preview panel 배치
      ctx.save();
      ctx.fillStyle = "rgba(48, 32, 70, 0.55)";
      ctx.beginPath();
      ctx.roundRect(x + 34, y + 34, width - 68, 190, 16);
      ctx.fill();
      ctx.restore();

      const character = this.characters[index];
      const cardImage = character && character.cardAssetKey
        ? this.assets.getImage(character.cardAssetKey)
        : null;

      if (cardImage && cardImage.complete !== false) {
        ctx.save();
        
        // 캐릭터 이미지에 영향을 주지 않도록 모든 그래픽 상태 완전 초기화
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 1;
        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";

        const maxPreviewWidth = 190;
        const maxPreviewHeight = 210;

        const imageRatio = cardImage.width / cardImage.height;
        let previewWidth = maxPreviewWidth;
        let previewHeight = previewWidth / imageRatio;

        if (previewHeight > maxPreviewHeight) {
          previewHeight = maxPreviewHeight;
          previewWidth = previewHeight * imageRatio;
        }

        const previewX = x + width / 2 - previewWidth / 2;
        const previewY = y + 52;

        ctx.drawImage(
          cardImage,
          previewX,
          previewY,
          previewWidth,
          previewHeight
        );
        
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = "rgba(230, 190, 255, 0.75)";
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + 150, 54, 76, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. 카드 텍스트 그리기 (상태 격리)
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, x + width / 2, y + height - 72);

      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#ffd86b";
      ctx.fillText("SELECTABLE", x + width / 2, y + height - 38);
      ctx.restore();
    }

    if (index === 1) {
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

      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "rgba(238, 230, 255, 0.72)";
      ctx.fillText("Coming Soon", x + width / 2, y + height - 76);

      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "rgba(255, 216, 107, 0.6)";
      ctx.fillText("LOCKED", x + width / 2, y + height - 40);
      ctx.restore();
    }
  }

  handleCharacterSelectKeyDown(event) {
    if (event.code === "Escape" || event.code === "Backspace") {
      event.preventDefault();
      this.state = GAME_STATE.WAITING;
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

      if (this.characterSelectIndex === 0) {
        this.selectedCharacterIndex = 0;
        this.state = GAME_STATE.WAITING;
        return true;
      }

      if (this.characterSelectIndex === 1) {
        this.characterSelectMessage = "Coming Soon";
        this.characterSelectMessageTimer = 90;
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
    const deltaTime = timeStamp - this.lastTime;
    this.lastTime = timeStamp;
    this.update(deltaTime);
    this.draw();
    requestAnimationFrame((t) => this.animate(t));
  }
}

window.onload = () => {
  new Game();
};
