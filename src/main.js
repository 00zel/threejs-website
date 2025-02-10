// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';

// ✅ DECLARING CONSTANTS
let garments = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedGarment = null;
let movementEnabled = true;
const keysPressed = {};
const movementSpeed = 0.1;

// ✅ CAMERA START POSITION
const cameraStartPosition = new THREE.Vector3(0, 1.2, 6);
const cameraStartLookAt = new THREE.Vector3(0, 0, 0);

// 2️⃣ SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(cameraStartPosition);
camera.lookAt(cameraStartLookAt);

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
const backgroundTexture = textureLoader.load('/black.png');
scene.background = backgroundTexture;

// ✅ POST PROCESSING SETUP FOR GLOW EFFECT
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 1.2;
outlinePass.edgeGlow = 10;
outlinePass.edgeThickness = 70;
outlinePass.visibleEdgeColor.set(0xff00ae);
composer.addPass(outlinePass);

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
            console.log(`Loaded ${filePath}`, gltf.animations); // Debugging animation data
            const garment = gltf.scene;
            const animations = gltf.animations; // Get animations
            const mixer = new THREE.AnimationMixer(garment); // Create an animation mixer

            if (animations.length > 0) {
                const action = mixer.clipAction(animations[0]); // Play first animation
                action.setLoop(THREE.LoopRepeat);
                garment.userData.mixer = mixer;
                garment.userData.action = action;
                action.play();
            }

            garment.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xFFFFFF,
                        roughness: 0,
                        metalness: 1,
                        side: THREE.DoubleSide,
                    });
                }
            });

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

            garments.push({ object: garment, mixer });
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


// ✅ CLICK EVENT 
window.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);

    if (intersects.length > 0) {
        let clickedGarment = intersects[0].object;
        while (clickedGarment.parent && clickedGarment.parent !== scene) {
            clickedGarment = clickedGarment.parent;
        }
        selectedGarment = clickedGarment;

        console.log(`Clicked on: ${clickedGarment.name}`);
        // Placeholder for new dissolving effect
    }
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

// ✅ HOVER EFFECT - OUTLINE GLOW + STOP MOVEMENT
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);

    outlinePass.selectedObjects = [];
    let garmentHovered = false;

    garments.forEach(garment => {
        garment.object.userData.isHovered = false; // ✅ Reset all garments
    });

    if (intersects.length > 0) {
        let hoveredGarment = intersects[0].object;
        while (hoveredGarment.parent && hoveredGarment.parent !== scene) {
            hoveredGarment = hoveredGarment.parent;
        }
        outlinePass.selectedObjects = [hoveredGarment];

        // ✅ Find the correct garment object & update hover state
        garments.forEach(garment => {
            if (garment.object === hoveredGarment) {
                gsap.to(garment.object.userData, { isHovered: true, duration: 0.1 }); // ✅ Smooth transition in 0.5s
            } else {
                gsap.to(garment.object.userData, { isHovered: false, duration: 0.1 });
            }
        });

        console.log(`Hovered Garment: ${hoveredGarment.name}, isHovered: ${hoveredGarment.userData.isHovered}`); // ✅ Debugging log
        garmentHovered = true;
    }

    garments.forEach(garment => {
        gsap.to(garment.object.userData, { orbitSpeed: garmentHovered ? 0 : 0.002, duration: 1.5 });
    });
});


// ✅ ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // Time difference per frame

    // ✅ Check if ANY garment is hovered
    const anyHovered = garments.some(g => g.object.userData.isHovered);

    garments.forEach(({ object }, index) => {
        // ✅ Ensure each garment has a unique initial rotation offset
        if (object.userData.rotationOffset === undefined) {
            object.userData.rotationOffset = Math.random() * Math.PI * 2; // Unique staggered offset
        }

        // ✅ Define base speeds
        const baseOrbitSpeed = 0.002; // Normal orbit speed
        const baseRotationSpeed = 0.5; // ✅ Uniform rotation speed for all garments
        const hoverSlowdownSpeed = 0.1; // Slower rotation when hovered
        const stopSpeed = 0.0; // Fully stop orbit when any garment is hovered

        // ✅ If any garment is hovered, stop ALL orbiting
        const targetOrbitSpeed = anyHovered ? stopSpeed : baseOrbitSpeed;
        object.userData.orbitSpeed = THREE.MathUtils.lerp(object.userData.orbitSpeed || baseOrbitSpeed, targetOrbitSpeed, 0.1);

        // ✅ Ensure all garments have the same rotation speed (while maintaining staggered offsets)
        if (object.userData.rotationSpeed === undefined) {
            object.userData.rotationSpeed = baseRotationSpeed; // Set the same speed for all
        }

 // ✅ Ensure ALL garments rotate at the EXACT same speed
const fixedRotationSpeed = 0.5; // Set a fixed, uniform speed for all garments

if (object.userData.rotationSpeed === undefined) {
    object.userData.rotationSpeed = 0.5; // Set uniform rotation speed for all
}

// ✅ Ensure only the hovered garment slows down while others continue at normal speed
if (object.userData.rotationSpeed === undefined) {
    object.userData.rotationSpeed = 0.5; // Set a uniform default speed for all
}

const targetRotationSpeed = object.userData.isHovered ? 0.1 : 0.5; // Slow down only hovered garment
object.userData.rotationSpeed = THREE.MathUtils.lerp(object.userData.rotationSpeed, targetRotationSpeed, 0.01);

        // ✅ Apply orbit movement (stops for all if any garment is hovered)
        object.userData.orbitAngle += object.userData.orbitSpeed;
        object.position.set(
            Math.cos(object.userData.orbitAngle) * object.userData.orbitRadius,
            0,
            Math.sin(object.userData.orbitAngle) * object.userData.orbitRadius
        );

        // ✅ Apply self-rotation (ALL garments should rotate unless hovered)
        object.rotation.y += delta * object.userData.rotationSpeed + Math.sin(object.userData.rotationOffset) * 0.01;
    });

    controls.update();
    composer.render();
}


animate();
