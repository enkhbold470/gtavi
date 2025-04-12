import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path when served in development or production
  base: '/',
  
  // Development server configuration
  server: {
    port: 3000,
    host: true, // Listen on all local IPs
    open: true, // Open browser on server start
    cors: true, // Enable CORS for asset loading
    hmr: {
      overlay: true, // Show errors as overlay
    },
  },
  
  // Configure path resolution with detailed aliases for project structure
  resolve: {
    alias: {
      // Main directories
      '@': resolve(__dirname, './src'),
      '@assets': resolve(__dirname, './assets'),
      
      // Component directories
      '@components': resolve(__dirname, './src/components'),
      '@systems': resolve(__dirname, './src/systems'),
      '@scenes': resolve(__dirname, './src/scenes'),
      '@utils': resolve(__dirname, './src/utils'),
      
      // Asset subdirectories
      '@models': resolve(__dirname, './assets/models'),
      '@textures': resolve(__dirname, './assets/textures'),
      '@sounds': resolve(__dirname, './assets/sounds'),
    },
  },
  
  // Configure asset handling
  assetsInclude: [
    // 3D models
    '**/*.gltf',
    '**/*.glb',
    '**/*.fbx',
    '**/*.obj',
    '**/*.3ds',
    '**/*.dae',
    
    // Textures
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.webp',
    '**/*.svg',
    '**/*.hdr',
    
    // Audio
    '**/*.mp3',
    '**/*.wav',
    '**/*.ogg',
    
    // Fonts
    '**/*.ttf',
    '**/*.woff',
    '**/*.woff2',
    
    // Shaders
    '**/*.glsl',
    '**/*.vert',
    '**/*.frag',
  ],
  
  // Configure static asset directory
  publicDir: 'assets',
  
  // Build options for production
  build: {
    // Output directory for production build
    outDir: 'dist',
    
    // Enable/disable source maps in production
    sourcemap: false,
    
    // Minify options
    minify: 'terser',
    
    // Target modern browsers
    target: 'es2018',
    
    // Terser options for minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.* calls in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.debug', 'console.log'], // Remove specific functions
      },
      format: {
        comments: false, // Remove comments
      },
    },
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        // Split vendor code from application code
        manualChunks: {
          // Core Three.js library
          three: ['three'],
          
          // Three.js extensions
          'three-ext': [
            'three/examples/jsm/controls/OrbitControls',
            'three/examples/jsm/loaders/GLTFLoader',
            'three/examples/jsm/loaders/FBXLoader',
            'three/examples/jsm/loaders/OBJLoader',
            'three/examples/jsm/loaders/TextureLoader',
          ],
          
          // Physics engine
          physics: ['cannon-es'],
          
          // Other vendor libraries can be added here
        },
        
        // Customize output filenames
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          // Put different asset types in appropriate folders
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name ?? '')) {
            return 'images/[name]-[hash][extname]';
          }
          
          if (/\.(mp3|wav|ogg)$/.test(name ?? '')) {
            return 'audio/[name]-[hash][extname]';
          }
          
          if (/\.(woff2?|ttf|eot)$/.test(name ?? '')) {
            return 'fonts/[name]-[hash][extname]';
          }
          
          if (/\.(gltf|glb|fbx|obj)$/.test(name ?? '')) {
            return 'models/[name]-[hash][extname]';
          }
          
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    // Optimize CSS
    cssCodeSplit: true,
    
    // Enable chunk size warnings to identify large bundles
    chunkSizeWarningLimit: 1000,
  },
  
  // Optimizations for dependencies
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls',
      'cannon-es',
    ],
    // Enable dependency optimization for large packages
    esbuildOptions: {
      target: 'es2018',
    },
  },
  
  // Define environment variables
  define: {
    // Add any global constants here
    __GAME_VERSION__: JSON.stringify(process.env.npm_package_version),
    __DEBUG_MODE__: process.env.NODE_ENV !== 'production',
  },
  
  // Configure preview server (used after build)
  preview: {
    port: 8080,
    host: true,
  },
});
