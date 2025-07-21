import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number;
}

interface OptimizationSettings {
  // 렌더링 최적화
  frameloop: 'always' | 'demand' | 'never';
  pixelRatio: number;
  shadowMapSize: number;
  
  // 품질 설정
  antialias: boolean;
  shadowsEnabled: boolean;
  toneMapping: THREE.ToneMapping;
  
  // 성능 임계값
  targetFPS: number;
  maxDrawCalls: number;
  maxTriangles: number;
  
  // 자동 최적화
  enableAutoOptimization: boolean;
  optimizationInterval: number; // ms
}

const DEFAULT_SETTINGS: OptimizationSettings = {
  frameloop: 'always',
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  shadowMapSize: 1024,
  antialias: true,
  shadowsEnabled: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  targetFPS: 30,
  maxDrawCalls: 100,
  maxTriangles: 50000,
  enableAutoOptimization: true,
  optimizationInterval: 2000
};

export const useThreeOptimization = (settings: Partial<OptimizationSettings> = {}) => {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { gl, scene, camera, setFrameloop } = useThree();
  
  const statsRef = useRef<RenderStats>({
    fps: 60,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memoryUsage: 0
  });
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const optimizationTimeoutRef = useRef<NodeJS.Timeout>();
  const renderTargetRef = useRef<THREE.WebGLRenderTarget>();

  // 렌더러 최적화 설정
  const optimizeRenderer = useCallback(() => {
    // 기본 렌더러 설정
    gl.setPixelRatio(config.pixelRatio);
    gl.setClearColor(0x000000, 0);
    gl.toneMapping = config.toneMapping;
    gl.toneMappingExposure = 1;
    
    // 섀도우 설정
    if (config.shadowsEnabled) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.shadowMap.setSize(config.shadowMapSize, config.shadowMapSize);
    } else {
      gl.shadowMap.enabled = false;
    }
    
    // 안티앨리어싱 설정
    if (config.antialias && gl.getContextAttributes()?.antialias !== config.antialias) {
      console.warn('안티앨리어싱 설정은 렌더러 초기화 시에만 적용됩니다.');
    }
    
    // WebGL 최적화 설정
    gl.getContext().getExtension('OES_vertex_array_object');
    gl.getContext().getExtension('WEBGL_compressed_texture_s3tc');
    gl.getContext().getExtension('WEBGL_compressed_texture_etc1');
    
  }, [gl, config]);

  // 성능 통계 수집
  const collectStats = useCallback(() => {
    const info = gl.info;
    const memory = info.memory;
    const render = info.render;
    
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    frameCountRef.current++;
    
    // FPS 계산 (1초마다)
    if (deltaTime >= 1000) {
      statsRef.current.fps = Math.round((frameCountRef.current * 1000) / deltaTime);
      statsRef.current.frameTime = deltaTime / frameCountRef.current;
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    // 렌더링 통계
    statsRef.current.drawCalls = render.calls;
    statsRef.current.triangles = render.triangles;
    statsRef.current.geometries = memory.geometries;
    statsRef.current.textures = memory.textures;
    
    // 메모리 사용량 (WebGL 컨텍스트 기준)
    const canvas = gl.domElement;
    const bytesPerPixel = 4; // RGBA
    const pixelCount = canvas.width * canvas.height;
    statsRef.current.memoryUsage = (pixelCount * bytesPerPixel) / (1024 * 1024); // MB
    
  }, [gl]);

  // 자동 최적화 로직
  const autoOptimize = useCallback(() => {
    const stats = statsRef.current;
    
    // FPS가 목표치 미만인 경우
    if (stats.fps < config.targetFPS) {
      console.log(`FPS 하락 감지 (${stats.fps}), 최적화 적용`);
      
      // 1단계: 섀도우 품질 낮추기
      if (config.shadowsEnabled && gl.shadowMap.getSize().width > 512) {
        gl.shadowMap.setSize(512, 512);
        console.log('섀도우 해상도를 512로 감소');
        return;
      }
      
      // 2단계: 섀도우 비활성화
      if (config.shadowsEnabled) {
        gl.shadowMap.enabled = false;
        console.log('섀도우 비활성화');
        return;
      }
      
      // 3단계: 픽셀 비율 낮추기
      if (config.pixelRatio > 1) {
        const newPixelRatio = Math.max(1, config.pixelRatio - 0.5);
        gl.setPixelRatio(newPixelRatio);
        console.log(`픽셀 비율을 ${newPixelRatio}로 감소`);
        return;
      }
      
      // 4단계: 온디맨드 렌더링으로 전환
      if (config.frameloop === 'always') {
        setFrameloop('demand');
        console.log('온디맨드 렌더링으로 전환');
        return;
      }
    }
    
    // 드로우 콜이 많은 경우
    if (stats.drawCalls > config.maxDrawCalls) {
      console.warn(`드로우 콜 과다 (${stats.drawCalls}), 지오메트리 병합 고려 필요`);
    }
    
    // 삼각형 수가 많은 경우
    if (stats.triangles > config.maxTriangles) {
      console.warn(`삼각형 과다 (${stats.triangles}), LOD 적용 고려 필요`);
    }
    
  }, [gl, config, setFrameloop]);

  // 메모리 정리
  const cleanupMemory = useCallback(() => {
    // 사용하지 않는 텍스처 정리
    const usedTextures = new Set<THREE.Texture>();
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach(mat => {
            Object.values(mat).forEach(value => {
              if (value instanceof THREE.Texture) {
                usedTextures.add(value);
              }
            });
          });
        } else if (material) {
          Object.values(material).forEach(value => {
            if (value instanceof THREE.Texture) {
              usedTextures.add(value);
            }
          });
        }
      }
    });
    
    // WebGL 리소스 정리
    gl.renderLists.dispose();
    gl.properties.clear();
    gl.state.reset();
    
  }, [gl, scene]);

  // 렌더 타겟 최적화
  const optimizeRenderTarget = useCallback((width: number, height: number) => {
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    
    // 멀티샘플링 설정 (안티앨리어싱)
    const samples = config.antialias ? 4 : 0;
    
    renderTargetRef.current = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      samples: samples,
      stencilBuffer: false,
      depthBuffer: true
    });
    
    return renderTargetRef.current;
  }, [config.antialias]);

  // 지오메트리 최적화
  const optimizeGeometry = useCallback((geometry: THREE.BufferGeometry) => {
    // 버텍스 중복 제거
    geometry.mergeVertices();
    
    // 법선 벡터 계산
    geometry.computeVertexNormals();
    
    // 바운딩 박스/스피어 계산
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    // 불필요한 속성 제거
    const unnecessaryAttributes = ['uv2', 'uv3', 'color'];
    unnecessaryAttributes.forEach(attr => {
      if (geometry.attributes[attr]) {
        geometry.deleteAttribute(attr);
      }
    });
    
    return geometry;
  }, []);

  // 머티리얼 최적화
  const optimizeMaterial = useCallback((material: THREE.Material) => {
    // 불필요한 기능 비활성화
    if (material instanceof THREE.MeshStandardMaterial) {
      // 성능이 중요한 경우 Lambert나 Basic 머티리얼 고려
      if (statsRef.current.fps < config.targetFPS) {
        material.roughness = 1.0; // 반사 계산 최소화
        material.metalness = 0.0;
      }
    }
    
    // 텍스처 압축
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        // 밉맵 생성 비활성화 (필요시)
        if (value.image && value.image.width <= 512) {
          value.generateMipmaps = false;
          value.minFilter = THREE.LinearFilter;
        }
      }
    });
    
    return material;
  }, [config.targetFPS]);

  // Level of Detail (LOD) 구현
  const createLOD = useCallback((
    highDetailMesh: THREE.Mesh,
    distances: number[] = [50, 100, 200]
  ) => {
    const lod = new THREE.LOD();
    
    // 고품질 메쉬 추가
    lod.addLevel(highDetailMesh, 0);
    
    // 중간 품질 메쉬 생성
    const mediumGeometry = highDetailMesh.geometry.clone();
    mediumGeometry.scale(0.8, 0.8, 0.8);
    const mediumMesh = new THREE.Mesh(mediumGeometry, highDetailMesh.material);
    lod.addLevel(mediumMesh, distances[0]);
    
    // 저품질 메쉬 생성
    const lowGeometry = highDetailMesh.geometry.clone();
    lowGeometry.scale(0.5, 0.5, 0.5);
    const lowMesh = new THREE.Mesh(lowGeometry, highDetailMesh.material);
    lod.addLevel(lowMesh, distances[1]);
    
    // 매우 저품질 (박스 형태)
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMesh = new THREE.Mesh(boxGeometry, highDetailMesh.material);
    lod.addLevel(boxMesh, distances[2]);
    
    return lod;
  }, []);

  // 프러스텀 컬링 최적화
  const setupFrustumCulling = useCallback(() => {
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4();
    
    return (object: THREE.Object3D, camera: THREE.Camera) => {
      cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(cameraMatrix);
      
      return frustum.intersectsObject(object);
    };
  }, []);

  // 프레임별 최적화 체크
  useFrame(() => {
    collectStats();
    
    // 자동 최적화 (주기적으로)
    if (config.enableAutoOptimization) {
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
      
      optimizationTimeoutRef.current = setTimeout(() => {
        autoOptimize();
      }, config.optimizationInterval);
    }
  });

  // 초기 설정
  useEffect(() => {
    optimizeRenderer();
    setFrameloop(config.frameloop);
  }, [optimizeRenderer, setFrameloop, config.frameloop]);

  // 정리
  useEffect(() => {
    return () => {
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
      cleanupMemory();
    };
  }, [cleanupMemory]);

  return {
    // 현재 상태
    stats: statsRef.current,
    config,
    
    // 최적화 함수들
    optimizeRenderer,
    optimizeGeometry,
    optimizeMaterial,
    optimizeRenderTarget,
    createLOD,
    setupFrustumCulling,
    cleanupMemory,
    
    // 수동 제어
    enableShadows: (enabled: boolean) => {
      gl.shadowMap.enabled = enabled;
    },
    setPixelRatio: (ratio: number) => {
      gl.setPixelRatio(Math.min(ratio, 2));
    },
    setShadowMapSize: (size: number) => {
      gl.shadowMap.setSize(size, size);
    },
    
    // 성능 정보
    getPerformanceInfo: () => ({
      ...statsRef.current,
      isPerformanceGood: statsRef.current.fps >= config.targetFPS,
      memoryPressure: statsRef.current.memoryUsage > 100 ? 'high' : 
                     statsRef.current.memoryUsage > 50 ? 'medium' : 'low',
      renderingLoad: statsRef.current.drawCalls > config.maxDrawCalls ? 'high' :
                     statsRef.current.drawCalls > config.maxDrawCalls * 0.7 ? 'medium' : 'low'
    }),
    
    // 권장사항
    getOptimizationSuggestions: () => {
      const suggestions: string[] = [];
      const stats = statsRef.current;
      
      if (stats.fps < config.targetFPS) {
        suggestions.push('프레임레이트가 낮습니다. 온디맨드 렌더링을 고려하세요.');
      }
      if (stats.drawCalls > config.maxDrawCalls) {
        suggestions.push('드로우 콜이 많습니다. 지오메트리 병합을 고려하세요.');
      }
      if (stats.triangles > config.maxTriangles) {
        suggestions.push('삼각형이 많습니다. LOD 시스템을 적용하세요.');
      }
      if (stats.memoryUsage > 100) {
        suggestions.push('메모리 사용량이 높습니다. 텍스처 해상도를 낮추세요.');
      }
      
      return suggestions;
    }
  };
};