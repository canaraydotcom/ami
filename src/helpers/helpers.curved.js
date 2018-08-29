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

		// TODO : subdivision algorithm?

		const horizontalStepSize = 0.1;
		const curveLength = this._curve.getLength();
		const horizontalStepCount = Math.floor(curveLength / horizontalStepSize);

		const horizontalSegmentStepCount = 20;

		const verticalStepCount = 15;

		const height = this._halfDimensions.z * 2;

		const geom = new THREE.BufferGeometry();

		const segmentLengths = [];

		const totalLengths = [];

		let p = this._curve.getPointAt(0);
		let tangent = this._curve.getTangentAt(0);
		let upVector = this.curvePlaneNormal.clone().applyQuaternion(
			new THREE.Quaternion().setFromAxisAngle(tangent, this._tangentUpAngles[0].angle)
		);

		const ps = [];

		for (let j = 0; j < verticalStepCount; ++j) {
			totalLengths.push(0);

			ps.push(p.clone().addScaledVector(upVector, height * (j / (verticalStepCount - 1) - 0.5)));
		}

		let up = this._tangentUpAngles[0];
		let nextUp = this._tangentUpAngles[1];
		let upSplinePosDiff = nextUp.splinePosition - up.splinePosition;
		let upAngleIndex = 1;

		let u = 0;

		let lengths;

		for (let i = 1; i < horizontalStepCount; ++i) {
			const nextU = i / (horizontalStepCount - 1);

			if (nextU > nextUp.splinePosition) {
				++upAngleIndex;
				up = nextUp;
				nextUp = this._tangentUpAngles[upAngleIndex];
				upSplinePosDiff = nextUp.splinePosition - up.splinePosition;
			}

			const weight = (nextUp.splinePosition - nextU) / upSplinePosDiff;
			const angle = up.angle * weight + nextUp.angle * (1 - weight);

			let tangent = this._curve.getTangentAt(nextU);
			upVector = this.curvePlaneNormal.clone().applyQuaternion(
				new THREE.Quaternion().setFromAxisAngle(tangent, angle)
			);

			if ((i - 1) % horizontalSegmentStepCount === 0 || i === horizontalStepCount - 1) {
				segmentLengths.push(lengths);

				lengths = [];
				for (let j = 0; j < verticalStepCount; ++j) {
					lengths.push(0);
				}
			}

			p = this._curve.getPointAt(u);

			for (let j = 0; j < verticalStepCount; ++j) {

				const nextP = p.clone();
				nextP.addScaledVector(upVector, height * (j / (verticalStepCount - 1) - 0.5));

				const curLength = -nextP.distanceTo(ps[j]) * Math.sign(ps[j].sub(nextP).dot(tangent));

				lengths[j] += curLength;
				totalLengths[j] += curLength;

				ps[j] = nextP;
			}

			u = nextU;
		}

		const uvs = [];
		const vertices = [];
		const normals = [];
		const indices = [];

		segmentLengths.shift();
		const l = segmentLengths.length + 1;

		for (let j = 0; j < verticalStepCount; ++j) {
			let x = -totalLengths[j] * 0.5;
			let u = 0;

			const ratio = j / (verticalStepCount - 1);
			const y = height * (2 * ratio - 1);

			vertices.push(x, y, 0);
			normals.push(0, 0, 1);
			uvs.push(u, ratio);

			for (let i = 0; i < segmentLengths.length; ++i) {
				x += segmentLengths[i][j];

				vertices.push(x, y, 0);
				normals.push(0, 0, 1);

				u += segmentLengths[i][j] / totalLengths[j];
				uvs.push(u, ratio);

				if (j > 0) {
					const j1l = (j - 1) * l;
					const jl = j * l;

					indices.push(
						j1l + i, jl + i, j1l + i + 1,
						j1l + i + 1, jl + i, jl + i + 1
					)
				}
			}
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
