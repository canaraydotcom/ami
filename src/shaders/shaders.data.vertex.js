import ShadersFragment, {VARYING} from './shaders.data.fragment';

export default class ShadersVertex {

    constructor(uniforms) {
        this._uniforms = uniforms;
    }

    uniforms() {
        return ShadersFragment.prototype.uniforms.apply(this);
    }

    compute() {
        // language=GLSL
        return `
${this.uniforms()}
        
${VARYING}

//
// main
//
void main() { 
  vec4 worldCoordinates = modelMatrix * vec4(position, 1.0 );
  vec4 dataCoordinates = uWorldToData * worldCoordinates;
  
  vec3 stepDirection = mat3(uWorldToData) * uSliceNormal;
  vStartVoxel = dataCoordinates.xyz - stepDirection * uSliceThickness * 0.5;
  
  // TODO : this can be uniform. Actually most varying variables could be
  float stepSize = uSliceThickness / float(uSteps);
  
  vStep = stepDirection * stepSize;
    
  vStartCropPos = (uCropMatrix * worldCoordinates).xyz;
  vCropStep = mat3(uCropMatrix) * uSliceNormal * stepSize;

  gl_Position = projectionMatrix * modelViewMatrix * uVertexOnlyTransform * vec4(position, 1.0 );

}
        `;
    }

}

