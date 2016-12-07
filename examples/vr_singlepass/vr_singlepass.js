/* globals Stats, dat*/

import ControlsTrackball from '../../src/controls/controls.trackball';
import HelpersLut        from '../../src/helpers/helpers.lut';
import HelpersVR         from '../../src/helpers/helpers.volumerendering';
import LoadersVolume     from '../../src/loaders/loaders.volume';

// standard global letiables
let controls, renderer, stats, camera, scene, preScene, bgScene, bgCamera, threeD;
let vrHelper;
let lut;
let ready = false;
let supportsExtension = true;
let target;

let myStack = {
  lut: 'random',
  opacity: 'random',
  steps: 256,
  alphaCorrection: 0.5,
  frequence: 0,
  amplitude: 0,
  interpolation: 1
};

function onMouseDown() {
  if (vrHelper && vrHelper.uniforms) {
    vrHelper.uniforms.uSteps.value = Math.floor(myStack.steps / 2);
    vrHelper.interpolation = 0;
  }
}

function onMouseUp() {
  if (vrHelper && vrHelper.uniforms) {
    // vrHelper.uniforms.uSteps.value = myStack.steps;
    vrHelper.interpolation = myStack.interpolation;
  }
}

function onWindowResize() {
  // update the camera
  camera.aspect = threeD.offsetWidth / threeD.offsetHeight;
  camera.updateProjectionMatrix();

  bgCamera.aspect = threeD.offsetWidth / threeD.offsetHeight;
  bgCamera.updateProjectionMatrix();

  const dpr = renderer.getPixelRatio();
  target.setSize(threeD.offsetWidth * dpr, threeD.offsetHeight * dpr);

  // notify the renderer of the size change
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);

  vrHelper.uniforms.uScreenWidth.value = threeD.offsetWidth;
  vrHelper.uniforms.uScreenHeight.value = threeD.offsetHeight;
}

function buildGUI() {
  let gui = new dat.GUI({
    autoPlace: false
  });

  let customContainer = document.getElementById('my-gui-container');
  customContainer.appendChild(gui.domElement);

  let stackFolder = gui.addFolder('Settings');
  let lutUpdate = stackFolder.add(myStack, 'lut', lut.lutsAvailable());
  lutUpdate.onChange(function (value) {
    lut.lut = value;
    vrHelper.uniforms.uTextureLUT.value.dispose();
    vrHelper.uniforms.uTextureLUT.value = lut.texture;
  });
  // init LUT
  lut.lut = myStack.lut;
  vrHelper.uniforms.uTextureLUT.value.dispose();
  vrHelper.uniforms.uTextureLUT.value = lut.texture;

  let opacityUpdate = stackFolder.add(myStack, 'opacity', lut.lutsAvailable('opacity'));
  opacityUpdate.onChange(function (value) {
    lut.lutO = value;
    vrHelper.uniforms.uTextureLUT.value.dispose();
    vrHelper.uniforms.uTextureLUT.value = lut.texture;
  });

  let stepsUpdate = stackFolder.add(myStack, 'steps', 0, 256).step(1);
  stepsUpdate.onChange(function (value) {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uSteps.value = value;
    }
  });

  let alphaCorrrectionUpdate = stackFolder.add(myStack, 'alphaCorrection', 0, 1).step(0.01);
  alphaCorrrectionUpdate.onChange(function (value) {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uAlphaCorrection.value = value;
    }
  });

  // let frequenceUpdate = stackFolder.add(myStack, 'frequence', 0, 1).step(0.01);
  // frequenceUpdate.onChange(function(value) {
  // if (vrHelper.uniforms) {
  //   vrHelper.uniforms.uFrequence.value = value;
  // }
  // });

  // let amplitudeUpdate = stackFolder.add(myStack, 'amplitude', 0, 0.5).step(0.01);
  // amplitudeUpdate.onChange(function(value) {
  // if (vrHelper.uniforms) {
  //   vrHelper.uniforms.uAmplitude.value = value;
  // }
  // });

  let interpolation = stackFolder.add(vrHelper, 'interpolation', 0, 1).step(1);

  stackFolder.open();
}

// this function is executed on each animation frame
function animate() {
  // render
  controls.update();

  if (ready) {

    renderer.autoClear = false;
    renderer.clear();
    renderer.clearTarget(target, true, true, false);
    renderer.render(preScene, camera, target);

    renderer.render(bgScene, bgCamera);
    renderer.render(scene, camera);
  }

  stats.update();

  // request new frame
  requestAnimationFrame(function () {
    animate();
  });
}

