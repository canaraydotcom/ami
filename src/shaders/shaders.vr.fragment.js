import shadersInterpolation from './interpolation/shaders.interpolation';
import shadersIntersectBox from './helpers/shaders.helpers.intersectBox';

export const MAX_RAY_STEPS = 1024;

export default class ShadersFragment {

  // pass uniforms object
  constructor(uniforms) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  functions() {
    if (this._main === '') {
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

      if (uniform && uniform.length) {
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

float readDepth () {
    vec2 coord = vec2(
      (gl_FragCoord.x + uScreenOffsetX) / uScreenWidth, 
      (gl_FragCoord.y + uScreenOffsetY) / uScreenHeight
    );
    float fragCoordZ = texture2D(uTextureDepth, coord).x;
    
    return -perspectiveDepthToViewZ( fragCoordZ, uCameraNear, uCameraFar );
}

void getIntensity(in vec3 dataCoordinates, out float intensity, out vec3 gradient){

  vec4 dataValue = vec4(0., 0., 0., 0.);
  ${shadersInterpolation(this, 'dataCoordinates', 'dataValue', 'gradient')}

  intensity = dataValue.r;

  intensity = ( intensity - uWindowMinWidth[0] ) / uWindowMinWidth[1];
  intensity = clamp(intensity, 0.0, 1.0);
}

const int maxIter = ${MAX_RAY_STEPS};

void main(void) {

  // the ray
  vec3 rayStartPosition = vPos.xyz;
  vec3 rayOrigin = cameraPosition;
  vec3 diff = rayStartPosition - rayOrigin;

  // Intersection ray/bbox
  float tNear = length(diff);
  float tFar = readDepth();

  vec3 rayDirection = diff / tNear;

  // init the ray marching
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;
  float nextAlpha = 1.0;
  
  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));

  vec3 currentVoxel = vec3(uWorldToData * vec4(rayStartPosition, 1.0));

  vec3 stepVector = mat3(uWorldToData) * (rayDirection * uStepSize);

  float currentZ = tNear;
  
  if (currentZ >= tFar) {
    gl_FragColor.a = 0.0;
    return;
  }
  
  for (int rayStep = 0; rayStep < maxIter; rayStep++) {
//    if (currentZ >= tFar) {
//      currentVoxel -= stepVector * (currentZ - tFar);
//    }
    
//    if ( all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
//         all(lessThan(currentVoxel, dataDim))) {

    float intensity = 0.0;
    vec3 gradient = vec3(0.0);
    getIntensity(currentVoxel, intensity, gradient);

    vec4 colorFromLUT = texture2D( uTextureLUT, vec2( intensity, 0.5) );

    vec3 colorSample = colorFromLUT.rgb;
    float alphaSample = colorFromLUT.a;
    // TODO : make the alpha LUT quadratic instead.
    alphaSample *= alphaSample;

    // TODO : use the last sampled value with linear interpolation to get less jagged results?
    float alpha = nextAlpha * alphaSample * 
        (uCorrectionCoefs[0] - 
         (uCorrectionCoefs[1] - 
          (uCorrectionCoefs[2] + uCorrectionCoefs[3] * alphaSample) * alphaSample) * alphaSample);
     
   
    accumulatedColor += alpha * colorSample;

    accumulatedAlpha += alpha;
    
    nextAlpha *= (1.0 - alphaSample);

//    }

    currentVoxel += stepVector;
    currentZ += uStepSize;
    

    if (currentZ >= tFar || rayStep >= uSteps || accumulatedAlpha >= 1.0 ) {
      break;
    }
  }

  gl_FragColor = vec4(accumulatedColor, accumulatedAlpha);
}
   `;
  }

  compute() {
    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

    // language=GLSL
    return `
#include <packing>
    
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
