import shadersInterpolation from './interpolation/shaders.interpolation';
import {MAX_STEP_COUNT} from "./shaders.data.fragment";


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
// TODO : this is almost the same as data.fragment
const int MAX_STEP_COUNT = ${MAX_STEP_COUNT};


vec4 quat_from_axis_angle(vec3 axis, float angle)
{ 
  float half_angle = angle * 0.5;
  float sin_half_angle = sin(half_angle);
  vec4 qr = vec4(axis * sin_half_angle, cos(half_angle));
  return qr;
}

vec4 quat_conj(vec4 q)
{ 
  return vec4(-q.x, -q.y, -q.z, q.w); 
}
  
vec4 quat_mult(vec4 q1, vec4 q2)
{ 
  vec4 qr;
  qr.x = (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y);
  qr.y = (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x);
  qr.z = (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w);
  qr.w = (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z);
  return qr;
}

vec3 rotate_vertex_position(vec3 position, vec3 axis, float angle)
{ 
  vec4 qr = quat_from_axis_angle(axis, angle);
  vec4 qr_conj = quat_conj(qr);
  vec4 q_pos = vec4(position, 0);
  
  vec4 q_tmp = quat_mult(qr, q_pos);
  qr = quat_mult(q_tmp, qr_conj);
  
  return qr.xyz;
}


vec4 getWorldCoordinates(out vec3 normal) {

  // float angle;
  // for (int i = 1; i < ${this._uniforms.uCurveTangentUpAngles.length}; ++i) {
  //   if (uCurveTangentUpAngles[i].x >= vUv.x) {
  //     angle = mix(uCurveTangentUpAngles[i - 1].y, uCurveTangentUpAngles[i].y, 
  //       (vUv.x - uCurveTangentUpAngles[i - 1].x) / (uCurveTangentUpAngles[i].x - uCurveTangentUpAngles[i - 1].x));
  //     break;
  //   }
  // }
  
  vec2 texturePos = vec2(vUv.x, 0.5);
  vec3 curvePos = texture2D(uCurveCoordinates, texturePos).xyz;
  vec3 tangent = texture2D(uCurveTangentVectors, texturePos).xyz;
  
  // TODO : use same quaternion for normal and up rotations
  
  normal = cross(tangent, uCurvePlaneNormal);
//  normal = rotate_vertex_position(normal, tangent, angle);
    
//  vec3 tangentUp = uCurvePlaneNormal; // rotate_vertex_position(uCurvePlaneNormal, tangent, angle);
//  vec3 up = -vPos.y * tangentUp;
  
  return vec4(curvePos.xy, -vPos.y, 1.0);
}
    
void main(void) {

  vec3 dataDim = vec3(float(uDataDimensions.x), float(uDataDimensions.y), float(uDataDimensions.z));
    
  vec3 normal;
  vec4 worldCoordinates = getWorldCoordinates(normal);
  vec4 dataCoordinates = uWorldToData * worldCoordinates;
  vec3 stepDirection = mat3(uWorldToData) * normal * uSliceThickness;

  vec3 currentVoxel = dataCoordinates.xyz - stepDirection * 0.5;
  vec4 dataValue = vec4(0.0);
  vec3 gradient = vec3(0.0);
  
  vec3 step = stepDirection / float(uSteps);
    
  vec3 cropStep = mat3(uCropMatrix) * uSliceNormal;
  vec3 currentCropPos = (uCropMatrix * worldCoordinates).xyz - cropStep * uSliceThickness * 0.5;
    
  float valueCount = 0.0;

  float intensity = 0.0;
  float maxIntensity = 0.0;

  for (int i = 1; i <= MAX_STEP_COUNT; ++i) {
  	
    if (all(greaterThanEqual(currentVoxel, vec3(0.0))) &&
        all(lessThan(currentVoxel, dataDim)) &&
        all(greaterThanEqual(currentCropPos, vec3(-0.5))) &&
        all(lessThanEqual(currentCropPos, vec3(0.5)))) {

      ${shadersInterpolation(this, 'currentVoxel', 'dataValue', 'gradient')}
      float increment = dataValue.r;
      
      if (increment > 0.0) {
        maxIntensity = max(maxIntensity, increment); 
        intensity += increment * increment;
        valueCount++;
      }
    }
    
    currentVoxel += step;
    currentCropPos += cropStep;
    
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
  if (uUnmultiplyAlpha) {
    dataValue.rgb /= dataValue.a;
  }

  gl_FragColor = dataValue;
}
   `;

  }

  compute(){

    let shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

    // language=GLSL
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
