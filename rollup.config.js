import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/dynamark.js',
      format: 'umd',
      name: 'DynaMark',
      sourcemap: true,
    },
    plugins: [resolve()],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/dynamark.min.js',
      format: 'umd',
      name: 'DynaMark',
    },
    plugins: [resolve(), terser()],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/dynamark.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [resolve()],
  },
];
