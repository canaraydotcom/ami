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

	get tangentUpAngles() {
		return this._tangentUpAngles;
	}

	set tangentUpAngles(value) {
		this._tangentUpAngles = value;
	}

	get normalUpAngles() {
		return this._normalUpAngles;
	}

	set normalUpAngles(value) {
		this._normalUpAngles = value;
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
		const height = this._halfDimensions.z * 2;

		const geom = new THREE.BufferGeometry();

		const bottomLengths = [];
		const topLengths = [];

		let totalBottomLength = 0;
		let totalTopLength = 0;

		let up = this._tangentUpAngles[0];

		for (let i = 1; i < this._tangentUpAngles.length; ++i) {
			const nextUp = this._tangentUpAngles[i];

			const stepCount = 100;
			let u = up.splinePosition;
			const nextU = nextUp.splinePosition;

			const uStep = (nextU - u) / stepCount - 0.00000001;

			let angle = up.angle;
			const angleStep = (nextUp.angle - up.angle) / stepCount;

			let lengthTop = 0;
			let lengthBottom = 0;

			let pTop = this._curve.getPointAt(u);
			const upVector = this.curvePlaneNormal.clone().applyQuaternion(
				new THREE.Quaternion().setFromAxisAngle(this._curve.getTangentAt(u), angle)
			);
			let pBottom = pTop.clone().addScaledVector(upVector, -height);
			pTop.addScaledVector(upVector, height);

			for (let i = 0; i < stepCount; ++i) {
				u += uStep;
				angle += angleStep;

				const nextPTop = this._curve.getPointAt(u);
				const upVector = this.curvePlaneNormal.clone().applyQuaternion(
					new THREE.Quaternion().setFromAxisAngle(this._curve.getTangentAt(u), angle)
				);
				let nextPBottom = nextPTop.clone().addScaledVector(upVector, -height);
				nextPTop.addScaledVector(upVector, height);

				lengthTop += nextPTop.distanceTo(pTop);
				lengthBottom += nextPBottom.distanceTo(pBottom);

				pTop = nextPTop;
				pBottom = nextPBottom;
			}

			topLengths.push(lengthTop);
			bottomLengths.push(lengthBottom);

			totalTopLength += lengthTop;
			totalBottomLength += lengthBottom;

			up = nextUp;
		}

		let top = -totalTopLength * 0.5;
		let bottom = -totalBottomLength * 0.5;

		let u = 0;

		const uvs = [];
		const vertices = [];
		const normals = [];
		const indices = [];

		// noinspection JSSuspiciousNameCombination
		vertices.push(
			top, height, 0,
			bottom, -height, 0
		);
		normals.push(
			0, 0, 1,
			0, 0, 1
		);
		uvs.push(
			0, 0,
			0, 1
		);

		for (let i = 0; i < topLengths.length; ++i) {
			top += topLengths[i];
			bottom += bottomLengths[i];

			// noinspection JSSuspiciousNameCombination
			vertices.push(
				top, height, 0,
				bottom, -height, 0
			);

			normals.push(
				0, 0, 1,
				0, 0, 1
			);

			u += topLengths[i] / totalTopLength;

			uvs.push(
				u, 0,
				u, 1,
			);

			indices.push(
				i * 2, i * 2 + 1, i * 2 + 2,
				i * 2 + 2, i * 2 + 1, i * 2 + 3
			)
		}

		geom.setIndex(indices);
		geom.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geom.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
		geom.addAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

		// TODO : why can't we use a buffer geom?
		this._geometry = new THREE.Geometry();
		this._geometry.fromBufferGeometry(geom);
		this._geometry.mergeVertices();
		// this._geometry = new THREE.PlaneGeometry(this._curve.getLength(), this._halfDimensions.z * 2);
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
