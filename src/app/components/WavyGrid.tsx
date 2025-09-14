"use client";

import { useRef, useEffect, useState } from "react";

export interface Recipe {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  description?: string;
}

type Props = {
  recipes: Recipe[]; // featured recipes to display
  speed?: number; // pixels per second for scrolling
  squareSize?: number; // size of each square in pixels
  gap?: number; // gap between squares in pixels
  waveAmplitude?: number; // how high/low the wave goes in pixels
  waveLength?: number; // how many columns for one complete wave cycle
  waveSpeed?: number; // speed of wave animation (multiplier)
};

export default function WavyGrid({
  recipes,
  speed = 50,
  squareSize = 140,
  gap = 20,
  waveAmplitude = 30,
  waveLength = 8,
  waveSpeed = 0.6,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const waveTimeRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [isClient, setIsClient] = useState(false);
  const scaleValues = useRef<Map<string, number>>(new Map());
  // No longer need currentRecipes state - calculating dynamically

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
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // No longer need to initialize recipes array - calculating dynamically

  useEffect(() => {
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (containerRef.current) {
        if (!isPaused) {
          // Update scroll position continuously - no resets
          scrollPositionRef.current += speed / 60; // assuming 60fps

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

        // Apply infinite scroll positioning
        const children = containerRef.current.children;
        const squaresPerRow =
          Math.ceil(dimensions.width / (squareSize + gap)) + 2;
        const totalWidth = squareSize + gap;

        for (let i = 0; i < children.length; i++) {
          const square = children[i] as HTMLElement;
          const col = i % squaresPerRow;
          const squareId = square.getAttribute("data-square-id")!;

          // Calculate base position for this column
          const baseX = col * totalWidth;

          // Apply scroll offset
          let currentX = baseX - scrollPositionRef.current;

          // Wrap around logic: if square is too far left, move it to the right side
          const containerWidth = dimensions.width;
          const extraBuffer = totalWidth * 2; // Extra buffer for smooth wrapping

          while (currentX < -extraBuffer) {
            currentX += squaresPerRow * totalWidth;
          }

          while (currentX > containerWidth + extraBuffer) {
            currentX -= squaresPerRow * totalWidth;
          }

          // Set the square's horizontal position
          square.style.left = `${currentX}px`;

          // Calculate wave Y position with moving wave pattern using the current X position
          const wavePhase =
            (currentX / (totalWidth * waveLength)) * Math.PI * 2 +
            waveTimeRef.current;
          const baseWaveY = Math.sin(wavePhase) * waveAmplitude;

          const waveY = baseWaveY;

          // Smooth scale animation
          const targetScale = hoveredSquare === squareId ? 1.3 : 1.0; // Increased hover scale from 1.1 to 1.3

          const currentScale = scaleValues.current.get(squareId) || 1.0;
          const newScale = currentScale + (targetScale - currentScale) * 0.15;
          scaleValues.current.set(squareId, newScale);

          // Apply wave animation with smooth scale
          square.style.transform = `translateY(${waveY}px) scale(${newScale})`;
        }

        // No longer need to transform the container since each square positions itself
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    speed,
    squareSize,
    gap,
    waveAmplitude,
    waveLength,
    waveSpeed,
    isPaused,
    hoveredSquare,
    dimensions,
  ]);

  // Calculate how many squares we need to fill the viewport plus some extra for seamless scrolling
  const squaresPerRow = Math.ceil(dimensions.width / (squareSize + gap)) + 2; // +2 for seamless scrolling

  // Calculate number of rows to fill 70vh (accounting for wave amplitude padding)
  const containerHeight = dimensions.height * 0.9;
  const availableHeight =
    containerHeight - (waveAmplitude + 180) - (waveAmplitude + 100); // Subtract top padding + bottom padding
  const rowsNeeded = Math.ceil(availableHeight / (squareSize + gap)); // Exact fit

  // Generate grid of squares using the current recipe state
  const squares = [];

  // Calculate scroll offset for recipe selection
  const totalWidth = squareSize + gap;
  const scrollOffsetInSquares = Math.floor(
    scrollPositionRef.current / totalWidth
  );

  // Show all squares
  for (let row = 0; row < rowsNeeded; row++) {
    for (let col = 0; col < squaresPerRow; col++) {
      // Calculate which recipe this square should show based on its effective position
      const effectiveCol = col + scrollOffsetInSquares;
      const recipeIndex = (row * squaresPerRow + effectiveCol) % recipes.length;
      const recipe = recipes[recipeIndex];
      squares.push({
        id: `${row}-${col}`,
        row,
        col,
        recipe,
      });
    }
  }

  // Don't render squares until we have client dimensions to prevent hydration mismatch
  if (!isClient) {
    return (
      <div
        className="relative overflow-hidden"
        style={{
          height: `calc(70vh + ${
            waveAmplitude + 180 + (waveAmplitude + 100)
          }px)`,
          marginTop: "20px",
          paddingTop: `${waveAmplitude + 180}px`,
          paddingBottom: `${waveAmplitude + 100}px`,
        }}
      >
        <div className="flex flex-wrap" />
      </div>
    );
  }

  return (
    <>
      {/* Main Grid Container */}
      <div
        className="relative overflow-hidden"
        style={{
          marginTop: "20px",
          paddingTop: `${waveAmplitude + 180}px`, // Increased to 180px to account for 1.3x scale hover (140 * 1.3 = 182px, so need extra 42px)
          paddingBottom: `${waveAmplitude + 100}px`, // Increased bottom padding too for symmetry
          height: `calc(70vh + ${
            waveAmplitude + 180 + (waveAmplitude + 100)
          }px)`, // Updated to match paddingTop
        }}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{
            width: "100%",
            height: `${
              rowsNeeded * (squareSize + gap) +
              (waveAmplitude * 2 + squareSize * 0.15) +
              (waveAmplitude + 180) +
              (waveAmplitude + 100)
            }px`, // Updated to account for new top positioning
            margin: "0",
            overflow: "hidden",
          }}
        >
          {squares.map((square) => (
            <div
              key={square.id}
              data-square-id={square.id}
              className={`cursor-pointer rounded-lg overflow-hidden ${
                hoveredSquare && hoveredSquare !== square.id
                  ? "opacity-30"
                  : "opacity-100"
              }`}
              style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                transformOrigin: "center",
                position: "absolute",
                top: `${
                  square.row * (squareSize + gap) +
                  waveAmplitude * 2 +
                  squareSize * 0.15
                }px`, // Extra buffer for wave peak + scale
                zIndex: hoveredSquare === square.id ? 10 : 1,
                boxShadow:
                  hoveredSquare === square.id
                    ? "0 0 30px 10px rgba(255, 255, 255, 0.8)"
                    : "none",
                transition: "box-shadow 0.3s ease-out",
                backgroundImage: `url(f${square.recipe.id}.jpg)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                // Don't set transform here - let JavaScript handle it completely
              }}
              onMouseEnter={() => {
                setHoveredSquare(square.id);
                setIsPaused(true);
              }}
              onMouseLeave={() => {
                setHoveredSquare(null);
                setIsPaused(false);
              }}
              onClick={(e) => {
                // If Ctrl/Cmd key is held, open in new tab
                if (e.ctrlKey || e.metaKey) {
                  window.open(square.recipe.url, "_blank");
                } else {
                  // Open recipe directly
                  window.open(square.recipe.url, "_blank");
                }
              }}
            >
              {/* Recipe title overlay */}
              <div
                className="absolute inset-0 flex items-end p-3 opacity-0 hover:opacity-100 transition-opacity duration-300"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                }}
              >
                <h3 className="text-white text-sm font-semibold leading-tight">
                  {square.recipe.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
