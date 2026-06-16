import { AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { BrandIntroScene } from './BrandIntroScene';
import { ProductShowcaseScene } from './ProductShowcaseScene';
import { ProductHeroScene } from './ProductHeroScene';
import { DesignStudioScene } from './DesignStudioScene';
import { CTAScene } from './CTAScene';

const SCENE_DURATIONS = {
  brandIntro:       3500,
  productShowcase:  5000,
  tshirtHero:       3800,
  hoodieHero:       3800,
  designStudio:     4200,
  cta:              5000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: '#0A1628' }}
    >
      <AnimatePresence mode="wait">
        {currentScene === 0 && <BrandIntroScene key="brand-intro" />}

        {currentScene === 1 && <ProductShowcaseScene key="product-showcase" />}

        {currentScene === 2 && (
          <ProductHeroScene
            key="tshirt-hero"
            sceneKey="tshirt-hero"
            img="/images/tshirt.png"
            badge="Custom Prints"
            title={"Your Design,\nYour T-Shirt"}
            subtitle="Express yourself with a fully custom print. Upload any artwork and we'll bring it to life."
            accentColor="#F97316"
            stat="100+"
            statLabel="design templates"
            direction="left"
          />
        )}

        {currentScene === 3 && (
          <ProductHeroScene
            key="hoodie-hero"
            sceneKey="hoodie-hero"
            img="/images/hoodie.png"
            badge="Premium Quality"
            title={"Premium\nHoodies"}
            subtitle="Heavy-weight, cozy, and built to last. Perfect for custom team wear, gifts, and personal style."
            accentColor="#3B82F6"
            stat="4.9★"
            statLabel="customer rating"
            direction="right"
          />
        )}

        {currentScene === 4 && <DesignStudioScene key="design-studio" />}

        {currentScene === 5 && <CTAScene key="cta" />}
      </AnimatePresence>
    </div>
  );
}
