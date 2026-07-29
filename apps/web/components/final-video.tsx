'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/app/home.module.css';

type FinalVideoProps = {
  videoUrl: string;
  poster: string;
};

/**
 * Defers the decorative closing film until its section is actually visible.
 * The poster remains the complete experience for reduced-motion visitors.
 */
export function FinalVideo({ videoUrl, poster }: FinalVideoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const loadAndPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    if (video.getAttribute('src') !== videoUrl) {
      video.setAttribute('src', videoUrl);
      video.load();
    }

    video
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [reducedMotion, videoUrl]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      const video = videoRef.current;
      if (!video) return;

      if (event.matches) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        setIsPlaying(false);
      } else if (isVisible) {
        loadAndPlay();
      }
    };

    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handlePreferenceChange);
    return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
  }, [isVisible, loadAndPlay]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !reducedMotion) loadAndPlay();
  }, [isVisible, loadAndPlay, reducedMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    if (video.paused) {
      loadAndPlay();
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <div ref={sectionRef} className={styles.finalMedia} aria-hidden="true">
        <video ref={videoRef} muted loop playsInline preload="none" poster={poster} />
        <div className={styles.halftone} />
      </div>
      <button
        className={styles.finalVideoControl}
        type="button"
        onClick={togglePlayback}
        disabled={reducedMotion}
        aria-label={
          reducedMotion
            ? 'Closing film disabled for reduced motion'
            : isPlaying
              ? 'Pause closing film'
              : 'Play closing film'
        }
        aria-pressed={isPlaying}
      >
        {isPlaying ? 'Pause film' : 'Play film'}
      </button>
    </>
  );
}
