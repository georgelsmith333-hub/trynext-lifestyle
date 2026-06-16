import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function CTAScene() {
  return (
    <motion.div
      key="cta"
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 40%, #1A0A00 100%)' }}
      {...sceneTransitions.morphExpand}
    >
      {/* Large orange radial glow */}
      <motion.div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,93,4,0.22) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating product images */}
      {[
        { src: '/images/tshirt.png', x: -360, y: -80, size: 120, delay: 0.4, rotate: -15 },
        { src: '/images/hoodie.png', x: 360, y: -60, size: 130, delay: 0.55, rotate: 12 },
        { src: '/images/cap.png', x: -300, y: 130, size: 100, delay: 0.7, rotate: -8 },
        { src: '/images/mug.png', x: 310, y: 140, size: 110, delay: 0.85, rotate: 10 },
      ].map((p, i) => (
        <motion.img
          key={i}
          src={p.src}
          alt=""
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            objectFit: 'contain',
            opacity: 0.35,
            filter: 'drop-shadow(0 8px 30px rgba(232,93,4,0.3))',
            rotate: p.rotate,
          }}
          initial={{ opacity: 0, x: p.x, y: p.y, scale: 0.5 }}
          animate={{
            opacity: 0.35,
            x: p.x,
            y: [p.y, p.y - 12, p.y],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.5, delay: p.delay },
            scale: { duration: 0.5, delay: p.delay },
            y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 },
          }}
        />
      ))}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {/* Logo */}
        <motion.div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 28 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #E85D04, #FF7A2B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(232,93,4,0.5)',
          }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}>T</span>
          </div>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1.5, fontFamily: 'Space Grotesk, sans-serif' }}>
            Trynex
          </span>
        </motion.div>

        <motion.h2
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -3,
            lineHeight: 1.05,
            fontFamily: 'Space Grotesk, sans-serif',
            marginBottom: 16,
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Start Creating <br />
          <span style={{ color: '#E85D04' }}>Today.</span>
        </motion.h2>

        <motion.p
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 40,
            fontFamily: 'DM Sans, sans-serif',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          Custom fashion delivered across Bangladesh
        </motion.p>

        {/* CTA Button */}
        <motion.div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'linear-gradient(135deg, #E85D04, #FF7A2B)',
            padding: '18px 40px',
            borderRadius: 50,
            boxShadow: '0 8px 40px rgba(232,93,4,0.45)',
            marginBottom: 32,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.85, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: -0.5 }}>
            Shop Now
          </span>
          <span style={{ fontSize: 20 }}>→</span>
        </motion.div>

        {/* URL */}
        <motion.p
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: 1,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          trynex.shop
        </motion.p>
      </div>
    </motion.div>
  );
}
