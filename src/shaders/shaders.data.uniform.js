
/**
 * @module shaders/data
 */

import * as THREE from "three";

export default class ShadersUniform {
  /**
   * Shaders data uniforms
   */
  static uniforms() {
    return {
      'uSliceNormal': {
        type: 'v3',
        value: [0, 0, 1],
        typeGLSL: 'vec3',
      },
      'uSliceThickness': {
        type: 'f',
        value: 0.5,
        typeGLSL: 'float',
      },
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
      'uVertexOnlyTransform': {
        type: 'm4',
        value: new THREE.Matrix4(),
        typeGLSL: 'mat4',
      },
      'uWindowMinWidth': {
        type: 'fv1',
        value: [0.0, 0.0],
        typeGLSL: 'float',
        length: 2,
      },
      'uBitsAllocated': {
        type: 'i',
        value: 8,
        typeGLSL: 'int',
      },
      'uLut': {
        type: 'i',
        value: 0,
        typeGLSL: 'int',
      },
      'uTextureLUT': {
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
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
      'uCanvasWidth': {
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
      'uCanvasHeight': {
        type: 'f',
        value: 0.,
        typeGLSL: 'float',
      },
			'uSteps': {
				type: 'i',
				value: 256,
				typeGLSL: 'int',
			},
			'uStep': {
				type: 'v3',
				value: [1, 0, 0],
				typeGLSL: 'vec3',
			},
      'uOpacity': {
        type: 'f',
        value: 1.,
        typeGLSL: 'float',
      }
    };
  }
}
