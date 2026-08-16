"use strict";
/// <reference path="webgl.d.ts" />

let Dog = class {
    constructor(gl, pos) {
        // ========== BODY ==========
        // Dog body: elongated rectangular prism (width 0.35, height 0.4, depth 0.8)
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        this.positions = [
            // Front face
            -0.175, -0.2, 0.4,
            0.175, -0.2, 0.4,
            0.175, 0.2, 0.4,
            -0.175, 0.2, 0.4,
            //Back Face
            -0.175, -0.2, -0.4,
            0.175, -0.2, -0.4,
            0.175, 0.2, -0.4,
            -0.175, 0.2, -0.4,
            //Top Face
            -0.175, 0.2, -0.4,
            0.175, 0.2, -0.4,
            0.175, 0.2, 0.4,
            -0.175, 0.2, 0.4,
            //Bottom Face
            -0.175, -0.2, -0.4,
            0.175, -0.2, -0.4,
            0.175, -0.2, 0.4,
            -0.175, -0.2, 0.4,
            //Left Face
            -0.175, -0.2, -0.4,
            -0.175, 0.2, -0.4,
            -0.175, 0.2, 0.4,
            -0.175, -0.2, 0.4,
            //Right Face
            0.175, -0.2, -0.4,
            0.175, 0.2, -0.4,
            0.175, 0.2, 0.4,
            0.175, -0.2, 0.4,
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
            20, 21, 22, 20, 22, 23,
        ];

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
            // Front
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Back
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Top
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Bottom
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Right
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Left
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        const vertexNormals = [
            // Front
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
            // Back
            0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
            // Top
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
            // Bottom
            0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
            // Right
            1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
            // Left
            -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

        // ========== HEAD ==========
        // Dog head: small cube at front-top (width 0.25, height 0.25, depth 0.3)
        this.headPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.headPositionBuffer);

        const headPositions = [
            // Front face (snout faces forward)
            -0.125, 0.1, 0.65,
            0.125, 0.1, 0.65,
            0.125, 0.35, 0.65,
            -0.125, 0.35, 0.65,
            //Back Face
            -0.125, 0.1, 0.4,
            0.125, 0.1, 0.4,
            0.125, 0.35, 0.4,
            -0.125, 0.35, 0.4,
            //Top Face
            -0.125, 0.35, 0.4,
            0.125, 0.35, 0.4,
            0.125, 0.35, 0.65,
            -0.125, 0.35, 0.65,
            //Bottom Face
            -0.125, 0.1, 0.4,
            0.125, 0.1, 0.4,
            0.125, 0.1, 0.65,
            -0.125, 0.1, 0.65,
            //Left Face
            -0.125, 0.1, 0.4,
            -0.125, 0.35, 0.4,
            -0.125, 0.35, 0.65,
            -0.125, 0.1, 0.65,
            //Right Face
            0.125, 0.1, 0.4,
            0.125, 0.35, 0.4,
            0.125, 0.35, 0.65,
            0.125, 0.1, 0.65,
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

        this.rotation = 0.0;
        this.speedx = 0;
        this.speedy = 0.05;
        this.speedz = 0;
        this.pos = pos;
        this.jumping_boots = false;
        this.fly_boost = false;

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

    // Draws the already-bound unit cube again as a limb, offset/scaled/swung
    // off the body matrix.
    drawBodyPart(gl, projectionMatrix, programInfo, baseMatrix, offset, scale, rotation, axis) {
        const partMatrix = mat4.clone(baseMatrix);
        mat4.translate(partMatrix, partMatrix, offset);
        if (rotation) mat4.rotate(partMatrix, partMatrix, rotation, axis || [1, 0, 0]);
        mat4.scale(partMatrix, partMatrix, scale);
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, partMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, partMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    drawCube(gl, projectionMatrix, programInfo, deltaTime) {
        // Draw shadow slightly below feet
        gl.disable(gl.DEPTH_TEST);
        drawShadow(gl, projectionMatrix, programInfo, this.pos[0], this.pos[1] - 0.22, this.pos[2], 0.2, 0.35);
        gl.enable(gl.DEPTH_TEST);

        const modelViewMatrix = mat4.create();
        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            this.pos
        );

        // Dog running animation: quick bobbing
        var runFactor = 1.0;
        if (this.pos[1] > -4.0) runFactor = 0.3;
        var t = Date.now() * 0.025;
        var bob = Math.sin(t) * 0.03 * runFactor;
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, bob, 0]);

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
        gl.bindTexture(gl.TEXTURE_2D, dog_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // ========== DRAW BODY ==========
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.textureCoord);
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
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.normal);
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

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);

        {
            const vertexCount = 36;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }

        // ========== DRAW LEGS / TAIL ==========
        // Body buffers are still bound, so these reuse the same unit cube.
        var gait = Math.sin(t * 1.6) * 0.55 * runFactor;
        this.drawBodyPart(gl, projectionMatrix, programInfo, modelViewMatrix, [-0.13, -0.3, 0.26], [0.09, 0.24, 0.24], gait, [1, 0, 0]);
        this.drawBodyPart(gl, projectionMatrix, programInfo, modelViewMatrix, [0.13, -0.3, 0.26], [0.09, 0.24, 0.24], -gait, [1, 0, 0]);
        this.drawBodyPart(gl, projectionMatrix, programInfo, modelViewMatrix, [-0.13, -0.3, -0.26], [0.09, 0.24, 0.24], -gait, [1, 0, 0]);
        this.drawBodyPart(gl, projectionMatrix, programInfo, modelViewMatrix, [0.13, -0.3, -0.26], [0.09, 0.24, 0.24], gait, [1, 0, 0]);
        // Tail, wagging out the back
        this.drawBodyPart(gl, projectionMatrix, programInfo, modelViewMatrix, [0, 0.16, -0.46], [0.07, 0.07, 0.3], 0.5 + gait * 0.4, [1, 0, 0]);

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

        cubeRotation += deltaTime;
    }
};
