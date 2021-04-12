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

float readDepth() {
    vec2 coord = vec2(
      gl_FragCoord.x / uScreenWidth,
      gl_FragCoord.y / uScreenHeight
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
  vec3 rayOrigin = cameraPosition;
  vec3 diff = vPos.xyz - rayOrigin;

  // Intersection ray/bbox
  float tNear = length(diff);
  float tFar = readDepth();

  vec3 rayDirection = diff / tNear;

  // init the ray marching
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;
  float nextAlpha = 1.0;

  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));

  vec3 step = rayDirection * uStepSize;

  vec3 currentVoxel = (uWorldToData * vPos).xyz;
  vec3 stepVector = mat3(uWorldToData) * step;

  vec3 currentCropPos = (uCropMatrix * vPos).xyz;
  vec3 cropStepVector = mat3(uCropMatrix) * step;

  float currentZ = tNear;

  if (currentZ >= tFar) {
    gl_FragColor.a = 0.0;
    return;
  }

  float randomOffset = gold_noise(gl_FragCoord.xy, uSeed);
  currentVoxel += stepVector * randomOffset;
  currentZ += uStepSize * randomOffset;

  bool wasInside = false;

  for (int rayStep = 0; rayStep < maxIter; rayStep++) {

    if ( all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
         all(lessThan(currentVoxel, dataDim)) &&
         all(greaterThanEqual(currentCropPos, vec3(-0.5))) &&
         all(lessThanEqual(currentCropPos, vec3(0.5)))
       ) {

      wasInside = true;

      float intensity = 0.0;
      vec3 gradient = vec3(0.0);
      getIntensity(currentVoxel, intensity, gradient);
        
      if (intensity >= uIsoThreshold) {
        // TODO : refinement step(s)
        vec4 colorFromLUT = texture2D( uTextureLUT, vec2( intensity, 0.5) );
        accumulatedColor = colorFromLUT.rgb;
        accumulatedAlpha = 1.0;
          
        float lambert = clamp(normalize(gradient).z, 0.0, 1.0);
        accumulatedColor *= lambert;
          
        // TODO : lighting with surface normal
        break;
      }

    } else if (wasInside) {
      break;
    }

    currentVoxel += stepVector;
    currentZ += uStepSize;

    currentCropPos += cropStepVector;

    if (currentZ >= tFar || rayStep >= uSteps || accumulatedAlpha >= 1.0) {
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
