/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms(){
    return {
      'uTextureSize': {
        type: 'i',
        value: 0,
        typeGLSL: 'int'
      },
      'uTextureContainer': {
        type: 'tv',
        value: [],
        typeGLSL: 'sampler2D',
        length: 7
      },
      'uDataDimensions': {
        type: 'iv',
        value: [0, 0, 0],
        typeGLSL: 'ivec3'
      },
      'uWorldToData': {
        type: 'm4',
        value: new THREE.Matrix4(),
        typeGLSL: 'mat4'
      },
      'uWindowMinWidth': {
        type: 'fv1',
        value: [0.0, 0.0],
        typeGLSL: 'float',
        length: 2
      },
      'uBitsAllocated': {
        type: 'i',
        value: 8,
        typeGLSL: 'int'
      },
      'uInvert': {
        type: 'i',
        value: 0,
        typeGLSL: 'int'
      },
      'uLut': {
        type: 'i',
        value: 0,
        typeGLSL: 'int'
      },
      'uTextureLUT':{
        type: 't',
        value: [],
        typeGLSL: 'sampler2D'
      },
      'uPixelType': {
        type: 'i',
        value: 0,
        typeGLSL: 'int'
      },
      'uPackedPerPixel': {
        type: 'i',
        value: 1,
        typeGLSL: 'int'
      },
      'uInterpolation': {
        type: 'i',
        value: 1,
        typeGLSL: 'int'
      },
      'uCurveCoordinates':{
        type: 't',
        value: [],
        typeGLSL: 'sampler2D',
      },
      'uCurveLength': {
        type: 'f',
        value: 1.0,
        typeGLSL: 'float'
      },
    };
  }
}