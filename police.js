/// <reference path="webgl.d.ts" />

let Police = class {
    constructor(gl, pos) {
        this.rotation = 0.0;
        this.speedx = 0;
        this.speedy = 0;
        this.speedz = 0;
        this.pos = pos;

        // ========== BODY ==========
        // Tall rectangular body (width 1.0, height 2.2, depth 0.6)
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        this.positions = [
            // Front face
            -0.5, -1.1, 0.3,
            0.5, -1.1, 0.3,
            0.5, 1.1, 0.3,
            -0.5, 1.1, 0.3,
            //Back Face
            -0.5, -1.1, -0.3,
            0.5, -1.1, -0.3,
            0.5, 1.1, -0.3,
            -0.5, 1.1, -0.3,
            //Top Face
            -0.5, 1.1, -0.3,
            0.5, 1.1, -0.3,
            0.5, 1.1, 0.3,
            -0.5, 1.1, 0.3,
            //Bottom Face
            -0.5, -1.1, -0.3,
            0.5, -1.1, -0.3,
            0.5, -1.1, 0.3,
            -0.5, -1.1, 0.3,
            //Left Face
            -0.5, -1.1, -0.3,
            -0.5, 1.1, -0.3,
            -0.5, 1.1, 0.3,
            -0.5, -1.1, 0.3,
            //Right Face
            0.5, -1.1, -0.3,
            0.5, 1.1, -0.3,
            0.5, 1.1, 0.3,
            0.5, -1.1, 0.3,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23,];

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
            // Front
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Back
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Top
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Bottom
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Right
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Left
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        const vertexNormals = [
            // Front
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            // Back
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            // Top
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            // Bottom
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            // Right
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            // Left
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

        // ========== HEAD ==========
        // Head cube (width 0.6, height 0.5, depth 0.5)
        this.headPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.headPositionBuffer);

        const headPositions = [
            // Front face
            -0.3, 1.1, 0.25,
            0.3, 1.1, 0.25,
            0.3, 1.6, 0.25,
            -0.3, 1.6, 0.25,
            //Back Face
            -0.3, 1.1, -0.25,
            0.3, 1.1, -0.25,
            0.3, 1.6, -0.25,
            -0.3, 1.6, -0.25,
            //Top Face
            -0.3, 1.6, -0.25,
            0.3, 1.6, -0.25,
            0.3, 1.6, 0.25,
            -0.3, 1.6, 0.25,
            //Bottom Face
            -0.3, 1.1, -0.25,
            0.3, 1.1, -0.25,
            0.3, 1.1, 0.25,
            -0.3, 1.1, 0.25,
            //Left Face
            -0.3, 1.1, -0.25,
            -0.3, 1.6, -0.25,
            -0.3, 1.6, 0.25,
            -0.3, 1.1, 0.25,
            //Right Face
            0.3, 1.1, -0.25,
            0.3, 1.6, -0.25,
            0.3, 1.6, 0.25,
            0.3, 1.1, 0.25,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headPositions), gl.STATIC_DRAW);

        const headIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, headIndexBuffer);
        const headIndices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23,
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(headIndices), gl.STATIC_DRAW);

        const headTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, headTextureCoordBuffer);
        const headTextureCoordinates = [
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headTextureCoordinates), gl.STATIC_DRAW);

        const headNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, headNormalBuffer);
        const headVertexNormals = [
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
            0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
            0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
            -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
            1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headVertexNormals), gl.STATIC_DRAW);

        this.buffer = {
            position: this.positionBuffer,
            normal: normalBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
        };

        this.headBuffer = {
            position: this.headPositionBuffer,
            normal: headNormalBuffer,
            textureCoord: headTextureCoordBuffer,
            indices: headIndexBuffer,
        };
    }

    drawCube(gl, projectionMatrix, programInfo, deltaTime) {
        const modelViewMatrix = mat4.create();
        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            this.pos
        );

        // Running animation synced with player chase
        var runFactor = 1.0;
        if (this.pos[1] > -3.5) runFactor = 0.2;
        else if (this.pos[1] < -4.2) runFactor = 0.5;
        var t = Date.now() * 0.015;
        var bob = Math.sin(t) * 0.04 * runFactor;
        var sway = Math.cos(t * 0.5) * 0.015 * runFactor;
        mat4.translate(modelViewMatrix, modelViewMatrix, [sway, bob, 0]);

        mat4.rotate(modelViewMatrix,
            modelViewMatrix,
            this.rotation,
            [1, 0, 0]);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

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
        gl.bindTexture(gl.TEXTURE_2D, police_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // ========== DRAW BODY ==========
        {
            const numComponents = 3;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        {
            const numComponents = 2;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.textureCoord);
            gl.vertexAttribPointer(
                programInfo.attribLocations.textureCoord,
                numComponents,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.textureCoord);
        }

        {
            const numComponents = 3;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.normal);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);

        {
            const vertexCount = 36;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }

        // ========== DRAW HEAD ==========
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.headBuffer.position);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                3,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.headBuffer.textureCoord);
            gl.vertexAttribPointer(
                programInfo.attribLocations.textureCoord,
                2,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.textureCoord);
        }

        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.headBuffer.normal);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                3,
                gl.FLOAT,
                false,
                0,
                0);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexNormal);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.headBuffer.indices);

        {
            const vertexCount = 36;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }
};
