/** Original browser renderer: owned 2D scene → texture → refractive lens + surface light. */
export type WelcomeFrame = {
  progress: number;
  plume: number;
  leaving: boolean;
  force: number;
};

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;
const fragmentSource = `
precision mediump float;
varying vec2 uv;
uniform sampler2D scene;
uniform vec2 size;
uniform vec2 center;
uniform float radius;
uniform float force;
uniform vec3 tint;
vec3 sampleAt(vec2 p) { return texture2D(scene, clamp(p / size, .001, .999)).rgb; }
void main() {
  vec2 p = vec2(uv.x, 1. - uv.y) * size;
  vec2 d = (p - center) / radius;
  float distance = length(d);
  vec3 color = sampleAt(p);
  if (distance < 1.) {
    float edge = smoothstep(.62, 1., distance);
    float thickness = .19 + .34 * edge * edge;
    vec2 refracted = center + (p - center) * (1. - thickness);
    refracted.y += force * radius * .035 * (1. - distance * distance);
    vec2 fringe = d * edge * radius * .018;
    color = vec3(sampleAt(refracted + fringe).r, sampleAt(refracted).g, sampleAt(refracted - fringe).b);
    color = mix(color, tint, .035 + edge * .08);
    float rim = smoothstep(.95, .985, distance) * (1. - smoothstep(.985, 1., distance));
    float sheen = exp(-pow((distance - .89) * 25., 2.)) * max(0., dot(normalize(d + .0001), normalize(vec2(-.5, -.8))));
    float crown = exp(-length((d - vec2(-.18, -.67)) * vec2(3., 7.)));
    color = mix(color, vec3(1.), clamp(rim * .85 + sheen * .68 + crown * (.16 + abs(force) * .32), 0., .94));
    float inner = exp(-pow((distance - .94) * 65., 2.));
    color = mix(color, tint, inner * .22);
  } else {
    float halo = exp(-(distance - 1.) * 24.) * .07;
    color = mix(color, tint, halo);
  }
  gl_FragColor = vec4(color, 1.);
}
`;

const artwork = [
  "/media/home/opportunity-mountains.webp",
  "/media/home/artist-at-work.webp",
  "/media/home/portfolio-still-life.webp",
  "/media/home/gallery-interior.webp",
];
// Authored asymmetric plume positions. Small fragments pass through the open lens.
const pieces = [
  [-0.25, 0.19, 112, -0.14, 0],
  [0.16, 0.13, 86, 0.13, 1],
  [-0.04, 0.35, 105, -0.06, 4],
  [0.28, 0.36, 92, 0.17, 2],
  [-0.3, 0.49, 78, -0.24, 3],
  [0.08, 0.54, 64, 0.18, 5],
  [-0.09, 0.68, 48, -0.17, 6],
  [0.18, 0.7, 35, 0.22, 7],
  [-0.34, 0.08, 30, 0.16, 7],
  [0.34, 0.17, 36, -0.1, 6],
  [-0.18, 0.79, 28, 0.25, 7],
  [0.04, 0.92, 42, 0.1, 6],
] as const;

