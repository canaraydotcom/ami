import * as THREE from "three";

import GeometriesSlice from '../geometries/geometries.slice';
import ShadersUniform from '../shaders/shaders.data.uniform';
import ShadersVertex from '../shaders/shaders.data.vertex';
import ShadersFragment from '../shaders/shaders.data.fragment';

import HelpersSliceBase from "./helpers.slicebase";

/**
 * @module helpers/slice
 */

export default class HelpersSlice extends HelpersSliceBase {
	constructor(stack,
							index = 0,
							position = new THREE.Vector3(0, 0, 0),
							direction = new THREE.Vector3(0, 0, 1),
							aabbSpace = 'IJK') {

		super(stack, index, aabbSpace);

		this._shadersFragment = ShadersFragment;
		this._shadersVertex = ShadersVertex;
		this._uniforms = ShadersUniform.uniforms();

		this._cropChild._uniforms = this._uniforms;

		this._planePosition = position;
		this._planeDirection = direction;

		// update dimensions, center, etc.
		// depending on aaBBSpace
		this._init();

		// update object
		this._create();
	}

	// getters/setters

	set planePosition(position) {
		this._planePosition = position;
		this._update();
	}

	get planePosition() {
		return this._planePosition;
	}

	set planeDirection(direction) {
		this._planeDirection = direction;
		this._uniforms.uSliceNormal.value = direction;
		this._update();
	}

	get planeDirection() {
		return this._planeDirection;
	}

	updateStepUniforms() {
		super.updateStepUniforms();
		this._uniforms.uStep.value = this.planeDirection.clone().multiplyScalar(this.thickness / this._uniforms.uSteps.value);
	}

	_create() {
		super._create();

		if (this._cropMatrix && !this._cropChild.parent) {
			this._cropChild = this.clone();
			this._cropChild.halfDimensions = this._cropHalfDimensions;
			this._cropChild.center = new THREE.Vector3();
			this._cropChild.cropMatrix = null;
			this._cropChild.cropHalfDimensions = null;

			this.add(this._cropChild);

		} else if (!this._cropMatrix && this._cropChild.parent) {
			this.remove(this._cropChild);
		}
	}

	// private methods
	_createGeometry(toAABB, cropMatrix) {
		this._geometry = null;
		this._geometry = new GeometriesSlice(
			this._halfDimensions,
			this._center,
			this._planePosition,
			this._planeDirection,
			toAABB,
			this._cropHalfDimensions,
			cropMatrix
		);
	}

	cartesianEquation() {
		// Make sure we have a geometry
		if (!this._geometry ||
			!this._geometry.vertices ||
			this._geometry.vertices.length < 3) {
			return new THREE.Vector4();
		}

		let vertices = this._geometry.vertices;
		let dataToWorld = this._stack.ijk2LPS;
		let p1 = new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z)
			.applyMatrix4(dataToWorld);
		let p2 = new THREE.Vector3(vertices[1].x, vertices[1].y, vertices[1].z)
			.applyMatrix4(dataToWorld);
		let p3 = new THREE.Vector3(vertices[2].x, vertices[2].y, vertices[2].z)
			.applyMatrix4(dataToWorld);
		let v1 = new THREE.Vector3();
		let v2 = new THREE.Vector3();
		let normal = v1
			.subVectors(p3, p2)
			.cross(v2.subVectors(p1, p2))
			.normalize();

		return new THREE.Vector4(
			normal.x,
			normal.y,
			normal.z,
			-normal.dot(p1)
		);
	}

	clone() {
		return new HelpersSlice(this._stack, this._index, this._planePosition, this._planeDirection, this._aaBBspace).copy(this);
	}

}
