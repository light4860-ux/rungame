/* 
  모든 밸런싱 수치는 이 GAME_CONFIG에서 관리합니다.
*/

const GAME_STATE = {
  WAITING: "WAITING",
  PLAYING: "PLAYING",
  GAMEOVER: "GAMEOVER",
  CHARACTER_SELECT: "CHARACTER_SELECT"
};

// 화면 상태 정의
const SCREEN = {
  MAIN_MENU: "main_menu",
  CHARACTER_SELECT: "character_select",
  DIFFICULTY_SELECT: "difficulty_select",
  PLAYING: "playing",
  GAME_OVER: "game_over"
};

// 난이도별 설정 (밸런스 조정됨)
const difficultyConfig = {
  easy: {
    label: "EASY",
    initialSpeed: 3.0,
    speedIncrease: 0.000015,
    maxSpeed: 4.0,
    obstacleMinGap: 500,
    obstacleMaxGap: 700,
    damage: 12
  },
  normal: {
    label: "NORMAL",
    initialSpeed: 3.5,
    speedIncrease: 0.000025,
    maxSpeed: 5.0,
    obstacleMinGap: 420,
    obstacleMaxGap: 600,
    damage: 20
  },
  hard: {
    label: "HARD",
    initialSpeed: 4.2,
    speedIncrease: 0.000035,
    maxSpeed: 6.0,
    obstacleMinGap: 340,
    obstacleMaxGap: 500,
    damage: 28
  }
};

// 캐릭터 목록 (카드 UI 및 선택 가능 여부 추가)
const characters = [
  {
    id: "jieeng",
    name: "지에엥",
    selectable: true,
    runAssetKey: "playerRun",
    jumpAssetKey: "playerJump",
    doubleJumpAssetKey: "playerDoubleJump",
    slideAssetKey: "playerSlide",
    cardAssetKey: "characterJieengCard",
    // 프레임 수 설정
    runFrameCount: 6,
    jumpFrameCount: 4,
    doubleJumpFrameCount: 5,
    slideFrameCount: 3,
    // 렌더링 설정 (스프라이트 실제 비율 반영)
    // run/jump: 128x307 → 비율 2.40, drawWidth=82 → height=197
    // doubleJump: 160x307 → 비율 1.92, drawWidth=82 → height=157
    // slide: 200x300 → 비율 1.50, drawWidth=110 → height=165
    normalDrawWidth: 85,
    normalDrawHeight: 60,
    slideDrawWidth: 145,    // 실제 캐릭터 가로 173px에 맞게
    slideDrawHeight: 46,    // 실제 캐릭터 세로 88px에 맞게 (슬라이드니까 낮게)
    // 오프셋 설정
    runOffsetX: 5,
    jumpOffsetX: 5,
    doubleJumpOffsetX: 5,
    slideOffsetX: -50,
    // 모션별 소스 인셋 (실제 여백 기반)
    sourceInsets: {
      run:        { left: -6,  right: 12, top: 90,  bottom: 105 },
      jump:       { left: 6,  right: 2, top: 90,  bottom: 105 },
      doubleJump: { left: 6,  right: 2, top: 96,  bottom: 85  },
      slide:      { left: 10, right: 10, top: 108, bottom: 98  },  // 상단111, 하단101 여백 제거
    }
  },
  {
    id: "snowmage",
    name: "스노우메이지",
    selectable: true,
    runAssetKey: "character2Run",
    jumpAssetKey: "character2Jump",
    doubleJumpAssetKey: "character2DoubleJump",
    slideAssetKey: "character2Slide",
    cardAssetKey: "characterSnowmageCard",
    // 프레임 수 설정
    runFrameCount: 6,
    jumpFrameCount: 4,
    doubleJumpFrameCount: 5,
    slideFrameCount: 6,
    // 렌더링 설정 (스프라이트 실제 비율 반영)
    normalDrawWidth: 88,
    normalDrawHeight: 97,
    slideDrawWidth: 110,
    slideDrawHeight: 55,
    // 오프셋 설정
    runOffsetX: 0,
    jumpOffsetX: 0,
    doubleJumpOffsetX: 0,
    slideOffsetX: 4,
    // 모션별 소스 인셋 (스노우메이지 전용)
    sourceInsets: {
      run:        { left: 1,  right: 4,  top: 5,   bottom: 5  },
      jump:       { left: 4,  right: 4,  top: 5,   bottom: 5  },
      doubleJump: { left: 10, right: 10, top: 50, bottom: 5  },
      slide:      { left: 47,  right: -40,  top: 5,   bottom: 5  },
    }
  }
];

