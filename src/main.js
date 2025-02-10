// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// ✅ DECLARING CONSTANTS
let garments = []; // Array to store all garments
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedGarment = null; // Track clicked garment
let movementEnabled = true; // Allow movement before selection
const keysPressed = {}; // WASD movement keys
const movementSpeed = 0.1; // WASD movement speed

// ✅ CAMERA START POSITION
const cameraStartPosition = new THREE.Vector3(0, 1, 4);
const cameraStartLookAt = new THREE.Vector3(0, 0, 0);

// 2️⃣ SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(cameraStartPosition);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ✅ ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;

// ✅ LIGHTING
const directionalLight = new THREE.DirectionalLight(0xffffff, 100);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// ✅ HDRI BACKGROUND
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/black.jpg');
scene.background = backgroundTexture;

// ✅ GARMENT FILES
const garmentFiles = [
    { path: '/Puffer.glb', offset: 0 },
    { path: '/CharaM.glb', offset: 1 },
    { path: '/CharaW.glb', offset: 2 },
    { path: '/Jumpsuit.glb', offset: 3 },
    { path: '/NB1.glb', offset: 4 }
];

// ✅ LOAD GARMENTS AND POSITION THEM
function loadGarment(filePath, index) {
    const loader = new GLTFLoader();
    loader.load(
        filePath,
        (gltf) => {
            const garment = gltf.scene;

            // Assign a default white material for testing
            const whiteMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 0,
                metalness: 1,
                side: THREE.DoubleSide,
            });

            garment.traverse((child) => {
                if (child.isMesh) {
                    child.material = whiteMaterial;
                }
            });

            // Position garments in orbit
            const radius = 2;
            const angle = (index / garmentFiles.length) * Math.PI * 2;
            garment.userData.orbitRadius = radius;
            garment.userData.orbitAngle = angle;
            garment.userData.orbitSpeed = 0.002;

            garment.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            garments.push({ object: garment });
            scene.add(garment);
        },
        undefined,
        (error) => {
            console.error(`❌ Failed to load garment: ${filePath}`, error);
        }
    );
}

garmentFiles.forEach((file, index) => {
    loadGarment(file.path, index);
});

// ✅ HOVER EFFECT - ADD GLOW & GRADUALLY STOP ORBIT MOVEMENT
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);

    let garmentHovered = false;
    garments.forEach(g => {
        g.object.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0x000000); // Reset glow
            }
        });
    });

    if (intersects.length > 0) {
        let hoveredGarment = intersects[0].object;
        while (hoveredGarment.parent && hoveredGarment.parent !== scene) {
            hoveredGarment = hoveredGarment.parent;
        }
        garmentHovered = true;
        hoveredGarment.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xFF00AE); // Add pink glow
            }
        });
    }

    garments.forEach(garment => {
        gsap.to(garment.object.userData, { orbitSpeed: garmentHovered ? 0 : 0.002, duration: 1.5 });
    });
});

// ✅ WASD MOVEMENT CONTROLS
window.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keysPressed[event.code] = false;
});

function handleMovement() {
    if (keysPressed['KeyW']) camera.position.z -= movementSpeed;
    if (keysPressed['KeyS']) camera.position.z += movementSpeed;
    if (keysPressed['KeyA']) camera.position.x -= movementSpeed;
    if (keysPressed['KeyD']) camera.position.x += movementSpeed;
    requestAnimationFrame(handleMovement);
}
handleMovement();

// ✅ CLICK EVENT TO MOVE CAMERA TO FRONT OF GARMENT
window.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);
    
    if (intersects.length > 0) {
        let clickedGarment = intersects[0].object;
        while (clickedGarment.parent && clickedGarment.parent !== scene) {
            clickedGarment = clickedGarment.parent;
        }
        selectedGarment = clickedGarment;

        const garmentFront = new THREE.Vector3();
        selectedGarment.getWorldPosition(garmentFront);

        const forwardVector = new THREE.Vector3(0, 0, 1);
        forwardVector.applyQuaternion(selectedGarment.quaternion);
        garmentFront.add(forwardVector.multiplyScalar(3));
        garmentFront.add(new THREE.Vector3(0, 1, 0)); // Adjust these values


        gsap.to(camera.position, { 
            x: garmentFront.x, 
            y: garmentFront.y, 
            z: garmentFront.z, 
            duration: 1.5, 
            onUpdate: () => camera.lookAt(selectedGarment.position) 
        });
    }
});

// ✅ ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    garments.forEach((garment) => {
        garment.object.userData.orbitAngle += garment.object.userData.orbitSpeed;
        garment.object.position.set(
            Math.cos(garment.object.userData.orbitAngle) * garment.object.userData.orbitRadius,
            0,
            Math.sin(garment.object.userData.orbitAngle) * garment.object.userData.orbitRadius
        );
    });
    controls.update();
    renderer.render(scene, camera);
}
animate();
