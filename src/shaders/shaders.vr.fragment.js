import shadersInterpolation from './interpolation/shaders.interpolation';
import shadersIntersectBox from './helpers/shaders.helpers.intersectBox';

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

void main(void) {

  const int maxIter = 256;
  const float minStepSize = 1.0;

  // the ray
  vec3 rayOrigin = cameraPosition;
  vec3 diff = vPos.xyz - rayOrigin;
  vec3 rayDirection = normalize(diff);

  // Intersection ray/bbox
  float tNear = length(diff);
  float tFar = readDepth();

  // init the ray marching
  float tStep = (tFar - tNear) / float(uSteps);
  tStep = max(minStepSize, tStep);
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;

  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));

  vec3 rayStartPosition = rayOrigin + rayDirection * tNear;
  vec3 currentVoxel = vec3(uWorldToData * vec4(rayStartPosition, 1.0));

  vec3 stepVector = mat3(uWorldToData) * (rayDirection * tStep);

  float currentZ = tNear;
  
  if (currentZ >= tFar) {
    gl_FragColor.a = 0.0;
    return;
  }

  bool lastStep = false;
  for (int rayStep = 0; rayStep < maxIter; rayStep++) {
    if (currentZ >= tFar) {
      lastStep = true;
      currentVoxel -= stepVector * (currentZ - tFar);
    }
    
    if ( all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
         all(lessThan(currentVoxel, dataDim))) {

      float intensity = 0.0;
      vec3 gradient = vec3(0.0);
      getIntensity(currentVoxel, intensity, gradient);

      vec4 colorFromLUT = texture2D( uTextureLUT, vec2( intensity, 1.0) );

      vec3 colorSample = colorFromLUT.rgb;
      float alphaSample = colorFromLUT.a;

   //   alphaSample *= uAlphaCorrection;
      alphaSample *= (1.0 - accumulatedAlpha);

      accumulatedColor *= accumulatedAlpha;
      accumulatedColor += alphaSample * colorSample;
      accumulatedAlpha += alphaSample;

    }

    currentVoxel += stepVector;
    currentZ += tStep;

    if (currentZ >= tFar || lastStep || rayStep >= uSteps || accumulatedAlpha >= 0.999 ) {
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
