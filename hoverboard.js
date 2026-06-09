"use strict";
/// <reference path="webgl.d.ts" />

let Hoverboard = class {
    constructor(gl, pos, h, w, b) {
        this.rotation = 0.0;
        this.pos = pos;
        this.exist = true;

        // Scale factor based on input dimensions
        var sx = w / 1.5;
        var sy = h / 1.5;
        var sz = b / 1.5;

        // ========== DECK ==========
        // Flat elongated prism (1.2 x 0.1 x 2.5)
        var dw = 0.6 * sx, dh = 0.05 * sy, db = 1.25 * sz;
        this.deckPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.deckPositionBuffer);
        var deckPositions = [
            // Front
            -dw, -dh, db,  dw, -dh, db,  dw, dh, db,  -dw, dh, db,
            // Back
            -dw, -dh, -db,  -dw, dh, -db,  dw, dh, -db,  dw, -dh, -db,
            // Top
            -dw, dh, -db,  dw, dh, -db,  dw, dh, db,  -dw, dh, db,
            // Bottom
            -dw, -dh, -db,  dw, -dh, -db,  dw, -dh, db,  -dw, -dh, db,
            // Right
            dw, -dh, -db,  dw, dh, -db,  dw, dh, db,  dw, -dh, db,
            // Left
            -dw, -dh, -db,  -dw, dh, -db,  -dw, dh, db,  -dw, -dh, db,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(deckPositions), gl.STATIC_DRAW);

        var deckIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, deckIndexBuffer);
        var deckIndices = [
            0,1,2, 0,2,3,
            4,5,6, 4,6,7,
            8,9,10, 8,10,11,
            12,13,14, 12,14,15,
            16,17,18, 16,18,19,
            20,21,22, 20,22,23,
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(deckIndices), gl.STATIC_DRAW);

        var deckTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, deckTextureCoordBuffer);
        var deckTextureCoordinates = [
            0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(deckTextureCoordinates), gl.STATIC_DRAW);

        var deckNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, deckNormalBuffer);
        var deckNormals = [
            0,0,1, 0,0,1, 0,0,1, 0,0,1,
            0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
            0,1,0, 0,1,0, 0,1,0, 0,1,0,
            0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
            1,0,0, 1,0,0, 1,0,0, 1,0,0,
            -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(deckNormals), gl.STATIC_DRAW);

        this.deckBuffer = {
            position: this.deckPositionBuffer,
            normal: deckNormalBuffer,
            textureCoord: deckTextureCoordBuffer,
            indices: deckIndexBuffer,
        };

        // ========== WHEELS ==========
        // 4 small cubes as wheels (0.2 x 0.2 x 0.2)
        var ww = 0.1 * sx, wh = 0.1 * sy, wb = 0.1 * sz;
        this.wheelPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wheelPositionBuffer);
        var wheelPositions = [
            // Front-left (relative to deck center)
            -0.45*sx-ww, -dh-wh, 0.9*sz+wb,  -0.45*sx+ww, -dh-wh, 0.9*sz+wb,
            -0.45*sx+ww, -dh+wh, 0.9*sz+wb,  -0.45*sx-ww, -dh+wh, 0.9*sz+wb,
            -0.45*sx-ww, -dh-wh, 0.9*sz-wb,  -0.45*sx-ww, -dh+wh, 0.9*sz-wb,
            -0.45*sx+ww, -dh+wh, 0.9*sz-wb,  -0.45*sx+ww, -dh-wh, 0.9*sz-wb,
            -0.45*sx-ww, -dh+wh, 0.9*sz-wb,  -0.45*sx-ww, -dh+wh, 0.9*sz+wb,
            -0.45*sx+ww, -dh+wh, 0.9*sz+wb,  -0.45*sx+ww, -dh+wh, 0.9*sz-wb,
            -0.45*sx-ww, -dh-wh, 0.9*sz-wb,  -0.45*sx+ww, -dh-wh, 0.9*sz-wb,
            -0.45*sx+ww, -dh-wh, 0.9*sz+wb,  -0.45*sx-ww, -dh-wh, 0.9*sz+wb,
            -0.45*sx-ww, -dh-wh, 0.9*sz-wb,  -0.45*sx-ww, -dh+wh, 0.9*sz-wb,
            -0.45*sx-ww, -dh+wh, 0.9*sz+wb,  -0.45*sx-ww, -dh-wh, 0.9*sz+wb,
            -0.45*sx+ww, -dh-wh, 0.9*sz-wb,  -0.45*sx+ww, -dh+wh, 0.9*sz-wb,
            -0.45*sx+ww, -dh+wh, 0.9*sz+wb,  -0.45*sx+ww, -dh-wh, 0.9*sz+wb,

            // Front-right
            0.45*sx-ww, -dh-wh, 0.9*sz+wb,  0.45*sx+ww, -dh-wh, 0.9*sz+wb,
            0.45*sx+ww, -dh+wh, 0.9*sz+wb,  0.45*sx-ww, -dh+wh, 0.9*sz+wb,
            0.45*sx-ww, -dh-wh, 0.9*sz-wb,  0.45*sx-ww, -dh+wh, 0.9*sz-wb,
            0.45*sx+ww, -dh+wh, 0.9*sz-wb,  0.45*sx+ww, -dh-wh, 0.9*sz-wb,
            0.45*sx-ww, -dh+wh, 0.9*sz-wb,  0.45*sx-ww, -dh+wh, 0.9*sz+wb,
            0.45*sx+ww, -dh+wh, 0.9*sz+wb,  0.45*sx+ww, -dh+wh, 0.9*sz-wb,
            0.45*sx-ww, -dh-wh, 0.9*sz-wb,  0.45*sx+ww, -dh-wh, 0.9*sz-wb,
            0.45*sx+ww, -dh-wh, 0.9*sz+wb,  0.45*sx-ww, -dh-wh, 0.9*sz+wb,
            0.45*sx-ww, -dh-wh, 0.9*sz-wb,  0.45*sx-ww, -dh+wh, 0.9*sz-wb,
            0.45*sx-ww, -dh+wh, 0.9*sz+wb,  0.45*sx-ww, -dh-wh, 0.9*sz+wb,
            0.45*sx+ww, -dh-wh, 0.9*sz-wb,  0.45*sx+ww, -dh+wh, 0.9*sz-wb,
            0.45*sx+ww, -dh+wh, 0.9*sz+wb,  0.45*sx+ww, -dh-wh, 0.9*sz+wb,

            // Back-left
            -0.45*sx-ww, -dh-wh, -0.9*sz+wb,  -0.45*sx+ww, -dh-wh, -0.9*sz+wb,
            -0.45*sx+ww, -dh+wh, -0.9*sz+wb,  -0.45*sx-ww, -dh+wh, -0.9*sz+wb,
            -0.45*sx-ww, -dh-wh, -0.9*sz-wb,  -0.45*sx-ww, -dh+wh, -0.9*sz-wb,
            -0.45*sx+ww, -dh+wh, -0.9*sz-wb,  -0.45*sx+ww, -dh-wh, -0.9*sz-wb,
            -0.45*sx-ww, -dh+wh, -0.9*sz-wb,  -0.45*sx-ww, -dh+wh, -0.9*sz+wb,
            -0.45*sx+ww, -dh+wh, -0.9*sz+wb,  -0.45*sx+ww, -dh+wh, -0.9*sz-wb,
            -0.45*sx-ww, -dh-wh, -0.9*sz-wb,  -0.45*sx+ww, -dh-wh, -0.9*sz-wb,
            -0.45*sx+ww, -dh-wh, -0.9*sz+wb,  -0.45*sx-ww, -dh-wh, -0.9*sz+wb,
            -0.45*sx-ww, -dh-wh, -0.9*sz-wb,  -0.45*sx-ww, -dh+wh, -0.9*sz-wb,
            -0.45*sx-ww, -dh+wh, -0.9*sz+wb,  -0.45*sx-ww, -dh-wh, -0.9*sz+wb,
            -0.45*sx+ww, -dh-wh, -0.9*sz-wb,  -0.45*sx+ww, -dh+wh, -0.9*sz-wb,
            -0.45*sx+ww, -dh+wh, -0.9*sz+wb,  -0.45*sx+ww, -dh-wh, -0.9*sz+wb,

            // Back-right
            0.45*sx-ww, -dh-wh, -0.9*sz+wb,  0.45*sx+ww, -dh-wh, -0.9*sz+wb,
            0.45*sx+ww, -dh+wh, -0.9*sz+wb,  0.45*sx-ww, -dh+wh, -0.9*sz+wb,
            0.45*sx-ww, -dh-wh, -0.9*sz-wb,  0.45*sx-ww, -dh+wh, -0.9*sz-wb,
            0.45*sx+ww, -dh+wh, -0.9*sz-wb,  0.45*sx+ww, -dh-wh, -0.9*sz-wb,
            0.45*sx-ww, -dh+wh, -0.9*sz-wb,  0.45*sx-ww, -dh+wh, -0.9*sz+wb,
            0.45*sx+ww, -dh+wh, -0.9*sz+wb,  0.45*sx+ww, -dh+wh, -0.9*sz-wb,
            0.45*sx-ww, -dh-wh, -0.9*sz-wb,  0.45*sx+ww, -dh-wh, -0.9*sz-wb,
            0.45*sx+ww, -dh-wh, -0.9*sz+wb,  0.45*sx-ww, -dh-wh, -0.9*sz+wb,
            0.45*sx-ww, -dh-wh, -0.9*sz-wb,  0.45*sx-ww, -dh+wh, -0.9*sz-wb,
            0.45*sx-ww, -dh+wh, -0.9*sz+wb,  0.45*sx-ww, -dh-wh, -0.9*sz+wb,
            0.45*sx+ww, -dh-wh, -0.9*sz-wb,  0.45*sx+ww, -dh+wh, -0.9*sz-wb,
            0.45*sx+ww, -dh+wh, -0.9*sz+wb,  0.45*sx+ww, -dh-wh, -0.9*sz+wb,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wheelPositions), gl.STATIC_DRAW);

        var wheelIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wheelIndexBuffer);
        var wheelIndices = [];
        for (var w = 0; w < 4; w++) {
            var base = w * 24;
            wheelIndices.push(
                base, base+1, base+2,  base, base+2, base+3,
                base+4, base+5, base+6,  base+4, base+6, base+7,
                base+8, base+9, base+10,  base+8, base+10, base+11,
                base+12, base+13, base+14,  base+12, base+14, base+15,
                base+16, base+17, base+18,  base+16, base+18, base+19,
                base+20, base+21, base+22,  base+20, base+22, base+23,
            );
        }
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wheelIndices), gl.STATIC_DRAW);

        var wheelTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, wheelTextureCoordBuffer);
        var wheelTextureCoordinates = [];
        for (var w = 0; w < 4; w++) {
            for (var f = 0; f < 6; f++) {
                wheelTextureCoordinates.push(0,0, 1,0, 1,1, 0,1);
            }
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wheelTextureCoordinates), gl.STATIC_DRAW);

        var wheelNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, wheelNormalBuffer);
        var wheelNormals = [];
        for (var w = 0; w < 4; w++) {
            wheelNormals.push(
                0,0,1, 0,0,1, 0,0,1, 0,0,1,
                0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
                0,1,0, 0,1,0, 0,1,0, 0,1,0,
                0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
                1,0,0, 1,0,0, 1,0,0, 1,0,0,
                -1,0,0, -1,0,0, -1,0,0, -1,0,0,
            );
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wheelNormals), gl.STATIC_DRAW);

        this.wheelBuffer = {
            position: this.wheelPositionBuffer,
            normal: wheelNormalBuffer,
            textureCoord: wheelTextureCoordBuffer,
            indices: wheelIndexBuffer,
        };
    }

    _bindAndDraw(gl, programInfo, buffer, count) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    }

    drawCube(gl, projectionMatrix, programInfo, deltaTime) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, this.pos);
        mat4.rotate(modelViewMatrix, modelViewMatrix, this.rotation, [0, 1, 0]);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, hoverboard_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // Draw deck
        this._bindAndDraw(gl, programInfo, this.deckBuffer, 36);
        // Draw wheels (4 wheels * 36 indices)
        this._bindAndDraw(gl, programInfo, this.wheelBuffer, 144);
    }
};
