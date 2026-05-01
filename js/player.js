/*
  SpriteAnimation 클래스는 스프라이트 시트의 애니메이션 처리를 담당합니다.
*/
class SpriteAnimation {
  constructor(image, { 
    frameCount, 
    fps, 
    loop = true, 
    manualFrameWidth = null, 
    manualFrameHeight = null 
  }) {
    this.image = image;
    this.frameCount = frameCount;
    this.fps = fps;
    this.frameDuration = 1000 / fps;
    this.loop = loop;

    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isFinished = false;

    // 이미지 크기에 기반한 프레임 너비/높이 계산 (수동 설정 우선)
    if (this.image && this.image.width > 0) {
      this.frameWidth = manualFrameWidth || Math.floor(this.image.width / this.frameCount);
      this.frameHeight = this.image.height;
    } else {
      this.frameWidth = 1;
      this.frameHeight = 1;
    }
  }

  update(deltaTime) {
    if (!this.image || (this.isFinished && !this.loop)) return;

    this.elapsedTime += deltaTime;
    if (this.elapsedTime >= this.frameDuration) {
      if (this.currentFrame < this.frameCount - 1) {
        this.currentFrame++;
      } else {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.isFinished = true;
        }
      }
      this.elapsedTime = 0;
    }
  }

  // 버그 수정: 좌우 개별 inset을 반영한 렌더링 높이 계산
  getRenderHeight(drawWidth, options = {}) {
    const insetLeft = options.sourceInsetLeft || 0;
    const insetRight = options.sourceInsetRight || 0;
    const insetY = options.sourceInsetY || 0;

    const srcW = Math.max(1, this.frameWidth - insetLeft - insetRight);
    const srcH = Math.max(1, this.frameHeight - insetY * 2);

    return Math.round(drawWidth * srcH / srcW);
  }

  draw(ctx, x, y, drawWidth, options = {}) {
    if (!this.image) return false;

    const insetLeft = options.sourceInsetLeft || 0;
    const insetRight = options.sourceInsetRight || 0;
    const insetY = options.sourceInsetY || 0;

    // 버그 수정: 프레임 너비(frameWidth)를 기준으로 정확한 소스 영역 계산
    const srcX = this.currentFrame * this.frameWidth + insetLeft;
    const srcY = insetY;
    const srcW = Math.max(1, this.frameWidth - insetLeft - insetRight);
    const srcH = Math.max(1, this.frameHeight - insetY * 2);

    const renderH = Math.round(drawWidth * srcH / srcW);

    ctx.drawImage(
      this.image,
      srcX,
      srcY,
      srcW,
      srcH,
      x,
      y,
      drawWidth,
      renderH
    );

    return true;
  }

  reset() {
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isFinished = false;
  }
}

