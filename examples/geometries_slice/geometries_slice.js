/* globals Stats, dat*/

import ControlsTrackball from '../../src/controls/controls.trackball';
import HelpersStack from '../../src/helpers/helpers.stack';
import LoadersVolume from '../../src/loaders/loaders.volume';

// standard global letiables
let controls, renderer, stats, scene, camera, stackHelper, particleLight, line, threeD, torusKnotGeometry, torusKnot, sliced, slicedGeometry, slicedMaterial, slicePlane;

function componentToHex(c) {
  let hex = c.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}


function updateGeometries() {
  if (stackHelper) {
    // move the "light"
    // update light position
    let timer = Date.now() * 0.0001;
    particleLight.position.x = Math.sin(timer * 7) * 70;
    particleLight.position.y = Math.cos(timer * 5) * 80;
    particleLight.position.z = Math.cos(timer * 3) * 90;

    // re-draw the line
    line.geometry.vertices[0] = stackHelper.slice.planePosition;
    line.geometry.vertices[1] = particleLight.position;
    line.geometry.verticesNeedUpdate = true;

    // update plane direction...
    let dirLPS = new THREE.Vector3(
      particleLight.position.x - stackHelper.slice.planePosition.x,
      particleLight.position.y - stackHelper.slice.planePosition.y,
      particleLight.position.z - stackHelper.slice.planePosition.z
    ).normalize();

    // update slice and THEN its border
    stackHelper.slice.planeDirection = dirLPS;
    // update border with new slice
    stackHelper.border.helpersSlice = stackHelper.slice;


    // update colors based on planeDirection
    let color = rgbToHex(
      Math.round(Math.abs(255*dirLPS.x)),
      Math.round(Math.abs(255*dirLPS.y)),
      Math.round(Math.abs(255*dirLPS.z)));
    stackHelper.bbox.color = color;
    stackHelper.border.color = color;
    particleLight.material.color.set(color);
    line.material.color.set(color);

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

  }
}

function init() {
  // this function is executed on each animation frame
  function animate() {
    updateGeometries();

    controls.update();
    renderer.render(scene, camera);
    stats.update();

    // request new frame
    requestAnimationFrame(function() {
      animate();
    });
  }

  // renderer
  threeD = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: true,
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
  camera = new THREE.PerspectiveCamera(45, threeD.offsetWidth / threeD.offsetHeight, 1, 1000);
  camera.position.x = 250;
  camera.position.y = 250;
  camera.position.z = 100;

  // controls
  controls = new ControlsTrackball(camera, threeD);
  controls.rotateSpeed = 1.4;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = false;
  controls.dynamicDampingFactor = 0.3;

  particleLight = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({color: 0xFFF336}));
  scene.add(particleLight);

  // knot
  torusKnotGeometry = new THREE.TorusKnotGeometry(30, 8, 128, 64);
  const material = new THREE.MeshLambertMaterial({color: 'green'});
  torusKnot = new THREE.Mesh(torusKnotGeometry, material);
  torusKnot.renderOrder = 20;
  // torusKnot.position.set(0, 0, 20);
  scene.add(torusKnot);

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
    depthTest: false
  });
  slicedMaterial.linewidth = 3;
  sliced = new THREE.LineSegments(slicedGeometry, slicedMaterial);
  scene.add(sliced);

  animate();
}

window.onload = function() {
  // init threeJS...
  init();

  // instantiate the loader
  // it loads and parses the dicom image
  let loader = new LoadersVolume(threeD);

  let t2 = [
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
    '36748256',
  ];

  let files = t2.map(function(v) {
    return 'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/' + v;
  });

  loader.load(files)
  .then(function() {
    let series = loader.data[0].mergeSeries(loader.data)[0];
    let stack = series.stack[0];
    stackHelper = new HelpersStack(stack);
    let centerLPS = stackHelper.stack.worldCenter();
    stackHelper.slice.aabbSpace = 'LPS';
    stackHelper.slice.planePosition.x = centerLPS.x;
    stackHelper.slice.planePosition.y = centerLPS.y;
    stackHelper.slice.planePosition.z = centerLPS.z;
    scene.add(stackHelper);

    // LINE STUFF
    let materialLine = new THREE.LineBasicMaterial();
    let geometryLine = new THREE.Geometry();
    stackHelper.slice.updateMatrixWorld();
    geometryLine.vertices.push(stackHelper.slice.position);
    geometryLine.vertices.push(particleLight.position);
    geometryLine.verticesNeedUpdate = true;
    line = new THREE.Line(geometryLine, materialLine);
    scene.add(line);

    // update camrea's and control's target
    camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
    camera.updateProjectionMatrix();
    controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

    // create GUI
    let gui = new dat.GUI({
      autoPlace: false,
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

    loader.free();
    loader = null;

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize, false);
  })
  .catch(function(error) {
    window.console.log('oops... something went wrong...');
    window.console.log(error);
  });
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
// slice mesh
//

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

function facePoints(geom, face, faceIndex) {
  const uvs = geom.faceVertexUvs[0];
  return ['a', 'b', 'c'].map(function(key, i) {
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

const intersectPlane = function(p1, p2, plane) {
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
