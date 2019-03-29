/** * Imports ***/
import * as THREE from "three";

import coreIntersections from '../core/core.intersections';

/**
 *
 * It is typically used for creating an irregular 3D planar shape given a box and the cut-plane.
 *
 * Demo: {@link https://fnndsc.github.io/vjs#geometry_slice}
 *
 * @module geometries/slice
 *
 * @param {THREE.Vector3} halfDimensions - Half-dimensions of the box to be sliced.
 * @param {THREE.Vector3} center - Center of the box to be sliced.
 * @param {THREE.Vector3<THREE.Vector3>} orientation - Orientation of the box to be sliced. (might not be necessary..?)
 * @param {THREE.Vector3} position - Position of the cutting plane.
 * @param {THREE.Vector3} direction - Cross direction of the cutting plane.
 *
 * @example
 * // Define box to be sliced
 * let halfDimensions = new THREE.Vector(123, 45, 67);
 * let center = new THREE.Vector3(0, 0, 0);
 * let orientation = new THREE.Vector3(
 *   new THREE.Vector3(1, 0, 0),
 *   new THREE.Vector3(0, 1, 0),
 *   new THREE.Vector3(0, 0, 1)
 * );
 *
 * // Define slice plane
 * let position = center.clone();
 * let direction = new THREE.Vector3(-0.2, 0.5, 0.3);
 *
 * // Create the slice geometry & materials
 * let sliceGeometry = new VJS.geometries.slice(halfDimensions, center, orientation, position, direction);
 * let sliceMaterial = new THREE.MeshBasicMaterial({
 *   'side': THREE.DoubleSide,
 *   'color': 0xFF5722
 * });
 *
 *  // Create mesh and add it to the scene
 *  let slice = new THREE.Mesh(sliceGeometry, sliceMaterial);
 *  scene.add(slice);
 */

export default class GeometriesSlice extends THREE.ShapeGeometry {
	constructor(halfDimensions, center, position, direction, toAABB = new THREE.Matrix4(),
							holeHalfDimensions = null, holeToAABB = null) {
		//
		// prepare data for the shape!
		//
		let aabb = {
			halfDimensions,
			center,
			toAABB,
		};

		let plane = {
			position,
			direction,
		};

		// BOOM!
		let intersections = coreIntersections.aabbPlane(aabb, plane);

		// can not exist before calling the constructor
		if (!intersections || intersections.length < 3) {
			// window.console.log('WARNING: Less than 3 intersections between AABB and Plane.');
			// window.console.log('AABB');
			// window.console.log(aabb);
			// window.console.log('Plane');
			// window.console.log(plane);
			// window.console.log('exiting...');
			// or throw error?
			throw 'geometries.slice has less than 3 intersections, can not create a valid geometry.';
		}

		// direction from first point to reference
		let planeXDirection;
		for (const intersection of intersections) {
			planeXDirection = intersection.clone().sub(position);
			if (planeXDirection.lengthSq() > 0.001) {
				break;
			}
		}
		planeXDirection.normalize();
		const planeYDirection = new THREE.Vector3(0, 0, 0).crossVectors(planeXDirection, direction).normalize();

		let orderedIntersections = GeometriesSlice.orderIntersections(
			intersections,
			position,
			planeXDirection,
			planeYDirection
		);
		let sliceShape = GeometriesSlice.shape(orderedIntersections);

		let orderedHoleIntersections = [];

		if (holeToAABB) {
			intersections = coreIntersections.aabbPlane(
				{
					halfDimensions: holeHalfDimensions,
					center: new THREE.Vector3(),
					toAABB: holeToAABB
				},
				plane
			);

			if (intersections.length > 2) {
				// TODO : for ordering only we need a separate center of mass
				orderedHoleIntersections = GeometriesSlice.orderIntersections(
					intersections,
					position,
					planeXDirection,
					planeYDirection
				);

				sliceShape.holes.push(GeometriesSlice.shape(orderedHoleIntersections));
			}
		}

		//
		// Generate Geometry from shape
		// It does triangulation for us!
		//
		super(sliceShape);
		this.type = 'SliceGeometry';

		// update real position of each vertex! (not in 2d)
		this.applyMatrix(
			new THREE.Matrix4()
				.makeBasis(planeXDirection, planeYDirection, new THREE.Vector3(0, 0, 1))
				.setPosition(position)
		);

	}

	static shape(points) {
		//
		// Create Shape
		//
		let shape = new THREE.Shape();
		// move to first point!
		shape.moveTo(points[0].x, points[0].y);

		// loop through all points!
		for (let l = 1; l < points.length; l++) {
			// project each on plane!
			shape.lineTo(points[l].x, points[l].y);
		}

		// close the shape!
		shape.lineTo(points[0].x, points[0].y);
		return shape;
	}

	/**
	 *
	 * Convenience function to extract center of mass from list of points.
	 *
	 * @private
	 *
	 * @param {Array<THREE.Vector3>} points - Set of points from which we want to extract the center of mass.
	 *
	 * @returns {THREE.Vector3} Center of mass from given points.
	 */
	static centerOfMass(points) {
		let centerOfMass = new THREE.Vector3(0, 0, 0);
		for (let i = 0; i < points.length; i++) {
			centerOfMass.x += points[i].x;
			centerOfMass.y += points[i].y;
			centerOfMass.z += points[i].z;
		}
		centerOfMass.divideScalar(points.length);

		return centerOfMass;
	}

	/**
	 *
	 * Order 3D planar points around a refence point.
	 *
	 * @private
	 *
	 * @param {Array<THREE.Vector3>} points - Set of planar 3D points to be ordered.
	 * @param {THREE.Vector3} position
	 * @param {THREE.Vector3} planeXDirection
	 * @param {THREE.Vector3} planeYDirection
	 * @returns {Array<Object>} Set of object representing the ordered points.
	 */
	static orderIntersections(points, position, planeXDirection, planeYDirection) {

		let orderedpoints = [];

		const planeCenter = new THREE.Vector2();

		// other lines // if inter, return location + angle
		for (let j = 0; j < points.length; j++) {
			let point = points[j].clone().sub(position);
			point = new THREE.Vector2(planeXDirection.dot(point), planeYDirection.dot(point));

			planeCenter.add(point);

			orderedpoints.push(point);
		}

		planeCenter.divideScalar(orderedpoints.length);

		for (let j = 0; j < orderedpoints.length; j++) {
			const point = orderedpoints[j];
			const diff = point.clone().sub(planeCenter);
			point.shapeAngle = diff.angle();
		}

		orderedpoints.sort(function (a, b) {
			return a.shapeAngle - b.shapeAngle;
		});

		let noDups = [orderedpoints[0]];
		let epsilon = 0.0001;
		for (let i = 1; i < orderedpoints.length; i++) {
			if (Math.abs(orderedpoints[i - 1].shapeAngle - orderedpoints[i].shapeAngle) > epsilon) {
				noDups.push(orderedpoints[i]);
			}
		}

		return noDups;
	}

}
