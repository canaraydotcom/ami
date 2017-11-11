export default class ShadersVertex {

    constructor() {

    }

    compute() {
        // language=GLSL
        return `
uniform mat4 uVertexOnlyTransform;
uniform mat4 uWorldToData;
uniform float uSliceThickness;
uniform vec3 uSliceNormal;
        
varying vec3 vStartVoxel;

//
// main
//
void main() {
  vec4 dataCoordinates = uWorldToData * modelMatrix * vec4(position, 1.0 );
  vStartVoxel = dataCoordinates.xyz - uSliceNormal * uSliceThickness * 0.5;

  gl_Position = projectionMatrix * modelViewMatrix * uVertexOnlyTransform * vec4(position, 1.0 );

}
        `;
    }

}
