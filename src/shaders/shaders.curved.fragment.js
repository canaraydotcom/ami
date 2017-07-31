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
    // language=GLSL
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

  float intensity = dataValue.r;

  intensity = ( intensity - uWindowMinWidth[0] ) / uWindowMinWidth[1];
  intensity = clamp(intensity, 0.0, 1.0);

  // Apply LUT table...
  // should opacity be grabbed there?
  dataValue = texture2D( uTextureLUT, vec2( intensity , 0.5) );

  if(uInvert == 1){
    dataValue = vec4(1.) - dataValue;
    // how do we deal with that and opacity?
    dataValue.a = 1.0;
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