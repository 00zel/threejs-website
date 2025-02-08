// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // ✅ NEW: Import Orbit Controls

// ✅ DECLARING CONSTANTS AT THE TOP
let garments = []; // Array to store all garments
const mixers = []; // Array to store animation mixers
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let lastScrollY = window.scrollY;

// ✅ MOVEMENT VARIABLES
const movementSpeed = 0.0; // ✅ Slow WASD movement speed
const moveDirection = { forward: 0, right: 0 };

// ✅ CAMERA START POSITION (For Reset)
const cameraStartPosition = new THREE.Vector3(0, 1.2, 6);
const cameraStartLookAt = new THREE.Vector3(0, 0, 0);

// 2️⃣ SCENE SETUP: Create a Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.2, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ✅ 3️⃣ ADD ORBIT CONTROLS (Click & Drag to Move Camera)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // ✅ Smooth camera motion
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2; // ✅ Prevent zooming too close
controls.maxDistance = 10; // ✅ Prevent zooming too far
controls.maxPolarAngle = Math.PI / 2; // ✅ Keep camera above ground

// // 3️⃣ LIGHTING: Keep strong lighting for contrast
const ambientLight = new THREE.AmbientLight(0xFCB8E3, 1); // ✅ Increased intensity
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xF5E6FF, 3);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 4️⃣ HDRI BACKGROUND 
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/env5.jpg');
scene.background = backgroundTexture;

// 5️⃣ GARMENT FILES
const garmentFiles = [
    { path: '/Puffer.glb', offset: 0 },
    { path: '/CharaM.glb', offset: 1 },
    { path: '/CharaW.glb', offset: 2 },
    { path: '/Jumpsuit.glb', offset: 3 },
    { path: '/NB1.glb', offset: 4 },
    { path: '/Marc.glb', offset: 5 },
    { path: '/A_CharaM_Spin.glb', offset: 6 },
    { path: '/CharaW.glb', offset: 7 },
    { path: '/Jumpsuit.glb', offset: 8 }
];

// 6️⃣ LOAD GARMENTS WITH CUSTOM/DEBUG MATERIAL
function loadGarment(filePath, index) {
    const loader = new GLTFLoader();
    loader.load(filePath, function (gltf) {
        const garment = gltf.scene;

        // ✅ APPLYING MATERIAL TO ALL MESHES
        const whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, 
            roughness: 1, 
            metalness: 0.2,
            side: THREE.DoubleSide // ✅ Ensures both sides render properly
        });

        garment.traverse((child) => {
            if (child.isMesh) {
                child.material = whiteMaterial;
            }
        });

        // POSITION GARMENTS IN ORBIT
        const radius = 2.5;
        const angle = (index / garmentFiles.length) * Math.PI * 2;
        garment.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        
        // ✅ ADDING CLO/MD ANIMATIONS
        let mixer = null;
        let animations = {};
        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(garment);
            
            gltf.animations.forEach((clip) => {
                if (clip.name.includes("FloatUp")) {
                    animations.floatUp = mixer.clipAction(clip);
                } else if (clip.name.includes("FloatDown")) {
                    animations.floatDown = mixer.clipAction(clip);
                } else if (clip.name.includes("Fall")) {
                    animations.fall = mixer.clipAction(clip);
                }
            });

            mixers.push(mixer);
        }

        garments.push({ object: garment, angle: angle, mixer: mixer, animations: animations });
        scene.add(garment);
    });
}

// 7️⃣ LOAD ALL GARMENTS INTO THE SCENE
garmentFiles.forEach((file, index) => {
    loadGarment(file.path, index);
});

// ✅ 9️⃣ HANDLE KEYBOARD INPUT (WASD + SPACEBAR)
document.addEventListener("keydown", (event) => {
    if (event.key === "w") moveDirection.forward = 1;
    if (event.key === "s") moveDirection.forward = -1;
    if (event.key === "a") moveDirection.right = -1;
    if (event.key === "d") moveDirection.right = 1;

    // ✅ SPACEBAR → RESET CAMERA POSITION
    if (event.key === " ") {
        camera.position.lerp(cameraStartPosition, 0.2); // ✅ Smoothly move camera back
        camera.lookAt(cameraStartLookAt);
        controls.target.copy(cameraStartLookAt); // ✅ Reset Orbit Controls Target
        controls.update();
    }
});

document.addEventListener("keyup", (event) => {
    if (event.key === "w" || event.key === "s") moveDirection.forward = 0;
    if (event.key === "a" || event.key === "d") moveDirection.right = 0;
});

// ✅ 1️⃣0️⃣ ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // ✅ FIXED WASD MOVEMENT
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    const moveStep = movementSpeed * delta * 60; // ✅ Ensures smooth movement

    // ✅ Move in the right direction
    camera.position.addScaledVector(direction, moveDirection.forward * moveStep);
    camera.position.addScaledVector(right, moveDirection.right * moveStep);

    controls.update(); // ✅ Keep Orbit Controls Functional

    garments.forEach((garment) => {
        const radius = 3;
        garment.angle += 0.0015;
        garment.object.position.x = Math.cos(garment.angle) * radius;
        garment.object.position.z = Math.sin(garment.angle) * radius;
        garment.object.rotation.y += 0.025;

        if (garment.mixer) {
            garment.mixer.update(delta);
        }
    });

    renderer.render(scene, camera);
}
animate();


/** 
 * 🔥 SCROLL INTERACTION - PLAY CLO/MD FLOATING ANIMATIONS
 */
function getClosestGarment() {
    let closestGarment = null;
    let closestDistance = Infinity;

    garments.forEach((garment) => {
        const distance = camera.position.distanceTo(garment.object.position);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestGarment = garment;
        }
    });

    return closestGarment;
}

window.addEventListener('scroll', () => {
    const scrollDirection = window.scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = window.scrollY;

    const closestGarment = getClosestGarment();

    if (closestGarment && closestGarment.animations) {
        if (scrollDirection === 'up' && closestGarment.animations.floatUp) {
            closestGarment.animations.floatUp.reset().play();
        } else if (scrollDirection === 'down' && closestGarment.animations.floatDown) {
            closestGarment.animations.floatDown.reset().play();
        }
    }
});

/** 
 * 🔥 CLICK INTERACTION - PLAY CLO/MD FALLING ANIMATION
 */
window.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedGarment = intersects[0].object.parent;

        if (clickedGarment.animations && clickedGarment.animations.fall) {
            clickedGarment.animations.fall.reset().play();
        }
    }
});

/** 
 * 🔥 HOVER INTERACTION (TBD - Leaving Empty for Now)
 */
