export const defaults = {
  // Source image
  image: null,
  imagePosition: 'cover', // 'cover' | 'contain' | 'fill'

  // Primary watermark
  text: 'CONFIDENTIAL',
  logo: null,
  font: 'bold 18px Arial, sans-serif',
  color: 'rgba(255,255,255,0.7)',
  strokeColor: 'rgba(0,0,0,0.4)',
  strokeWidth: 1,
  rotation: -30,       // degrees, stamp rotation
  rotationSpeed: 0,    // degrees/second continuous rotation

  // Motion
  path: 'lissajous',   // 'lissajous' | 'lemniscate' | 'random'
  speed: 1.0,
  lissajousA: 3,
  lissajousB: 2,
  lissajousDelta: Math.PI / 4,
  margin: 24,

  // Opacity
  opacity: 0.7,
  opacityPulse: true,
  opacityPulseSpeed: 0.6,  // Hz
  opacityPulseDepth: 0.15, // ± fraction

  // Color perturbation
  colorPerturbation: true,
  colorPerturbationSpeed: 0.25, // Hz
  colorPerturbationDepth: 20,   // ± degrees in HSL hue

  // Tiled ghost layer
  tiledEnabled: true,
  tiledOpacity: 0.07,
  tiledSpacing: 160,
  tiledAngle: -30,

  // Spotlight (the moving "clear window" — image is obscured everywhere else)
  spotlightEnabled: true,
  spotlightRadius: 0.28,         // fraction of min(width, height); 0.28 ≈ ~30% of image
  spotlightFeather: 0.5,         // 0–1, where the soft falloff starts (lower = sharper edge)
  spotlightMargin: 60,           // px, keeps centre away from canvas edges
  obscureColor: 'rgba(8,12,20,0.93)', // the colour used to obscure everything outside the spotlight
  watermarkFollowsSpotlight: true,    // text watermark sits inside the clear window
  watermarkSpotlightOffset: 0,        // px, vertical offset of text from spotlight centre

  // Performance
  targetFps: 30,

  // Callbacks
  onFrame: null,
};
