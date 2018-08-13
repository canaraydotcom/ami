/*** Imports ***/
import * as THREE from "three";

import ShadersUniform from '../../src/shaders/shaders.curved.uniform';
import ShadersVertex from '../../src/shaders/shaders.curved.vertex';
import ShadersFragment, {CURVE_SEGMENTS, UP_RESOLUTION} from '../../src/shaders/shaders.curved.fragment';

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
		this._tangentUpVectors = [
			{
				curvePosition: 0,
				vector: new THREE.Vector2(0, 1),
			},
			{
				curvePosition: 1,
				vector: new THREE.Vector2(0, 1),
			},
		];
		this._normalUpVectors = [
			{
				curvePosition: 0,
				vector: new THREE.Vector2(0, 1),
			},
			{
				curvePosition: 1,
				vector: new THREE.Vector2(0, 1),
			},
		];

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

	get tangentUpVectors() {
		return this._tangentUpVectors;
	}

	set tangentUpVectors(value) {
		this._tangentUpVectors = value;
	}

	get normalUpVectors() {
		return this._normalUpVectors;
	}

	set normalUpVectors(value) {
		this._normalUpVectors = value;
	}

	// private methods
	_create() {
		super._create();
		this.updateCurveUniforms();
		this.updateUpUniforms();
	}

	_createGeometry(toAABB) {
		this._geometry = new THREE.PlaneGeometry(this._curve.getLength(), this._halfDimensions.z * 2);
	}

	updateCurveUniforms() {
		const posData = new Float32Array(CURVE_SEGMENTS * 4);
		const spacedPoints = this._curve.getSpacedPoints(CURVE_SEGMENTS);
		for (let i = 0; i < CURVE_SEGMENTS; ++i) {
			posData[i * 4] = spacedPoints[i].x;
			posData[i * 4 + 1] = spacedPoints[i].y;
			posData[i * 4 + 2] = spacedPoints[i].z;
		}
		const curvePosTex = new THREE.DataTexture(posData, CURVE_SEGMENTS, 1, THREE.RGBAFormat, THREE.FloatType);
		curvePosTex.generateMipmaps = false;
		curvePosTex.minFilter = THREE.LinearFilter;
		curvePosTex.maxFilter = THREE.LinearFilter;
		curvePosTex.needsUpdate = true;
		this._uniforms.uCurveCoordinates.value = curvePosTex;
		this._uniforms.uCurveLength.value = this._curve.getLength();

		const tangentData = new Float32Array(CURVE_SEGMENTS * 4);
		for (let i = 0; i < CURVE_SEGMENTS; ++i) {
			const tangent = this._curve.getTangentAt(i / (CURVE_SEGMENTS - 1));
			tangentData[i * 4] = tangent.x;
			tangentData[i * 4 + 1] = tangent.y;
			tangentData[i * 4 + 2] = tangent.z;
		}
		const curveTangentTex = new THREE.DataTexture(tangentData, CURVE_SEGMENTS, 1, THREE.RGBAFormat, THREE.FloatType);
		curveTangentTex.generateMipmaps = false;
		curveTangentTex.minFilter = THREE.LinearFilter;
		curveTangentTex.maxFilter = THREE.LinearFilter;
		curveTangentTex.needsUpdate = true;
		this._uniforms.uCurveTangentVectors.value = curveTangentTex;
	}

	updateUpUniforms() {
		const upData = new Float32Array(UP_RESOLUTION * 4);

		let curTangentIndex = 1;
		let curTangentPos = this._tangentUpVectors[1].splinePosition;
		let curTangentDiff = curTangentPos - this._tangentUpVectors[0].splinePosition;
		let curTangentVec = this._tangentUpVectors[1].vector;
		let prevTangentVec = this._tangentUpVectors[0].vector;

		let curNormalIndex = 1;
		let curNormalPos = this._normalUpVectors[1].splinePosition;
		let curNormalDiff = curNormalPos - this._normalUpVectors[0].splinePosition;
		let curNormalVec = this._normalUpVectors[1].vector;
		let prevNormalVec = this._normalUpVectors[0].vector;

		for (let i = 0; i < UP_RESOLUTION; ++i) {
			const curvePos = i / (UP_RESOLUTION - 1);

			if (curvePos > curTangentPos) {
				curTangentIndex += 1;
				const prevTangentPos = curTangentPos;
				prevTangentVec = curTangentVec;
				curTangentPos = this._tangentUpVectors[curTangentIndex].splinePosition;
				curTangentVec = this._tangentUpVectors[curTangentIndex].vector;
				curTangentDiff = curTangentPos - prevTangentPos;
			}

			let w = (curTangentPos - curvePos) / curTangentDiff;
			const tangentUp = prevTangentVec.clone().multiplyScalar(w).add(curTangentVec.clone().multiplyScalar(1 - w));

			upData[i * 4] = tangentUp.x;
			upData[i * 4 + 1] = tangentUp.y;

			if (curvePos > curNormalPos) {
				curNormalIndex += 1;
				const prevNormalPos = curNormalPos;
				prevNormalVec = curNormalVec;
				curNormalPos = this._normalUpVectors[curNormalIndex].splinePosition;
				curNormalVec = this._normalUpVectors[curNormalIndex].vector;
				curNormalDiff = curNormalPos - prevNormalPos;
			}

			w = (curNormalPos - curvePos) / curNormalDiff;
			const normalUp = prevNormalVec.clone().multiplyScalar(w).add(curNormalVec.clone().multiplyScalar(1 - w));

			upData[i * 4 + 2] = normalUp.x;
			upData[i * 4 + 3] = normalUp.y;
		}

		const curveUpTex = new THREE.DataTexture(upData, UP_RESOLUTION, 1, THREE.RGBAFormat, THREE.FloatType);
		curveUpTex.generateMipmaps = false;
		curveUpTex.minFilter = THREE.LinearFilter;
		curveUpTex.maxFilter = THREE.LinearFilter;
		curveUpTex.needsUpdate = true;
		this._uniforms.uCurveUpVectors.value = curveUpTex;

	}
}
