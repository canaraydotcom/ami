/* globals Stats, dat, AMI*/

import ControlsTrackball from '../../src/controls/controls.trackball';
import HelpersStack      from '../../src/helpers/helpers.stack';
import HelpersCurved     from '../../src/helpers/helpers.curved';
import LoadersVolume     from '../../src/loaders/loaders.volume';
// import {CURVE_SEGMENTS}  from '../../src/shaders/shaders.curved.fragment';

const CURVE_SEGMENTS = 128;

// standard global letiables
let controls, renderer, renderer2, stats, scene, scene2,
  camera, camera2, stackHelper, curvedHelper, threeD, threeD2,
  torusKnotGeometry, torusKnot, sliced, slicedGeometry, slicedMaterial,
  slicePlane, curveHandles, curve, curveLine, dragControls,
  curveSliced, curveSlicedGeometry;

let zoomFactor = 0.2;
let zoomFactor2 = 0.2;

const curveHandlePositions = [
  new THREE.Vector3(-30, -10, 0),
  new THREE.Vector3(-10, 10, 0),
  new THREE.Vector3(10, 10, 0),
  new THREE.Vector3(30, -10, 0)
];

function componentToHex(c) {

  var hex = c.toString(16);
  return hex.length === 1 ? '0' + hex : hex;

}

function rgbToHex(r, g, b) {

  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);

}


function updateGeometries() {

  if (stackHelper) {

    // update plane direction...
    let dirLPS = new THREE.Vector3(0, 0, 1).normalize();

    // update slice and THEN its border
    stackHelper.slice.planeDirection = dirLPS;
    // update border with new slice
    stackHelper.border.helpersSlice = stackHelper.slice;


    // update colors based on planeDirection
    let color = rgbToHex(
      Math.round(Math.abs(255 * dirLPS.x)),
      Math.round(Math.abs(255 * dirLPS.y)),
      Math.round(Math.abs(255 * dirLPS.z)));
    // stackHelper.bbox.color = color;
    stackHelper.border.color = color;

    // slice knot
    slicePlane.setFromNormalAndCoplanarPoint(stackHelper.slice.planeDirection, stackHelper.slice.planePosition);

    scene.remove(sliced);
    sliced = new THREE.LineSegments(sliceGeometry(torusKnotGeometry, slicePlane), slicedMaterial);
    sliced.renderOrder = 10;
    scene.add(sliced);

    // slicedGeometry.vertices = sliceGeometry(torusKnotGeometry, slicePlane);
    // const args = [0, slicedGeometry.vertices.length, ...sliceGeometry(torusKnotGeometry, slicePlane).vertices];
    // Array.prototype.splice.apply(slicedGeometry.vertices, args);
    // slicedGeometry.verticesNeedUpdate = true;

    curve.updateArcLengths();
    curvedHelper.curve = curve;

    scene2.remove(curveSliced);
    // curveSliced = new THREE.LineSegments(sliceGeometryCurved(torusKnotGeometry, curveLine.geometry), slicedMaterial);
    curveSliced.renderOrder = 10;
    scene2.add(curveSliced);
  }

}

// this function is executed on each animation frame
function animate() {

  updateGeometries();

  controls.update();
  renderer.render(scene, camera);
  stats.update();

  renderer2.render(scene2, camera2);

  // request new frame
  requestAnimationFrame(function () {

    animate();

  });
}

function onWindowResize() {

  // camera.aspect = window.innerWidth / window.innerHeight;
  camera.left = zoomFactor * threeD.offsetWidth / -2;
  camera.right = zoomFactor * threeD.offsetWidth / 2;
  camera.top = zoomFactor * threeD.offsetHeight / 2;
  camera.bottom = zoomFactor * threeD.offsetHeight / -2;
  camera.updateProjectionMatrix();

  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);

}

