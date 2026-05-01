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
    initialSpeed: 2.8,
    speedIncrease: 0.00045,
    obstacleMinGap: 460,
    obstacleMaxGap: 680,
    damage: 6
  },
  normal: {
    label: "NORMAL",
    initialSpeed: 3.4,
    speedIncrease: 0.0007,
    obstacleMinGap: 390,
    obstacleMaxGap: 590,
    damage: 10
  },
  hard: {
    label: "HARD",
    initialSpeed: 4.1,
    speedIncrease: 0.001,
    obstacleMinGap: 330,
    obstacleMaxGap: 500,
    damage: 14
  }
};

// 캐릭터 목록 (카드 UI 및 선택 가능 여부 추가)
const characters = [
  {
    id: "jieeng",
    name: "지에엥",
    selectable: true,
    status: "available",
    assetKey: "player"
  },
  {
    id: "coming_soon",
    name: "Coming Soon",
    selectable: false,
    status: "coming_soon",
    assetKey: null
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
    invincibleDuration: 1200,

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

      runFrameWidth: 124,
      runFrameHeight: null,

      jumpFrameWidth: null,
      jumpFrameHeight: null,

      doubleJumpFrameWidth: null,
      doubleJumpFrameHeight: null,

      slideFrameWidth: null,
      slideFrameHeight: null,

      // 모션별 정밀 소스 인셋 설정
      sourceInsets: {
        run: { left: 2, right: 2, y: 0 },
        jump: { left: 2, right: 2, y: 0 },
        doubleJump: { left: 2, right: 4, y: 0 },
        slide: { left: 0, right: 0, y: 0 },
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
    size: 40,
    score: 100,
    color: "#ffd600",
    collectPadding: 2,
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
    obstacleGap: 240, 
    slideSafeGap: 360,
    comboObstacleGap: 380, 
    earlySlideExtraCooldown: 40,

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
      
      // Stage 1 장애물 에셋
      obstacleNormal: "./assets/images/obstacle_stage1_normal_01.png",
      obstacleDouble: "./assets/images/obstacle_stage1_double_01.png",
      obstacleSlide1: "./assets/images/obstacle_stage1_slide_01.png",
      obstacleSlide2: "./assets/images/obstacle_stage1_slide_02.png",
      
      // Stage 1 코인 에셋
      item: "./assets/images/coin_stage1_gold.png", 
      
      bgStage1: "./assets/images/bg_stage1_test.png",
      ground: "./assets/images/ground_stage1_pastel_gothic.png",
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
