export default class ShadersVertex {

    constructor() {

    }

    compute() {
        return `
uniform mat4 uVertexOnlyTransform;
        
varying vec4 vPos;

//
// main
//
void main() {
    // TODO : inverse plane matrix
  vPos = modelMatrix * vec4(position, 1.0 );
  gl_Position = projectionMatrix * modelViewMatrix * uVertexOnlyTransform * vec4(position, 1.0 );

}
        `;
    }

}
