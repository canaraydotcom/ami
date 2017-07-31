/*** Imports ***/
import ShadersUniform  from '../../src/shaders/shaders.curved.uniform';
import ShadersVertex   from '../../src/shaders/shaders.curved.vertex';
import ShadersFragment, {CURVE_SEGMENTS} from '../../src/shaders/shaders.curved.fragment';

import HelpersMaterialMixin from '../../src/helpers/helpers.material.mixin';

/**
 * @module helpers/curved
 */

export default class HelpersCurved extends HelpersMaterialMixin( THREE.Object3D ){
  constructor(stack, curve, index = 0) {
    //
    super();

    // private vars
    this._stack = stack;

    // image settings
    // index only used to grab window/level and intercept/slope
    this._invert = this._stack.invert;

    this._lut = 'none';
    this._lutTexture = null;
    // if auto === true, get from index
    // else from stack which holds the default values
    this._intensityAuto = true;
    this._interpolation = 1; // default to trilinear interpolation
    // starts at 0
    this._index = index;
    this._windowWidth = null;
    this._windowMin = null;
    this._rescaleSlope = null;
    this._rescaleIntercept = null;
    this._curve = curve;

    // Object3D settings

    // change aaBBSpace changes the box dimensions
    // also changes the transform
    // there is also a switch to move back mesh to LPS space automatically
    this._material = null;
    this._textures = [];
    this._shadersFragment = ShadersFragment;
    this._shadersVertex = ShadersVertex;
    this._uniforms = ShadersUniform.uniforms();
    this._geometry = null;
    this._mesh = null;
    this._visible = true;

    // update dimensions, center, etc.
    // depending on aaBBSpace
    this._init();

    // update object
    this._create();
  }

  // getters/setters

  get stack() {
    return this._stack;
  }

  set stack(stack) {
    this._stack = stack;
  }

  get windowWidth() {
    return this._windowWidth;
  }

  set windowWidth(windowWidth) {
    this._windowWidth = windowWidth;
    this.updateIntensitySettingsUniforms();
  }

  get windowMin() {
    return this._windowMin;
  }

  set windowMin(windowMin) {
    this._windowMin = windowMin;
    this.updateIntensitySettingsUniforms();
  }

  get rescaleSlope() {
    return this._rescaleSlope;
  }

  set rescaleSlope(rescaleSlope) {
    this._rescaleSlope = rescaleSlope;
    this.updateIntensitySettingsUniforms();
  }

  get rescaleIntercept() {
    return this._rescaleIntercept;
  }

  set rescaleIntercept(rescaleIntercept) {
    this._rescaleIntercept = rescaleIntercept;
    this.updateIntensitySettingsUniforms();
  }

  get curve() {
    return this._curve;
  }

  set curve(curve) {
    this._curve = curve;
    this._update();
  }

  get invert() {
    return this._invert;
  }

  set invert(invert) {
    this._invert = invert;
    this.updateIntensitySettingsUniforms();
  }

  get lut() {
    return this._lut;
  }

  set lut(lut) {
    this._lut = lut;
  }

  get lutTexture() {
    return this._lutTexture;
  }

  set lutTexture(lutTexture) {
    this._lutTexture = lutTexture;
    this.updateIntensitySettingsUniforms();
  }

  get intensityAuto() {
    return this._intensityAuto;
  }

  set intensityAuto(intensityAuto) {
    this._intensityAuto = intensityAuto;
    this.updateIntensitySettings();
    this.updateIntensitySettingsUniforms();
  }

  get interpolation() {
    return this._interpolation;
  }

  set interpolation(interpolation) {
    this._interpolation = interpolation;
    this.updateIntensitySettingsUniforms();
    this._updateMaterial();
  }

  get index() {
    return this._index;
  }

  set index(index) {
    this._index = index;
    this._update();
  }

  set halfDimensions(halfDimensions) {
    this._halfDimensions = halfDimensions;
  }

  get halfDimensions() {
    return this._halfDimensions;
  }

  set center(center) {
    this._center = center;
  }

  get center() {
    return this._center;
  }

  set mesh(mesh) {
    this._mesh = mesh;
  }

  get mesh() {
    return this._mesh;
  }

  set geometry(geometry) {
    this._geometry = geometry;
  }

  get geometry() {
    return this._geometry;
  }

  _init() {
    if (!this._stack || !this._stack._prepared || !this._stack._packed) {
      return;
    }

    this._halfDimensions = this._stack.halfDimensionsIJK;
    this._center = new THREE.Vector3(
      this._stack.halfDimensionsIJK.x - 0.5,
      this._stack.halfDimensionsIJK.y - 0.5,
      this._stack.halfDimensionsIJK.z - 0.5);
    this._toAABB = new THREE.Matrix4();
  }

