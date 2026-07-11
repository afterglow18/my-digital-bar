import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneContainer, springSnappy, springBouncy } from './Shared';
import { screenGenerateImg } from '../../../assets/images';

export const Scene2 = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <SceneContainer style={{ backgroundColor: 'var(--color-brand-yellow)' }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, var(--color-brand-black) 10px, var(--color-brand-black) 20px)`
      }} />

      <div className="relative w-full h-full flex flex-col items-center justify-center pt-[5cqh]">
        <motion.div
          className="absolute right-[5cqw] top-[15cqh] z-20 font-display font-black text-[7cqh] uppercase leading-[0.9] text-right transform rotate-6"
          style={{ color: 'var(--color-brand-black)' }}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...springSnappy, delay: 0.2 }}
        >
          MIX &<br/>MATCH
        </motion.div>

        <motion.div
          className="relative w-[75cqw] h-[65cqh] rounded-[2cqw] overflow-hidden shadow-2xl border-[3px] border-black z-10"
          initial={{ scale: 0.8, x: -100, opacity: 0, rotateZ: -10 }}
          animate={{ scale: 1, x: 0, opacity: 1, rotateZ: 0 }}
          transition={{ ...springSnappy, delay: 0.4 }}
        >
          <img 
            src={screenGenerateImg}
            className="w-full h-full object-cover object-top"
          />
        </motion.div>

        <motion.div
          className="absolute bottom-[10cqh] z-30 bg-brand-pink text-black py-[2cqh] px-[8cqw] rounded-[1cqw] border-4 border-black font-display font-black text-[4cqh] tracking-widest shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]"
          style={{ backgroundColor: 'var(--color-brand-pink)', color: 'var(--color-brand-black)' }}
          initial={{ scale: 0 }}
          animate={phase >= 1 ? { scale: [0, 1.2, 1], rotate: [-10, 10, 0] } : { scale: 0 }}
          transition={springBouncy}
        >
          SPIN IT!
        </motion.div>
      </div>
    </SceneContainer>
  );
};
