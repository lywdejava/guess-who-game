# 适配层放置位置

微信小游戏需要一层 DOM/BOM 垫片（canvas、window、document、Image、requestAnimationFrame 等）。
本项目把适配层与业务代码分开，构建时会把这里的文件原样拷到 `dist/weapp-adapter.js`，
由 `dist/game.js` 第一行 `require` 加载。

## 放入文件

把 **weapp-phaser3-adapter** 的适配层产物（通常是 `weapp-adapter.js` / `dist/index.js` 打包后的单文件）
命名为 `weapp-adapter.js` 放到本目录，然后：

```bash
npm run build
```

未放置时构建不会失败，但会打印警告，`dist/` 无法在开发者工具中启动。

## 兼容性说明

- 适配层必须**先于** Phaser 加载，且只需提供 `canvas`、`window`、`document`、
  `Image`、`XMLHttpRequest`、`performance.now`、`requestAnimationFrame`、`localStorage` 等基础能力。
- Phaser 侧只依赖公开 API（`new Phaser.Game({ canvas })`、Scale.FIT、WebGL PostFX Pipeline），
  不依赖任何 DOM 查询，因此任意主流小游戏适配层都能接。
- 若使用其它版本适配层，请确认 `canvas` 已挂到 `GameGlobal`，
  且 `wx.createCanvas()` 返回的是同一张主画布（否则会渲染到离屏节点上）。
- 包体积：适配层压缩后约 20–40K，计入主包预算。
