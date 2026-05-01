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
    this.selectedCharacterIndex = 0; // 현재 확정된 캐릭터 인덱스
    this.cursorCharacterIndex = 0;   // 캐릭터 선택 화면에서의 커서 위치

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

      // 2. 캐릭터 선택 조작
      if (this.currentScreen === SCREEN.CHARACTER_SELECT) {
        if (event.code === "ArrowLeft") {
          this.cursorCharacterIndex = (this.cursorCharacterIndex - 1 + characters.length) % characters.length;
        } else if (event.code === "ArrowRight") {
          this.cursorCharacterIndex = (this.cursorCharacterIndex + 1) % characters.length;
        } else if (event.code === "Enter" || event.code === "Space") {
          const char = characters[this.cursorCharacterIndex];
          if (char.selectable) {
            this.selectedCharacterIndex = this.cursorCharacterIndex;
            this.currentScreen = SCREEN.MAIN_MENU;
          }
          // selectable이 아니면 아무 동작 안 함 (화면에 남음)
        } else if (event.code === "Escape" || event.code === "Backspace") {
          this.currentScreen = SCREEN.MAIN_MENU;
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
      this.cursorCharacterIndex = this.selectedCharacterIndex; // 현재 선택된 캐릭터로 커서 초기화
      this.currentScreen = SCREEN.CHARACTER_SELECT;
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

    switch (this.currentScreen) {
      case SCREEN.MAIN_MENU:
        this.drawMainMenu();
        break;
      case SCREEN.CHARACTER_SELECT:
        this.drawCharacterSelect();
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
    this.drawOverlayBackground();
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 64px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("캐릭터 선택", this.canvas.width / 2, 120);

    const cardWidth = 300;
    const cardHeight = 400;
    const spacing = 100;
    const startX = this.canvas.width / 2 - cardWidth - spacing / 2;
    const cardY = 200;

    characters.forEach((char, index) => {
      const isCursorOn = this.cursorCharacterIndex === index;
      const x = startX + index * (cardWidth + spacing);
      
      // 카드 배경
      this.ctx.save();
      this.ctx.fillStyle = char.selectable ? "rgba(60, 20, 100, 0.8)" : "rgba(30, 10, 50, 0.6)";
      
      if (isCursorOn) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = char.selectable ? "#FFD700" : "#888888";
        this.ctx.strokeStyle = char.selectable ? "#FFD700" : "#888888";
        this.ctx.lineWidth = 4;
      } else {
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 2;
      }
      
      // 카드 둥근 사각형 (단순화)
      this.ctx.fillRect(x, cardY, cardWidth, cardHeight);
      this.ctx.strokeRect(x, cardY, cardWidth, cardHeight);
      
      // 캐릭터 이미지
      if (char.id === "jieeng") {
        if (this.player && this.player.sprites.run) {
          this.ctx.drawImage(this.player.sprites.run, 0, 0, 124, 124, x + cardWidth/2 - 62, cardY + 80, 124, 124);
        }
      } else {
        // 실루엣
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.beginPath();
        this.ctx.arc(x + cardWidth/2, cardY + 140, 50, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillRect(x + cardWidth/2 - 40, cardY + 190, 80, 60);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("LOCKED", x + cardWidth/2, cardY + 230);
      }
      
      // 캐릭터 이름
      this.ctx.fillStyle = isCursorOn ? "#FFD700" : "white";
      this.ctx.font = "bold 32px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(char.name, x + cardWidth / 2, cardY + 340);
      
      // 상태 표시
      if (!char.selectable) {
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.font = "20px Arial";
        this.ctx.fillText("COMING SOON", x + cardWidth / 2, cardY + 375);
      } else if (this.selectedCharacterIndex === index) {
        this.ctx.fillStyle = "#FFD700";
        this.ctx.font = "20px Arial";
        this.ctx.fillText("SELECTED", x + cardWidth / 2, cardY + 375);
      }
      
      this.ctx.restore();
    });

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("← → 선택 / ENTER 확정 / BACKSPACE 또는 ESC 뒤로가기", this.canvas.width / 2, 650);
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
