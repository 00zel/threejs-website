import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loaderTexture = new THREE.TextureLoader();
const envMap = loaderTexture.load('/public/env.jpg'); // Add an HDRI or simple image
scene.background = envMap;



// Add lighting
const light = new THREE.AmbientLight(0xffffff, 2);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Load GLB model
const loader = new GLTFLoader();
let garment; // Store the garment mesh

loader.load('/Dress2.glb', function (gltf) {
    garment = gltf.scene; // Store the loaded garment mesh
    garment.scale.set(1, 1, 1); // Adjust size if needed
    scene.add(garment);
}, undefined, function (error) {
    console.error("Error loading model:", error);
});

// Camera position
camera.position.set(0, 0.8, 2);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    renderer.render(scene, camera);
}
animate();
