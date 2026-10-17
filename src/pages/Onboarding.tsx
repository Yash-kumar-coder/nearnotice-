import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
} from '../features/onboarding/onboardingStorage';

// Real onboarding illustrations from the repo
import slide1Img from '../../Onboarding Illustrations/1st screen.png';
import slide2Img from '../../Onboarding Illustrations/2nd screen.png';
import slide3Img from '../../Onboarding Illustrations/3rd screen.png';

interface Slide {
  id: number;
  image: string;
  alt: string;
  heading: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    image: slide1Img,
    alt: 'Neighborhood noticeboard showing community announcements and local maps',
    heading: 'Discover Your Local Neighborhood',
    description: 'Browse notices, local events, garage sales, and community requests right in your neighborhood.',
  },
  {
    id: 2,
    image: slide2Img,
    alt: 'Two neighbors chatting and exchanging information through verified local messaging',
    heading: 'Connect Directly With Neighbors',
    description: 'Contact verified posters securely and support your nearby community with peace of mind.',
  },
  {
    id: 3,
    image: slide3Img,
    alt: 'Mobile user publishing a new hyperlocal notice onto the community board in seconds',
    heading: 'Post Notices In Seconds',
    description: 'Share announcements with people right in your area without hassle, sign-up friction, or noise.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const alreadyDone = isOnboardingCompleted();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const liveAnnounceRef = useRef<HTMLDivElement>(null);

  const totalSlides = SLIDES.length;

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted();
    navigate('/', { replace: true });
  }, [navigate]);

  const goToSlide = useCallback((index: number) => {
    const target = Math.max(0, Math.min(index, totalSlides - 1));
    setCurrentIndex(target);
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      goToSlide(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, totalSlides, goToSlide, completeOnboarding]);

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }, [currentIndex, goToSlide]);

  // Keyboard navigation: left/right arrows, ignored while an input has focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          (activeElement as HTMLElement).isContentEditable);

      if (isInput) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (alreadyDone) {
    return <Navigate to="/" replace />;
  }

  // Pointer event handlers with 10px threshold, touch-action: pan-y
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const deltaX = e.clientX - startXRef.current;

    if (!isDragging && Math.abs(deltaX) > 10) {
      setIsDragging(true);
    }

    if (isDragging) {
      const isAtFirst = currentIndex === 0 && deltaX > 0;
      const isAtLast = currentIndex === totalSlides - 1 && deltaX < 0;
      const resistance = isAtFirst || isAtLast ? 0.35 : 1;
      setDragOffset(deltaX * resistance);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored if capture already lost
    }

    if (!isDragging) {
      setDragOffset(0);
      return;
    }

    setIsDragging(false);

    const deltaX = e.clientX - startXRef.current;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(deltaX) / (deltaTime || 1);

    const containerWidth = containerRef.current?.offsetWidth || 350;
    const distanceThreshold = containerWidth * 0.25;
    const isFlick = velocity > 0.4 && Math.abs(deltaX) > 20;

    if (deltaX < -distanceThreshold || (deltaX < 0 && isFlick)) {
      if (currentIndex < totalSlides - 1) {
        goToSlide(currentIndex + 1);
      }
    } else if (deltaX > distanceThreshold || (deltaX > 0 && isFlick)) {
      if (currentIndex > 0) {
        goToSlide(currentIndex - 1);
      }
    }

    setDragOffset(0);
  };

  const onPointerCancel = () => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const isLastSlide = currentIndex === totalSlides - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between max-w-md mx-auto select-none overflow-hidden touch-pan-y relative">
      {/* Polite Live Region for Screen Readers */}
      <div
        ref={liveAnnounceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Slide ${currentIndex + 1} of ${totalSlides}: ${SLIDES[currentIndex].heading}`}
      </div>

      {/* Top Header / Skip Control */}
      <header className="px-6 pt-6 pb-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="NearNotice"
            className="w-10 h-10 rounded-xl object-contain"
          />
          <span className="font-bold text-gray-900 text-xl tracking-tight">NearNotice</span>
        </div>

        {!isLastSlide ? (
          <button
            onClick={completeOnboarding}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] flex items-center cursor-pointer"
          >
            Skip
          </button>
        ) : (
          <div className="w-12" aria-hidden="true" />
        )}
      </header>

      {/* Main Carousel Region */}
      <main
        ref={containerRef}
        role="region"
        aria-label="Welcome Tour"
        aria-roledescription="carousel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="flex-1 flex flex-col justify-center px-6 relative cursor-grab active:cursor-grabbing"
      >
        <div className="relative w-full overflow-hidden">
          <div
            className="flex w-full"
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
              transition: isDragging
                ? 'none'
                : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {SLIDES.map((slide, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${totalSlides}`}
                  aria-hidden={!isCurrent}
                  inert={!isCurrent ? true : undefined}
                  className="w-full shrink-0 flex flex-col items-center text-center px-2 py-4"
                >
                  <div className="w-full aspect-2/1 max-h-[300px] flex items-center justify-center mb-6 overflow-hidden rounded-2xl bg-blue-50/40 border border-blue-100/50">
                    <img
                      src={slide.image}
                      alt={slide.alt}
                      width={1774}
                      height={887}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
                    />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                    {slide.heading}
                  </h2>

                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                    {slide.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Carousel Navigation and Controls */}
      <footer className="px-6 pb-8 pt-2 space-y-6 z-10">
        {/* Progress Dots with accessible buttons */}
        <div
          role="tablist"
          aria-label="Slides"
          className="flex justify-center items-center gap-2"
        >
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1} of ${totalSlides}`}
                onClick={() => goToSlide(idx)}
                className="transition-all duration-300 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-[24px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive ? 'w-7 bg-primary' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Primary Action Controls */}
        <div className="flex items-center gap-3">
          {currentIndex > 0 ? (
            <Button
              variant="outline"
              size="lg"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="px-4"
            >
              <ChevronLeft size={20} />
            </Button>
          ) : null}

          {isLastSlide ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={completeOnboarding}
              className="gap-2 text-base font-bold shadow-md shadow-primary/25"
            >
              Get Started <ArrowRight size={18} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={nextSlide}
              className="gap-2"
            >
              Next <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