function initFirstPass() {
  threeD = document.getElementById("r3d");
  const canvas = document.querySelector('canvas');

  // renderer
  let gl;
  try {
    gl = canvas.getContext('webgl2');
  } catch (err) {
    console.error(err);
  }
  const isWebGL2 = Boolean(gl);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    context: gl,
    alpha: true,
  });

  if (!renderer.extensions.get('WEBGL_depth_texture')) {
    supportsExtension = false;
    alert("webgl depth texture extension not supported");
    return;
  }
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);

  // camera
  camera = new THREE.PerspectiveCamera(45, threeD.offsetWidth / threeD.offsetHeight, 1, 10000);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = -550;


  // render target
  target = new THREE.WebGLRenderTarget(threeD.offsetWidth, threeD.offsetHeight);
  target.texture.format = THREE.RGBAFormat;
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.texture.generateMipmaps = false;
  target.stencilBuffer = false;
  target.depthBuffer = true;
  target.depthTexture = new THREE.DepthTexture();
  target.depthTexture.type = isWebGL2 ? THREE.FloatType : THREE.UnsignedShortType;

  // Our scene
  preScene = new THREE.Scene();

  // Setup some geometries
  const geometry = new THREE.TorusKnotGeometry(50, 10, 128, 64);
  const material = new THREE.MeshLambertMaterial({color: 'green'});
  const mesh = new THREE.Mesh(geometry, material);

  // Lights
  const directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.position.set(1, 1, -10);
  preScene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  preScene.add(ambientLight);

  preScene.add(mesh);
}

function init() {

  const bgVertShader = `
varying vec2 vUv;
    
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

  const bgFragShader = `
#include <packing>

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

varying vec2 vUv;

float readDepth (sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    gl_FragColor = texture2D(tDiffuse, vUv);

//    float depth = readDepth(tDepth, vUv);
//    gl_FragColor.rgb = vec3(depth);
//    gl_FragColor.a = 1.0;
}
`;

  bgScene = new THREE.Scene();

  bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const bgMaterial = new THREE.ShaderMaterial({
    vertexShader: bgVertShader.trim(),
    fragmentShader: bgFragShader.trim(),
    uniforms: {
      cameraNear: {value: camera.near},
      cameraFar: {value: camera.far},
      tDiffuse: {value: target.texture},
      tDepth: {value: target.depthTexture}
    },
    depthTest: false,
    depthWrite: false
  });
  // const bgMaterial = new THREE.MeshBasicMaterial({
  //     "color": "red",
  //     depthTest: false,
  //     depthWrite: false
  // });
  const bgPlane = new THREE.PlaneGeometry(2, 2);
  const bgMesh = new THREE.Mesh(bgPlane, bgMaterial);
  bgScene.add(bgMesh);

  // scene
  scene = new THREE.Scene();

  // stats
  stats = new Stats();
  threeD.appendChild(stats.domElement);

  // controls
  controls = new ControlsTrackball(camera, threeD);
  controls.rotateSpeed = 5.5;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  threeD.addEventListener('mousedown', onMouseDown, false);
  threeD.addEventListener('mouseup', onMouseUp, false);
  window.addEventListener('resize', onWindowResize, false);

  // start rendering loop
  animate();
}

window.onload = function () {

  // init threeJS
  initFirstPass();
  init();

  let files = ['https://cdn.rawgit.com/FNNDSC/data/master/nifti/eun_brain/eun_uchar_8.nii.gz'];

  // files = ['http://127.0.0.1:8080/brainc.nii']

  //   let data = [
  //  'scan-00109_rec-01a.nii_.gz'
  //   // '7002_t1_average_BRAINSABC.nii.gz'
  // ];

  // let files = data.map(function(v) {
  //   return '../../data/nii/' + v;
  // });

  // load sequence for each file
  // instantiate the loader
  // it loads and parses the dicom image
  // hookup a progress bar....
  let loader = new LoadersVolume(threeD);
  let seriesContainer = [];
  let loadSequence = [];
  files.forEach((url) => {
    loadSequence.push(
      Promise.resolve()
      // fetch the file
        .then(() => loader.fetch(url))
        .then((data) => loader.parse(data))
        .then((series) => {
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
    .then(() => {
      loader.free();
      loader = null;

      let series = seriesContainer[0].mergeSeries(seriesContainer)[0];
      // get first stack from series
      let stack = series.stack[0];

      vrHelper = new HelpersVR(stack);
      // scene
      scene.add(vrHelper);

      // CREATE LUT
      lut = new HelpersLut('my-lut-canvases');
      lut.luts = HelpersLut.presetLuts();
      lut.lutsO = HelpersLut.presetLutsO();
      // update related uniforms
      vrHelper.uniforms.uTextureLUT.value = lut.texture;
      vrHelper.uniforms.uLut.value = 1;
      vrHelper.uniforms.uSteps.value = myStack.steps;
      vrHelper.uniforms.uTextureDepth.value = target.depthTexture;
      vrHelper.uniforms.uCameraNear.value = camera.near;
      vrHelper.uniforms.uCameraFar.value = camera.far;
      vrHelper.uniforms.uScreenWidth.value = threeD.offsetWidth;
      vrHelper.uniforms.uScreenHeight.value = threeD.offsetHeight;

      // update camrea's and interactor's target
      let centerLPS = stack.worldCenter();
      camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
      camera.updateProjectionMatrix();
      controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

      // create GUI
      buildGUI();

      // screenshot experiment
      let screenshotElt = document.getElementById('screenshot');
      screenshotElt.addEventListener('click', function () {
        controls.update();

        if (ready) {
          renderer.render(scene, camera);
        }

        let screenshot = renderer.domElement.toDataURL();
        screenshotElt.download = 'AMI-' + Date.now() + '.png';
        screenshotElt.href = screenshot;
      });

      // good to go
      ready = true;
    })
    .catch((error) => window.console.log(error));

};
