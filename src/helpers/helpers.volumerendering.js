import * as THREE from "three";

import ShadersUniform from '../shaders/shaders.vr.uniform';
import ShadersVertex from '../shaders/shaders.vr.vertex';
import ShadersFragment, {MAX_RAY_STEPS} from '../shaders/shaders.vr.fragment';

import HelpersMaterialMixin from '../helpers/helpers.material.mixin';

const CORRECTION_COEFS = [
  [ 1,  0,  0,  0],
  [ 2,  1,  0,  0].map(c => c * 0.8),
  [ 3,  3,  1,  0].map(c => c * 0.85),
  [ 4,  6,  4,  1].map(c => c * 0.9),
  [ 5, 10, 10,  5],
];

/**
 * @module helpers/volumerendering
 */

export default class HelpersVolumeRendering extends HelpersMaterialMixin(THREE.Object3D) {
  constructor(stack) {
    //
    super();

    this._stack = stack;
    this._textures = [];
    this._shadersFragment = ShadersFragment;
    this._shadersVertex = ShadersVertex;
    this._uniforms = ShadersUniform.uniforms();
    this._material = null;
    this._geometry = null;
    this._diagonalLength = 0;

    this._interpolation = 1; // default to trilinear interpolation

    this._create();
  }

  _create() {
    this._prepareStack();
    this._prepareTexture();
    this._prepareMaterial();
    this._prepareGeometry();

    this._mesh = new THREE.Mesh(this._geometry, this._material);
    this.add(this._mesh);
  }

  _prepareStack() {
    if (!this._stack.prepared) {
      this._stack.prepare();
    }

    if (!this._stack.packed) {
      this._stack.pack();
    }
  }

  _prepareMaterial() {
    // uniforms
    this._uniforms = ShadersUniform.uniforms();
    this._uniforms.uWorldBBox.value = this._stack.worldBoundingBox();
    this._uniforms.uTextureSize.value = this._stack.textureSize;
    this._uniforms.uTextureContainer.value = this._textures;
    this._uniforms.uWorldToData.value = this._stack.lps2IJK.clone();
    this._uniforms.uPixelType.value = this._stack.pixelType;
    this._uniforms.uBitsAllocated.value = this._stack.bitsAllocated;
    this._uniforms.uPackedPerPixel.value = this._stack.packedPerPixel;
    this._uniforms.uWindowMinWidth.value = [
      this._stack.windowMin + this._stack.windowWidth * 0.1,
      this._stack.windowWidth * 0.8
    ];

    this._uniforms.uDataDimensions.value = [
      this._stack.dimensionsIJK.x,
      this._stack.dimensionsIJK.y,
      this._stack.dimensionsIJK.z
    ];
    this._uniforms.uInterpolation.value = this._interpolation;

    this._createMaterial({
      side: THREE.FrontSide,
      transparent: true,
    });
  }

  updateMatrix() {
    super.updateMatrix();

    const inv = new THREE.Matrix4();
    inv.getInverse(this.matrixWorld);
    this._uniforms.uWorldToData.value = this._stack.lps2IJK.clone();
    this._uniforms.uWorldToData.value.multiply(inv);
  }

  _prepareGeometry() {
    let worldBBox = this._stack.worldBoundingBox();
    let centerLPS = this._stack.worldCenter();

    let width = worldBBox[1] - worldBBox[0];
    let height = worldBBox[3] - worldBBox[2];
    let depth = worldBBox[5] - worldBBox[4];
    this._geometry = new THREE.BoxGeometry(width, height, depth);
    this._geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
      centerLPS.x, centerLPS.y, centerLPS.z));

    this._diagonalLength = new THREE.Vector3(width, height, depth).length();
  }

  get uniforms() {
    return this._uniforms;
  }

  set uniforms(uniforms) {
    this._uniforms = uniforms;
  }

  set stepResolution(value) {

    let stepSize = this._stack.spacing.x * value;
    this._uniforms.uStepSize.value = stepSize;

    this._uniforms.uSteps.value = this._diagonalLength / stepSize;

    // TODO : we're assuming here that the spacing is equal in all dimensions
    this._uniforms.uAlphaCorrection.value = value;

    this._uniforms.uCorrectionCoefs.value = CORRECTION_COEFS[Math.min(value, CORRECTION_COEFS.length) - 1];
  }

  get stack() {
    return this._stack;
  }

  set stack(stack) {
    this._stack = stack;
  }

  get interpolation() {
    return this._interpolation;
  }

  set interpolation(interpolation) {
    this._interpolation = interpolation;
    this._uniforms.uInterpolation.value = this._interpolation;
    this._updateMaterial();
  }
}
