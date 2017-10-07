import * as THREE from "three";

/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms() {
    return {
      'uTextureSize': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureContainer': {
        type: 'tv',
        value: [],
        typeGLSL: 'sampler2D',
        length: 7,
      },
      'uDataDimensions': {
        type: 'iv',
        value: [0, 0, 0],
        typeGLSL: 'ivec3',
      },
      'uWorldToData': {
        type: 'm4',
        value: new THREE.Matrix4(),
        typeGLSL: 'mat4',
      },
      'uWindowMinWidth': {
        type: 'fv1',
        value: [0.0, Math.pow(2, 16) - 1],
        typeGLSL: 'float',
        length: 2,
      },
      'uBitsAllocated': {
        type: 'i',
        value: 8,
        typeGLSL: 'int',
      },
      'uInvert': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureLUT': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uTextureDepth': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D'
      },
      'uCameraNear': {
        type: 'f',
        value: 0.0,
        typeGLSL: 'float'
      },
      'uCameraFar': {
        type: 'f',
        value: 0.0,
        typeGLSL: 'float'
      },
      'uPixelType': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uPackedPerPixel': {
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uInterpolation': {
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uWorldBBox': {
        type: 'fv1',
        value: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        typeGLSL: 'float',
        length: 6,
      },
      'uSteps': {
        type: 'i',
        value: 256,
        typeGLSL: 'int',
      },
      'uStepSize': {
        type: 'f',
        value: 1,
        typeGLSL: 'float',
      },
      'uAlphaCorrection': {
        type: 'i',
        value: 1,
        typeGLSL: 'int',
      },
      'uCorrectionCoefs': {
        type: 'v4',
        value: [1.0, 0.0, 0.0, 0.0],
        typeGLSL: 'vec4',
      },
      'uScreenWidth': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uScreenHeight': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float',
      },
      'uScreenOffsetX': {
        type: 'f',
        value: 0.0,
        typeGLSL: 'float',
      },
      'uScreenOffsetY': {
        type: 'f',
        value: 0.0,
        typeGLSL: 'float',
      },
    };
  }
}
