import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FlipbookMetadata, PageMetadata } from '../types/flipbook';

interface FlipbookViewerProps {
  flipbook: FlipbookMetadata;
  currentPage: number;
  onPageChange: (page: number) => void;
  autoPlay?: boolean;
  controls?: boolean;
}

interface FlipbookPageProps {
  page: PageMetadata;
  position: [number, number, number];
  rotation: [number, number, number];
  isActive: boolean;
  isAnimating: boolean;
  flipProgress: number;
}

const FlipbookPage: React.FC<FlipbookPageProps> = ({
  page,
  position,
  rotation,
  isActive,
  isAnimating,
  flipProgress
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      page.imageUrl,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('페이지 텍스처 로딩 실패:', error);
      }
    );
  }, [page.imageUrl]);

  useFrame(() => {
    if (meshRef.current && isAnimating) {
      const rotationY = rotation[1] + (flipProgress * Math.PI);
      meshRef.current.rotation.y = rotationY;
    }
  });

  const aspectRatio = page.aspectRatio || 1;
  const pageWidth = aspectRatio > 1 ? 2 : 2 * aspectRatio;
  const pageHeight = aspectRatio > 1 ? 2 / aspectRatio : 2;

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      visible={isActive || isAnimating}
    >
      <planeGeometry args={[pageWidth, pageHeight]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent={page.hasTransparency}
      />
    </mesh>
  );
};

const FlipbookScene: React.FC<{
  flipbook: FlipbookMetadata;
  currentPage: number;
  onPageChange: (page: number) => void;
}> = ({ flipbook, currentPage, onPageChange }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [flipProgress, setFlipProgress] = useState(0);
  const [targetPage, setTargetPage] = useState(currentPage);
  const { camera, gl } = useThree();

  const animationRef = useRef<number | null>(null);

  const startPageFlip = (direction: 'next' | 'prev') => {
    if (isAnimating) return;

    const newPage = direction === 'next' 
      ? Math.min(currentPage + 1, (flipbook.pages?.length || 1) - 1)
      : Math.max(currentPage - 1, 0);

    if (newPage === currentPage) return;

    setIsAnimating(true);
    setTargetPage(newPage);
    setFlipProgress(0);

    const startTime = Date.now();
    const duration = 800; // 0.8초

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // ease-in-out 이징 함수
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setFlipProgress(easedProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setFlipProgress(0);
        onPageChange(newPage);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleClick = (event: THREE.Event) => {
    const mouseX = (event as any).clientX;
    const canvasWidth = gl.domElement.clientWidth;
    const clickRatio = mouseX / canvasWidth;

    if (clickRatio < 0.3) {
      startPageFlip('prev');
    } else if (clickRatio > 0.7) {
      startPageFlip('next');
    }
  };

  if (!flipbook.pages || flipbook.pages.length === 0) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="gray"
        anchorX="center"
        anchorY="middle"
      >
        페이지가 없습니다
      </Text>
    );
  }

  return (
    <group onClick={handleClick}>
      {flipbook.pages.map((page, index) => {
        const isCurrentPage = index === currentPage;
        const isTargetPage = index === targetPage;
        const shouldRender = isCurrentPage || isTargetPage || 
                           (isAnimating && (index === currentPage || index === targetPage));

        if (!shouldRender) return null;

        return (
          <FlipbookPage
            key={page.id}
            page={page}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            isActive={isCurrentPage || (isAnimating && isTargetPage)}
            isAnimating={isAnimating && isCurrentPage}
            flipProgress={flipProgress}
          />
        );
      })}
    </group>
  );
};

const FlipbookViewer: React.FC<FlipbookViewerProps> = ({
  flipbook,
  currentPage,
  onPageChange,
  autoPlay = false,
  controls = true
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 첫 번째 페이지 로딩 완료 시뮬레이션
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [flipbook.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">플립북 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-gray-100 to-gray-200">
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <Suspense fallback={null}>
          <FlipbookScene
            flipbook={flipbook}
            currentPage={currentPage}
            onPageChange={onPageChange}
          />
        </Suspense>

        {controls && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            maxDistance={10}
            minDistance={2}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 4}
          />
        )}
      </Canvas>

      {/* 페이지 네비게이션 UI */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
          >
            ←
          </button>
          
          <span className="text-sm font-medium text-gray-700">
            {currentPage + 1} / {flipbook.pageCount}
          </span>
          
          <button
            onClick={() => onPageChange(Math.min(flipbook.pageCount - 1, currentPage + 1))}
            disabled={currentPage === flipbook.pageCount - 1}
            className="p-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* 클릭 가이드 */}
      <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-2 rounded-lg">
        좌측 클릭: 이전 페이지 | 우측 클릭: 다음 페이지
      </div>
    </div>
  );
};

export default FlipbookViewer;