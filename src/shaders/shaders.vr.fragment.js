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
    this._main = `
float readDepth () {
    vec2 coord = vec2(gl_FragCoord.x / uScreenWidth, gl_FragCoord.y / uScreenHeight);
    float fragCoordZ = texture2D(uTextureDepth, coord).x;
    
    return -perspectiveDepthToViewZ( fragCoordZ, uCameraNear, uCameraFar );
}

void getIntensity(in vec3 dataCoordinates, out float intensity, out vec3 gradient){

  vec4 dataValue = vec4(0., 0., 0., 0.);
  ${shadersInterpolation(this, 'dataCoordinates', 'dataValue', 'gradient')}

  intensity = dataValue.r;

  // rescale/slope
  intensity = intensity * uRescaleSlopeIntercept[0] + uRescaleSlopeIntercept[1];
  // window level
  float windowMin = uWindowCenterWidth[0] - uWindowCenterWidth[1] * 0.5;
  intensity = ( intensity - windowMin ) / uWindowCenterWidth[1];
}

void main(void) {

  const int maxIter = 256;
  const float minStepSize = 1.0;

  // the ray
  vec3 rayOrigin = cameraPosition;
  vec3 diff = vPos.xyz - rayOrigin;
  vec3 rayDirection = normalize(diff);

  // the Axe-Aligned B-Box
  vec3 AABBMin = vec3(uWorldBBox[0], uWorldBBox[2], uWorldBBox[4]);
  vec3 AABBMax = vec3(uWorldBBox[1], uWorldBBox[3], uWorldBBox[5]);

  // Intersection ray/bbox
  float tNear = length(diff);
  float tFar = readDepth();

  // init the ray marching
  float tStep = (tFar - tNear) / float(uSteps);
  tStep = max(minStepSize, tStep);
  vec4 accumulatedColor = vec4(0.0);
  float accumulatedAlpha = 0.0;

  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));

  vec3 rayStartPosition = rayOrigin + rayDirection * tNear;
  vec3 currentVoxel = vec3(uWorldToData * vec4(rayStartPosition, 1.0));

  vec3 stepVector = mat3(uWorldToData) * (rayDirection * tStep);

  float currentZ = tNear;
  
//  gl_FragColor.rgb = vec3((tFar - uCameraNear) / (uCameraFar - uCameraNear));
//  gl_FragColor.a = 1.0;
//  return;

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
    
    //vec3 currentPosition = rayOrigin + rayDirection * tCurrent;

    // some non-linear FUN
    // some occlusion issue to be fixed
    //vec3 transformedPosition = currentPosition; //transformPoint(currentPosition, uAmplitude, uFrequence);


    // world to data coordinates
    // rounding trick
    // first center of first voxel in data space is CENTERED on (0,0,0)
    // vec4 dataCoordinatesRaw = uWorldToData * vec4(transformedPosition, 1.0);
    // vec3 currentVoxel = vec3(uWorldToData * vec4(transformedPosition, 1.0));

    if ( all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
         all(lessThan(currentVoxel, dataDim))) {
      // mapped intensity, given slope/intercept and window/level
      float intensity = 0.0;
      vec3 gradient = vec3(0., 0., 0.);
      getIntensity(currentVoxel, intensity, gradient);

      vec4 colorSample;
      float alphaSample;
      if(uLut == 1){
        vec4 colorFromLUT = texture2D( uTextureLUT, vec2( intensity, 1.0) );
        // 256 colors
        colorSample = colorFromLUT;
        alphaSample = colorFromLUT.a;
      }
      else{
        alphaSample = intensity * intensity;
        colorSample.r = colorSample.g = colorSample.b = intensity;
      }

      alphaSample *= uAlphaCorrection;
      alphaSample *= (1.0 - accumulatedAlpha);

      accumulatedColor += alphaSample * colorSample;
      accumulatedAlpha += alphaSample;

    }

    currentVoxel += stepVector;
    currentZ += tStep;

    if (currentZ >= tFar || lastStep || rayStep >= uSteps || accumulatedAlpha >= 0.999 ) {
      break;
    }
  }

  gl_FragColor = vec4(accumulatedColor.xyz, accumulatedAlpha);
}
   `;
  }

  compute() {
    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

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
