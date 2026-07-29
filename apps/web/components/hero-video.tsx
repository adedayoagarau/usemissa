'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/app/home.module.css';

type HeroVideoProps = {
  videoUrl: string;
  poster: string;
};

/**
 * Keeps the decorative hero film opt-in for motion-sensitive users. The
 * source is assigned only after checking the user's motion preference, so a
 * reduced-motion visitor keeps the poster without downloading or playing the
 * video.
 */
export function HeroVideo({ videoUrl, poster }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const startVideo = useCallback((video: HTMLVideoElement) => {
    if (video.src !== new URL(videoUrl, window.location.origin).toString()) {
      video.src = videoUrl;
      video.load();
    }
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        video?.pause();
        video?.removeAttribute('src');
        video?.load();
        setIsPlaying(false);
      } else if (video) {
        startVideo(video);
      }
    };

    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handlePreferenceChange);

    if (!mediaQuery.matches && video) {
      startVideo(video);
    }

    return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
  }, [startVideo]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <div className={styles.heroMedia} aria-hidden="true">
        <video ref={videoRef} muted loop playsInline preload="metadata" poster={poster} />
        <div className={styles.videoWash} />
        <div className={styles.halftone} />
      </div>
      <button
        className={styles.videoControl}
        type="button"
        onClick={togglePlayback}
        disabled={reducedMotion}
        aria-label={reducedMotion ? 'Hero video disabled for reduced motion' : isPlaying ? 'Pause hero video' : 'Play hero video'}
        aria-pressed={isPlaying}
      >
        {isPlaying ? 'Pause film' : 'Play film'}
      </button>
    </>
  );
}