function init() {

  // renderer
  threeD = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
  renderer.setClearColor(0x353535, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  threeD.appendChild(renderer.domElement);

  // stats
  stats = new Stats();
  threeD.appendChild(stats.domElement);

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.OrthographicCamera(zoomFactor * threeD.offsetWidth / -2, zoomFactor * threeD.offsetWidth / 2,
    zoomFactor * threeD.offsetHeight / 2, zoomFactor * threeD.offsetHeight / -2, 0, 1000);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 100;
  // camera.rotation.x = 90;

  // controls
  controls = new ControlsTrackball(camera, threeD);
  controls.rotateSpeed = 1.4;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = false;
  controls.noRotate = true;
  controls.dynamicDampingFactor = 0.3;

  // knot
  torusKnotGeometry = new THREE.TorusKnotGeometry(30, 8, 128, 64);
  const material = new THREE.MeshLambertMaterial({color: 'green'});
  torusKnot = new THREE.Mesh(torusKnotGeometry, material);
  torusKnot.renderOrder = 0;
  // torusKnot.position.set(0, 0, 20);
  // scene.add(torusKnot);

  // lights
  const directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.position.set(1, 1, -10);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // slice plane
  slicePlane = new THREE.Plane();

  // slice
  slicedGeometry = new THREE.Geometry();
  slicedMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    depthTest: false,
    linewidth: 2,
  });
  sliced = new THREE.LineSegments(slicedGeometry, slicedMaterial);
  scene.add(sliced);

  // curve
  curveHandles = [];
  for (let i = 0; i < curveHandlePositions.length; ++i) {
    const geom = new THREE.SphereGeometry(1.5, 10, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 10;
    mesh.position.copy(curveHandlePositions[i]);
    curveHandlePositions[i] = mesh.position;
    curveHandles.push(mesh);
    scene.add(mesh);
  }

  let curveGeometry = new THREE.Geometry();
  for (let i = 0; i < CURVE_SEGMENTS; ++i) {
    curveGeometry.vertices.push(new THREE.Vector3());
  }

  curve = new THREE.CatmullRomCurve3(curveHandlePositions);
  curve.type = "centripetal";

  curveLine = new THREE.Line(curveGeometry, new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
    depthTest: false,
  }));
  curveLine.renderOrder = 10;
  scene.add(curveLine);

  dragControls = new THREE.DragControls(curveHandles, camera, renderer.domElement);
  dragControls.addEventListener("drag", updateCurveLine);

  updateCurveLine();

  // renderer 2
  threeD2 = document.getElementById('curved-slice');
  renderer2 = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer2.setSize(threeD2.offsetWidth, threeD2.offsetHeight);
  renderer2.setClearColor(0x353535, 1);
  renderer2.setPixelRatio(window.devicePixelRatio);
  renderer2.context.getExtension('OES_texture_float');
  renderer2.context.getExtension('OES_texture_float_linear');
  threeD2.appendChild(renderer2.domElement);

  // scene 2
  scene2 = new THREE.Scene();

  // camera 2
  camera2 = new THREE.OrthographicCamera(zoomFactor2 * threeD2.offsetWidth / -2, zoomFactor2 * threeD2.offsetWidth / 2,
    zoomFactor2 * threeD2.offsetHeight / 2, zoomFactor2 * threeD2.offsetHeight / -2, 0, 1000);
  camera2.position.x = 0;
  camera2.position.y = -100;
  camera2.position.z = -30;
  camera2.rotation.x = 90;

  // slice
  curveSlicedGeometry = new THREE.Geometry();
  curveSliced = new THREE.LineSegments(curveSlicedGeometry, slicedMaterial);
  scene2.add(curveSliced);

  animate();
}

const updateCurveLine = () => {
  for (let i = 0; i < CURVE_SEGMENTS; ++i) {
    curveLine.geometry.vertices[i].copy(curve.getPoint(i / (CURVE_SEGMENTS - 1)));
  }

  curveLine.geometry.verticesNeedUpdate = true;
};

