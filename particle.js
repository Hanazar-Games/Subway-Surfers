"use strict";
/// <reference path="webgl.d.ts" />

// Simple billboard particle (small golden square)
let Particle = class {
    constructor(gl, pos, velocity, life, texture) {
        this.pos = pos.slice();
        this.velocity = velocity.slice();
        this.life = life;
        this.maxLife = life;
        this.size = 0.15 + Math.random() * 0.1;
        this.texture = texture || particle_texture;

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        var s = this.size / 2;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -s, -s, 0,   s, -s, 0,   s, s, 0,  -s, s, 0,
        ]), gl.STATIC_DRAW);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
            0,1,2, 0,2,3,
        ]), gl.STATIC_DRAW);

        var textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0,0, 1,0, 1,1, 0,1,
        ]), gl.STATIC_DRAW);

        var normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0,0,1, 0,0,1, 0,0,1, 0,0,1,
        ]), gl.STATIC_DRAW);

        this.buffer = {
            position: this.positionBuffer,
            normal: normalBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
        };
    }

    update(deltaTime) {
        this.pos[0] += this.velocity[0] * deltaTime;
        this.pos[1] += this.velocity[1] * deltaTime;
        this.pos[2] += this.velocity[2] * deltaTime;
        this.velocity[1] -= 2.0 * deltaTime; // gravity
        // air resistance / drag
        this.velocity[0] *= 0.98;
        this.velocity[1] *= 0.98;
        this.velocity[2] *= 0.98;
        this.life -= deltaTime;
    }

    drawCube(gl, projectionMatrix, programInfo, deltaTime) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, this.pos);

        // Face camera by cancelling rotation (billboard)
        // We use the view matrix inverse rotation - simplified: no rotate
        // Since camera looks mostly down -Z with small Y tilt, plain quads read fine

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);

        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture || particle_texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        gl.disable(gl.BLEND);
    }
};