/*
  Player 클래스는 캐릭터의 상태와 애니메이션을 관리합니다.
*/
class Player {
  constructor(assets) {
    this.assets = assets;

    this.normalWidth = GAME_CONFIG.player.width;
    this.normalHeight = GAME_CONFIG.player.height;
    this.slideHeight = GAME_CONFIG.player.slideHeight;

    this.x = GAME_CONFIG.player.x;
    this.y = 0;

    this.width = this.normalWidth;
    this.height = this.normalHeight;

    this.velocityY = 0;
    this.jumpCount = 0;
    this.isSliding = false;

    // 체력 및 무적 시스템 상태 추가
    this.maxHp = GAME_CONFIG.player.maxHp;
    this.hp = this.maxHp;
    this.isInvincible = false;
    this.invincibleTimer = 0;

    // 상하 바운스 효과를 위한 상태
    this.bounceTimer = 0;
    this.bounceOffset = 0;

    // 거대화 상태 추가
    this.isGiantMode = false;
    this.giantModeTimer = 0;
    this.giantScale = 1.45; // 시각적 배율
    this.giantHitBoxScale = 1.15; // 히트박스 배율

    // 거대화 종료 후 보호 상태 추가
    this.isPostGiantInvincible = false;
    this.postGiantInvincibleTimer = 0;
    this.postGiantInvincibleDuration = 2000;

    this.color = GAME_CONFIG.player.color;

    const animConfig = GAME_CONFIG.player.animation;
    this.animations = {
      run: new SpriteAnimation(this.assets.getImage("playerRun"), {
        frameCount: 6,
        fps: animConfig.runFps,
        manualFrameWidth: animConfig.runFrameWidth,
        manualFrameHeight: animConfig.runFrameHeight,
      }),
      jump: new SpriteAnimation(this.assets.getImage("playerJump"), {
        frameCount: 4,
        fps: animConfig.jumpFps,
        loop: true,
        manualFrameWidth: animConfig.jumpFrameWidth,
        manualFrameHeight: animConfig.jumpFrameHeight,
      }),
      doubleJump: new SpriteAnimation(this.assets.getImage("playerDoubleJump"), {
        frameCount: 5,
        fps: animConfig.doubleJumpFps,
        loop: false,
        manualFrameWidth: animConfig.doubleJumpFrameWidth,
        manualFrameHeight: animConfig.doubleJumpFrameHeight,
      }),
      slide: new SpriteAnimation(this.assets.getImage("playerSlide"), {
        frameCount: 3,
        fps: animConfig.slideFps,
        manualFrameWidth: animConfig.slideFrameWidth,
        manualFrameHeight: animConfig.slideFrameHeight,
      }),
    };

    this.currentAnimKey = "run";
    this.reset();
  }

  reset() {
    this.width = this.normalWidth;
    this.height = this.normalHeight;
    this.x = GAME_CONFIG.player.x;
    this.y = GAME_CONFIG.ground.y - this.height;
    this.velocityY = 0;
    this.jumpCount = 0;
    this.isSliding = false;
    this.bounceTimer = 0;
    this.bounceOffset = 0;

    // 체력 및 무적 초기화
    this.maxHp = GAME_CONFIG.player.maxHp;
    this.hp = this.maxHp;
    this.isInvincible = false;
    this.invincibleTimer = 0;

    this.currentAnimKey = "run";

    // 거대화 및 보호 상태 초기화
    this.isGiantMode = false;
    this.giantModeTimer = 0;
    this.isPostGiantInvincible = false;
    this.postGiantInvincibleTimer = 0;
  }

  update(input, worldSpeed, deltaTime) {
    this.handleSlide(input);
    this.applyGravity(worldSpeed);
    this.updateAnimationState(deltaTime);
    this.updateInvincibility(deltaTime);
    this.updateBounceEffect(deltaTime);
    this.updateGiantMode(deltaTime);
    this.updatePostGiantInvincibility(deltaTime);
  }

  // 거대화 상태 업데이트
  updateGiantMode(deltaTime) {
    if (!this.isGiantMode) return;

    this.giantModeTimer -= deltaTime;
    if (this.giantModeTimer <= 0) {
      this.isGiantMode = false;
      this.giantModeTimer = 0;
      
      // 거대화 종료 직후 보호 상태 진입
      this.isPostGiantInvincible = true;
      this.postGiantInvincibleTimer = this.postGiantInvincibleDuration;
    }
  }

  // 거대화 종료 후 보호 상태 업데이트
  updatePostGiantInvincibility(deltaTime) {
    if (!this.isPostGiantInvincible) return;

    this.postGiantInvincibleTimer -= deltaTime;
    if (this.postGiantInvincibleTimer <= 0) {
      this.isPostGiantInvincible = false;
      this.postGiantInvincibleTimer = 0;
    }
  }

  // 거대화 활성화
  activateGiantMode(duration) {
    this.isGiantMode = true;
    this.giantModeTimer = duration;
    // 거대화 획득 시 짧은 무적 제공 (선택 사항이나 안정성 위해)
    this.isInvincible = true;
    this.invincibleTimer = Math.max(this.invincibleTimer, 1000);
  }

  // 달리기 중 상하 바운스 효과 (1~2px 부드러운 움직임)
  updateBounceEffect(deltaTime) {
    if (this.isOnGround() && !this.isSliding) {
      this.bounceTimer += deltaTime * 0.015; // 바운스 속도
      this.bounceOffset = Math.sin(this.bounceTimer) * 1.5; // 바운스 진폭 (1.5px)
    } else {
      this.bounceTimer = 0;
      this.bounceOffset = 0;
    }
  }

