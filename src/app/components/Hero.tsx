"use client";

import { useEffect, useState } from "react";
import CafeBorder from "./CafeBorder";
import GridBackgroundPattern from "./GridBackgroundPattern";
import SearchBar from "./SearchBar";
import WavyGrid, { Recipe } from "./WavyGrid";

const sampleRecipes: Recipe[] = [
  {
    id: "1",
    title: "Classic Granny Square",
    thumbnail:
      "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/classic-granny-square",
    description:
      "The traditional granny square pattern that started it all. Perfect for beginners!",
  },
  {
    id: "2",
    title: "Flower Power Square",
    thumbnail:
      "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/flower-power-square",
    description:
      "Beautiful floral motifs that bring spring into your crochet projects.",
  },
  {
    id: "3",
    title: "Rainbow Ripple Square",
    thumbnail:
      "https://images.unsplash.com/photo-1576082958492-da2dcbdb2e1a?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/rainbow-ripple-square",
    description: "Vibrant rainbow colors in a stunning ripple pattern.",
  },
  {
    id: "4",
    title: "Celtic Knot Square",
    thumbnail:
      "https://images.unsplash.com/photo-1613575831056-0ac4c3750b3e?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/celtic-knot-square",
    description: "Intricate Celtic knot designs for advanced crocheters.",
  },
  {
    id: "5",
    title: "Sunburst Square",
    thumbnail:
      "https://images.unsplash.com/photo-1627662055398-3995ca505b20?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/sunburst-square",
    description:
      "Bright and cheerful sunburst pattern perfect for summer projects.",
  },
  {
    id: "6",
    title: "Mandala Square",
    thumbnail:
      "https://images.unsplash.com/photo-1619696506371-d3354489034c?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/mandala-square",
    description:
      "Meditative mandala patterns that create stunning symmetrical designs.",
  },
  {
    id: "7",
    title: "Solid Color Square",
    thumbnail:
      "https://images.unsplash.com/photo-1608932631011-6fa4f5b0c0b3?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/solid-color-square",
    description:
      "Simple solid color squares perfect for combining into larger projects.",
  },
  {
    id: "8",
    title: "Textured Bobble Square",
    thumbnail:
      "https://images.unsplash.com/photo-1611312449467-1b75df05e55b?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/textured-bobble-square",
    description:
      "Add dimension with raised bobble stitches in this textured pattern.",
  },
  {
    id: "9",
    title: "Textured Bobble Square",
    thumbnail:
      "https://images.unsplash.com/photo-1611312449467-1b75df05e55b?w=400&h=400&fit=crop&crop=center",
    url: "/recipes/textured-bobble-square",
    description:
      "Add dimension with raised bobble stitches in this textured pattern.",
  },
];

export default function Hero() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let targetProgress = 0;
    let currentProgress = 0;
    let animationId: number;

    const animate = () => {
      // Smooth interpolation
      currentProgress += (targetProgress - currentProgress) * 0.1;
      setScrollProgress(currentProgress);

      // Continue animating if not close enough to target
      if (Math.abs(targetProgress - currentProgress) > 0.001) {
        animationId = requestAnimationFrame(animate);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Update target based on wheel delta
      const delta = e.deltaY * 0.001;
      targetProgress = Math.max(0, Math.min(1, targetProgress + delta));

      // Start animation
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Simple, bounded animations
  const cafeBorderTop = -scrollProgress * 180; // Exactly its height
  const textScale = 1 - scrollProgress * 0.4; // Scale from 1 to 0.6

  // Calculate text position to tuck at top
  // When fully scrolled, text should be at top with some padding
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const textTuckPosition = scrollProgress * (-viewportHeight * 0.45) + 80; // Tuck to top 45% of screen

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 w-full h-full">
        <GridBackgroundPattern />

        <CafeBorder top={cafeBorderTop} />
      </div>

      {/* Content */}
      <div
        className="relative z-10 container mx-auto px-4 text-center"
        style={{
          transform: `translateY(${textTuckPosition}px) scale(${textScale})`,
          transformOrigin: "center top",
        }}
      >
        <h1 className="text-6xl mb-2 text-brown font-advent-pro font-extrabold transition-all duration-200 ease-in">
          WELCOME TO GRANNY SQUARES!
        </h1>
        <p className="text-3xl text-orange max-w-4xl mx-auto leading-relaxed font-advent-pro font-semibold transition-all duration-200 ease-in">
          FIND RECIPES THAT FEEL LIKE HOME
        </p>

        {/* SearchBar - fades in as user scrolls */}
        <div
          className="mt-8 max-w-lg mx-auto transition-opacity duration-300 ease-in"
          style={{
            opacity: Math.min(scrollProgress * 2, 1), // Fade in based on scroll progress
          }}
        >
          <SearchBar
            placeholder="Search by dish, flavour, or country..."
            onSearch={(query) => console.log("Searching for:", query)}
          />
        </div>
      </div>

      {/* Recipes Section - positioned to start after scroll area */}
      <div
        className="absolute left-0 right-0 w-full"
        style={{
          top: `calc(50vh)`, // 70vh + padding as requested
          transform: `translateY(calc(${-scrollProgress} * 36vh))`, // Move up with scroll
        }}
      >
        <WavyGrid recipes={sampleRecipes} />
      </div>
    </div>
  );
}
