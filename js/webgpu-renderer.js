class WebGPURenderer {
    constructor() {
        this.canvas = null;
        this.device = null;
        this.context = null;
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.sampler = null;
        this.textureCache = new Map();

        // Matrix stack for 2D transforms (a,b,c,d,e,f)
        // [a c e]
        // [b d f]
        // [0 0 1]
        this.transformStack = [];
        this.currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        // Batching
        this.maxQuads = 2000;
        this.vertexData = new Float32Array(this.maxQuads * 6 * 4); // 6 vertices * 4 floats (x,y,u,v)
        this.quadCount = 0;
        this.vertexBuffer = null;

        // Current texture for batching
        this.currentTexture = null;
        this.batches = [];

        // Proxy context to mimic Canvas2D
        this.proxyContext = this.createProxyContext();
    }

    async init(canvas) {
        this.canvas = canvas;
        if (!navigator.gpu) throw new Error("WebGPU not supported");

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("No adapter");

        this.device = await adapter.requestDevice();
        this.context = canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();

        this.context.configure({
            device: this.device,
            format: format,
            alphaMode: 'premultiplied',
        });

        // WGSL Shaders
        const shaderModule = this.device.createShaderModule({
            code: `
                struct Uniforms {
                    resolution : vec2<f32>,
                }
                @group(0) @binding(0) var<uniform> uniforms : Uniforms;
                @group(0) @binding(1) var mySampler : sampler;
                @group(0) @binding(2) var myTexture : texture_2d<f32>;

                struct VertexOutput {
                    @builtin(position) Position : vec4<f32>,
                    @location(0) uv : vec2<f32>,
                }

                @vertex
                fn vs_main(@location(0) pos : vec2<f32>, @location(1) uv : vec2<f32>) -> VertexOutput {
                    var output : VertexOutput;
                    // Convert screen coords (0..width, 0..height) to NDC (-1..1, 1..-1)
                    var p = pos / uniforms.resolution * 2.0;
                    p.x = p.x - 1.0;
                    p.y = 1.0 - p.y;
                    output.Position = vec4<f32>(p, 0.0, 1.0);
                    output.uv = uv;
                    return output;
                }

                @fragment
                fn fs_main(@location(0) uv : vec2<f32>) -> vec4<f32> {
                    return textureSample(myTexture, mySampler, uv);
                }
            `
        });

        // Bind Group Layout
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} }
            ]
        });

        // Pipeline
        this.pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 4 * 4, // 4 floats (x,y,u,v)
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' }, // pos
                        { shaderLocation: 1, offset: 8, format: 'float32x2' }  // uv
                    ]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                    }
                }]
            },
            primitive: { topology: 'triangle-list' }
        });

        this.vertexBuffer = this.device.createBuffer({
            size: this.vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.sampler = this.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        });

        // Uniform Buffer
        this.uniformBuffer = this.device.createBuffer({
            size: 8, // 2 floats
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        return true;
    }

    createProxyContext() {
        // Mimics CanvasRenderingContext2D methods we use
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
            scale: (sx, sy) => {
                const t = this.currentTransform;
                t.a *= sx;
                t.c *= sx;
                t.b *= sy;
                t.d *= sy;
            },
            drawImage: (image, ...args) => {
                this.drawSprite(image, args);
            },
            graphics: this,

            // Stub methods to prevent crashes
            beginPath: () => { },
            closePath: () => { },
            fill: () => { },
            stroke: () => { },
            rect: () => { },
            fillRect: () => { },
            fillText: () => { }, // Handled by UI overlay
            measureText: () => ({ width: 0 }),
            createLinearGradient: () => ({ addColorStop: () => { } }),
            strokeRect: () => { },

            // Property stubs
            set globalAlpha(v) { },
            set fillStyle(v) { },
            set strokeStyle(v) { },
            set font(v) { },
            set imageSmoothingEnabled(v) { },
            set textAlign(v) { },
            set textBaseline(v) { },
            set webkitImageSmoothingEnabled(v) { },
            set mozImageSmoothingEnabled(v) { },
            set msImageSmoothingEnabled(v) { },
            set globalCompositeOperation(v) { }
        };
    }

    startRender() {
        this.batches = [];
        this.quadCount = 0;
        this.currentTexture = null;
        this.transformStack = [];
        this.currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        if (this.device && this.uniformBuffer) {
            this.device.queue.writeBuffer(
                this.uniformBuffer,
                0,
                new Float32Array([this.canvas.width, this.canvas.height])
            );
        }
    }

    drawSprite(image, args) {
        // args: [img, dx, dy] or [img, sx, sy, sw, sh, dx, dy, dw, dh]
        if (!image) return;

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

        let tex = this.getTexture(image);
        if (!tex) return;

        if (this.currentTexture !== tex) {
            this.batches.push({
                texture: tex,
                start: this.quadCount * 6,
                count: 0
            });
            this.currentTexture = tex;
        }

        const batch = this.batches[this.batches.length - 1];
        batch.count += 6;

        const t = this.currentTransform;
        const x1 = dx, y1 = dy;
        const x2 = dx + dw, y2 = dy + dh;

        // Transform vertices
        const p1x = x1 * t.a + y1 * t.c + t.e;
        const p1y = x1 * t.b + y1 * t.d + t.f;
        const p2x = x2 * t.a + y1 * t.c + t.e;
        const p2y = x2 * t.b + y1 * t.d + t.f;
        const p3x = x2 * t.a + y2 * t.c + t.e;
        const p3y = x2 * t.b + y2 * t.d + t.f;
        const p4x = x1 * t.a + y2 * t.c + t.e;
        const p4y = x1 * t.b + y2 * t.d + t.f;

        const u1 = sx / image.width;
        const v1 = sy / image.height;
        const u2 = (sx + sw) / image.width;
        const v2 = (sy + sh) / image.height;

        let i = this.quadCount * 24;
        const d = this.vertexData;

        // Tri 1
        d[i++] = p1x; d[i++] = p1y; d[i++] = u1; d[i++] = v1;
        d[i++] = p2x; d[i++] = p2y; d[i++] = u2; d[i++] = v1;
        d[i++] = p3x; d[i++] = p3y; d[i++] = u2; d[i++] = v2;

        // Tri 2
        d[i++] = p1x; d[i++] = p1y; d[i++] = u1; d[i++] = v1;
        d[i++] = p3x; d[i++] = p3y; d[i++] = u2; d[i++] = v2;
        d[i++] = p4x; d[i++] = p4y; d[i++] = u1; d[i++] = v2;

        this.quadCount++;
    }

    getTexture(img) {
        if (this.textureCache.has(img)) return this.textureCache.get(img);

        // Dynamic texture creation
        const texture = this.device.createTexture({
            size: [img.width || 1, img.height || 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });

        try {
            this.device.queue.copyExternalImageToTexture(
                { source: img },
                { texture: texture },
                [img.width || 1, img.height || 1]
            );
        } catch (e) {
            console.warn("Failed to upload texture", e);
            return null;
        }

        const bindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: this.sampler },
                { binding: 2, resource: texture.createView() }
            ]
        });

        const res = { texture, bindGroup };

        // Only cache static images
        if (img instanceof HTMLImageElement && img.complete) {
            this.textureCache.set(img, res);
        }
        // Canvases are not cached -> re-uploaded every frame (slow but works for dynamic player)

        return res;
    }

    finishRender() {
        if (this.batches.length === 0 || !this.context) return;

        const cmd = this.device.createCommandEncoder();
        const pass = cmd.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        pass.setPipeline(this.pipeline);

        this.device.queue.writeBuffer(
            this.vertexBuffer,
            0,
            this.vertexData,
            0,
            this.quadCount * 24
        );
        pass.setVertexBuffer(0, this.vertexBuffer);

        for (const batch of this.batches) {
            pass.setBindGroup(0, batch.texture.bindGroup);
            pass.draw(batch.count, 1, batch.start, 0);
        }

        pass.end();
        this.device.queue.submit([cmd.finish()]);
    }
}

// Make globally available
window.WebGPURenderer = WebGPURenderer;
