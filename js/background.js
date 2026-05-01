/*
  Background 클래스는 게임의 배경 및 바닥 렌더링과 무한 스크롤링을 담당합니다.
*/

class Background {
  constructor(assets) {
    this.assets = assets;
    this.bgImage = assets.getImage("bgStage1");
    this.groundImage = assets.getImage("ground");

    // 배경 스크롤 설정
    this.bgX = 0;
    this.bgSpeedRatio = 0.35;

    // 지면(Ground) 스크롤 설정
    this.groundX = 0;

    // ground_stage1_pastel_gothic.png는 1536x1024 이미지 안에
    // 실제 바닥 리소스가 y=430~713 근처에만 들어 있습니다.
    // 검은 여백을 제외하고, 옆에서 본 플랫폼 상단부터 필요한 높이만 crop합니다.
    this.groundCrop = this.groundImage
      ? {
          sx: 0,
          sy: 430,
          sw: this.groundImage.width,
          sh: 156,
        }
      : null;

    // 화면에서 보이는 ground의 위치와 높이를 고정합니다.
    // groundDrawY가 곧 플레이어/장애물이 서는 지면선입니다.
    this.groundDrawHeight = 130;
    this.groundDrawY = GAME_CONFIG.canvas.height - this.groundDrawHeight + 20;

    // 모든 객체가 같은 지면선을 기준으로 움직이도록 전역 ground 값을 통일합니다.
    GAME_CONFIG.ground.y = this.groundDrawY;
    GAME_CONFIG.ground.height = this.groundDrawHeight;
  }

  // Game.update에서 PLAYING 상태일 때만 호출됩니다.
  update(worldSpeed) {
    // 배경 이동: 지면보다 느리게 이동시켜 패럴랙스 느낌을 줍니다.
    this.bgX -= worldSpeed * this.bgSpeedRatio;
    if (this.bgX <= -GAME_CONFIG.canvas.width) {
      this.bgX = 0;
    }

    // 바닥 이동: 실제 달리는 표면이므로 게임 속도와 동일하게 이동합니다.
    this.groundX -= worldSpeed;
    if (this.groundX <= -GAME_CONFIG.canvas.width) {
      this.groundX = 0;
    }
  }

  draw(ctx) {
    const canvasWidth = GAME_CONFIG.canvas.width;
    const canvasHeight = GAME_CONFIG.canvas.height;

    // 1. 배경 이미지 그리기
    if (this.bgImage) {
      const x = Math.floor(this.bgX);
      ctx.drawImage(this.bgImage, x, 0, canvasWidth, canvasHeight);
      ctx.drawImage(this.bgImage, x + canvasWidth, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = "#87ceeb";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. 바닥 이미지 그리기
    this.drawGround(ctx);
  }

  drawGround(ctx) {
    const canvasWidth = GAME_CONFIG.canvas.width;
    const x = Math.floor(this.groundX);

    if (this.groundImage && this.groundCrop) {
      const crop = this.groundCrop;

      // 검은 여백이 포함된 원본 전체를 그리지 않고,
      // 실제 플랫폼 영역만 잘라서 2장 이어 붙여 무한 스크롤합니다.
      ctx.drawImage(
        this.groundImage,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        x,
        this.groundDrawY,
        canvasWidth,
        this.groundDrawHeight
      );

      ctx.drawImage(
        this.groundImage,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        x + canvasWidth,
        this.groundDrawY,
        canvasWidth,
        this.groundDrawHeight
      );
    } else {
      ctx.save();
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(0, this.groundDrawY, canvasWidth, this.groundDrawHeight);
      ctx.restore();
    }
  }
}
