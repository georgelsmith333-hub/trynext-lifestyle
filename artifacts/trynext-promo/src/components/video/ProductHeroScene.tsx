import { motion } from 'framer-motion';
import { sceneTransitions, elementAnimations } from '@/lib/video/animations';

interface ProductHeroSceneProps {
  sceneKey: string;
  img: string;
  badge: string;
  title: string;
  subtitle: string;
  accentColor: string;
  stat: string;
  statLabel: string;
  direction?: 'left' | 'right';
}

export function ProductHeroScene({
  sceneKey,
  img,
  badge,
  title,
  subtitle,
  accentColor,
  stat,
  statLabel,
  direction = 'left',
}: ProductHeroSceneProps) {
  const textFirst = direction === 'left';

  return (
    <motion.div
      key={sceneKey}
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 60%, #0F2040 100%)' }}
      {...(direction === 'left' ? sceneTransitions.slideLeft : sceneTransitions.slideRight)}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
        filter: 'blur(50px)',
        [textFirst ? 'right' : 'left']: -100,
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        width: '88%',
        maxWidth: 960,
        flexDirection: textFirst ? 'row' : 'row-reverse',
      }}>
        {/* Text side */}
        <div style={{ flex: 1 }}>
          <motion.span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 4,
              color: accentColor,
              textTransform: 'uppercase',
              background: `${accentColor}18`,
              padding: '6px 14px',
              borderRadius: 20,
              marginBottom: 20,
              fontFamily: 'Space Grotesk, sans-serif',
            }}
            initial={{ opacity: 0, x: textFirst ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {badge}
          </motion.span>

          <motion.h2
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -2.5,
              lineHeight: 1.05,
              fontFamily: 'Space Grotesk, sans-serif',
              marginBottom: 16,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {title}
          </motion.h2>

          <motion.p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: 28,
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {subtitle}
          </motion.p>

          {/* Stat chip */}
          <motion.div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '12px 20px',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.65, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span style={{ fontSize: 28, fontWeight: 900, color: accentColor, fontFamily: 'Space Grotesk, sans-serif' }}>{stat}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>{statLabel}</span>
          </motion.div>
        </div>

        {/* Image side */}
        <motion.div
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
          initial={{ opacity: 0, scale: 0.8, x: textFirst ? 60 : -60 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow circle behind product */}
          <div style={{
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
            filter: 'blur(30px)',
          }} />
          <motion.img
            src={img}
            alt={title}
            style={{ width: 280, height: 280, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.4))' }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
