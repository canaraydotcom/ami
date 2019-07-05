/*** Imports ***/
import * as THREE from "three";

import ShadersUniform from '../../src/shaders/shaders.curved.uniform';
import ShadersVertex from '../../src/shaders/shaders.curved.vertex';
import ShadersFragment from '../../src/shaders/shaders.curved.fragment';

import HelpersSliceBase from "./helpers.slicebase";

/**
 * @module helpers/curved
 */

// TODO : common stuff with HelpersSlice through inheritance?
export default class HelpersCurved extends HelpersSliceBase {
	constructor(
		stack,
		curvePoints = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)],
		curveTangents = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0)],
		curveLength = 2,
		index = 0,
		aabbSpace = 'IJK'
	) {

		super(stack, index, aabbSpace);

		this._shadersFragment = ShadersFragment;
		this._shadersVertex = ShadersVertex;
		this._uniforms = ShadersUniform.uniforms();

		this._curvePoints = curvePoints;
		this._curveTangents = curveTangents;
		this._curveLength = curveLength;

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

	get curvePoints() {
		return this._curvePoints;
	}

	setCurvePoints(curvePoints, curveTangents, length) {
		this._curveLength = length;
		this._curvePoints = curvePoints;
		this._curveTangents = curveTangents;
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
		this._geometry = new THREE.PlaneGeometry(this._curveLength, this._halfDimensions.z * 2);

		const pos = new THREE.Vector3().applyMatrix4(toAABB);

		this.position.setY(pos.z - this._halfDimensions.z);
	}

	updateCurveUniforms() {
		const curvePointCount = this._curvePoints.length;

		const posData = new Float32Array(curvePointCount * 3);
		for (let i = 0; i < curvePointCount; ++i) {
			posData[i * 3] = this._curvePoints[i].x;
			posData[i * 3 + 1] = this._curvePoints[i].y;
			posData[i * 3 + 2] = this._curvePoints[i].z;
		}
		const curvePosTex = new THREE.DataTexture(posData, curvePointCount, 1, THREE.RGBFormat, THREE.FloatType);
		curvePosTex.generateMipmaps = false;
		curvePosTex.minFilter = THREE.LinearFilter;
		curvePosTex.maxFilter = THREE.LinearFilter;
		curvePosTex.needsUpdate = true;
		this._uniforms.uCurveCoordinates.value = curvePosTex;
		this._uniforms.uCurveLength.value = this._curveLength;

		const tangentData = new Float32Array(curvePointCount * 3);
		for (let i = 0; i < curvePointCount; ++i) {
			const tangent = this._curveTangents[i];
			tangentData[i * 3] = tangent.x;
			tangentData[i * 3 + 1] = tangent.y;
			tangentData[i * 3 + 2] = tangent.z;
		}
		const curveTangentTex = new THREE.DataTexture(tangentData, curvePointCount, 1, THREE.RGBFormat, THREE.FloatType);
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
