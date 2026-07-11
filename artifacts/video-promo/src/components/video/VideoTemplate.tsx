import { useVideoPlayer } from '@/lib/video';
import { useEffect, useState } from 'react';

import { Scene0 } from './video_scenes/Scene0';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { WardrobeDoorsLayer } from './video_scenes/Shared';

const SCENE_DURATIONS = {
  scene0: 4000,
  scene1: 3000,
  scene2: 3000,
  scene3: 5000, // Total = 15s
};

export default function VideoTemplate() {
  const { currentScene, currentSceneKey } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  const [doorsOpen, setDoorsOpen] = useState(false);

  useEffect(() => {
    // Force doors closed immediately at scene start
    setDoorsOpen(false);
    
    // Open doors slightly after the scene has mounted
    const openTimer = setTimeout(() => {
      setDoorsOpen(true);
    }, 200);

    // Start closing doors so they are fully shut exactly when the scene ends
    const duration = SCENE_DURATIONS[currentSceneKey as keyof typeof SCENE_DURATIONS] || 3500;
    
    // The player will loop to scene0, so we close it at the end of every scene.
    const closeTimer = setTimeout(() => {
      setDoorsOpen(false);
    }, duration - 600); // 600ms closing duration

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [currentScene, currentSceneKey]);

  return (
    <div
      className="w-full h-screen flex items-center justify-center"
      style={{ backgroundColor: '#111' }}
    >
      {/* 9:16 portrait frame — matches Instagram Reels / Facebook Stories */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: '9 / 16',
          height: '100vh',
          maxHeight: '100vh',
          maxWidth: 'calc(100vh * 9 / 16)',
          backgroundColor: 'var(--color-brand-black)',
          containerType: 'size',
        }}
      >
        {/* Persistent global door layer */}
        <WardrobeDoorsLayer isOpen={doorsOpen} />

        {/* The scenes themselves jump-cut, but it's hidden by the doors */}
        <div className="absolute inset-0 z-0">
          {currentScene === 0 && <Scene0 />}
          {currentScene === 1 && <Scene1 />}
          {currentScene === 2 && <Scene2 />}
          {currentScene === 3 && <Scene3 />}
        </div>
      </div>
    </div>
  );
}