  // 무적 시간 업데이트 로직
  updateInvincibility(deltaTime) {
    if (!this.isInvincible) return;

    this.invincibleTimer -= deltaTime;

    if (this.invincibleTimer <= 0) {
      this.invincibleTimer = 0;
      this.isInvincible = false;
    }
  }

  // 데미지 처리 메서드
  takeDamage(amount) {
    if (this.isInvincible) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;
    this.invincibleTimer = GAME_CONFIG.player.invincibleDuration;

    return true;
  }

  // 사망 여부 확인
  isDead() {
    return this.hp <= 0;
  }

  updateAnimationState(deltaTime) {
    let nextAnimKey = "run";

    if (this.isSliding) {
      nextAnimKey = "slide";
    } else if (!this.isOnGround()) {
      if (this.jumpCount === 2) {
        if (this.currentAnimKey === "doubleJump" && this.animations.doubleJump.isFinished) {
          nextAnimKey = "jump";
        } else {
          nextAnimKey = "doubleJump";
        }
      } else {
        nextAnimKey = "jump";
      }
    } else {
      nextAnimKey = "run";
    }

    if (this.currentAnimKey !== nextAnimKey) {
      this.currentAnimKey = nextAnimKey;
      if (this.animations[this.currentAnimKey]) {
        this.animations[this.currentAnimKey].reset();
      }
    }

    if (this.animations[this.currentAnimKey]) {
      this.animations[this.currentAnimKey].update(deltaTime);
    }
  }

  jump(worldSpeed) {
    if (this.jumpCount < GAME_CONFIG.player.maxJumpCount) {
      const speedRatio = this.getSpeedRatio(worldSpeed);
      const jumpBonus = GAME_CONFIG.player.maxJumpPowerBonus * speedRatio;

      this.velocityY = GAME_CONFIG.player.jumpPower - jumpBonus;
      this.jumpCount += 1;

      if (this.jumpCount === 1) this.currentAnimKey = "jump";
      if (this.jumpCount === 2) {
        this.currentAnimKey = "doubleJump";
        this.animations.doubleJump.reset();
      }
    }
  }

  handleSlide(input) {
    if (input.down && this.isOnGround()) {
      this.startSlide();
    } else {
      this.endSlide();
    }
  }

  startSlide() {
    if (this.isSliding) return;
    this.isSliding = true;
    const bottomY = this.y + this.height;
    this.height = this.slideHeight;
    this.y = bottomY - this.height;
  }

  endSlide() {
    if (!this.isSliding) return;
    this.isSliding = false;
    const bottomY = this.y + this.height;
    this.height = this.normalHeight;
    this.y = bottomY - this.height;
  }

  applyGravity(worldSpeed) {
    const speedRatio = this.getSpeedRatio(worldSpeed);
    const gravityScale = 1 + (GAME_CONFIG.player.maxGravityScale - 1) * speedRatio;
    const adjustedGravity = GAME_CONFIG.player.gravity * gravityScale;

    this.velocityY += adjustedGravity;
    this.y += this.velocityY;

    const groundY = GAME_CONFIG.ground.y - this.height;

    if (this.y >= groundY) {
      this.y = groundY;
      this.velocityY = 0;
      this.jumpCount = 0;
    }
  }

  getSpeedRatio(worldSpeed) {
    const baseSpeed = GAME_CONFIG.world.baseSpeed;
    const maxSpeed = GAME_CONFIG.world.maxSpeed;
    if (maxSpeed <= baseSpeed) return 0;
    return Math.min(Math.max((worldSpeed - baseSpeed) / (maxSpeed - baseSpeed), 0), 1);
  }

  isOnGround() {
    return this.y >= GAME_CONFIG.ground.y - this.height - 0.1;
  }

