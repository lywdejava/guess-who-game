/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * 微信小游戏产物收尾：
 * 1) game.js 作为入口，先 require 适配层，再 require 业务 bundle（顺序不能反）
 * 2) 拷贝 game.json / project.config.json
 * 3) 若 vendor/weapp-adapter.js 存在则一并拷贝
 */
function weappShell(mode: string): Plugin {
  return {
    name: 'weapp-shell',
    apply: 'build',
    closeBundle() {
      if (mode !== 'weapp') return;
      const out = resolve(ROOT, 'dist');

      const shell = `// 微信小游戏入口：适配层必须先于 Phaser 加载
require('./weapp-adapter.js');
require('./game.bundle.js');
`;
      write(resolve(out, 'game.js'), shell);

      for (const f of ['game.json', 'project.config.json']) {
        const src = resolve(ROOT, f);
        if (existsSync(src)) copyFileSync(src, resolve(out, f));
      }

      const adapter = resolve(ROOT, 'vendor/weapp-adapter.js');
      if (existsSync(adapter)) {
        copyFileSync(adapter, resolve(out, 'weapp-adapter.js'));
      } else {
        console.warn(
          '\n[weapp-shell] 未找到 vendor/weapp-adapter.js。\n' +
            '  请把 weapp-phaser3-adapter 的适配层文件放进去，否则真机/开发者工具无法启动。\n'
        );
      }
    }
  };
}

function write(p: string, content: string) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2018',
    outDir: 'dist',
    assetsInlineLimit: 0,
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
    rollupOptions:
      mode === 'weapp'
        ? {
            input: resolve(ROOT, 'src/main.ts'),
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              entryFileNames: 'game.bundle.js',
              assetFileNames: 'assets/[name][extname]'
            }
          }
        : {}
  },
  server: { host: '127.0.0.1', port: 5173 },
  plugins: [weappShell(mode)],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
}));
