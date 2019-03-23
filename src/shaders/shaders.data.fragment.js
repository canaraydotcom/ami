import shadersInterpolation from './interpolation/shaders.interpolation';

export const MAX_STEP_COUNT = 512;

export default class ShadersFragment {

  // pass uniforms object
  constructor(uniforms) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  functions() {
    if(this._main === '') {
      // if main is empty, functions can not have been computed
      this.main();
    }

    let content = '';
    for (let property in this._functions) {
      content += this._functions[property] + '\n';
    }

    return content;
  }

  uniforms() {
    let content = '';
    for (let property in this._uniforms) {
      let uniform = this._uniforms[property];
      content += `uniform ${uniform.typeGLSL} ${property}`;

      if(uniform && uniform.length) {
        content += `[${uniform.length}]`;
      }

      content += ';\n';
    }

    return content;
  }

  main() {
    // need to pre-call main to fill up the functions list
    // language=GLSL
    this._main = `
const int MAX_STEP_COUNT = ${MAX_STEP_COUNT};
varying vec3 vStartVoxel;

void main(void) {
  
  // get texture coordinates of current pixel
  vec3 currentVoxel = vStartVoxel;
  
  vec4 dataValue = vec4(0.0);
  vec3 gradient = vec3(0.0);
  
  float intensity = 0.0;
  for (int i = 1; i <= MAX_STEP_COUNT; ++i) {
    ${shadersInterpolation(this, 'currentVoxel', 'dataValue', 'gradient')}  
    intensity += dataValue.r;
    currentVoxel += uStep;
    
    if (i >= uSteps) {
      break;
    }
  }
  
  intensity /= float(uSteps);

  intensity = ( intensity - uWindowMinWidth[0] ) / uWindowMinWidth[1];
  intensity = clamp(intensity, 0.0, 1.0);

  // Apply LUT table...
  // should opacity be grabbed there?

  dataValue = texture2D( uTextureLUT, vec2( intensity , 0.5) );

  dataValue.a = dot(dataValue.rgb, vec3(0.299, 0.587, 0.114));
  dataValue.rgb /= dataValue.a;

  if(uInvert == 1){
    dataValue = vec4(1.0) - dataValue;
    // how do we deal with that and opacity?
    dataValue.a = 1.0;
  }

  dataValue.a *= uOpacity;
  
  gl_FragColor = dataValue;
}
   `;
  }

  compute() {
    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

    // language=GLSL
    return `
// uniforms
${this.uniforms()}

// varying (should fetch it from vertex directly)
varying vec4      vPos;

// tailored functions
${this.functions()}

// main loop
${this._main}
      `;
    }

}
