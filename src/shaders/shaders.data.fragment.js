import shadersInterpolation from './interpolation/shaders.interpolation';

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
const int MAX_STEP_COUNT = 10;

const float stepWeight = 1.0 / float(MAX_STEP_COUNT);

void main(void) {
  // TODO : do this in the vertex shader or compute it as uniforms?
  float stepSize = uSliceThickness / float(MAX_STEP_COUNT);
  vec3 step = uSliceNormal * stepSize;

  // get texture coordinates of current pixel
  // TODO : this should be possible in the vertex shader
  vec4 dataCoordinates = uWorldToData * vPos;
  
  vec3 currentVoxel = dataCoordinates.xyz - uSliceNormal * uSliceThickness * 0.5;
  vec4 dataValue = vec4(0.0);
  vec3 gradient = vec3(0.0);
  float intensity = 0.0;
  for (int i = 0; i < MAX_STEP_COUNT; ++i) {
    ${shadersInterpolation(this, 'currentVoxel', 'dataValue', 'gradient')}  
    intensity += dataValue.r;
    currentVoxel += step;
  }
  
  intensity *= stepWeight;

// TODO : this can probably removed since it can easily be implemented by the LUT. If this is part of the volume file it should better be applied once on the image data.
//  how do we deal with more than 1 channel?
//  if(uNumberOfChannels == 1){

    // rescale/slope
    intensity = intensity*uRescaleSlopeIntercept[0] + uRescaleSlopeIntercept[1];

    float windowMin = uWindowCenterWidth[0] - uWindowCenterWidth[1] * 0.5;
    float windowMax = uWindowCenterWidth[0] + uWindowCenterWidth[1] * 0.5;
    intensity = ( intensity - windowMin ) / uWindowCenterWidth[1];

    dataValue.r = dataValue.g = dataValue.b = intensity;
    dataValue.a = 1.0;
//  }

  // Apply LUT table...
  //
  if(uLut == 1){
    // should opacity be grabbed there?
    dataValue = texture2D( uTextureLUT, vec2( dataValue.r , 1.0) );
  }

  if(uInvert == 1){
    dataValue = vec4(1.) - dataValue;
    // how do we deal with that and opacity?
    dataValue.a = 1.;
  }

  gl_FragColor = dataValue;

    // if on edge, draw line
  // float xPos = gl_FragCoord.x/512.;
  // float yPos = gl_FragCoord.y/512.;
  // if( xPos < 0.05 || xPos > .95 || yPos < 0.05 || yPos > .95){
  //   gl_FragColor = vec4(xPos, yPos, 0., 1.);//dataValue;
  //   //return;
  // }

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
