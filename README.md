# 猜猜我是谁 · 微信小游戏工程

Phaser 3.80.1 + TypeScript + Vite，纯本地运行（无服务器、无网络请求），竖屏固定，WebGL 渲染 + 自研 CRT 后处理。

## 命令

```bash
npm i
npm run dev        # 浏览器调试（360×640 画布，热更新）
npm test           # 核心算法单测（反馈语义 / 假话 / 可解性 / 状态机）
npm run typecheck  # 类型检查
npm run build      # 生产构建 → dist/（含 game.js、weapp-adapter.js 校验）
```

`npm run build` 产物结构：

```
dist/
  game.js             // 小游戏入口：先 require 适配层，再 require 业务包
  game.bundle.js      // 业务 bundle（iife，单文件，便于控制主包体积）
  game.json
  project.config.json
  weapp-adapter.js    // 从 vendor/ 拷入
  assets/             // Aseprite 导出的 PNG（按需）
```

## 微信开发者工具

1. 把 `vendor/weapp-adapter.js` 放好（见 `vendor/README.md`）；
2. `npm run build`；
3. 开发者工具「导入项目」选择 `dist/`，`compileType` 已是 `game`。

> 主包 4M 限制：Phaser 压缩后约 1.2M，业务包 < 100K，素材预算约 2.6M。
> 素材超过预算时按 `game.json` 的 `subpackages` 拆分包（首包只留菜单/字体）。

## 目录

```
src/
  config.ts            设计分辨率、屏幕区域、难度参数、配色
  main.ts              Phaser 初始化（浏览器/微信双入口自适应）
  core/                纯逻辑，无引擎依赖，可单测
    types.ts           Combo / Feedback / Hint / Summary
    board.ts           5040 密码空间、evaluate、候选集过滤
    hints.ts           熵探针选择、假话生成、假话槽位规划
    round.ts           一局的状态机与结算
  platform/storage.ts  微信本地缓存（浏览器自动回退 localStorage）
  render/
    frame.ts           暗室 + CRT 外壳 + 底座（所有页面共用）
    crt.ts             自研 GLSL 后处理：弯曲 / 扫描线 / 色散 / 暗角
    ui.ts              文字、辉光描边、按钮
  scenes/              Boot / Menu / Game / End
tests/core.test.ts     算法与数值标定校验
```

## 术语（严格定义）

| 显示文案 | 含义 | 字段 |
|---|---|---|
| 位置+数值 | 位置和数字都对（严格意义的“位置对”） | `exact` |
| 仅数值 | 数字在答案里，但位置不对 | `present` |

**不要**把 `exact` 简写成“位置”，因为“位置对”在玩家理解里已经包含“数字也对”。UI 一律写「位置+数值 / 仅数值」。

## 关键算法

- **候选集过滤**：`contradictions(X) ≤ K`，且自己猜测的反馈必须完全吻合（玩家猜测永远真实）。
- **探针选择**：在 5040 空间里采样 320 个探针，取 (exact, present) 分布熵最大者；排除答案与已用探针。
- **假话**：优先取“最接近真值”的合法组合，避免 `exact+present>4` 这类一眼假；开局必定至少 1 假 1 真。
- **可解性**：`tests/core.test.ts` 内置完美玩家求解器，四档难度都必须落在猜测配额内。

## 美术接入

当前 `render/` 里的界面是矢量绘制（便于先跑通逻辑与布局）。接入 Aseprite 素材时：

1. 导出 1× PNG（无缩放），保持偶数像素边界；
2. 9-slice 面板用 `Phaser.GameObjects.NineSlice`；
3. 中文标题建议直接导出 PNG（像素字体不含汉字），数字用 5×7 像素字模走 `BitmapText`；
4. `config.ts` 里的 `SCREEN` 与设计分辨率 360×640 是唯一布局基准，素材按此出图即可。
