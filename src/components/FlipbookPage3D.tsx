import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PageMetadata, PageTransitionType } from '../types/flipbook';

interface FlipbookPage3DProps {
  page: PageMetadata;
  position: [number, number, number];
  rotation: [number, number, number];
  isActive: boolean;
  isAnimating: boolean;
  flipProgress: number;
  transitionType?: PageTransitionType;
  onTextureLoad?: () => void;
  onTextureError?: (error: Error) => void;
}

export const FlipbookPage3D: React.FC<FlipbookPage3DProps> = ({
  page,
  position,
  rotation,
  isActive,
  isAnimating,
  flipProgress,
  transitionType = PageTransitionType.FLIP,
  onTextureLoad,
  onTextureError
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshLambertMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isTextureLoaded, setIsTextureLoaded] = useState(false);

  // 페이지 크기 계산 (종횡비 기반)
  const { pageWidth, pageHeight } = useMemo(() => {
    const aspectRatio = page.aspectRatio || 1;
    const baseSize = 2.4;
    
    if (aspectRatio > 1) {
      // 가로형
      return {
        pageWidth: baseSize,
        pageHeight: baseSize / aspectRatio
      };
    } else {
      // 세로형
      return {
        pageWidth: baseSize * aspectRatio,
        pageHeight: baseSize
      };
    }
  }, [page.aspectRatio]);

  // 커스텀 지오메트리 생성 (페이지 휨 효과를 위한)
  const geometry = useMemo(() => {
    const segments = 32; // 세분화된 평면으로 자연스러운 휨 표현
    return new THREE.PlaneGeometry(pageWidth, pageHeight, segments, segments);
  }, [pageWidth, pageHeight]);

  // 텍스처 로딩
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    
    const loadTexture = async () => {
      try {
        const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            page.imageUrl,
            resolve,
            undefined,
            reject
          );
        });

        // 텍스처 최적화 설정
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.generateMipmaps = false;

        setTexture(loadedTexture);
        setIsTextureLoaded(true);
        onTextureLoad?.();
      } catch (error) {
        console.error('페이지 텍스처 로딩 실패:', error);
        onTextureError?.(error as Error);
      }
    };

    loadTexture();
  }, [page.imageUrl, onTextureLoad, onTextureError]);

  // 애니메이션 프레임 업데이트
  useFrame((state) => {
    if (!meshRef.current || !isAnimating) return;

    const mesh = meshRef.current;
    const time = state.clock.getElapsedTime();

    switch (transitionType) {
      case PageTransitionType.FLIP:
        // 기본 플립 애니메이션
        const rotationY = rotation[1] + (flipProgress * Math.PI);
        mesh.rotation.y = rotationY;
        
        // 페이지 휨 효과
        if (flipProgress > 0 && flipProgress < 1) {
          const positions = geometry.attributes.position as THREE.BufferAttribute;
          const positionArray = positions.array as Float32Array;
          
          for (let i = 0; i < positions.count; i++) {
            const x = positionArray[i * 3];
            const curvature = Math.sin(flipProgress * Math.PI) * 0.1;
            positionArray[i * 3 + 2] = Math.sin((x / pageWidth + 0.5) * Math.PI) * curvature;
          }
          
          positions.needsUpdate = true;
        }
        break;

      case PageTransitionType.CURL:
        // 페이지 모서리 말림 효과
        const curlAmount = flipProgress * 0.3;
        mesh.rotation.z = curlAmount;
        mesh.position.x = position[0] + flipProgress * 0.5;
        break;

      case PageTransitionType.FADE:
        // 페이드 효과
        if (materialRef.current) {
          materialRef.current.opacity = 1 - flipProgress;
        }
        break;

      case PageTransitionType.ZOOM:
        // 줌 효과
        const scale = 1 + flipProgress * 0.2;
        mesh.scale.setScalar(scale);
        if (materialRef.current) {
          materialRef.current.opacity = 1 - flipProgress * 0.5;
        }
        break;

      default:
        // 슬라이드 효과
        mesh.position.x = position[0] + flipProgress * pageWidth;
    }

    // 부드러운 그림자 효과
    if (flipProgress > 0 && flipProgress < 1) {
      const shadowIntensity = Math.sin(flipProgress * Math.PI) * 0.3;
      mesh.position.z = position[2] - shadowIntensity * 0.1;
    }
  });

  // 머티리얼 속성
  const materialProps = useMemo(() => ({
    map: texture,
    side: THREE.DoubleSide,
    transparent: page.hasTransparency || transitionType === PageTransitionType.FADE,
    opacity: isAnimating && transitionType === PageTransitionType.FADE ? 1 - flipProgress : 1,
    color: page.backgroundColor ? new THREE.Color(page.backgroundColor) : 0xffffff,
    // 종이 질감을 위한 속성
    roughness: 0.8,
    metalness: 0.1,
  }), [texture, page.hasTransparency, page.backgroundColor, isAnimating, transitionType, flipProgress]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      visible={isActive || isAnimating}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshLambertMaterial
        ref={materialRef}
        {...materialProps}
      />
      
      {/* 로딩 중 플레이스홀더 */}
      {!isTextureLoaded && (
        <meshBasicMaterial color={0xf0f0f0} />
      )}
    </mesh>
  );
};

export default FlipbookPage3D;