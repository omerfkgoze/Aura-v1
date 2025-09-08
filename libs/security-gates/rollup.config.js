import typescript from '@rollup/plugin-typescript';

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external: ['zod', 'fast-check', '@aura/shared-types', '@aura/crypto-core'],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src',
      }),
    ],
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external: ['zod', 'fast-check', '@aura/shared-types', '@aura/crypto-core'],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        rootDir: './src',
      }),
    ],
  },
];
