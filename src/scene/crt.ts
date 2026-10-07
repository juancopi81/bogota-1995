// The picture tube. The TV draws its picture into a small flat canvas; this
// shows it through a curved CRT: the glass bulges so the picture bows and its
// corners fall into the dark, the scanlines show (thinner where it's bright),
// bright things bleed light, and the colors split a hair at the edges.
// WebGL when there is one; without it the flat canvas stays on screen.

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_lines;
uniform float u_flicker;
varying vec2 v_uv;

// the glass bulges: the picture is pulled in toward the corners
vec2 bulge(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  vec2 k = abs(c.yx) / vec2(6.5, 5.5);
  c += c * k * k;
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = bulge(v_uv);
  float edge = 0.006;
  float inside = smoothstep(0.0, edge, uv.x) * smoothstep(0.0, edge, uv.y) * smoothstep(0.0, edge, 1.0 - uv.x) * smoothstep(0.0, edge, 1.0 - uv.y);
  vec2 d = uv - 0.5;
  float split = 0.0008 + 0.004 * dot(d, d);
  vec4 base = texture2D(u_tex, uv);
  vec3 col = vec3(texture2D(u_tex, uv + vec2(split, 0.0)).r, base.g, texture2D(u_tex, uv - vec2(split, 0.0)).b);
  // phosphor glow: what's bright bleeds into its surroundings
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 o = vec2(cos(a), sin(a)) * u_texel;
    glow += texture2D(u_tex, uv + o * 1.5).rgb + texture2D(u_tex, uv + o * 3.5).rgb;
  }
  glow /= 16.0;
  col += max(glow - 0.3, 0.0) * 0.55;
  // scanlines, which bright lines swell into
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float s = sin(uv.y * u_lines * 3.1415927);
  col *= mix(0.6 + 0.32 * lum, 1.0, s * s);
  // the tube is dimmer toward its edges
  float vig = pow(clamp(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.0, 1.0), 0.2);
  col *= vig * 1.12 * u_flicker;
  vec4 picture = vec4(min(col, vec3(base.a)), base.a);
  gl_FragColor = mix(vec4(0.014, 0.016, 0.018, 1.0), picture, inside);
}`;

export class Tube {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private readonly uniforms: { texel: WebGLUniformLocation | null; lines: WebGLUniformLocation | null; flicker: WebGLUniformLocation | null };
  private lost = false;
  private sizedAt = -1;
  private frame = 0;
  /** Called if the browser takes the GPU context away (the flat canvas comes back). */
  onLost: (() => void) | null = null;

  /** A tube, or null where WebGL isn't available. */
  static create(): Tube | null {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
      return gl ? new Tube(canvas, gl) : null;
    } catch {
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    const program = gl.createProgram()!;
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT],
    ] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'program');
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    this.uniforms = {
      texel: gl.getUniformLocation(program, 'u_texel'),
      lines: gl.getUniformLocation(program, 'u_lines'),
      flicker: gl.getUniformLocation(program, 'u_flicker'),
    };
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.onLost?.();
    });
  }

  get working(): boolean {
    return !this.lost;
  }

  /** Match the drawing buffer to the pixels the tube covers on screen, now and then. */
  private fit(): void {
    if (this.sizedAt >= 0 && this.frame - this.sizedAt < 60) return;
    this.sizedAt = this.frame;
    const box = this.canvas.getBoundingClientRect();
    if (box.width < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.min(1400, Math.round(box.width * dpr));
    const h = Math.min(1050, Math.round(box.height * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    // a scanline every three pixels or so: fine, and never a moiré
    this.gl.uniform1f(this.uniforms.lines, Math.max(120, Math.round(h / 3)));
  }

  /** Show what's on the flat canvas through the glass. */
  render(picture: HTMLCanvasElement): void {
    if (this.lost) return;
    this.frame++;
    this.fit();
    const gl = this.gl;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
    gl.uniform2f(this.uniforms.texel, 1 / picture.width, 1 / picture.height);
    gl.uniform1f(this.uniforms.flicker, 0.975 + Math.random() * 0.025);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
