const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/huggingface-bundle.js'],
  bundle: true,
  outfile: 'lib/huggingface/huggingface.min.js',
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).catch(() => process.exit(1));
