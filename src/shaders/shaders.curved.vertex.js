export default class ShadersVertex {

  constructor() {

  }

  compute() {
    // language=GLSL
    return `
varying vec4 vPos;
varying vec2 vUv;

//
// main
//
void main() {

  vUv = uv;
  vPos = modelMatrix * vec4(position, 1.0 );
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );

}
`;
  }

}
