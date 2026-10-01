import { defineConfig, mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

// Builds one self-contained HTML file (JS, CSS and fonts inlined).
export default mergeConfig(base, defineConfig({ plugins: [viteSingleFile()], build: { outDir: 'dist-single' } }));
