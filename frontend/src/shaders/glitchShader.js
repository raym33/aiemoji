// Custom YTP Glitch shader for postprocessing
export const YTPGlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    intensity: { value: 0.5 },
    mood: { value: 0 }, // 0=normal, 1=glitch, 2=void, 3=dream, 4=manic, 5=tokenize, 6=loop, 7=hallucination
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float mood;
    varying vec2 vUv;

    // Noise functions
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      float t = time;
      float i = intensity;

      // === GLITCH: RGB split + scanlines ===
      if (mood < 1.5) {
        // Horizontal tear
        float tear = step(0.99 - i * 0.15, random(vec2(floor(t * 8.0), floor(uv.y * 20.0))));
        uv.x += tear * (random(vec2(t)) - 0.5) * 0.3 * i;

        // RGB channel split
        float split = i * 0.02;
        float r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;

        // Scanlines
        float scanline = sin(uv.y * 400.0 + t * 10.0) * 0.04 * i;

        gl_FragColor = vec4(r + scanline, g + scanline, b + scanline, 1.0);
      }
      // === VOID: darkness + noise grain ===
      else if (mood < 2.5) {
        vec4 color = texture2D(tDiffuse, uv);
        float darkness = 1.0 - i * 0.07;
        float grain = random(uv + t) * 0.15 * i;
        float vignette = 1.0 - length(uv - 0.5) * 1.5;
        color.rgb *= darkness * vignette;
        color.rgb += grain;
        gl_FragColor = color;
      }
      // === DREAM: chromatic wobble + bloom ===
      else if (mood < 3.5) {
        uv += sin(uv.y * 10.0 + t * 2.0) * 0.01 * i;
        uv += cos(uv.x * 8.0 + t * 1.5) * 0.01 * i;

        float r = texture2D(tDiffuse, uv + vec2(0.005 * i, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(0.005 * i, 0.0)).b;

        // Dreamy color shift
        vec3 col = vec3(r, g, b);
        col = mix(col, vec3(0.5, 0.3, 0.8), 0.2 * i * 0.1);

        gl_FragColor = vec4(col, 1.0);
      }
      // === MANIC: extreme RGB + speed lines ===
      else if (mood < 4.5) {
        float warp = sin(t * 20.0) * 0.02 * i;
        uv.x += warp;
        uv.y += cos(t * 15.0) * 0.01 * i;

        float split = i * 0.04;
        float r = texture2D(tDiffuse, uv + vec2(split, split)).r;
        float g = texture2D(tDiffuse, uv - vec2(split, 0.0)).g;
        float b = texture2D(tDiffuse, uv + vec2(0.0, -split)).b;

        // Strobe
        float strobe = step(0.5, fract(t * 4.0)) * 0.3 * i * 0.1;

        gl_FragColor = vec4(r + strobe, g, b + strobe, 1.0);
      }
      // === TOKENIZE: pixelation + digital rain ===
      else if (mood < 5.5) {
        float pixels = 100.0 - i * 8.0;
        vec2 pixelUv = floor(uv * pixels) / pixels;
        vec4 color = texture2D(tDiffuse, pixelUv);

        // Digital rain overlay
        float rain = step(0.98, random(vec2(floor(uv.x * 40.0), floor(uv.y * 40.0 - t * 10.0))));
        color.g += rain * 0.5;

        gl_FragColor = color;
      }
      // === LOOP: feedback / echo ===
      else if (mood < 6.5) {
        vec4 color = vec4(0.0);
        for (float j = 0.0; j < 5.0; j++) {
          float offset = j * 0.01 * i * 0.3;
          float angle = t + j * 0.5;
          vec2 off = vec2(cos(angle), sin(angle)) * offset;
          color += texture2D(tDiffuse, uv + off);
        }
        color /= 5.0;

        // Time loop color cycling
        color.r *= 0.8 + 0.2 * sin(t * 3.0);
        color.b *= 0.8 + 0.2 * cos(t * 2.0);

        gl_FragColor = color;
      }
      // === HALLUCINATION: color inversion + wave distortion ===
      else {
        uv.x += sin(uv.y * 20.0 + t * 5.0) * 0.03 * i;
        uv.y += cos(uv.x * 15.0 + t * 3.0) * 0.02 * i;

        vec4 color = texture2D(tDiffuse, uv);

        // Partial color inversion
        float inv = sin(t * 2.0) * 0.5 + 0.5;
        color.rgb = mix(color.rgb, 1.0 - color.rgb, inv * i * 0.1);

        // Hue shift
        float shift = t * 0.5;
        mat3 hueRotation = mat3(
          0.577 + 0.423 * cos(shift), 0.577 * (1.0 - cos(shift)) - 0.577 * sin(shift), 0.577 * (1.0 - cos(shift)) + 0.577 * sin(shift),
          0.577 * (1.0 - cos(shift)) + 0.577 * sin(shift), 0.577 + 0.423 * cos(shift), 0.577 * (1.0 - cos(shift)) - 0.577 * sin(shift),
          0.577 * (1.0 - cos(shift)) - 0.577 * sin(shift), 0.577 * (1.0 - cos(shift)) + 0.577 * sin(shift), 0.577 + 0.423 * cos(shift)
        );
        color.rgb = hueRotation * color.rgb;

        gl_FragColor = color;
      }
    }
  `,
};
