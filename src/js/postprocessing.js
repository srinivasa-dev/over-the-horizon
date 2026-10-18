// =================================================================
// OVER THE HORIZON: French Ligne-Claire Moebius Comic Post-Processing
// =================================================================
import * as THREE from 'three';

export class ComicPostProcessor {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.enabled = true;

    // Fullscreen render target
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Orthographic post-processing camera & scene
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene = new THREE.Scene();

    // Sobel Edge Detection + Comic Cel Ink Shader
    this.comicMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uEnabled: { value: 1.0 },
        uEdgeThreshold: { value: 0.18 },
        uInkThickness: { value: 1.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uEnabled;
        uniform float uEdgeThreshold;
        uniform float uInkThickness;
        varying vec2 vUv;

        float getLuma(vec4 color) {
          return dot(color.rgb, vec3(0.299, 0.587, 0.114));
        }

        void main() {
          vec4 original = texture2D(tDiffuse, vUv);
          if (uEnabled < 0.5) {
            gl_FragColor = original;
            return;
          }

          vec2 texel = uInkThickness / uResolution;

          // 3x3 Sobel kernel sampling
          float tl = getLuma(texture2D(tDiffuse, vUv + vec2(-texel.x,  texel.y)));
          float tm = getLuma(texture2D(tDiffuse, vUv + vec2( 0.0,      texel.y)));
          float tr = getLuma(texture2D(tDiffuse, vUv + vec2( texel.x,  texel.y)));

          float ml = getLuma(texture2D(tDiffuse, vUv + vec2(-texel.x,  0.0)));
          float mr = getLuma(texture2D(tDiffuse, vUv + vec2( texel.x,  0.0)));

          float bl = getLuma(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)));
          float bm = getLuma(texture2D(tDiffuse, vUv + vec2( 0.0,     -texel.y)));
          float br = getLuma(texture2D(tDiffuse, vUv + vec2( texel.x, -texel.y)));

          // Horizontal & vertical gradients
          float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
          float gy = -tl - 2.0 * tm - tr + bl + 2.0 * bm + br;
          float edge = length(vec2(gx, gy));

          // Ink color (deep charcoal ink #1A1A22)
          vec3 inkColor = vec3(0.10, 0.10, 0.14);

          if (edge > uEdgeThreshold) {
            // Crisp uniform black ink outline
            gl_FragColor = vec4(inkColor, 1.0);
          } else {
            // Subtle pastel cel-color quantization for comic book print feel
            vec3 col = original.rgb;
            gl_FragColor = vec4(col, original.a);
          }
        }
      `
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comicMaterial);
    this.postScene.add(quad);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.renderTarget.setSize(width, height);
    this.comicMaterial.uniforms.uResolution.value.set(width, height);
  }

  toggleComicMode() {
    this.enabled = !this.enabled;
    this.comicMaterial.uniforms.uEnabled.value = this.enabled ? 1.0 : 0.0;
    return this.enabled;
  }

  setComicMode(enabled) {
    this.enabled = enabled;
    this.comicMaterial.uniforms.uEnabled.value = enabled ? 1.0 : 0.0;
  }

  render(scene, camera) {
    if (!this.enabled) {
      // Direct pass
      this.renderer.render(scene, camera);
      return;
    }

    // Pass 1: Render scene to render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);

    // Pass 2: Fullscreen Sobel Inking pass to canvas
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
