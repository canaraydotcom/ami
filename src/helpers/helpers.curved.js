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
		this._tangentUpAngles = [
			{
				splinePosition: 0,
				angle: 0,
			},
			{
				splinePosition: 1,
				angle: 0,
			},
		];
		this._normalUpAngles = [
			{
				splinePosition: 0,
				angle: 0,
			},
			{
				splinePosition: 1,
				angle: 0,
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

	get curvePlaneNormal() {
		return this._uniforms.uCurvePlaneNormal.value;
	}

	set curvePlaneNormal(value) {
		this._uniforms.uCurvePlaneNormal.value = value;
	}

	// private methods
	_create() {
		super._create();
		this.updateCurveUniforms();
		this.updateUpUniforms();
	}

	_createGeometry(toAABB) {

		// geom.setIndex(indices);
		// geom.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		// geom.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
		// geom.addAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		//
		// // TODO : why can't we use a buffer geom?
		// this._geometry = new THREE.Geometry();
		// this._geometry.fromBufferGeometry(geom);
		// this._geometry.mergeVertices();
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
		const upData = this._uniforms.uCurveTangentUpAngles.value;

		for (const [i, {splinePosition, angle}] of this._tangentUpAngles.entries()) {
			upData[i] = new THREE.Vector2(splinePosition, angle);
		}

		this._uniforms.uCurveTangentUpAngles.value = upData;
	}
}