window.onload = function () {

  // init threeJS...
  init();

  // instantiate the loader
  // it loads and parses the dicom image
  let loader = new LoadersVolume(threeD);

  var t2 = [
    '36444280', '36444294', '36444308', '36444322', '36444336',
    '36444350', '36444364', '36444378', '36444392', '36444406',
    '36444420', '36444434', '36444448', '36444462', '36444476',
    '36444490', '36444504', '36444518', '36444532', '36746856',
    '36746870', '36746884', '36746898', '36746912', '36746926',
    '36746940', '36746954', '36746968', '36746982', '36746996',
    '36747010', '36747024', '36748200', '36748214', '36748228',
    '36748270', '36748284', '36748298', '36748312', '36748326',
    '36748340', '36748354', '36748368', '36748382', '36748396',
    '36748410', '36748424', '36748438', '36748452', '36748466',
    '36748480', '36748494', '36748508', '36748522', '36748242',
    '36748256'
  ];

  var files = t2.map(function (v) {

    return 'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/' + v;

  });

  // load sequence for each file
  let seriesContainer = [];
  let loadSequence = [];
  files.forEach(function (url) {

    loadSequence.push(
      Promise.resolve()
      // fetch the file
        .then(function () {

          return loader.fetch(url);

        })
        .then(function (data) {

          return loader.parse(data);

        })
        .then(function (series) {

          seriesContainer.push(series);

        })
        .catch(function (error) {

          window.console.log('oops... something went wrong...');
          window.console.log(error);

        })
    );
  });

  // load sequence for all files
  Promise
    .all(loadSequence)
    .then(function () {

      loader.free();
      loader = null;

      let series = seriesContainer[0].mergeSeries(seriesContainer)[0];
      let stack = series.stack[0];
      stackHelper = new HelpersStack(stack);
      let centerLPS = stackHelper.stack.worldCenter();
      stackHelper.slice.aabbSpace = 'LPS';
      stackHelper.slice.planePosition.x = centerLPS.x;
      stackHelper.slice.planePosition.y = centerLPS.y;
      stackHelper.slice.planePosition.z = centerLPS.z;
      stackHelper.bbox.visible = false;
      scene.add(stackHelper);

      stackHelper.slice.updateMatrixWorld();

      // update camrea's and control's target
      // camera.lookAt( centerLPS.x, centerLPS.y, centerLPS.z );
      // camera.updateProjectionMatrix();
      // controls.target.set( centerLPS.x, centerLPS.y, centerLPS.z );

      curvedHelper = new HelpersCurved(stack, curve);
      curvedHelper.interpolation = 1;
      scene2.add(curvedHelper);

      // create GUI
      let gui = new dat.GUI({
        autoPlace: false
      });

      let customContainer = document.getElementById('my-gui-container');
      customContainer.appendChild(gui.domElement);
      customContainer = null;

      let positionFolder = gui.addFolder('Plane position');
      let worldBBox = stackHelper.stack.worldBoundingBox();
      let frameIndexControllerOriginI = positionFolder.add(stackHelper.slice.planePosition, 'x',
        worldBBox[0], worldBBox[1]).step(0.01).listen();
      let frameIndexControllerOriginJ = positionFolder.add(stackHelper.slice.planePosition, 'y',
        worldBBox[2], worldBBox[3]).step(0.01).listen();
      let frameIndexControllerOriginK = positionFolder.add(stackHelper.slice.planePosition, 'z',
        worldBBox[4], worldBBox[5]).step(0.01).listen();
      let interpolation = positionFolder.add(stackHelper.slice, 'interpolation',
        0, 1).step(1).listen();
      positionFolder.open();

      let knotFolder = gui.addFolder("Knot");
      let knotVisible = knotFolder.add(torusKnot, "visible");
      knotFolder.open();

      frameIndexControllerOriginI.onChange(updateGeometries);
      frameIndexControllerOriginJ.onChange(updateGeometries);
      frameIndexControllerOriginK.onChange(updateGeometries);

      window.addEventListener('resize', onWindowResize, false);
    })
    .catch(function (error) {
      window.console.log('oops... something went wrong...');
      window.console.log(error);
    });
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
// slice mesh
//

function sliceGeometryCurved(geom, curvedGeom) {
  let sliced = new THREE.Geometry();

  for (let i = 0; i < curvedGeom.vertices.length; i += 2) {
    sliceGeometryWithSegment(geom, curvedGeom.vertices[i], curvedGeom.vertices[i + 1], sliced);
  }

  return sliced;
}

function sliceGeometryWithSegment(geom, segmentStart, segmentEnd, sliced) {
  let points;

  const segmentDirection = segmentEnd.clone();
  segmentDirection.sub(segmentStart);
  const segmentLength = segmentDirection.length();
  segmentDirection.normalize();
  const normal = new THREE.Vector3(-segmentDirection.y, segmentDirection.x, 0);

  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(normal, segmentStart);

  geom.faces.forEach(function (face, faceIndex) {
    points = facePoints(geom, face, faceIndex);
    if (faceIntersectsPlane(plane, points)) {
      for (let p of points) {
        const v = p.vertex.clone();
        v.sub(segmentStart);
        const projected = segmentDirection.dot(v);
        if (projected >= 0 && projected <= segmentLength) {
          sliceFaceWithSegment(plane, segmentStart, segmentDirection, segmentLength, sliced, points);
          break;
        }
      }
    }
  });
}

function facePoints(geom, face, faceIndex) {
  const uvs = geom.faceVertexUvs[0];
  return ['a', 'b', 'c'].map(function (key, i) {
    return {
      vertex: geom.vertices[face[key]],
      normal: face.vertexNormals[i],
      uv: uvs[faceIndex] ? uvs[faceIndex][i] : undefined,
    };
  });
}

function faceIntersectsPlane(plane, points) {
  // TODO : in production is should be most probably removed
  if (points.length != 3) {
    console.error("points must have length 3 (triangle). you passed in length " + points.length);
  }
  // a plane always intersects two sides of a triangle or none. so only two sides need to be checked.
  for (let i = 0; i < 2; ++i) {
    const line = new THREE.Line3(points[i].vertex, points[i + 1].vertex);
    if (plane.intersectsLine(line)) {
      return true;
    }
  }

  return false;
}

const intersectPlane = function (p1, p2, plane) {
  const line = new THREE.Line3(p1.vertex, p2.vertex);
  const intersection = plane.intersectLine(line);
  if (intersection) {
    const distance = p1.vertex.distanceTo(intersection);
    const alpha = distance / line.distance();
    return {
      vertex: intersection,
      normal: p1.normal.clone().lerp(p2.normal, alpha).normalize(),
      uv: p1.uv && p2.uv ? p1.uv.clone().lerp(p2.uv, alpha) : null
    };
  }
};

function sliceFaceWithSegment(plane, segmentStart, segmentDirection, segmentLength, sliced, points) {
  let i;
  let len = points.length;
  let p1;
  let p2;
  let intersections = [];

  for (i = 0; i < len; ++i) {
    p1 = points[i];
    p2 = points[(i + 1) % len];
    const intersection = intersectPlane(p1, p2, plane);
    if (intersection) {
      intersections.push(intersection.vertex);
    }
  }

  let dir = intersections[1].clone();
  dir.sub(intersections[0]);

  // dir.normalize();
  if (dir.dot(segmentDirection) < 0) {
    [intersections[1], intersections[0]] = intersections;
    dir.negate();
  }

  // const facs = [0, 0];
  //
  // for (i = 0; i < 2; ++i) {
  //   const v = intersections[i].clone();
  //   v.sub(segmentStart);
  //
  //   facs[i] = segmentDirection.dot(v);
  // }
  //
  // if (facs[1] > segmentLength) {
  //   intersections[1] = intersections[0].clone();
  //   intersections[1].addScaledVector(dir, (segmentLength - facs[0]) / (facs[1] - facs[0]));
  // }
  //
  // if (facs[0] < 0) {
  //   intersections[0].addScaledVector(dir, -facs[0] / (facs[1] - facs[0]));
  // }

  sliced.vertices.push(...intersections);
}



function sliceGeometry(geom, plane) {
  let sliced = new THREE.Geometry();
  let points;

  geom.faces.forEach(function(face, faceIndex) {
    points = facePoints(geom, face, faceIndex);
    if (faceIntersectsPlane(plane, points)) {
      sliceFace(plane, sliced, points);
    }
  });

  return sliced;
}

function sliceFace(plane, sliced, points) {
  let i;
  let len = points.length;
  let p1;
  let p2;
  let intersection;

  for (i = 0; i < len; i++) {
    p1 = points[i];
    p2 = points[(i + 1) % len];
    intersection = intersectPlane(p1, p2, plane);
    if (intersection) {
      sliced.vertices.push(intersection.vertex);
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// copied from three.js/examples/js/controls/DragControls.js
//

/*
 * @author zz85 / https://github.com/zz85
 * @author mrdoob / http://mrdoob.com
 * Running this will allow you to drag three.js objects around the screen.
 */

THREE.DragControls = function (_objects, _camera, _domElement) {

  if (_objects instanceof THREE.Camera) {

    console.warn('THREE.DragControls: Constructor now expects ( objects, camera, domElement )');
    var temp = _objects;
    _objects = _camera;
    _camera = temp;

  }

  var _plane = new THREE.Plane();
  var _raycaster = new THREE.Raycaster();

  var _mouse = new THREE.Vector2();
  var _offset = new THREE.Vector3();
  var _intersection = new THREE.Vector3();

  var _selected = null, _hovered = null;

  //

  var scope = this;

  function activate() {

    _domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    _domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    _domElement.addEventListener('mouseup', onDocumentMouseUp, false);

  }

  function deactivate() {

    _domElement.removeEventListener('mousemove', onDocumentMouseMove, false);
    _domElement.removeEventListener('mousedown', onDocumentMouseDown, false);
    _domElement.removeEventListener('mouseup', onDocumentMouseUp, false);

  }

  function dispose() {

    deactivate();

  }

  function onDocumentMouseMove(event) {

    event.preventDefault();

    _mouse.x = ( event.clientX / _domElement.width ) * 2 - 1;
    _mouse.y = -( event.clientY / _domElement.height ) * 2 + 1;

    _raycaster.setFromCamera(_mouse, _camera);

    if (_selected && scope.enabled) {

      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {

        _selected.position.copy(_intersection.sub(_offset));

      }

      scope.dispatchEvent({type: 'drag', object: _selected});

      return;

    }

    _raycaster.setFromCamera(_mouse, _camera);

    var intersects = _raycaster.intersectObjects(_objects);

    if (intersects.length > 0) {

      var object = intersects[0].object;

      _plane.setFromNormalAndCoplanarPoint(_camera.getWorldDirection(_plane.normal), object.position);

      if (_hovered !== object) {

        scope.dispatchEvent({type: 'hoveron', object: object});

        _domElement.style.cursor = 'pointer';
        _hovered = object;

      }

    } else {

      if (_hovered !== null) {

        scope.dispatchEvent({type: 'hoveroff', object: _hovered});

        _domElement.style.cursor = 'auto';
        _hovered = null;

      }

    }

  }

  function onDocumentMouseDown(event) {

    event.preventDefault();

    _raycaster.setFromCamera(_mouse, _camera);

    var intersects = _raycaster.intersectObjects(_objects);

    if (intersects.length > 0) {

      _selected = intersects[0].object;

      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {

        _offset.copy(_intersection).sub(_selected.position);

      }

      _domElement.style.cursor = 'move';

      scope.dispatchEvent({type: 'dragstart', object: _selected});

    }


  }

  function onDocumentMouseUp(event) {

    event.preventDefault();

    if (_selected) {

      scope.dispatchEvent({type: 'dragend', object: _selected});

      _selected = null;

    }

    _domElement.style.cursor = 'auto';

  }

  activate();

  // API

  this.enabled = true;

  this.activate = activate;
  this.deactivate = deactivate;
  this.dispose = dispose;

  // Backward compatibility

  this.setObjects = function () {

    console.error('THREE.DragControls: setObjects() has been removed.');

  };

  this.on = function (type, listener) {

    console.warn('THREE.DragControls: on() has been deprecated. Use addEventListener() instead.');
    scope.addEventListener(type, listener);

  };

  this.off = function (type, listener) {

    console.warn('THREE.DragControls: off() has been deprecated. Use removeEventListener() instead.');
    scope.removeEventListener(type, listener);

  };

  this.notify = function (type) {

    console.error('THREE.DragControls: notify() has been deprecated. Use dispatchEvent() instead.');
    scope.dispatchEvent({type: type});

  };

};

THREE.DragControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.DragControls.prototype.constructor = THREE.DragControls;

