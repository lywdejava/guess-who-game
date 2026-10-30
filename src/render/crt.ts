import Phaser from 'phaser';

/**
 * 自研 CRT 后处理（GLSL）：
 * - 桶形畸变（屏幕弯曲）
 * - 扫描线（按设备像素行调制）
 * - 轻微色偏 + 暗角
 * 通过 Camera.setPostPipeline 应用；WebGL 不可用时自动跳过。
 */
const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uIntensity;
uniform float uCurve;

varying vec2 outTexCoord;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 off = abs(uv.yx) / vec2(9.0, 7.0);
  uv += uv * off * off * uCurve;
  return uv * 0.5 + 0.5;
}

void main() {
  vec2 uv = curve(outTexCoord);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // 极轻微色散，增强“老屏幕”质感
  float ab = 0.0009;
  float r = texture2D(uMainSampler, uv + vec2(ab, 0.0)).r;
  float g = texture2D(uMainSampler, uv).g;
  float b = texture2D(uMainSampler, uv - vec2(ab, 0.0)).b;
  vec3 col = vec3(r, g, b);

  // 扫描线：每物理像素两行暗一行
  float line = 0.5 + 0.5 * sin(uv.y * uResolution.y * 3.1415926);
  col *= mix(1.0, 0.72 + 0.28 * line, uIntensity);

  // 暗角
  float d = distance(uv, vec2(0.5));
  float vig = smoothstep(0.95, 0.28, d);
  col *= mix(1.0, vig, 0.55);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class CRTPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG, renderTarget: true });
  }

  onPreRender(): void {
    this.set1f('uIntensity', 0.55);
    this.set1f('uCurve', 1.0);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}

export const CRT_PIPELINE = 'CRTPostFX';

/** 注册管线；非 WebGL（或无后处理能力）时安全退出 */
export function installCRT(game: Phaser.Game): boolean {
  try {
    const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer || !(renderer as unknown as { pipelines?: unknown }).pipelines) return false;
    renderer.pipelines.addPostPipeline(CRT_PIPELINE, CRTPostFX);
    return true;
  } catch (e) {
    console.warn('[crt] 后处理不可用，已跳过', e);
    return false;
  }
}

/** 给相机挂上 CRT；失败则什么都不做 */
export function applyCRT(camera: Phaser.Cameras.Scene2D.Camera): void {
  try {
    camera.setPostPipeline(CRT_PIPELINE);
  } catch {
    /* ignore */
  }
}
