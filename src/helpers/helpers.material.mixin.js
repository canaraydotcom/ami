/**
 * Helpers material mixin.
 *
 * @module helpers/material/mixin
 */

import * as THREE from "three";


let HelpersMaterialMixin = (superclass) => class extends superclass {

  _createMaterial(extraOptions) {
    // generate shaders on-demand!
    let fs = new this._shadersFragment(this._uniforms);
    let vs = new this._shadersVertex(this._uniforms);

    // material
    let globalOptions = {
      uniforms: this._uniforms,
      vertexShader: vs.compute(),
      fragmentShader: fs.compute(),
      // wireframe: true,
      // side: THREE.DoubleSide,
    };

    let options = Object.assign(extraOptions, globalOptions);
    this._material = new THREE.ShaderMaterial(options);
    this._material.needsUpdate = true;
  }

  _updateMaterial() {
    // generate shaders on-demand!
    let fs = new this._shadersFragment(this._uniforms);
    let vs = new this._shadersVertex();

    this._material.vertexShader = vs.compute();
    this._material.fragmentShader = fs.compute();

    this._material.needsUpdate = true;
  }

  _prepareTexture() {
    this._textures = this._stack.textures;
  }

};

export default HelpersMaterialMixin;
