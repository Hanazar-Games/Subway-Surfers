/// <reference path="webgl.d.ts" />

let Manhole = class {
    constructor(gl, pos, h, w, b) {
        this.rotation = 0.0;
        this.pos = pos;
        this.exist = true;

        // Create a flat cylindrical disc (12-sided polygon) for manhole cover
        // Radius from width, half-height from h
        var radius = w / 2;
        var halfH = h / 2;
        var segments = 12;
        var positions = [];
        var textureCoordinates = [];
        var vertexNormals = [];
        var indices = [];

        // === TOP FACE ===
        // Center vertex
        positions.push(0, halfH, 0);
        textureCoordinates.push(0.5, 0.5);
        vertexNormals.push(0, 1, 0);

        // Top edge vertices
        for (var i = 0; i < segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var x = Math.cos(angle) * radius;
            var z = Math.sin(angle) * radius;
            positions.push(x, halfH, z);
            textureCoordinates.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
            vertexNormals.push(0, 1, 0);
        }

        // Top face indices (center at 0, edge at 1..segments)
        // Order (center, next, current) gives normal pointing up (+Y)
        for (var i = 0; i < segments; i++) {
            var next = (i + 1) % segments;
            indices.push(0, next + 1, i + 1);
        }

        // === BOTTOM FACE ===
        var bottomCenterIdx = positions.length / 3;
        positions.push(0, -halfH, 0);
        textureCoordinates.push(0.5, 0.5);
        vertexNormals.push(0, -1, 0);

        // Bottom edge vertices
        for (var i = 0; i < segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var x = Math.cos(angle) * radius;
            var z = Math.sin(angle) * radius;
            positions.push(x, -halfH, z);
            textureCoordinates.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
            vertexNormals.push(0, -1, 0);
        }

        // Bottom face indices
        // Order (center, current, next) gives normal pointing down (-Y)
        for (var i = 0; i < segments; i++) {
            var next = (i + 1) % segments;
            indices.push(bottomCenterIdx, bottomCenterIdx + i + 1, bottomCenterIdx + next + 1);
        }

        // === SIDE FACES ===
        // Each side is a rectangle between two edge vertices (top and bottom)
        for (var i = 0; i < segments; i++) {
            var next = (i + 1) % segments;
            var topCurrent = 1 + i;
            var topNext = 1 + next;
            var bottomCurrent = bottomCenterIdx + 1 + i;
            var bottomNext = bottomCenterIdx + 1 + next;

            // Normal for this side segment
            var angle = (i + 0.5) / segments * Math.PI * 2;
            var nx = Math.cos(angle);
            var nz = Math.sin(angle);

            // 4 vertices for the side quad
            var sideBaseIdx = positions.length / 3;

            positions.push(positions[topCurrent * 3], positions[topCurrent * 3 + 1], positions[topCurrent * 3 + 2]);
            textureCoordinates.push(i / segments, 1.0);
            vertexNormals.push(nx, 0, nz);

            positions.push(positions[topNext * 3], positions[topNext * 3 + 1], positions[topNext * 3 + 2]);
            textureCoordinates.push((i + 1) / segments, 1.0);
            vertexNormals.push(nx, 0, nz);

            positions.push(positions[bottomNext * 3], positions[bottomNext * 3 + 1], positions[bottomNext * 3 + 2]);
            textureCoordinates.push((i + 1) / segments, 0.0);
            vertexNormals.push(nx, 0, nz);

            positions.push(positions[bottomCurrent * 3], positions[bottomCurrent * 3 + 1], positions[bottomCurrent * 3 + 2]);
            textureCoordinates.push(i / segments, 0.0);
            vertexNormals.push(nx, 0, nz);

            indices.push(sideBaseIdx, sideBaseIdx + 1, sideBaseIdx + 2);
            indices.push(sideBaseIdx, sideBaseIdx + 2, sideBaseIdx + 3);
        }

        this.vertexCount = indices.length;

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

        this.buffer = {
            position: this.positionBuffer,
            normal: normalBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
        }
    }

    drawCube(gl, projectionMatrix, programInfo, deltaTime) {
        const modelViewMatrix = mat4.create();
        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            this.pos
        );

        mat4.rotate(modelViewMatrix,
            modelViewMatrix,
            this.rotation,
            [0, 1, 0]);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        {
            const numComponents = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.textureCoord);
            gl.vertexAttribPointer(
                programInfo.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.textureCoord);
        }

        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.normal);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);

        gl.useProgram(programInfo.program);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, manhole_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        {
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, this.vertexCount, type, offset);
        }

    }
};
