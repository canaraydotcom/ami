import shadersInterpolation from './interpolation/shaders.interpolation';


export const MAX_STEP_COUNT = 512;

export const VARYING = `
varying vec3 vStartVoxel;
varying vec3 vStep;
varying vec3 vStartCropPos;
varying vec3 vCropStep;
`;

export default class ShadersFragment {

  // pass uniforms object
  constructor( uniforms ) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  functions() {
    if ( this._main === '' ) {
      // if main is empty, functions can not have been computed
      this.main();
    }

    let content = '';
    for ( let property in this._functions ) {
      content += this._functions[ property ] + '\n';
    }

    return content;
  }

  uniforms() {
    let content = '';
    for ( let property in this._uniforms ) {
      let uniform = this._uniforms[ property ];
      content += `uniform ${ uniform.typeGLSL } ${ property }`;

      if ( uniform && uniform.length ) {
        content += `[${ uniform.length }]`;
      }

      content += ';\n';
    }

    return content;
  }

  main() {
    // need to pre-call main to fill up the functions list
    // language=GLSL
    this._main = `
const int MAX_STEP_COUNT = ${ MAX_STEP_COUNT };

void main(void) {

  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));
  
  // get texture coordinates of current pixel
  vec3 currentVoxel = vStartVoxel;
  vec3 currentCropPos = vStartCropPos;
  
  vec4 dataValue = vec4(0.0);
  vec3 gradient = vec3(0.0);
  
  float valueCount = 0.0;
  
  float intensity = 0.0;
  float maxIntensity = 0.0;
  
  for (int i = 1; i <= MAX_STEP_COUNT; ++i) {
    
    if (all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
        all(lessThan(currentVoxel, dataDim)) && 
        all(greaterThanEqual(currentCropPos, vec3(-0.5))) &&
        all(lessThanEqual(currentCropPos, vec3(0.5)))) {
        
      ${ shadersInterpolation( this, 'currentVoxel', 'dataValue', 'gradient' ) }  
      float increment = dataValue.r;
      
      if (increment > 0.0) {
        maxIntensity = max(maxIntensity, increment); 
        intensity += increment * increment;
        valueCount++;
      }
    }
    
    currentVoxel += vStep;
    currentCropPos += vCropStep;
    
    if (i >= uSteps) {
      break;
    }
  }
  
  intensity /= valueCount;
  intensity = sqrt(intensity);
  intensity = mix(intensity, maxIntensity, uMaxFactor);

  intensity = ( intensity - uWindowMinWidth[0] ) / uWindowMinWidth[1];
  intensity = clamp(intensity, 0.0, 1.0);

  // Apply LUT table...
  // should opacity be grabbed there?
  dataValue = texture2D( uTextureLUT, vec2( intensity , 0.5) );

  dataValue.a = dot(dataValue.rgb, vec3(0.299, 0.587, 0.114));
  dataValue.rgb /= dataValue.a;

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
${ this.uniforms() }

${ VARYING }

// tailored functions
${ this.functions() }

// main loop
${ this._main }
      `;
  }

}