  // private methods
  _create() {

    if (!this._stack || !this._stack.prepared || !this._stack.packed) {
      return;
    }

    // Convenience vars
    try {
      this._geometry = new THREE.PlaneGeometry(this._curve.getLength(), this._stack.worldBoundingBox()[2]);
    }
    catch (e) {
      window.console.log(e);
      window.console.log('invalid geometry - exiting...');
      return;
    }

    if (!this._geometry.vertices) {
      return;
    }

    if (!this._material) {
      //
      this._uniforms.uTextureSize.value     = this._stack.textureSize;
      this._uniforms.uDataDimensions.value  = [ this._stack.dimensionsIJK.x,
                                                this._stack.dimensionsIJK.y,
                                                this._stack.dimensionsIJK.z ];
      this._uniforms.uWorldToData.value      = this._stack.lps2IJK;
      this._uniforms.uPixelType.value        = this._stack.pixelType;
      this._uniforms.uBitsAllocated.value    = this._stack.bitsAllocated;
      this._uniforms.uPackedPerPixel.value   = this._stack.packedPerPixel;

      // compute texture if material exist
      this._prepareTexture();
      this._uniforms.uTextureContainer.value = this._textures;

      this._createMaterial({
        side: THREE.DoubleSide
      });

    }

    this.updateCurveUniforms();

    // update intensity related stuff
    this.updateIntensitySettings();
    this.updateIntensitySettingsUniforms();

    // create the mesh!
    this._mesh = new THREE.Mesh(this._geometry, this._material);
    this._mesh.rotation.x = 90;

    this._mesh.visible = this._visible;

    // and add it!
    this.add(this._mesh);
  }

  updateIntensitySettings() {
    // if auto, get from frame index
    if (this._intensityAuto) {
      this.updateIntensitySetting('windowMin');
      this.updateIntensitySetting('windowWidth');
      this.updateIntensitySetting('rescaleSlope');
      this.updateIntensitySetting('rescaleIntercept');
    } else {
      if (this._windowMin === null) {
        this._windowMin = this._stack.windowMin;
      }

      if (this.__windowWidth === null) {
        this._windowWidth = this._stack.windowWidth;
      }

      if (this._rescaleSlope === null) {
        this._rescaleSlope = this._stack.rescaleSlope;
      }

      if (this._rescaleIntercept === null) {
        this._rescaleIntercept = this._stack.rescaleIntercept;
      }
    }

  }

  updateIntensitySettingsUniforms() {
    // set slice window center and width
    this._uniforms.uWindowMinWidth.value = [this._windowMin, this._windowWidth];

    // invert
    this._uniforms.uInvert.value = this._invert === true ? 1 : 0;

    // interpolation
    this._uniforms.uInterpolation.value = this._interpolation;

    // lut
    if (this._lut === 'none') {
      this._uniforms.uLut.value = 0;
    } else {
      this._uniforms.uLut.value = 1;
      this._uniforms.uTextureLUT.value = this._lutTexture;
    }
  }

  updateIntensitySetting(setting) {
    if (this._stack.frame[this._index] &&
        this._stack.frame[this._index][setting]) {
      this['_' + setting] = this._stack.frame[this._index][setting];
    } else {
      this['_' + setting] = this._stack[setting];
    }
  }

  updateCurveUniforms() {
    let data = new Float32Array(CURVE_SEGMENTS*4);
    const spacedPoints = this._curve.getSpacedPoints(CURVE_SEGMENTS);
    for (let i = 0; i < CURVE_SEGMENTS; ++i) {
      data[i*4] = spacedPoints[i].x;
      data[i*4+1] = spacedPoints[i].y;
    }
    const dataTex = new THREE.DataTexture(data, CURVE_SEGMENTS, 1, THREE.RGBAFormat, THREE.FloatType);
    dataTex.generateMipmaps = false;
    dataTex.minFilter = THREE.LinearFilter;
    dataTex.maxFilter = THREE.LinearFilter;
    dataTex.needsUpdate = true;
    this._uniforms.uCurveCoordinates.value = dataTex;
    this._uniforms.uCurveLength.value = this._curve.getLength();
  }

  _update() {
    // update slice
    if (this._mesh) {
      this.remove(this._mesh);
      this._mesh.geometry.dispose();
      this._mesh.geometry = null;
      // we do not want to dispose the texture!
      // this._mesh.material.dispose();
      // this._mesh.material = null;
      this._mesh = null;
    }

    this._create();
  }
}