  getHitBox() {
    const config = GAME_CONFIG.player;
    let baseBox;

    if (this.isSliding) {
      baseBox = {
        x: this.x + config.slideHitBoxOffsetX,
        y: this.y + config.slideHitBoxOffsetY,
        width: config.slideHitBoxWidth,
        height: config.slideHitBoxHeight,
      };
    } else {
      baseBox = {
        x: this.x + config.hitBoxOffsetX,
        y: this.y + config.hitBoxOffsetY,
        width: config.hitBoxWidth,
        height: config.hitBoxHeight,
      };
    }

    if (this.isGiantMode) {
      const scale = this.giantHitBoxScale;
      return {
        x: baseBox.x - (baseBox.width * (scale - 1)) / 2,
        y: baseBox.y - (baseBox.height * (scale - 1)), // 바닥 기준이므로 위쪽으로만 확장
        width: baseBox.width * scale,
        height: baseBox.height * scale,
      };
    }

    return baseBox;
  }

  // 현재 모션별 정밀 인셋 값을 가져옵니다.
  getCurrentSourceInset() {
    const animConfig = GAME_CONFIG.player.animation;
    const motionInset = animConfig.sourceInsets?.[this.currentAnimKey];

    return {
      sourceInsetLeft: motionInset?.left ?? GAME_CONFIG.player.spriteSourceInsetLeft ?? 0,
      sourceInsetRight: motionInset?.right ?? GAME_CONFIG.player.spriteSourceInsetRight ?? 0,
      sourceInsetY: motionInset?.y ?? GAME_CONFIG.player.spriteSourceInsetY ?? 0,
    };
  }

  // 현재 모션별 렌더링 설정(크기, 오프셋)을 가져옵니다.
  getCurrentRenderSetting() {
    const animConfig = GAME_CONFIG.player.animation;
    const setting = animConfig.renderSettings?.[this.currentAnimKey];

    return {
      displayWidth: setting?.displayWidth ?? GAME_CONFIG.player.displayWidth,
      offsetX: setting?.offsetX ?? GAME_CONFIG.player.spriteOffsetX,
      offsetY: setting?.offsetY ?? GAME_CONFIG.player.spriteOffsetY,
    };
  }

  draw(ctx) {
    ctx.save();

    // 무적 상태일 때 깜빡임 효과 적용
    if ((this.isInvincible && !this.isGiantMode) || this.isPostGiantInvincible) {
      // 100ms 단위로 깜빡임 (0.35 ~ 1.0 alpha)
      const timer = this.isPostGiantInvincible ? this.postGiantInvincibleTimer : this.invincibleTimer;
      const blink = Math.floor(timer / 100) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1;
    }

    // 거대화 아우라 효과
    if (this.isGiantMode) {
      ctx.save();
      const box = this.getHitBox();
      ctx.shadowBlur = 25;
      ctx.shadowColor = "rgba(255, 215, 0, 0.6)"; // 황금색 아우라
      ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(box.x - 10, box.y - 10, box.width + 20, box.height + 20, 20);
      ctx.stroke();
      ctx.restore();
    }

    const anim = this.animations[this.currentAnimKey];
    let drawn = false;

    if (anim && anim.image) {
      // 모션별 렌더링 설정 적용
      const renderSetting = this.getCurrentRenderSetting();
      // 거대화 스케일 적용
      const scale = this.isGiantMode ? this.giantScale : 1;
      const dw = renderSetting.displayWidth * scale;
      
      const sourceInset = this.getCurrentSourceInset();
      const renderH = anim.getRenderHeight(dw, sourceInset);
      
      const drawX = this.x - (dw - this.width) / 2 + renderSetting.offsetX * scale;
      
      // y값에 바운스 오프셋 적용 및 바닥 정렬 유지
      const drawY = (this.y + this.height) - renderH + (renderSetting.offsetY * scale) + this.bounceOffset;

      drawn = anim.draw(ctx, drawX, drawY, dw, sourceInset);
    }

    if (!drawn) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y + this.bounceOffset, this.width, this.height);
    }

    ctx.restore();

    if (GAME_CONFIG.debug.showHitBox) {
      this.drawHitBox(ctx);
    }
  }

  drawHitBox(ctx) {
    const box = this.getHitBox();
    
    ctx.save();
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}