const GAME_CONFIG = {
  debug: {
    // 장애물 충돌 영역과 렌더링 영역을 확인하려면 true로 설정하세요.
    showHitBox: false,
    showObstacleDebug: false, // double 장애물 전용 디버그
  },

  canvas: {
    width: 1280,
    height: 720,
  },

  ground: {
    // 플레이어와 장애물이 서는 실제 지면선입니다.
    y: 588, 
    height: 130,
  },

  player: {
    x: 160,

    // 체력 및 무적 시스템
    maxHp: 100,
    damagePerHit: 25,
    invincibleDuration: 700,

    // 물리 기반 기본 높이/너비 (주로 지면 착지 기준점으로 사용)
    width: 42,
    height: 58,
    slideHeight: 30,

    // [Fallback] 화면 표시용 스프라이트 크기 및 위치 보정
    displayWidth: 120,
    spriteOffsetX: -10,
    spriteOffsetY: 110,

    // [공통 Fallback] 스프라이트 프레임 경계 보정
    spriteSourceInsetLeft: 2,
    spriteSourceInsetRight: 2,
    spriteSourceInsetY: 0,

    // 실제 충돌 판정용 히트박스 (캐릭터 상체와 겹치도록 보정)
    hitBoxOffsetX: 16,
    hitBoxOffsetY: -46,
    hitBoxWidth: 38,
    hitBoxHeight: 58,

    // 슬라이딩 중 히트박스 보정값 (낮고 얇게 유지)
    slideHitBoxOffsetX: 14,
    slideHitBoxOffsetY: -6,
    slideHitBoxWidth: 44,
    slideHitBoxHeight: 22,

    gravity: 0.65,
    jumpPower: -15,
    maxJumpCount: 2,

    maxGravityScale: 1.4,
    maxJumpPowerBonus: 3.5,

    color: "#e53935",
    animation: {
      runFps: 12,
      jumpFps: 10,
      doubleJumpFps: 14,
      slideFps: 10,

      runFrameWidth: null,
      runFrameHeight: null,

      jumpFrameWidth: null,
      jumpFrameHeight: null,

      doubleJumpFrameWidth: null,
      doubleJumpFrameHeight: null,

      slideFrameWidth: null,
      slideFrameHeight: null,

      // 모션별 정밀 소스 인셋 설정 (캐릭터별 설정이 없을 때 fallback)
      sourceInsets: {
        run:        { left: 1, right: 2, top: 0, bottom: 0 },
        jump:       { left: 2, right: 2, top: 0, bottom: 0 },
        doubleJump: { left: 2, right: 4, top: 0, bottom: 0 },
        slide:      { left: 0, right: 0, top: 0, bottom: 0 },
      },

      // 모션별 렌더링 설정 (displayWidth, offsetX, offsetY)
      renderSettings: {
        run: {
          displayWidth: 120,
          offsetX: -10,
          offsetY: 110,
        },
        jump: {
          displayWidth: 120,
          offsetX: -10,
          offsetY: 110,
        },
        doubleJump: {
          displayWidth: 120,
          offsetX: -10,
          offsetY: 110,
        },
        slide: {
          displayWidth: 165,
          offsetX: -35,
          offsetY: 92,
        },
      },
    },
  },

  ui: {
    hpBar: {
      x: 32,
      y: 74,
      width: 220,
      height: 18,
      borderWidth: 2,
      label: "HP",
    },
  },

  world: {
    baseSpeed: 3.2,
    maxSpeed: 10,
    speedIncreaseRate: 0.00035,
  },

  obstacle: {
    minSpawnInterval: 90,
    maxSpawnInterval: 150,

    // 장애물 타입별 상세 설정
    types: {
      normal: {
        width: 85,
        height: 95,
        groundOffset: 0,
        hitBoxPadding: 8,
      },
      double: {
        width: 115,
        height: 190,
        groundOffset: 0, // 이미지 여백에 따라 -5 ~ +8 조정 가능
        hitBoxPadding: 20,
      },
      slide: {
        width: 230,
        height: 64,
        hitBoxPaddingX: 12,
        hitBoxPaddingY: 8,
        // 지면과 장애물 사이의 통과 높이 보정값
        clearanceOffset: 8,
      },
    },
  },

  item: {
    spawnChance: 0.65,
    size: 72,
    score: 100,
    color: "#ffd600",
    collectPadding: 20,
    giantPotion: {
      width: 42,
      height: 64,
      score: 300,
      spawnChance: 0.055,
      firstSpawnDelay: 15000,
      cooldown: {
        easy: { min: 35000, max: 45000 },
        normal: { min: 45000, max: 60000 },
        hard: { min: 55000, max: 75000 }
      }
    }
  },

  // 패턴 생성 시스템 설정
  patterns: {
    minSpawnInterval: 110,
    maxSpawnInterval: 170,

    mediumScoreThreshold: 800,
    hardScoreThreshold: 1800,

    lateGameMinSpawnInterval: 85,
    lateGameMaxSpawnInterval: 135,

    coinGap: 48,
    obstacleGap: 340,
    slideSafeGap: 560,
    comboObstacleGap: 720,   // 충분히 늘려서 슬라이드+점프 겹침 방지
    earlySlideExtraCooldown: 70,

    coinArc: {
      count: 5,
      gapX: 44,
      baseY: 210,
      arcHeight: 70,
    },
  },

  score: {
    distanceScoreRate: 0.08,
  },

  assets: {
    images: {
      playerRun: "./assets/images/character_run.png",
      playerJump: "./assets/images/character_jump.png",
      playerDoubleJump: "./assets/images/character_doublejump.png",
      playerSlide: "./assets/images/character_slide.png",
      characterJieengCard: "./assets/images/character_jieeng_card.png",
      
      // Stage 1 장애물 에셋
      obstacleNormal: "./assets/images/obstacle_stage1_normal_01.png",
      obstacleDouble: "./assets/images/obstacle_stage1_double_01.png",
      obstacleSlide1: "./assets/images/obstacle_stage1_slide_01.png",
      obstacleSlide2: "./assets/images/obstacle_stage1_slide_02.png",
      
      // Stage 1 코인 에셋
      item: "./assets/images/coin_stage1_gold.png", 
      
      bgStage1: "./assets/images/bg_stage1_test.png",
      ground: "./assets/images/ground_stage1_pastel_gothic.png",
      giantPotion: "./assets/images/item_giant_potion.png",

      // 스노우메이지 에셋
      character2Run: "./assets/images/character2_run.png",
      character2Jump: "./assets/images/character2_jump.png",
      character2DoubleJump: "./assets/images/character2_doublejump.png",
      character2Slide: "./assets/images/character2_slide.png",
      characterSnowmageCard: "./assets/images/character_snowmage_card.png",
    },

    // 게임 중단을 방지하기 위해 크로마키 기능을 우선 비활성화합니다.
    chromaKey: {
      playerSlide: {
        enabled: false,
        color: [255, 255, 255],
        tolerance: 35,
      },
    },
  },
};
