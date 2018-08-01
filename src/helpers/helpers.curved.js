/*** Imports ***/
import * as THREE from "three";

import ShadersUniform from '../../src/shaders/shaders.curved.uniform';
import ShadersVertex from '../../src/shaders/shaders.curved.vertex';
import ShadersFragment, {CURVE_SEGMENTS} from '../../src/shaders/shaders.curved.fragment';

import HelpersSliceBase from "./helpers.slicebase";

/**
 * @module helpers/curved
 */

// TODO : common stuff with HelpersSlice through inheritance?
export default class HelpersCurved extends HelpersSliceBase {
	constructor(
		stack,
		curve = new THREE.LineCurve3(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)),
		index = 0,
		aabbSpace = 'IJK'
	) {

		super(stack, index, aabbSpace);

		this._shadersFragment = ShadersFragment;
		this._shadersVertex = ShadersVertex;
		this._uniforms = ShadersUniform.uniforms();

		this._curve = curve;

		// update dimensions, center, etc.
		// depending on aaBBSpace
		this._init();

		// update object
		this._create();

	}

	// getters/setters

	get curve() {
		return this._curve;
	}

	set curve(curve) {
		this._curve = curve;
		this._update();
	}

	// private methods
	_create() {
		super._create();
		this.updateCurveUniforms();
	}

	_createGeometry(toAABB) {
		this._geometry = new THREE.PlaneGeometry(this._curve.getLength(), this._halfDimensions.z * 2);
	}

	updateCurveUniforms() {
		let data = new Float32Array(CURVE_SEGMENTS * 4);
		const spacedPoints = this._curve.getSpacedPoints(CURVE_SEGMENTS);
		for (let i = 0; i < CURVE_SEGMENTS; ++i) {
			data[i * 4] = spacedPoints[i].x;
			data[i * 4 + 1] = spacedPoints[i].y;
		}
		const dataTex = new THREE.DataTexture(data, CURVE_SEGMENTS, 1, THREE.RGBAFormat, THREE.FloatType);
		dataTex.generateMipmaps = false;
		dataTex.minFilter = THREE.LinearFilter;
		dataTex.maxFilter = THREE.LinearFilter;
		dataTex.needsUpdate = true;
		this._uniforms.uCurveCoordinates.value = dataTex;
		this._uniforms.uCurveLength.value = this._curve.getLength();
	}
}
