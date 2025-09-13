"use client";

import { useRef, useEffect, useState } from "react";

type Props = {
  speed?: number; // pixels per second for scrolling
  squareSize?: number; // size of each square in pixels
  gap?: number; // gap between squares in pixels
  waveAmplitude?: number; // how high/low the wave goes in pixels
  waveLength?: number; // how many columns for one complete wave cycle
  waveSpeed?: number; // speed of wave animation (multiplier)
};

export default function WavyGrid({
  speed = 50,
  squareSize = 140,
  gap = 20,
  waveAmplitude = 30,
  waveLength = 8,
  waveSpeed = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const waveTimeRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [isClient, setIsClient] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [overlayAnimationProgress, setOverlayAnimationProgress] = useState(0);
  const scaleValues = useRef<Map<string, number>>(new Map());
  const overlayProgressRef = useRef(0);

  // Handle client-side hydration and window sizing
  useEffect(() => {
    setIsClient(true);
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    overlayProgressRef.current = overlayAnimationProgress;
  }, [overlayAnimationProgress]);

  // Smooth overlay animation
  useEffect(() => {
    if (!isOverlayMode && !selectedSquare) return;
    
    let animationId: number;
    
    const animateOverlay = () => {
      const targetProgress = isOverlayMode ? 1 : 0;
      const currentProgress = overlayProgressRef.current;
      const diff = targetProgress - currentProgress;
      
      if (Math.abs(diff) < 0.01) {
        setOverlayAnimationProgress(targetProgress);
        overlayProgressRef.current = targetProgress;
        if (targetProgress === 0) {
          setSelectedSquare(null);
        }
        return;
      }
      
      const newProgress = currentProgress + diff * 0.15;
      setOverlayAnimationProgress(newProgress);
      overlayProgressRef.current = newProgress;
      animationId = requestAnimationFrame(animateOverlay);
    };
    
    animationId = requestAnimationFrame(animateOverlay);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isOverlayMode]);

  useEffect(() => {
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (containerRef.current) {
        if (!isPaused) {
          // Update scroll position
          scrollPositionRef.current += speed / 60; // assuming 60fps
          
          const totalWidth = squareSize + gap;
          // Reset position when we've scrolled one full square width
          if (scrollPositionRef.current >= totalWidth) {
            scrollPositionRef.current = 0;
          }
          
          // Update wave time for moving wave pattern
          // Only advance time when not paused
          if (lastTimestampRef.current !== null) {
            const deltaTime = (timestamp - lastTimestampRef.current) * 0.001; // convert to seconds
            waveTimeRef.current += deltaTime * waveSpeed;
          }
          lastTimestampRef.current = timestamp;
        } else {
          // When paused, reset the timestamp reference so we don't get a big jump when resuming
          lastTimestampRef.current = null;
        }
        
        // Apply horizontal scroll and update wave positions
        const children = containerRef.current.children;
        const squaresPerRow = Math.ceil(dimensions.width / (squareSize + gap)) + 2;
        
        for (let i = 0; i < children.length; i++) {
          const square = children[i] as HTMLElement;
          const col = i % squaresPerRow;
          const squareId = square.getAttribute('data-square-id')!;
          
          // Calculate the absolute X position of this column considering scroll
          const absoluteX = col * (squareSize + gap) - scrollPositionRef.current;
          
          // Calculate wave Y position with moving wave pattern
          const wavePhase = (absoluteX / ((squareSize + gap) * waveLength)) * Math.PI * 2 + waveTimeRef.current;
          const baseWaveY = Math.sin(wavePhase) * waveAmplitude;
          
          // Reduce wave amplitude in overlay mode (straighten the wave)
          const waveY = baseWaveY * (1 - overlayProgressRef.current);
          
          // Debug: log the first square's values
          if (i === 0 && overlayProgressRef.current > 0) {
            console.log('Wave straightening:', {
              baseWaveY,
              overlayProgress: overlayProgressRef.current,
              finalWaveY: waveY,
              squareId
            });
          }
          
          // Determine if this square should be visible in overlay mode
          const [selectedRow] = selectedSquare?.split('-') || [];
          const [currentRow] = squareId.split('-');
          const isSelectedRow = selectedRow === currentRow;
          const isSelectedSquare = selectedSquare === squareId;
          
          // Calculate opacity for overlay mode
          let opacity = 1;
          if (overlayProgressRef.current > 0) {
            if (isSelectedRow) {
              opacity = 1;
            } else {
              opacity = 1 - overlayProgressRef.current;
            }
          }
          
          // Smooth scale animation
          let targetScale = hoveredSquare === squareId ? 1.3 : 1.0; // Increased hover scale from 1.1 to 1.3
          if (isSelectedSquare && overlayProgressRef.current > 0) {
            targetScale = 1.2; // Highlight selected square more
          }
          
          const currentScale = scaleValues.current.get(squareId) || 1.0;
          const newScale = currentScale + (targetScale - currentScale) * 0.15;
          scaleValues.current.set(squareId, newScale);
          
          // Apply wave animation with smooth scale and opacity
          square.style.transform = `translateY(${waveY}px) scale(${newScale})`;
          square.style.opacity = opacity.toString();
        }
        
        containerRef.current.style.transform = `translateX(-${scrollPositionRef.current}px)`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [speed, squareSize, gap, waveAmplitude, waveLength, waveSpeed, isPaused, hoveredSquare, dimensions, selectedSquare]);

  // Calculate how many squares we need to fill the viewport plus some extra for seamless scrolling
  const squaresPerRow = Math.ceil(dimensions.width / (squareSize + gap)) + 2; // +2 for seamless scrolling
  
  // Calculate number of rows to fill 70vh (accounting for wave amplitude padding)
  const containerHeight = dimensions.height * 0.7;
  const availableHeight = containerHeight - (waveAmplitude * 2); // Subtract padding for wave amplitude
  const rowsNeeded = Math.ceil(availableHeight / (squareSize + gap)); // Exact fit

  // Generate grid of squares
  const squares = [];
  if (isOverlayMode && selectedSquare) {
    // Only show the selected row in overlay mode
    const [selectedRow] = selectedSquare.split('-');
    const rowNum = parseInt(selectedRow);
    for (let col = 0; col < squaresPerRow; col++) {
      squares.push({
        id: `${rowNum}-${col}`,
        row: rowNum,
        col,
      });
    }
  } else {
    // Show all squares in normal mode
    for (let row = 0; row < rowsNeeded; row++) {
      for (let col = 0; col < squaresPerRow; col++) {
        squares.push({
          id: `${row}-${col}`,
          row,
          col,
        });
      }
    }
  }

  // Don't render squares until we have client dimensions to prevent hydration mismatch
  if (!isClient) {
    return (
      <div 
        className="relative overflow-hidden"
        style={{ 
          height: `calc(70vh + ${waveAmplitude * 2}px)`, 
          marginTop: '20px',
          paddingTop: `${waveAmplitude}px`,
          paddingBottom: `${waveAmplitude}px`
        }}
      >
        <div className="flex flex-wrap" />
      </div>
    );
  }

  return (
    <>
      {/* Placeholder div to maintain space when grid goes fixed */}
      {isOverlayMode && (
        <div 
          style={{ 
            height: `calc(70vh + ${waveAmplitude * 2}px)`, 
            marginTop: '20px',
          }}
        />
      )}

      {/* Main Grid Container */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          marginTop: isOverlayMode ? '30px' : '20px',
          paddingTop: `${waveAmplitude}px`,
          paddingBottom: `${waveAmplitude}px`,
          // Transform to overlay mode
          position: isOverlayMode ? 'fixed' : 'relative',
          top: isOverlayMode ? '0' : 'auto',
          left: isOverlayMode ? '0' : 'auto',
          right: isOverlayMode ? '0' : 'auto',
          transform: 'none',
          zIndex: isOverlayMode ? 1000 : 'auto',
          width: isOverlayMode ? '100vw' : 'auto',
          height: isOverlayMode ? 'auto' : `calc(70vh + ${waveAmplitude * 2}px)`,
          transition: 'position 0s, top 1s ease-out, left 1s ease-out, right 1s ease-out, width 1s ease-out, z-index 0s, margin-top 1s ease-out, height 1s ease-out',
        }}
      >
        <div
          ref={containerRef}
          className="flex flex-wrap"
          style={{
            width: `${squaresPerRow * (squareSize + gap)}px`,
            height: isOverlayMode ? `${squareSize + gap}px` : `${rowsNeeded * (squareSize + gap)}px`,
            margin: isOverlayMode ? '40px auto 0 auto' : '0',
            transition: 'margin 1s ease-out, height 1s ease-out',
          }}
        >
          {squares.map((square) => (
            <div
              key={square.id}
              data-square-id={square.id}
              className={`bg-gray-400 cursor-pointer ${
                hoveredSquare && hoveredSquare !== square.id && !isOverlayMode ? 'opacity-30' : 'opacity-100'
              }`}
              style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                marginRight: `${gap}px`,
                marginBottom: `${gap}px`,
                transformOrigin: 'center',
                position: 'relative',
                zIndex: hoveredSquare === square.id ? 10 : 1,
                boxShadow: hoveredSquare === square.id ? '0 0 30px 10px rgba(255, 255, 255, 0.8)' : 'none',
                transition: 'opacity 0.5s ease-out, box-shadow 0.3s ease-out',
                // Don't set transform here - let JavaScript handle it completely
              }}
              onMouseEnter={() => {
                if (!isOverlayMode) {
                  setHoveredSquare(square.id);
                  setIsPaused(true);
                }
              }}
              onMouseLeave={() => {
                if (!isOverlayMode) {
                  setHoveredSquare(null);
                  setIsPaused(false);
                }
              }}
              onClick={() => {
                if (!isOverlayMode) {
                  setSelectedSquare(square.id);
                  setIsOverlayMode(true);
                  setIsPaused(true);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Overlay Background */}
      {isOverlayMode && (
        <div
          className="fixed inset-0 bg-white transition-opacity duration-1000 ease-out"
          style={{
            opacity: overlayAnimationProgress * 0.8,
            backdropFilter: 'blur(20px)',
            zIndex: 999,
          }}
          onClick={() => {
            setIsOverlayMode(false);
            setIsPaused(false);
            setHoveredSquare(null);
          }}
        />
      )}

      {/* Details Panel */}
      {isOverlayMode && selectedSquare && (
        <div
          className="fixed left-1/2 transition-all duration-1000 ease-out"
          style={{
            top: `calc(40px + ${waveAmplitude}px + ${squareSize + gap}px + ${waveAmplitude}px + 20px)`,
            transform: `translateX(-50%) translateY(${(1 - overlayAnimationProgress) * 50}px)`,
            opacity: overlayAnimationProgress,
            zIndex: 1001,
            width: '600px',
            maxWidth: '90vw',
          }}
        >
          {/* Dummy Details Content */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="w-full h-64 bg-gray-300 rounded-lg mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Square {selectedSquare}</h2>
            <p className="text-gray-600 leading-relaxed">
              This is a detailed view of the selected square. Here you can display any relevant information,
              images, or interactive content related to this particular square in the grid.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
