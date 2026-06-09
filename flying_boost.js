"use strict";
/// <reference path="webgl.d.ts" />

let FlyingBoost = class {
    constructor(gl, pos, h, w, b) {
        this.rotation = 0.0;
        this.speedz = 1;
        this.speedy = 0.0;
        this.pos = pos;
        this.exist = 1;

        // Jetpack shape: main body + left/right wing pods + thrusters
        // All parts packed into one buffer for simplicity
        var positions = [];
        var normals = [];
        var texCoords = [];
        var indices = [];

        function addCube(px, py, pz, cw, ch, cd, nxSign, nySign, nzSign) {
            var base = positions.length / 3;
            // Front
            positions.push(px-cw, py-ch, pz+cd,  px+cw, py-ch, pz+cd,  px+cw, py+ch, pz+cd,  px-cw, py+ch, pz+cd);
            normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1);
            // Back
            positions.push(px-cw, py-ch, pz-cd,  px-cw, py+ch, pz-cd,  px+cw, py+ch, pz-cd,  px+cw, py-ch, pz-cd);
            normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1);
            // Top
            positions.push(px-cw, py+ch, pz-cd,  px+cw, py+ch, pz-cd,  px+cw, py+ch, pz+cd,  px-cw, py+ch, pz+cd);
            normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
            // Bottom
            positions.push(px-cw, py-ch, pz-cd,  px+cw, py-ch, pz-cd,  px+cw, py-ch, pz+cd,  px-cw, py-ch, pz+cd);
            normals.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0);
            // Right
            positions.push(px+cw, py-ch, pz-cd,  px+cw, py+ch, pz-cd,  px+cw, py+ch, pz+cd,  px+cw, py-ch, pz+cd);
            normals.push(1,0,0, 1,0,0, 1,0,0, 1,0,0);
            // Left
            positions.push(px-cw, py-ch, pz-cd,  px-cw, py+ch, pz-cd,  px-cw, py+ch, pz+cd,  px-cw, py-ch, pz+cd);
            normals.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0);

            for (var f = 0; f < 6; f++) {
                texCoords.push(0,0, 1,0, 1,1, 0,1);
            }

            indices.push(
                base, base+1, base+2,  base, base+2, base+3,
                base+4, base+5, base+6,  base+4, base+6, base+7,
                base+8, base+9, base+10,  base+8, base+10, base+11,
                base+12, base+13, base+14,  base+12, base+14, base+15,
                base+16, base+17, base+18,  base+16, base+18, base+19,
                base+20, base+21, base+22,  base+20, base+22, base+23
            );
        }

        // Main body (backpack) - 0.5 x 0.65 x 0.2
        addCube(0, 0, 0, 0.5, 0.65, 0.2);
        // Left wing pod - 0.25 x 0.4 x 0.08, positioned left and slightly back
        addCube(-0.7, -0.1, -0.15, 0.25, 0.4, 0.08);
        // Right wing pod
        addCube(0.7, -0.1, -0.15, 0.25, 0.4, 0.08);
        // Bottom thruster left
        addCube(-0.25, -0.85, -0.05, 0.12, 0.15, 0.12);
        // Bottom thruster right
        addCube(0.25, -0.85, -0.05, 0.12, 0.15, 0.12);

        this.vertexCount = indices.length;

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

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
        gl.bindTexture(gl.TEXTURE_2D, fb_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        {
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, this.vertexCount, type, offset);
        }
    }
};
