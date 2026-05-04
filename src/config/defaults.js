export const defaults = {
  // Source image
  image: null,
  imagePosition: 'cover',

  // Watermark text (empty = no text overlay)
  text: '',
  logo: null,
  font: 'bold 18px Arial, sans-serif',
  color: 'rgba(255,255,255,0.7)',
  strokeColor: 'rgba(0,0,0,0.4)',
  strokeWidth: 1,
  rotation: -30,
  rotationSpeed: 0,

  // Motion (path shared by spotlight and watermark)
  path: 'lissajous',
  speed: 1.0,
  lissajousA: 3,
  lissajousB: 2,
  lissajousDelta: Math.PI / 4,
  margin: 24,

  // Watermark opacity pulse
  opacity: 0.7,
  opacityPulse: true,
  opacityPulseSpeed: 0.6,
  opacityPulseDepth: 0.15,

  // Color perturbation
  colorPerturbation: true,
  colorPerturbationSpeed: 0.25,
  colorPerturbationDepth: 20,

  // Tiled ghost layer
  tiledEnabled: true,
  tiledOpacity: 0.06,
  tiledSpacing: 160,
  tiledAngle: -30,

  // Spotlight — moving clear window; everything outside shows the decoy image
  spotlightEnabled: true,
  spotlightRadius: 0.50,          // 50% of min(w,h)
  spotlightFeather: 0.75,         // soft edge falloff
  spotlightMargin: 60,
  watermarkFollowsSpotlight: false,

  // Performance
  targetFps: 30,

  // Callbacks
  onFrame: null,
};
