"use strict";
/// <reference path="webgl.d.ts" />

// Global shadow texture and geometry (created lazily)
var shadowTexture = null;
var shadowPositionBuffer = null;
var shadowTextureCoordBuffer = null;
var shadowNormalBuffer = null;
var shadowIndexBuffer = null;

function ensureShadowResources(gl) {
    if (shadowTexture) return;

    // 1x1 semi-transparent black pixel
    shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 120]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // Flat ellipse-like quad (scalable)
    shadowPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -0.5, 0,  0.3,
         0.5, 0,  0.3,
         0.5, 0, -0.3,
        -0.5, 0, -0.3,
    ]), gl.STATIC_DRAW);

    shadowTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shadowTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0,0, 1,0, 1,1, 0,1,
    ]), gl.STATIC_DRAW);

    shadowNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shadowNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
    ]), gl.STATIC_DRAW);

    shadowIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shadowIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
        0,1,2, 0,2,3,
    ]), gl.STATIC_DRAW);
}

// Draw a soft oval shadow below an object.
// sx and sz are the half-width and half-depth of the shadow.
function drawShadow(gl, projectionMatrix, programInfo, x, y, z, sx, sz) {
    ensureShadowResources(gl);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [x, y, z]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [sx * 2, 1, sz * 2]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPositionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowTextureCoordBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowNormalBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shadowIndexBuffer);

    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // Depth test should be controlled by caller (often disabled so shadow
    // overlays the ground plane, then re-enabled before drawing the object)

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.BLEND);
}
