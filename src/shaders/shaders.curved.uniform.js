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
      'uCurveTangentUpAngles': {
        type: 'v2v',
        value: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 0),
        ],
        length: 8,
        typeGLSL: 'vec2',
      },
      'uCurveTangentVectors': {
				type: 't',
				value: [],
				typeGLSL: 'sampler2D',
      },
      'uCurvePlaneNormal': {
        type: 'v3',
        value: new THREE.Vector3(0, 0, 1),
        typeGLSL: 'vec3',
      }
    };
    delete us.uStep;

    return us;
  }
}