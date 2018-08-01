import * as THREE from 'three';
import DataShadersUniform from './shaders.data.uniform';

/**
 * @module shaders/data
 */
export default class ShadersUniform {
  static uniforms(){
    const us = {
      ...DataShadersUniform.uniforms(),

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
    delete us.uStep;

    return us;
  }
}