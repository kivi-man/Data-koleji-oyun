class WebGLRenderer {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.positionLocation = null;
        this.texCoordLocation = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.textureCache = new Map();

        // Context lost/restored state
        this.isContextLost = false;
        this.onContextLostCallback = null;
        this.onContextRestoredCallback = null;

        // Matrix stack for 2D transforms (a,b,c,d,e,f)
        // [a c e]
        // [b d f]
        // [0 0 1]
        this.transformStack = [];
        this.currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        // Proxy context
        this.proxyContext = this.createProxyContext();
    }

    async init(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        }) || canvas.getContext("experimental-webgl");
        if (!this.gl) throw new Error("WebGL not supported");

        // Setup context lost/restored handlers
        this.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            this.isContextLost = true;
            console.warn('⚠️ WebGL Context Lost!');
            if (this.onContextLostCallback) this.onContextLostCallback();
        }, false);

        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('✅ WebGL Context Restored!');
            this.isContextLost = false;
            // Clear texture cache - textures are invalid after context restore
            this.textureCache.clear();
            // Re-initialize shaders and buffers
            this.reinitialize();
            if (this.onContextRestoredCallback) this.onContextRestoredCallback();
        }, false);

        // Setup Shaders
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            varying vec2 v_texCoord;
            void main() {
                // Convert position to 0->1
                vec2 zeroToOne = a_position / u_resolution;
                // Convert to 0->2
                vec2 zeroToTwo = zeroToOne * 2.0;
                // Convert to -1->+1 (clip space)
                vec2 clipSpace = zeroToTwo - 1.0;
                // Flip Y axis
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_image;
            varying vec2 v_texCoord;
            void main() {
                gl_FragColor = texture2D(u_image, v_texCoord);
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);

        this.gl.useProgram(this.program);

        // Look up locations
        this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
        this.texCoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
        this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");

        // Create buffers
        this.positionBuffer = this.gl.createBuffer();
        this.texCoordBuffer = this.gl.createBuffer();

        // Enable alpha blending
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        return true;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error("Shader compilation failed: " + info);
        }
        return shader;
    }

    createProgram(vs, fs) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error("Program linkage failed: " + info);
        }
        return program;
    }

    createProxyContext() {
        return {
            save: () => {
                this.transformStack.push({ ...this.currentTransform });
            },
            restore: () => {
                if (this.transformStack.length > 0) {
                    this.currentTransform = this.transformStack.pop();
                }
            },
            translate: (x, y) => {
                const t = this.currentTransform;
                t.e += t.a * x + t.c * y;
                t.f += t.b * x + t.d * y;
            },
            rotate: (angle) => {
                const t = this.currentTransform;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const a = t.a, b = t.b, c = t.c, d = t.d;
                t.a = a * cos + c * sin;
                t.b = b * cos + d * sin;
                t.c = a * -sin + c * cos;
                t.d = b * -sin + d * cos;
            },
            scale: (sx, sy) => {
                const t = this.currentTransform;
                t.a *= sx;
                t.b *= sx;
                t.c *= sy;
                t.d *= sy;
            },
            drawImage: (image, ...args) => {
                this.drawSprite(image, args);
            },

            createLinearGradient: () => ({ addColorStop: () => { } }),
            createRadialGradient: () => ({ addColorStop: () => { } }),
            createPattern: () => ({}),

            // Stubs
            beginPath: () => { },
            closePath: () => { },
            fill: () => { },
            stroke: () => { },
            rect: () => { },
            fillRect: () => { },
            strokeRect: () => { },
            clearRect: () => { },
            moveTo: () => { },
            lineTo: () => { },
            arc: () => { },
            arcTo: () => { },
            quadraticCurveTo: () => { },
            bezierCurveTo: () => { },
            fillText: () => { },
            strokeText: () => { },
            measureText: () => ({ width: 0 }),
            setLineDash: () => { },
            getLineDash: () => [],

            // Properties
            set globalAlpha(v) { },
            set fillStyle(v) { },
            set strokeStyle(v) { },
            set font(v) { },
            set imageSmoothingEnabled(v) { },
            set textAlign(v) { },
            set textBaseline(v) { },
        };
    }

    getTexture(img) {
        // Check for context loss
        if (this.isContextLost || !this.gl || this.gl.isContextLost()) {
            return null;
        }

        // For canvases and videos, we should probably update the texture if it's already in cache
        if (this.textureCache.has(img)) {
            const tex = this.textureCache.get(img);
            if (img instanceof HTMLCanvasElement) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
            }
            return tex;
        }

        const tex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

        // Set parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        try {
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
        } catch (e) {
            console.warn("WebGL Texture Error (Security?):", e);
            console.warn("Image details:", img);
            if (img instanceof HTMLImageElement) {
                console.warn("Src:", img.src, "Complete:", img.complete, "NaturalWidth:", img.naturalWidth);
            }
            return null;
        }

        // Cache the texture
        this.textureCache.set(img, tex);
        return tex;
    }

    reinitialize() {
        // Re-setup shaders after context restore
        if (!this.gl || this.gl.isContextLost()) return;

        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            varying vec2 v_texCoord;
            void main() {
                vec2 zeroToOne = a_position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_image;
            varying vec2 v_texCoord;
            void main() {
                gl_FragColor = texture2D(u_image, v_texCoord);
            }
        `;

        try {
            const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
            this.program = this.createProgram(vertexShader, fragmentShader);

            this.gl.useProgram(this.program);

            this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
            this.texCoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
            this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");

            this.positionBuffer = this.gl.createBuffer();
            this.texCoordBuffer = this.gl.createBuffer();

            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

            console.log('🔄 WebGL reinitialize completed');
        } catch (e) {
            console.error('❌ WebGL reinitialize failed:', e);
        }
    }

    startRender() {
        // Check for context loss
        if (!this.gl || this.isContextLost || this.gl.isContextLost()) {
            return false;
        }

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);

        this.transformStack = [];
        this.currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        return true;
    }

    finishRender() {
        // Nothing to flush for simple non-batched implementation, 
        // but if we batched, we'd do it here.
    }

    drawSprite(image, args) {
        // Check for context loss
        if (!image || !this.gl || this.isContextLost || this.gl.isContextLost()) return;

        let sx = 0, sy = 0, sw = image.width, sh = image.height;
        let dx = 0, dy = 0, dw = image.width, dh = image.height;

        if (args.length === 2) {
            dx = args[0]; dy = args[1];
        } else if (args.length === 4) {
            dx = args[0]; dy = args[1]; dw = args[2]; dh = args[3];
        } else if (args.length === 8) {
            sx = args[0]; sy = args[1]; sw = args[2]; sh = args[3];
            dx = args[4]; dy = args[5]; dw = args[6]; dh = args[7];
        }

        const tex = this.getTexture(image);
        if (!tex) return;

        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

        const t = this.currentTransform;

        // Transform the 4 corners of the quad
        // 0,0 -> 1,0 -> 0,1 -> 1,1
        // We need to calculate exact screen coordinates for the quad based on current transform

        const x1 = dx;
        const y1 = dy;
        const x2 = dx + dw;
        const y2 = dy + dh;

        // Apply matrix transform
        const p1x = x1 * t.a + y1 * t.c + t.e;
        const p1y = x1 * t.b + y1 * t.d + t.f;
        const p2x = x2 * t.a + y1 * t.c + t.e;
        const p2y = x2 * t.b + y1 * t.d + t.f;
        const p3x = x1 * t.a + y2 * t.c + t.e;
        const p3y = x1 * t.b + y2 * t.d + t.f;
        const p4x = x2 * t.a + y2 * t.c + t.e;
        const p4y = x2 * t.b + y2 * t.d + t.f;

        // Vertices (2 triangles)
        const positions = new Float32Array([
            p1x, p1y,
            p2x, p2y,
            p3x, p3y,
            p3x, p3y,
            p2x, p2y,
            p4x, p4y
        ]);

        // Texture coords
        const u1 = sx / image.width;
        const v1 = sy / image.height;
        const u2 = (sx + sw) / image.width;
        const v2 = (sy + sh) / image.height;

        const texCoords = new Float32Array([
            u1, v1,
            u2, v1,
            u1, v2,
            u1, v2,
            u2, v1,
            u2, v2
        ]);

        // Bind and draw
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}

// Make globally available
window.WebGLRenderer = WebGLRenderer;
