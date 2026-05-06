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

  draw(ctx, x, y, drawWidth, drawHeight, options = {}) {
    if (!this.image) return false;

    const insetLeft = options.sourceInsetLeft || 0;
    const insetRight = options.sourceInsetRight || 0;
    const insetTop = options.sourceInsetTop || 0;
    const insetBottom = options.sourceInsetBottom || 0;

    const frameCount = Math.max(1, this.frameCount);
    const frameWidth = this.image.width / frameCount;
    const frameHeight = this.image.height;

    const currentFrame = this.currentFrame % frameCount;
    const srcX = currentFrame * frameWidth + insetLeft;
    const srcY = insetTop;
    const srcW = Math.max(1, frameWidth - insetLeft - insetRight);
    const srcH = Math.max(1, frameHeight - insetTop - insetBottom);

    // clip으로 옆 프레임 삐져나옴 방지
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, drawWidth, drawHeight);
    ctx.clip();

    ctx.drawImage(
      this.image,
      srcX, srcY,
      srcW, srcH,
      x, y,
      drawWidth, drawHeight
    );

    ctx.restore();
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
  constructor(assets, characterData) {
    this.assets = assets;
    this.characterData = characterData || characters[0];

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

    // 플레이어 렌더링 크기 고정
    this.drawWidth = 90;
    this.drawHeight = 105;

    this.color = GAME_CONFIG.player.color;
    
    // 선택된 캐릭터 기반 애니메이션 초기화
    this.initAnimations(this.characterData);

    this.currentAnimKey = "run";
    this.reset();
  }

  // 선택된 캐릭터에 따라 애니메이션 세트를 다시 빌드합니다.
  initAnimations(character) {
    if (!character) return;
    
    const animConfig = GAME_CONFIG.player.animation;
    const assets = this.assets;

    // 이미지 헬퍼: 요청한 키가 없거나 로드되지 않았으면 기본 run으로 fallback
    const getSafeImage = (key, fallbackKey) => {
      let img = assets.getImage(key);
      if (!img || !img.complete || img.naturalWidth === 0) {
        if (fallbackKey) {
          img = assets.getImage(fallbackKey);
        }
        // 최종 fallback: 지에엥 기본 run
        if (!img || !img.complete || img.naturalWidth === 0) {
          img = assets.getImage("playerRun");
        }
      }
      return img;
    };

    this.animations = {
      run: new SpriteAnimation(getSafeImage(character.runAssetKey), {
        frameCount: character.runFrameCount || 6,
        fps: animConfig.runFps,
      }),
      jump: new SpriteAnimation(getSafeImage(character.jumpAssetKey, character.runAssetKey), {
        frameCount: character.jumpFrameCount || 4,
        fps: animConfig.jumpFps,
        loop: true,
      }),
      doubleJump: new SpriteAnimation(getSafeImage(character.doubleJumpAssetKey, character.jumpAssetKey), {
        frameCount: character.doubleJumpFrameCount || 5,
        fps: animConfig.doubleJumpFps,
        loop: false,
      }),
      slide: new SpriteAnimation(getSafeImage(character.slideAssetKey, character.runAssetKey), {
        frameCount: character.slideFrameCount || 3,
        fps: animConfig.slideFps,
      }),
    };
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
    const char = this.characterData || characters[0];

    // 캐릭터별 인셋 우선, 없으면 global 인셋 사용
    const charInsets = char.sourceInsets?.[this.currentAnimKey];
    const globalInsets = animConfig.sourceInsets?.[this.currentAnimKey];
    const motionInset = charInsets || globalInsets;

    return {
      sourceInsetLeft:   motionInset?.left   ?? 0,
      sourceInsetRight:  motionInset?.right  ?? 0,
      sourceInsetTop:    motionInset?.top    ?? 0,
      sourceInsetBottom: motionInset?.bottom ?? 0,
    };
  }

  // 현재 모션별 렌더링 설정(크기, 오프셋)을 가져옵니다.
  getCurrentRenderSetting() {
    const char = this.characterData || characters[0];
    const isSliding = this.isSliding;

    const fallbackNormalWidth = GAME_CONFIG.player.displayWidth || 90;
    const fallbackNormalHeight = 92;
    const fallbackSlideWidth = 90;
    const fallbackSlideHeight = 50;

    let baseWidth, baseHeight;

    if (isSliding) {
      baseWidth = char.slideDrawWidth ?? fallbackSlideWidth;
      baseHeight = char.slideDrawHeight ?? fallbackSlideHeight;
    } else {
      baseWidth = char.normalDrawWidth ?? fallbackNormalWidth;
      // 모션별로 스프라이트 비율이 다를 경우 각각 계산
      const anim = this.animations[this.currentAnimKey];
      if (anim && anim.image && anim.frameWidth > 0) {
        // 실제 스프라이트 비율로 height 계산
        baseHeight = Math.round(baseWidth * anim.frameHeight / anim.frameWidth);
        // 너무 크거나 작아지면 normalDrawHeight로 cap
        const maxH = (char.normalDrawHeight ?? fallbackNormalHeight) * 2;
        const minH = (char.normalDrawHeight ?? fallbackNormalHeight) * 0.5;
        baseHeight = Math.min(maxH, Math.max(minH, baseHeight));
      } else {
        baseHeight = char.normalDrawHeight ?? fallbackNormalHeight;
      }
    }

    let offsetX = 0;
    switch (this.currentAnimKey) {
      case "run": offsetX = char.runOffsetX ?? 0; break;
      case "jump": offsetX = char.jumpOffsetX ?? 0; break;
      case "doubleJump": offsetX = char.doubleJumpOffsetX ?? 0; break;
      case "slide": offsetX = char.slideOffsetX ?? 0; break;
      default: offsetX = char.runOffsetX ?? 0;
    }

    return {
      drawWidth: baseWidth,
      drawHeight: baseHeight,
      offsetX: offsetX
    };
  }

  draw(ctx) {
    ctx.save();

    // 무적 상태일 때 깜빡임 효과 적용
    if ((this.isInvincible && !this.isGiantMode) || this.isPostGiantInvincible) {
      // 100ms 단위로 깜빡임 (0.35 ~ 1.0 alpha)
      const timer = this.isPostGiantInvincible ? this.postGiantInvincibleTimer : this.invincibleTimer;
      // 무적 시간이 짧아졌으므로 깜빡임 주기도 약간 조정 (80ms)
      const blink = Math.floor(timer / 80) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1;
    }

    // 거대화 아우라 효과 (박스 테두리 제거, 그림자 glow만 사용)
    if (this.isGiantMode) {
      ctx.save();
      const renderSetting = this.getCurrentRenderSetting();
      const scale = this.giantScale;
      const dw = renderSetting.drawWidth * scale;
      const dh = renderSetting.drawHeight * scale;
      const drawX = this.x + renderSetting.offsetX * scale;
      const drawBottomY = this.y + this.height;
      const drawY = drawBottomY - dh;

      // 테두리 없이 황금색 glow만 표현
      ctx.shadowBlur = 40;
      ctx.shadowColor = "rgba(255, 215, 0, 0.9)";
      ctx.fillStyle = "rgba(255, 215, 0, 0)"; // 투명 fill
      ctx.beginPath();
      ctx.ellipse(
        drawX + dw / 2,
        drawY + dh / 2,
        dw / 2 + 10,
        dh / 2 + 10,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    let anim = this.animations[this.currentAnimKey];
    if (!anim || !anim.image) {
      anim = this.animations.run;
    }
    let drawn = false;

    if (anim && anim.image) {
      const renderSetting = this.getCurrentRenderSetting();
      const scale = this.isGiantMode ? this.giantScale : 1;
      
      const dw = renderSetting.drawWidth * scale;
      const dh = renderSetting.drawHeight * scale;
      
      const sourceInset = this.getCurrentSourceInset();
      
      const drawX = this.x + renderSetting.offsetX * scale;
      
      // 발 기준 정렬 (바닥 Y축 고정)
      // 물리적인 바닥 위치 = this.y + this.height
      const drawBottomY = this.y + this.height;
      const drawY = drawBottomY - dh + this.bounceOffset;

      drawn = anim.draw(ctx, drawX, drawY, dw, dh, sourceInset);
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
