import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneContainer, springSnappy, springSmooth } from './Shared';
import { screenWardrobeImg } from '../../../assets/images';

export const Scene1 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <SceneContainer style={{ backgroundColor: 'var(--color-brand-pink)' }}>
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-brand-yellow)_0%,transparent_50%)] opacity-40 mix-blend-overlay" />
      <motion.div 
        className="absolute -top-[20cqh] -right-[20cqw] w-[80cqw] h-[80cqw] bg-white/20 rounded-full blur-[40px]"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative w-full h-full flex flex-col items-center justify-center pt-[5cqh]">
        <motion.div
          className="relative w-[75cqw] h-[65cqh] rounded-[2cqw] overflow-hidden shadow-2xl border-[3px] border-black"
          initial={{ scale: 0.8, y: 100, opacity: 0, rotateX: 20 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
          transition={{ ...springSnappy, delay: 0.3 }}
        >
          <img 
            src={screenWardrobeImg}
            className="w-full h-full object-cover object-top"
          />
        </motion.div>

        <motion.div
          className="absolute bottom-[8cqh] bg-black text-brand-yellow py-[1.5cqh] px-[6cqw] rounded-full border-2 border-brand-yellow font-body font-bold text-[3cqh] uppercase tracking-wider"
          style={{ backgroundColor: 'var(--color-brand-black)', color: 'var(--color-brand-yellow)', borderColor: 'var(--color-brand-yellow)' }}
          initial={{ scale: 0, y: 50 }}
          animate={phase >= 1 ? { scale: 1, y: 0 } : { scale: 0, y: 50 }}
          transition={springSnappy}
        >
          Organize Every Piece
        </motion.div>

        <motion.div
          className="absolute top-[10cqh] left-[5cqw] text-black font-display font-black text-[6cqh] uppercase leading-none transform -rotate-6"
          style={{ color: 'var(--color-brand-black)' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={springSnappy}
        >
          YOUR<br/>DIGITAL<br/>CLOSET
        </motion.div>
      </div>
    </SceneContainer>
  );
};
