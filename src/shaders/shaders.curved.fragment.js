import shadersInterpolation from './interpolation/shaders.interpolation';

export const CURVE_SEGMENTS = 2048;

export default class ShadersFragment {

  // pass uniforms object
  constructor( uniforms ){

    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';

  }

  functions(){

    if( this._main === ''){
      // if main is empty, functions can not have been computed
      this.main();

    }

    let content = '';
    for ( let property in this._functions ) {
    
      content  += this._functions[property] + '\n';
    
    }
    
    return content;

  }

  uniforms(){

    let content = '';
    for ( let property in this._uniforms ) {
      
      let uniform = this._uniforms[property];
      content += `uniform ${uniform.typeGLSL} ${property}`; 
      
      if( uniform && uniform.length ){
      
        content += `[${uniform.length}]`;
      
      }
      
      content += ';\n';
    
    }
    
    return content;

  }

  main(){
  
    // need to pre-call main to fill up the functions list
    this._main = `
vec4 getWorldCoordinates() {
  vec2 xy = texture2D(uCurveCoordinates, vec2(vUv.x, 0.5)).xy;
  return vec4(xy, vPos.z, 1.0);
}
    
void main(void) {

  vec4 dataCoordinates = uWorldToData * getWorldCoordinates();
  vec3 currentVoxel = dataCoordinates.xyz;
  vec4 dataValue = vec4(0.0);
  vec3 gradient = vec3(0.0);
  ${shadersInterpolation( this, 'currentVoxel', 'dataValue', 'gradient' )}

  // how do we deal wil more than 1 channel?
  if(uNumberOfChannels == 1){
    float intensity = dataValue.r;

    // rescale/slope
    intensity = intensity*uRescaleSlopeIntercept[0] + uRescaleSlopeIntercept[1];

    float windowMin = uWindowCenterWidth[0] - uWindowCenterWidth[1] * 0.5;
    float windowMax = uWindowCenterWidth[0] + uWindowCenterWidth[1] * 0.5;
    intensity = ( intensity - windowMin ) / uWindowCenterWidth[1];

    dataValue.r = dataValue.g = dataValue.b = intensity;
    dataValue.a = 1.0;
  }

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

}
   `;

  }

  compute(){

    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)
    
    return `
// uniforms
${this.uniforms()}

// varying (should fetch it from vertex directly)
varying vec4      vPos;
varying vec2 vUv;

// tailored functions
${this.functions()}

// main loop
${this._main}
      `;
    }

}