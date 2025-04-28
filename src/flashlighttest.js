import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Box
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
box.position.set(0, 1, 0);
scene.add(box);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Flashlight spotlight (NOT parented to camera)
const flashlight = new THREE.SpotLight(0xff00ff, 100, 30, Math.PI / 6, 0.3, 1);
flashlight.position.set(0, 3, 10);
flashlight.target.position.set(0, 1, 0); // Aim at the box
scene.add(flashlight);
scene.add(flashlight.target);

const helper = new THREE.SpotLightHelper(flashlight);
scene.add(helper);

// Ambient to slightly light everything
scene.add(new THREE.AmbientLight(0x111111));

function animate() {
  requestAnimationFrame(animate);
  helper.update();
  renderer.render(scene, camera);
}
animate();
