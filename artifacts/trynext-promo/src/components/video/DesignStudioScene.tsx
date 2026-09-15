import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

const features = [
  { icon: '🎨', label: 'Upload Your Design' },
  { icon: '👕', label: 'Pick Your Style' },
  { icon: '✨', label: 'Preview in 3D' },
  { icon: '🚀', label: 'Order Instantly' },
];

export function DesignStudioScene() {
  return (
    <motion.div
      key="design-studio"
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #0A1628 0%, #0F2040 50%, #1A1040 100%)' }}
      {...sceneTransitions.scaleFade}
    >
      {/* Animated background pattern */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.07 }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: '1px solid #E85D04',
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '88%', maxWidth: 860 }}>
        {/* Badge */}
        <motion.div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(232,93,4,0.15)',
            border: '1px solid rgba(232,93,4,0.3)',
            borderRadius: 24,
            padding: '8px 20px',
            marginBottom: 24,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.span
            animate={{ rotate: [0, 15, -10, 0] }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
            style={{ fontSize: 18 }}
          >
            🎨
          </motion.span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 4, color: '#E85D04', textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif' }}>
            Design Studio
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          style={{
            fontSize: 60,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -2.5,
            lineHeight: 1.05,
            fontFamily: 'Space Grotesk, sans-serif',
            marginBottom: 16,
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          Create Something <br />
          <span style={{ color: '#E85D04' }}>Uniquely Yours</span>
        </motion.h2>

        <motion.p
          style={{
            fontSize: 19,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 48,
            lineHeight: 1.6,
            fontFamily: 'DM Sans, sans-serif',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Upload your artwork, pick your product, and order<br />a custom piece delivered to your door.
        </motion.p>

        {/* Feature steps */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.65 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: 28 }}>{f.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>
                {f.label}
              </span>
              <div style={{
                width: 24,
                height: 2,
                background: 'linear-gradient(90deg, #E85D04, #FF7A2B)',
                borderRadius: 2,
              }} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
