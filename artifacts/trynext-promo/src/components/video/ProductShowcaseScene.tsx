import { motion } from 'framer-motion';
import { sceneTransitions, staggerDelay } from '@/lib/video/animations';

const BASE = import.meta.env.BASE_URL;

const products = [
  { name: 'Custom T-Shirts', img: `${BASE}images/tshirt.png`, color: '#F97316', delay: 0 },
  { name: 'Premium Hoodies', img: `${BASE}images/hoodie.png`, color: '#3B82F6', delay: 0.15 },
  { name: 'Printed Caps', img: `${BASE}images/cap.png`, color: '#10B981', delay: 0.3 },
  { name: 'Custom Mugs', img: `${BASE}images/mug.png`, color: '#8B5CF6', delay: 0.45 },
];

export function ProductShowcaseScene() {
  return (
    <motion.div
      key="product-showcase"
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A1628 0%, #0F2040 100%)' }}
      {...sceneTransitions.slideLeft}
    >
      {/* Heading */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 5, color: '#E85D04', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Space Grotesk, sans-serif' }}>
          Our Collection
        </p>
        <h2 style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.1, fontFamily: 'Space Grotesk, sans-serif' }}>
          Wear Your <span style={{ color: '#E85D04' }}>Story</span>
        </h2>
      </motion.div>

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, width: '90%', maxWidth: 900 }}>
        {products.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 + p.delay, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 12px 16px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 14,
              background: `${p.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <img
                src={p.img}
                alt={p.name}
                style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              />
            </div>
            <p style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              fontFamily: 'Space Grotesk, sans-serif',
              letterSpacing: -0.3,
            }}>
              {p.name}
            </p>
            <motion.div
              style={{ width: 24, height: 2, background: p.color, borderRadius: 2, marginTop: 6 }}
              initial={{ width: 0 }}
              animate={{ width: 24 }}
              transition={{ duration: 0.4, delay: 0.7 + p.delay }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
