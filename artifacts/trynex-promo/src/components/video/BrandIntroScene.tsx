import { motion } from 'framer-motion';
import { sceneTransitions, elementAnimations, charVariants, charContainerVariants } from '@/lib/video/animations';

const tagline = "Design. Wear. Express.";

export function BrandIntroScene() {
  return (
    <motion.div
      key="brand-intro"
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 50%, #0F2040 100%)' }}
      {...sceneTransitions.fadeBlur}
    >
      {/* Radial glow behind logo */}
      <motion.div
        className="absolute"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,93,4,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      {/* Logo mark */}
      <motion.div
        className="mb-6 relative"
        {...elementAnimations.elasticScale}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #E85D04, #FF7A2B)', boxShadow: '0 0 60px rgba(232,93,4,0.5)' }}
        >
          <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', fontFamily: 'Space Grotesk, Inter, sans-serif', letterSpacing: -2 }}>T</span>
        </div>
      </motion.div>

      {/* Brand name */}
      <motion.h1
        style={{
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: -3,
          color: '#fff',
          fontFamily: 'Space Grotesk, Inter, sans-serif',
          lineHeight: 1,
          marginBottom: 16,
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Trynex
        <span style={{ color: '#E85D04' }}>.</span>
      </motion.h1>

      {/* Tagline — character by character */}
      <motion.div
        style={{ display: 'flex', gap: 0 }}
        variants={charContainerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delayChildren: 0.9 }}
      >
        {tagline.split('').map((char, i) => (
          <motion.span
            key={i}
            variants={charVariants}
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: char === '.' ? '#E85D04' : 'rgba(255,255,255,0.7)',
              fontFamily: 'DM Sans, Inter, sans-serif',
              letterSpacing: char === ' ' ? 4 : 2,
              whiteSpace: 'pre',
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Decorative bottom line */}
      <motion.div
        style={{ height: 2, background: 'linear-gradient(90deg, transparent, #E85D04, transparent)', marginTop: 40 }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 200, opacity: 1 }}
        transition={{ duration: 1, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
