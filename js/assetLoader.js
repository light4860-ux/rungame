/*
  AssetLoader: 게임에 필요한 이미지 리소스를 로드하고 관리합니다.
*/

class AssetLoader {
  constructor() {
    this.images = {};
  }

  async loadAll(imagePaths) {
    const entries = Object.entries(imagePaths);

    const loadPromises = entries.map(([key, src]) => {
      return this.loadImage(key, src);
    });

    return Promise.all(loadPromises);
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        this.images[key] = image;
        resolve(image);
      };

      image.onerror = () => {
        console.warn(`[AssetLoader] 이미지 로드 실패: ${src}`);
        this.images[key] = null;
        resolve(null);
      };

      image.src = src;
    });
  }

  // 검은색 배경(또는 특정 색상)을 투명하게 처리하는 메서드
  processChromaKey(key, img, targetColor, tolerance) {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // R, G, B 모두 tolerance(예: 35) 이하이면 투명 처리
        if (r < tolerance && g < tolerance && b < tolerance) {
          data[i + 3] = 0; // Alpha 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      // 원본 Image 객체 대신 처리된 Canvas를 저장합니다. (Canvas는 drawImage에서 Image처럼 사용 가능)
      this.images[key] = canvas;
      return canvas;
    } catch (e) {
      console.error("[AssetLoader] 크로마키 처리 중 에러 발생:", e);
      return img;
    }
  }

  getImage(key) {
    return this.images[key] || null;
  }
}