export function createWelcomeRenderer(
  canvas: HTMLCanvasElement,
  invalidate: () => void,
) {
  const context = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL unavailable");
  const gl: WebGLRenderingContext = context;
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error("Shader compilation failed");
    return shader;
  };
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
  };
  try {
    if (!program || !buffer || !texture)
      throw new Error("Graphics allocation failed");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Shader link failed");
  } catch (error) {
    dispose();
    throw error;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program!, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uniforms = Object.fromEntries(
    ["size", "center", "radius", "force", "tint"].map((name) => [
      name,
      gl.getUniformLocation(program!, name),
    ]),
  );
  const source = document.createElement("canvas");
  const ctx = source.getContext("2d");
  if (!ctx) {
    dispose();
    throw new Error("Scene canvas unavailable");
  }
  let alive = true;
  const images = artwork.map((path) => {
    const image = new Image();
    image.onload = () => {
      if (alive) invalidate();
    };
    image.src = path;
    return image;
  });
  const style = getComputedStyle(canvas);
  const color = (name: string) => style.getPropertyValue(name).trim();
  const palette = {
    paper: color("--welcome-paper"),
    mist: color("--welcome-mist"),
    forest: color("--welcome-forest"),
    blue: color("--welcome-blue"),
    gold: color("--welcome-gold"),
    ink: color("--welcome-text"),
    line: color("--welcome-line"),
  };
  // Resolve semantic color into numeric shader channels without duplicating palette literals.
  ctx.fillStyle = palette.forest;
  ctx.fillRect(0, 0, 1, 1);
  const rgb = ctx.getImageData(0, 0, 1, 1).data;
  gl.uniform3f(uniforms.tint, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  const editorial = style.getPropertyValue("--font-heading").trim();
  const ui = style.getPropertyValue("--font-sans").trim();

  function render({ progress, plume, leaving, force }: WelcomeFrame) {
    if (!alive || !ctx || gl.isContextLost()) return;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pw = Math.round(w * dpr),
      ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = source.width = pw;
      canvas.height = source.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, palette.paper);
    bg.addColorStop(1, palette.mist);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Engraved concentric arcs form an original backdrop the lens can visibly bend.
    ctx.strokeStyle = palette.forest;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 13; i++) {
      ctx.beginPath();
      ctx.ellipse(
        w * 0.52,
        h * 1.06,
        w * (0.35 + i * 0.065),
        h * (0.2 + i * 0.055),
        -0.22,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const p = Math.min(1.12, Math.max(-0.1, progress));
    const cy = h * (1 - p * 0.43),
      radius = Math.max(34, w * 0.57 * (1 - p) + 46 * p);
    for (let i = 0; i < pieces.length; i++) {
      const [px, py, size, angle, kind] = pieces[i];
      const q = leaving
        ? plume
        : Math.min(1, Math.max(0, (plume - i * 0.035) / 0.58));
      if (q <= 0) continue;
      const ease = 1 - (1 - q) ** 3;
      const homeY = 70 + py * (h * 0.57 - 70);
      const x = w * 0.5 + px * w * (leaving ? 1 : ease);
      const y = leaving
        ? homeY + Math.sin((1 - q) * Math.PI) * 44 - (1 - q) * 52
        : cy + (homeY - cy) * ease;
      const scale = Math.min(w / 470, 1.1) * (leaving ? 1 : 0.22 + 0.78 * ease);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle * (leaving ? 1 : ease));
      ctx.scale(scale, scale);
      ctx.globalAlpha = leaving ? q : Math.min(1, q * 4);
      if (kind < 4) {
        ctx.fillStyle = palette.paper;
        ctx.fillRect(-size / 2, -size * 0.6, size, size * 1.2);
        ctx.strokeStyle = palette.line;
        ctx.strokeRect(-size / 2, -size * 0.6, size, size * 1.2);
        const image = images[kind];
        ctx.fillStyle = palette.mist;
        ctx.fillRect(-size / 2 + 6, -size * 0.6 + 6, size - 12, size * 0.86);
        if (image.complete && image.naturalWidth) {
          const side = Math.min(image.naturalWidth, image.naturalHeight);
          ctx.drawImage(
            image,
            (image.naturalWidth - side) / 2,
            (image.naturalHeight - side) / 2,
            side,
            side,
            -size / 2 + 6,
            -size * 0.6 + 6,
            size - 12,
            size * 0.86,
          );
        }
        ctx.fillStyle = palette.ink;
        ctx.font = `10px ${ui}`;
        ctx.textAlign = "center";
        ctx.fillText(
          ["Somewhere new", "Make something", "Your practice", "Room to grow"][
            kind
          ],
          0,
          size * 0.43,
        );
      } else if (kind === 4) {
        ctx.fillStyle = palette.forest;
        ctx.fillRect(-size / 2, -size * 0.64, size, size * 1.28);
        ctx.strokeStyle = palette.mist;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          -size / 2 + 7,
          -size * 0.64 + 7,
          size - 14,
          size * 1.28 - 14,
        );
        ctx.fillStyle = palette.paper;
        ctx.font = `italic 24px ${editorial}`;
        ctx.textAlign = "center";
        ctx.fillText("The next", 0, -14);
        ctx.fillText("chapter", 0, 13);
        ctx.font = `9px ${ui}`;
        ctx.fillText("YOURS TO WRITE", 0, 45);
      } else if (kind === 5) {
        ctx.fillStyle = palette.paper;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = palette.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 - 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = palette.gold;
        ctx.font = `28px ${editorial}`;
        ctx.textAlign = "center";
        ctx.fillText("✳", 0, 10);
      } else {
        ctx.strokeStyle = kind === 6 ? palette.blue : palette.gold;
        ctx.lineWidth = kind === 6 ? 3 : 2;
        for (let ray = 0; ray < 8; ray++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(0, 5);
          ctx.lineTo(0, size / 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    gl.viewport(0, 0, pw, ph);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform2f(uniforms.size, w, h);
    gl.uniform2f(uniforms.center, w * 0.5, cy);
    gl.uniform1f(uniforms.radius, radius);
    gl.uniform1f(uniforms.force, Math.min(1, Math.max(-1, force)));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  return {
    render,
    dispose: () => {
      alive = false;
      images.forEach((image) => {
        image.onload = null;
      });
      dispose();
    },
  };
}
