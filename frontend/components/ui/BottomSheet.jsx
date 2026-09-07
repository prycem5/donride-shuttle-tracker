// components/ui/BottomSheet.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * Draggable BottomSheet with snap points
 * Supports both touch (mobile) and mouse (desktop) dragging
 */
export function BottomSheet({
  children,
  snapPoints = [0.3, 0.6, 0.92], // Percentage of viewport height
  defaultSnapIndex = 0,
  onSnapChange,
  className = "",
}) {
  const [snapIndex, setSnapIndex] = useState(defaultSnapIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [mounted, setMounted] = useState(false);
  const startYRef = useRef(0);
  const currentHeightRef = useRef(0);
  const sheetRef = useRef(null);

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate height based on snap point
  const getSnapHeight = useCallback(
    (index) => {
      if (typeof window === "undefined") return 300;
      return window.innerHeight * snapPoints[index];
    },
    [snapPoints]
  );

  // Use fixed height on server, dynamic on client
  const currentHeight = mounted ? getSnapHeight(snapIndex) : 300;

  // Handle drag start (touch + mouse)
  const handleDragStart = useCallback(
    (clientY) => {
      setIsDragging(true);
      startYRef.current = clientY;
      currentHeightRef.current = getSnapHeight(snapIndex);
    },
    [snapIndex, getSnapHeight]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - clientY;
      setDragOffset(deltaY);
    },
    [isDragging]
  );

  // Handle drag end - snap to closest point
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const newHeight = currentHeightRef.current + dragOffset;
    const windowHeight = window.innerHeight;

    // Find closest snap point
    let closestIndex = 0;
    let closestDistance = Infinity;

    snapPoints.forEach((point, index) => {
      const snapHeight = windowHeight * point;
      const distance = Math.abs(newHeight - snapHeight);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    // Add velocity-based snapping (if dragging fast, go to next/prev)
    const velocity = dragOffset;
    const threshold = 50;

    if (Math.abs(velocity) > threshold) {
      if (velocity > 0 && closestIndex < snapPoints.length - 1) {
        closestIndex = Math.min(closestIndex + 1, snapPoints.length - 1);
      } else if (velocity < 0 && closestIndex > 0) {
        closestIndex = Math.max(closestIndex - 1, 0);
      }
    }

    setSnapIndex(closestIndex);
    setDragOffset(0);
    onSnapChange?.(closestIndex);
  }, [isDragging, dragOffset, snapPoints, onSnapChange]);

  // Touch handlers
  const handleTouchStart = (e) => handleDragStart(e.touches[0].clientY);
  const handleTouchMove = (e) => handleDragMove(e.touches[0].clientY);
  const handleTouchEnd = () => handleDragEnd();

  // Mouse handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => handleDragMove(e.clientY);
    const handleMouseUp = () => handleDragEnd();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Programmatic snap control
  const snapTo = useCallback(
    (index) => {
      if (index >= 0 && index < snapPoints.length) {
        setSnapIndex(index);
        onSnapChange?.(index);
      }
    },
    [snapPoints.length, onSnapChange]
  );

  // Calculate display height during drag
  const displayHeight = !mounted
    ? 300
    : isDragging
    ? Math.max(
        window.innerHeight * snapPoints[0],
        Math.min(
          currentHeightRef.current + dragOffset,
          window.innerHeight * snapPoints[snapPoints.length - 1]
        )
      )
    : currentHeight;

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-[0_-4px_25px_rgba(0,0,0,0.1)] z-50",
        !isDragging && "transition-[height] duration-300 ease-out",
        className
      )}
      style={{
        height: displayHeight,
        willChange: isDragging ? "height" : "auto",
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100%-28px)] overscroll-contain">
        {typeof children === "function"
          ? children({ snapIndex, snapTo, isExpanded: snapIndex > 0 })
          : children}
      </div>
    </div>
  );
}

/**
 * Search bar that looks tappable - expands bottom sheet when clicked
 */
export function SearchBar({ onClick, placeholder = "Where to?", className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 bg-gray-100 rounded-xl text-left hover:bg-gray-200 active:scale-[0.98] transition-all",
        className
      )}
    >
      <svg
        className="w-5 h-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-gray-500 font-medium">{placeholder}</span>
    </button>
  );
}
