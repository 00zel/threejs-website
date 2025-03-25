// IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import Stats from 'https://cdn.skypack.dev/stats.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// SETTINGS AND CONSTANTS
const SETTINGS = {
  CAMERA: {
    START_POSITION: new THREE.Vector3(0, 1.2, 6),
    TARGET: new THREE.Vector3(0, 0.5, 0),
    MOVEMENT_SPEED: 0.1
  },
  ORBIT: {
    BASE_SPEED: 0.002
  },
  ROTATION: {
    BASE_SPEED: 1
  },
  GLOW: {
    DEFAULT: 0.5,
    MAX: 3.0,
    HOLD_DURATION: 1000, // ms until max glow
    ACTIVATION_HOLD: 500 // ms to hold before selection activates
  },
  DEBUG: false // Set to false in production
};

//  DECLARING CONSTANTS
let garments = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedGarment = null;
let movementEnabled = true;
const keysPressed = {};
let avatarReplaced = false; // Flag to track if the avatar has been replaced
let currentHoveredGarment = null;
let garmentSelected = false; // Add this flag at the top with your other constants
const loadingManager = new THREE.LoadingManager();
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN path
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);
const BLOOM_LAYER = 1;



// Add these variables at the top with your other declarations
let isMouseDown = false;
let mouseDownStartTime = 0;

// Add this at the top with other constants
const lightHelpers = []; // To track all light helpers

// Create a new Stats instance.
const stats = new Stats();
// Optionally, set which panel to show:
// 0: fps, 1: ms, 2: mb, 3+: custom
stats.showPanel(0); 

// Append the stats DOM element to the body.
document.body.appendChild(stats.dom);

// CAMERA START POSITION
const cameraStartPosition = new THREE.Vector3(0, 1.2, 6);
const cameraStartLookAt = new THREE.Vector3(0, 0, 0);

// SCENE SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// CAMERA SETUP (ensure it looks at the origin )
camera.position.set(0, 1.2, 6);  // Position camera at (0, 1.2, 6), making it look at the center of the scene
camera.lookAt(new THREE.Vector3(0, 0, 0));  // Make sure it looks at the origin (0, 0, 0)

// 🎯 Attach a flashlight to the camera
const cameraFlashlight = new THREE.SpotLight(0xff0000, 60000, 50, Math.PI / 6, 0.8, 1); // color, intensity, distance, angle, penumbra, decay

cameraFlashlight.position.set(0, 0, 0);
cameraFlashlight.target.position.set(0, 0, -1);
cameraFlashlight.castShadow = true;

camera.add(cameraFlashlight);

// Set up the flashlight target
const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 0, -5); // Aim 5 units in front of the camera
camera.add(flashlightTarget);
cameraFlashlight.target = flashlightTarget;

camera.add(cameraFlashlight);
const flashlightHelper = new THREE.SpotLightHelper(cameraFlashlight);
scene.add(flashlightHelper);


const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add these renderer settings near the beginning of your code, right after creating the renderer
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;

//ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;  // Enable screen space panning
controls.minDistance = 0.5;          // Allow closer zoom
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI;    // Allow full vertical rotation
controls.target.set(0, 0.5, 0);      // Set target to face height instead of center

// ENVIRONMENTAL LIGHTING

// const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1); // Soft white light
// scene.add(ambientLight);

// FUNCTION TO LOAD THE AVATAR
function loadAvatar() {
    gltfLoader.load(  
        '/public/Avatar_Base2.glb',
        (gltf) => {
            const avatar = gltf.scene;
            processPBRMaterials(avatar); // Add this line
            
            // Scale & Position Avatar
            avatar.scale.set(0.008, 0.008, 0.008);
            avatar.position.set(0, -0.6, 0);

            // ATTACH LIGHTS TO THE AVATAR
             const keyLight = new THREE.PointLight(0xFFFFFF, 15, 10, 2); // white
            keyLight.position.set(80, 140, 80);
            keyLight.castShadow = true;

            const rimLight = new THREE.PointLight(0xFFFFFF, 4, 10, 2); // FFA0B0 purple
            rimLight.position.set(-80, 130, -80);

            const fillLight = new THREE.PointLight(0xFFFFFF, 4, 10, 2); // DCFFCB green 
            fillLight.position.set(50, 80, -50);

            avatar.add(keyLight, rimLight, fillLight);


            // Add visual helpers for debugging light positions
        //    const keyLightHelper = new THREE.PointLightHelper(keyLight, 10, 0xff0000);
         //   scene.add(keyLightHelper);

        //    const rimLightHelper = new THREE.PointLightHelper(rimLight, 10, 0x00ff00);
        //    scene.add(rimLightHelper);

        //    const fillLightHelper = new THREE.PointLightHelper(fillLight, 10, 0x0000ff);
        //    scene.add(fillLightHelper);

           window.avatar = avatar;
           scene.add(avatar);
        },
    );
}


window.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.map(g => g.object), true);

    if (intersects.length > 0) {
        let clickedGarment = intersects[0].object;

        // Traverse up to find the main garment group
        while (clickedGarment.parent && clickedGarment.parent !== scene) {
            clickedGarment = clickedGarment.parent;
        }
        selectedGarment = clickedGarment;

        console.log("🧐 Selected Garment Object:", selectedGarment);
        console.log("🧐 Selected Garment Name:", selectedGarment?.name);
        console.log("🧐 Parent Name:", selectedGarment?.parent?.name);
        console.log("🧐 Full Object Structure:", selectedGarment);

        // Extract a valid garment name
        let garmentName = selectedGarment.name?.trim().toLowerCase() || "";

        // 🔍 If the name is empty, check the parent
        if (!garmentName && selectedGarment.parent) {
            console.warn("⚠️ No valid garment name found. Checking parent...");
            garmentName = selectedGarment.parent.name?.trim().toLowerCase() || "";
        }

        // 🔍 If still empty, check children
        if (!garmentName && selectedGarment.children.length > 0) {
            console.warn("⚠️ No name found. Checking first child...");
            garmentName = selectedGarment.children[0].name?.trim().toLowerCase() || "";
        }

        // 🔍 If still empty, fallback to file path
        if (!garmentName && selectedGarment.userData.sourceFile) {
            console.warn("⚠️ Using file path as name...");
            garmentName = selectedGarment.userData.sourceFile.split('/').pop().split('.')[0].toLowerCase();
        }

        console.log(`Extracted Garment Name: "${garmentName}"`);

        // 🛑 **Prevent selecting an empty name**
        if (!garmentName) {
            console.error("❌ Cannot determine garment name. Skipping posed avatar replacement.");
            return;
        }

        // Hide all other garments
        garments.forEach(({ object }) => {
            object.visible = (object === selectedGarment);
            object.userData.isClickable = (object === selectedGarment);
        });

        // Disable clicking on hidden garments
        garments = garments.filter(({ object }) => object.userData.isClickable);

        // 🔍 **Find the correct posed avatar**
        let posedAvatarUrl = garmentToPosedAvatarMap[garmentName];

        if (!posedAvatarUrl) {
            console.warn(`❌ No exact match found for "${garmentName}". Checking fuzzy matches...`);

            Object.keys(garmentToPosedAvatarMap).forEach(key => {
                if (garmentName.includes(key) || key.includes(garmentName)) {
                    posedAvatarUrl = garmentToPosedAvatarMap[key];
                    console.log(`Fuzzy match found: "${garmentName}" -> "${key}"`);
                }
            });
        }

        // Only replace the avatar if a valid match is found
        if (posedAvatarUrl) {
            console.log(`🧵 Replacing with posed avatar: ${posedAvatarUrl}`);
            replaceAvatar(selectedGarment, posedAvatarUrl);
            avatarReplaced = true;
        } else {
            console.error(`❌ No posed avatar found for garment: "${garmentName}"`);
            console.log(`🔎 Available Keys:`, Object.keys(garmentToPosedAvatarMap));
        }
    } else {
        console.warn("❌ No garment detected under the click.");
    }
});

// Function to replace the avatar with the clicked garment

function replaceAvatar(garment, posedAvatarUrl) {
    console.log("Starting avatar replacement...");
    console.log("URL:", posedAvatarUrl);
    
    if (window.avatar) {
        console.log("Removing old avatar");
        scene.remove(window.avatar);
        window.avatar = null;
    }

    gltfLoader.load(posedAvatarUrl,
        (gltf) => {
            console.log("Successfully loaded new avatar");
            const newAvatar = gltf.scene;
            processPBRMaterials(newAvatar); // Add this line
            newAvatar.scale.set(0.008, 0.008, 0.008);
            newAvatar.position.set(0, -0.6, 0);
            
            // Add the same lights as the original avatar
            const keyLight = new THREE.PointLight(0xFFFFFF, 13, 10, 2); // white color, intensity, distance, decay
            keyLight.position.set(-100, 150, 100);
            keyLight.castShadow = true;

            const rimLight = new THREE.PointLight(0xFFFFFF, 13, 50, 1); // purple FFA0B0
            rimLight.position.set(-100, 130, -100);

            const fillLight = new THREE.PointLight(0xFFFFFF, 13, 50, 1); // green DCFFCB
            fillLight.position.set(100, 150, -100);

            const highLight = new THREE.PointLight(0xFFFFFF, 15, 50, 1);
            highLight.position.set(100, 130, 100); 

            newAvatar.add(keyLight, rimLight, fillLight, highLight);
            
            // Optional: Add debug helpers if needed
            
            const keyLightHelper = new THREE.PointLightHelper(keyLight, 10, 0xff0000);
            const rimLightHelper = new THREE.PointLightHelper(rimLight, 10, 0x00ff00);
            const fillLightHelper = new THREE.PointLightHelper(fillLight, 10, 0x0000ff);
            const highLightHelper = new THREE.PointLightHelper(fillLight, 10, 0x0f0f0f);
            scene.add(keyLightHelper, rimLightHelper, fillLightHelper);
            
            console.log("Avatar material check:");
            gltf.scene.traverse(node => {
                if (node.isMesh) {
                    console.log(`- ${node.name}: ${node.material.type}`, 
                        node.material.map ? "✓ has texture" : "⚠️ no texture");
                }
            });
            
            window.avatar = newAvatar;
            scene.add(newAvatar);
        },
        (progress) => console.log("Loading progress:", progress),
        (error) => console.error("Error loading avatar:", error)
    );
}

// Mapping between garments and their associated posed avatars
const garmentToPosedAvatarMap = {
    'jumpsuit': '/public/Jumpsuit_Posed.glb',
    'charam': '/public/CharaM_Posed.glb',
    'domi': '/public/Domi_Posed.glb',
    'puffer': '/public/Puffer_Posed.glb',
    'nb1': '/public/NB1_Posed.glb'
};

// ALL THE FUNCTION TO LOAD THE AVATAR
loadAvatar();


// HDRI BACKGROUND
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/black.png');
scene.background = backgroundTexture;

// POST PROCESSING SETUP FOR GLOW EFFECT
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Update outlinePass settings to be more performant but visible
const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 0.5;      // Increased from 0.2
outlinePass.edgeGlow = 10;        // Reduced from 1
outlinePass.edgeThickness = 1;     // Reduced from 10
outlinePass.pulsePeriod = 0;       // Disable pulse effect
outlinePass.visibleEdgeColor.set(0xFFFFFF); //fddeff
outlinePass.hiddenEdgeColor.set(0x222222);
composer.addPass(outlinePass);

function applyMaterialMaps(mesh, materialMaps) {
    const textureLoader = new THREE.TextureLoader();

    if (Array.isArray(mesh.material) && Array.isArray(materialMaps)) {
        // If the mesh has multiple materials, assign the correct texture set to each one
        mesh.material.forEach((material, index) => {
            const maps = materialMaps[index] || {}; // Get corresponding texture set for each material
            material.map = maps.diffuse ? textureLoader.load(maps.diffuse) : null;
            material.normalMap = maps.normal ? textureLoader.load(maps.normal) : null;
            material.roughnessMap = maps.roughness ? textureLoader.load(maps.roughness) : null;
            material.metalnessMap = maps.metalness ? textureLoader.load(maps.metalness) : null;
            material.alphaMap = maps.alpha ? textureLoader.load(maps.alpha) : null;
            material.transparent = !!maps.alpha;
            material.needsUpdate = true;
        });
    } else {
        // If the mesh has only one material, apply a single texture set
        const maps = materialMaps[0] || materialMaps || {};
        mesh.material.map = maps.diffuse ? textureLoader.load(maps.diffuse) : null;
        mesh.material.normalMap = maps.normal ? textureLoader.load(maps.normal) : null;
        mesh.material.roughnessMap = maps.roughness ? textureLoader.load(maps.roughness) : null;
        mesh.material.metalnessMap = maps.metalness ? textureLoader.load(maps.metalness) : null;
        mesh.material.alphaMap = maps.alpha ? textureLoader.load(maps.alpha) : null;
        mesh.material.transparent = !!maps.alpha;
        mesh.material.needsUpdate = true;
    }
}

// Utility function to apply normal maps to a mesh based on ID 
function applyNormalMap(mesh, normalMapPath) {
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load(normalMapPath);

    if (Array.isArray(mesh.material)) {
        // If the mesh has multiple material groups
        mesh.material.forEach(material => {
            material.normalMap = normalMap;
            material.needsUpdate = true;
        });
    } else {
        // If the mesh has a single material
        mesh.material.normalMap = normalMap;
        mesh.material.needsUpdate = true;
    }
}
function applyMaterialToAvatar() {
    const avatar = window.avatar;
    if (!avatar) return;

    avatar.traverse((child) => {
        if (child.isMesh) {

            child.castShadow = false;
            child.receiveShadow = true;
       // Optional: Log materials for debugging
       console.log(`📦 Mesh: ${child.name}, Material:`, child.material);
        }
    });
}

//POST PROCESSING EFFECTS
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2,    // strength
    0.8,    // radius
    0.3     // threshold
);

bloomPass.threshold = 0.9;     // Only bloom pixels brighter than this value (1.0 = white)
bloomPass.strength = 0.3;      // Keep bloom strength moderate
bloomPass.radius = 0.4;        // Keep the glow radius tight

composer.addPass(bloomPass);

// ✅ GARMENT FILES
const garmentFiles = [
    { path: '/Puffer.glb', offset: 0 },
    { path: '/CharaM.glb', offset: 1 },
    { path: '/Domi.glb', offset: 2 },
    { path: '/Jumpsuit.glb', offset: 3 },
    { path: '/NB1.glb', offset: 4 }
];


// LOAD GARMENTS AND POSITION THEM
function loadGarment(filePath, index) {
    const loader = new GLTFLoader();
    loader.load(
      filePath,
      (gltf) => {
        const garment = gltf.scene;
        processPBRMaterials(garment); 
        
        // Add these two lines to fix the Puffer mesh issue
        garment.userData.sourceFile = filePath;
        garment.name = filePath.split('/').pop().split('.')[0].toLowerCase();
        
        // Basic garment setup
        garment.scale.set(0.5, 0.5, 0.5);
        const radius = 2;
        const angle = (index / garmentFiles.length) * Math.PI * 2;
        garment.userData.orbitRadius = radius;
        garment.userData.orbitAngle = angle;
        garment.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
                
        // 1. Key light - Main light, brightest, 45° front-right
        const keyLight = new THREE.PointLight(0xffffff, 1, 1); // white color, intensity, distance
        keyLight.position.set(1, 1, 1); // x (negative left of garment, positive right), y (height), z (negative behind garment, positive front)
        garment.add(keyLight);
        
        // 2. Fill light - Softer light, opposite the key light
        const fillLight = new THREE.PointLight(0xFFFFFF, 1, 1); // cyan c9ffed
        fillLight.position.set(-1, 1, 1); // 
        garment.add(fillLight);
        
        // 3. Rim light - Behind subject for edge definition
    //    const rimLight = new THREE.PointLight(0xFFFFFF, 1.5, 1); // pink ffd6f6
    //    rimLight.position.set(1, 1, -1);
    //    garment.add(rimLight);
        
        // 4. Highlight light - Top light for specific highlights
      //  const highlightLight = new THREE.PointLight(0xFFFFFF, 1.5, 1); // ice blue D7F1FF
      //  highlightLight.position.set(-1, 1, -1);
     //   garment.add(highlightLight);
        
        // Light helpers - only create them if debug mode is enabled
        if (SETTINGS.DEBUG) {
            const keyHelper = new THREE.PointLightHelper(keyLight, 0.3);
            const fillHelper = new THREE.PointLightHelper(fillLight, 0.3);
          //  const rimHelper = new THREE.PointLightHelper(rimLight, 0.3);
          //  const highlightHelper = new THREE.PointLightHelper(highlightLight, 0.3);
            
            lightHelpers.push(keyHelper, fillHelper);
            scene.add(keyHelper, fillHelper);
            
            // Add cleanup method to the garment
            garment.userData.cleanupHelpers = () => {
                lightHelpers.forEach(helper => {
                    scene.remove(helper);
                    helper.dispose && helper.dispose();
                });
            };
        }

        // Update helpers position
        const updateHelpers = () => {
            // Only run this if we're in debug mode and helpers exist
            if (SETTINGS.DEBUG) {
              // Access helpers through the outer scope variables
              lightHelpers.forEach(helper => {
                if (helper && helper.update) helper.update();
              });
            }
          };
        
        garment.userData.updateHelpers = updateHelpers;

        garments.push({ object: garment });
        scene.add(garment);
      }
    );
}

// Add this helper function to toggle debug visualizations
function toggleDebugHelpers(show) {
    lightHelpers.forEach(helper => {
        helper.visible = show;
    });
}

garmentFiles.forEach((file, index) => {
    loadGarment(file.path, index);
});


//  WASD MOVEMENT CONTROLS
window.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keysPressed[event.code] = false;
});

function handleMovement() {
    if (keysPressed['KeyW']) camera.position.z -= SETTINGS.CAMERA.MOVEMENT_SPEED;
    if (keysPressed['KeyS']) camera.position.z += SETTINGS.CAMERA.MOVEMENT_SPEED;
    if (keysPressed['KeyA']) camera.position.x -= SETTINGS.CAMERA.MOVEMENT_SPEED;
    if (keysPressed['KeyD']) camera.position.x += SETTINGS.CAMERA.MOVEMENT_SPEED;
    requestAnimationFrame(handleMovement);
}
handleMovement();

// Add this helper function near the top
function getObjectUnderMouse() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);
    
    if (intersects.length === 0) {
        return null;
    }
    
    // Find the parent garment
    let selectedObject = intersects[0].object;
    while (selectedObject.parent && selectedObject.parent !== scene) {
        selectedObject = selectedObject.parent;
    }
    
    return selectedObject;
}
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    if (!isMouseDown) {
        const hoveredGarment = getObjectUnderMouse();
        outlinePass.selectedObjects = hoveredGarment ? [hoveredGarment] : [];
        outlinePass.edgeStrength = hoveredGarment ? SETTINGS.GLOW.DEFAULT : 0;
        
        // Update hover states
        garments.forEach(garment => {
            garment.object.userData.isHovered = (garment.object === hoveredGarment);
        });
    }
});

// CLICK-AND-HOLD EFFECT: Gradually Increase Glow
window.addEventListener('mousedown', (event) => {
    if (avatarReplaced) return; // Prevent further interactions if the avatar has already been replaced

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.map(g => g.object), true);

    if (intersects.length > 0) {
        let clickedGarment = intersects[0].object;
        while (clickedGarment.parent && clickedGarment.parent !== scene) {
            clickedGarment = clickedGarment.parent;
        }
        
        // Start the glow effect
        isMouseDown = true;
        mouseDownStartTime = Date.now();
        selectedGarment = clickedGarment;
        outlinePass.selectedObjects = [selectedGarment];
        outlinePass.edgeStrength = SETTINGS.GLOW.DEFAULT; 
    }
});

window.addEventListener('mouseup', (event) => {
    if (isMouseDown && selectedGarment) {
        const holdDuration = Date.now() - mouseDownStartTime;
        
        if (holdDuration > SETTINGS.GLOW.ACTIVATION_HOLD) { // If held for more than 500ms
           
            // Hide all other garments except the selected one
            garments.forEach(({ object }) => {
                object.visible = (object === selectedGarment);
            });

            // Get the garment name for avatar replacement
            let garmentName = selectedGarment.name?.trim().toLowerCase() || "";
            if (!garmentName) {
                garmentName = selectedGarment.userData.sourceFile?.split('/').pop().split('.')[0].toLowerCase() || "";
            }

            // Find and load the corresponding posed avatar
            const posedAvatarUrl = garmentToPosedAvatarMap[garmentName];
            if (posedAvatarUrl) {
                replaceAvatar(selectedGarment, posedAvatarUrl);
                avatarReplaced = true;
            }
        } else {
            // If just clicking quickly, reset the glow
            fadeOutGlowEffect(selectedGarment, 500);
        }
    }
    
    // Reset mouse state
    isMouseDown = false;
});

// Add key controls for camera positioning
window.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'KeyW':
            camera.position.z -= SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'KeyS':
            camera.position.z += SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'KeyA':
            camera.position.x -= SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'KeyD':
            camera.position.x += SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'KeyQ':  // Move camera up
            camera.position.y += SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'KeyE':  // Move camera down
            camera.position.y -= SETTINGS.CAMERA.MOVEMENT_SPEED;
            break;
        case 'Space':  // Reset camera to face view
            gsap.to(controls.target, {
                x: 0,
                y: 0.5,  // Face height
                z: 0,
                duration: 1,
                ease: "power2.out"
            });
            gsap.to(camera.position, {
                x: 0,
                y: 1.2,
                z: 3,
                duration: 1,
                ease: "power2.out"
            });
            break;
    }
});

// SPARKLE EFFECT SYSTEM
function createSparkleEffect() {
    // Settings for particles - increase size for more visibility
    const particleCount = 20;
    const particleSize = 1;
    
    // Create geometry for particles
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    
    // Create arrays to store twinkling parameters
    const twinkleFrequencies = new Float32Array(particleCount);
    const twinklePhases = new Float32Array(particleCount);
    const brightnessFactors = new Float32Array(particleCount);
    
    // Generate random positions, colors, and speeds
    for (let i = 0; i < particleCount; i++) {
      
        // Position particles in a spherical volume around the scene
        const radius = 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = (Math.random() * 4) - 1; // Between -1 and 3
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
             // Random scale with bigger range
             scales[i] = Math.random() * 0.8 + 0.4; // Larger variation (0.4-1.2)
        
        // Brighter colors - increase all color values
        const colorChoice = Math.random();
        if (colorChoice > 0.7) { // Light blue
            colors[i * 3] = 1.2;     // R 
            colors[i * 3 + 1] = 1; // G 
            colors[i * 3 + 2] = 1.7;  // B
        } else if (colorChoice > 0.4) { // Light yellow green
            colors[i * 3] = 0.1;     // R
            colors[i * 3 + 1] = 0.2;  // G
            colors[i * 3 + 2] = 0.1;  // B 
        } else { // Pure white (brighter)
            colors[i * 3] = 1.0;     // R
            colors[i * 3 + 1] = 1.0;  // G
            colors[i * 3 + 2] = 1.0;  // B
        }
        
        // Store custom twinkle parameters for each particle
        twinkleFrequencies[i] = 3 + Math.random() * 7; // Between 3-10x speed
        twinklePhases[i] = Math.random() * Math.PI * 2; // Random phase offset
        brightnessFactors[i] = 0.6 + Math.random() * 0.4; // Brightness variation
        
        // Movement speed
        speeds[i] = Math.random() * 0.0002 + 0.0001;
    }
    
    // Save the twinkle parameters to userData
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // MATERIALS
    const sparkleTexture = textureLoader.load('/sparkle.png'); 
    
    const particleMaterial = new THREE.PointsMaterial({
        size: particleSize,
        map: sparkleTexture, // Enable texture for star-like appearance
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending, // This creates the glow effect
        vertexColors: true,
        sizeAttenuation: true,
        opacity: 0.95,              // Slightly transparent for better glow
    });
    
    // Create the particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData.speeds = speeds;
    particleSystem.userData.time = 0;
    particleSystem.userData.twinkleFrequencies = twinkleFrequencies;
    particleSystem.userData.twinklePhases = twinklePhases;
    particleSystem.userData.brightnessFactors = brightnessFactors;
    particleSystem.userData.originalColors = colors.slice(); // Store original colors
    scene.add(particleSystem);
    
    return particleSystem;
}

// Create the sparkle effect
const sparkleSystem = createSparkleEffect();



// Enhanced update function
function updateSparkles(delta) {
    if (!sparkleSystem) return;
    
    sparkleSystem.userData.time += delta;
    
    const positions = sparkleSystem.geometry.attributes.position.array;
    const scales = sparkleSystem.geometry.attributes.scale.array;
    const colors = sparkleSystem.geometry.attributes.color.array;
    const originalColors = sparkleSystem.userData.originalColors;
    const speeds = sparkleSystem.userData.speeds;
    const time = sparkleSystem.userData.time;
    const twinkleFrequencies = sparkleSystem.userData.twinkleFrequencies;
    const twinklePhases = sparkleSystem.userData.twinklePhases;
    
    // Initialize particle behavior parameters if they don't exist
    if (!sparkleSystem.userData.particleBehaviors) {
        const particleBehaviors = new Array(positions.length / 3);
        for (let i = 0; i < particleBehaviors.length; i++) {
            particleBehaviors[i] = {
               
                // 1️⃣ Varied falling speeds
                speedMultiplier: Math.random() * 1 + 0.02, // 0.5x to 2.0x base speed
                
                // 2️⃣ Non-Linear Motion
                acceleration: Math.random() * 0.0003, // Random acceleration
                maxSpeed: 0.01 + Math.random() * 0.01, // Maximum speed cap
                
                // 3️⃣ Random Drift & Swirling
                swirlingFactor: Math.random() * 0.002 + 0.0001,
                swirlingFrequency: Math.random() * 2 + 0.5,
                swirlingOffset: Math.random() * Math.PI * 2,
                horizontalDrift: (Math.random() - 0.5) * 0.003,
                
                // 4️⃣ Oscillation parameters
                oscillateVertically: Math.random() > 0.7, // 30% of particles oscillate
                oscillationFrequency: Math.random() * 2 + 1,
                oscillationMagnitude: Math.random() * 0.0005 + 0.001,
                
                // 5️⃣ Varying Lifespan & Reset
                lifespan: Math.random() * 10 + 5, // 5-15 seconds lifespan
                birthTime: time - (Math.random() * 5), // Stagger birth times
                resetPoint: -2 - Math.random() * 2, // Different reset heights
                currentSpeed: 0 // Current speed (will be affected by acceleration)
            };
        }
        sparkleSystem.userData.particleBehaviors = particleBehaviors;
    }
    
    const behaviors = sparkleSystem.userData.particleBehaviors;
    
    // Global size pulse - make this more dramatic
    sparkleSystem.material.size = 0.03 + Math.abs(Math.sin(time * 2)) * 0.04;
    
    for (let i = 0; i < positions.length / 3; i++) {
        const behavior = behaviors[i];
        
        // Twinkle frequency and phase
        const twinkleValue = Math.sin(time * twinkleFrequencies[i] + twinklePhases[i]);
        
        // GLOW - Color pulsing with brightness
        const brightness = 1.2 + Math.max(0, twinkleValue) * 10;
        colors[i * 3] = originalColors[i * 3] * brightness;
        colors[i * 3 + 1] = originalColors[i * 3 + 1] * brightness;
        colors[i * 3 + 2] = originalColors[i * 3 + 2] * brightness;
        
        // 2️⃣ NON-LINEAR MOTION: Apply acceleration up to max speed
        behavior.currentSpeed = Math.min(
            behavior.currentSpeed + behavior.acceleration * delta,
            behavior.maxSpeed
        );
        
        // 1️⃣ VARIED FALLING SPEEDS: Use behavior-specific speed
        const fallSpeed = speeds[i] * behavior.speedMultiplier * (0.5 + Math.sin(time * 0.5) * 0.1);
        
        // 4️⃣ OSCILLATION: Some particles bobble up and down
        let verticalOffset = 0;
        if (behavior.oscillateVertically) {
            verticalOffset = Math.sin(time * behavior.oscillationFrequency) * behavior.oscillationMagnitude;
        }
        
        // Movement logic with all behaviors combined
        positions[i * 3 + 1] -= fallSpeed + behavior.currentSpeed + verticalOffset;
        
        // 3️⃣ RANDOM DRIFT & SWIRLING: Add swirling motion
        const swirl = behavior.swirlingFactor * 
            Math.sin(time * behavior.swirlingFrequency + behavior.swirlingOffset);
        positions[i * 3] += swirl + behavior.horizontalDrift;
        positions[i * 3 + 2] += swirl * 0.8;
        
        // 5️⃣ VARYING LIFESPAN & RESET: Reset at custom point with different behaviors
        if (positions[i * 3 + 1] < behavior.resetPoint) {
            // Reset with more variation
            positions[i * 3 + 1] = 3 + Math.random() * 2; // Random height at top
            positions[i * 3] = (Math.random() - 0.5) * 10; // Random x position
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // Random z position
            behavior.currentSpeed = 0; // Reset acceleration
            behavior.birthTime = time; // Reset birth time
            
            // Occasionally change behavior properties for more variety
            if (Math.random() > 0.7) {
                behavior.swirlingFactor = Math.random() * 0.005 + 0.001;
                behavior.oscillateVertically = Math.random() > 0.7;
            }
        }
    }
    
    sparkleSystem.geometry.attributes.color.needsUpdate = true;
    sparkleSystem.geometry.attributes.position.needsUpdate = true;
    sparkleSystem.geometry.attributes.scale.needsUpdate = true;
}

// 🚀 Selective Bloom Effect Setup
function setupSelectiveBloom() {

    // Create a separate layer for bloom objects
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(1); // Layer 1 for sparkles

    // Apply bloom layer only to sparkles
    sparkleSystem.layers.enable(1);

    // 🎬 Render pass for the main scene
    const renderScene = new RenderPass(scene, camera);

    // UnrealBloomPass for sparkles only
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        4,  // Bloom Strength
        1.5,   // Radius
        1      // Threshold
    );

    // Custom shader for combining bloom & base render
    const finalPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: null }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D bloomTexture;
                varying vec2 vUv;
                void main() {
                    vec4 base = texture2D(baseTexture, vUv);
                    vec4 bloom = texture2D(bloomTexture, vUv);
                    gl_FragColor = base + vec4(bloom.rgb * 1.5, bloom.a); // Increase glow subtly
                }
            `
        }), "baseTexture"
    );
    finalPass.needsSwap = true;

    // 📸 Separate bloom rendering pipeline
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // 🎭 Final composite render (scene + bloom)
    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    
    // 🌟 ADD THIS LINE: Add the outline pass to the final composer
    finalComposer.addPass(outlinePass);
    
    finalComposer.addPass(finalPass);

    return {
        bloomComposer,
        finalComposer,
        finalPass,
        bloomLayer
    };
}

// 🚀 Initialize the bloom effect
const bloomEffect = setupSelectiveBloom();

// 🛠️ Helper: Darken Non-Bloomed Objects 
function darkenNonBloomed(obj) {

    // Store scene background temporarily before changing it - commenting this out makes it washed out and glowy
    if (obj === scene) {
        obj.userData.originalBackground = obj.background;
        obj.background = null; // Set to null (black) for bloom pass
        return;
    }
    
    if (obj.isMesh && !bloomEffect.bloomLayer.test(obj.layers)) {
        obj.userData.originalMaterial = obj.material;
        obj.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    }
}

// 🎨 Restore Original Materials After Bloom Pass
function restoreMaterial(obj) {
    // Restore scene background
    if (obj === scene && obj.userData.originalBackground !== undefined) {
        obj.background = obj.userData.originalBackground;
        obj.userData.originalBackground = undefined;
        return;
    }
    
    if (obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
        obj.userData.originalMaterial = null;
    }
}

function animate() {
    stats.begin(); 
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    // Gradual glow while mouse is held down
    if (isMouseDown && selectedGarment) {
        const holdDuration = Date.now() - mouseDownStartTime;
        const holdProgress = Math.min(1.0, holdDuration / SETTINGS.GLOW.HOLD_DURATION); // Max out at 1 second
        
        // Calculate glow intensity based on how long the mouse has been held
        const currentGlow = SETTINGS.GLOW.DEFAULT + (SETTINGS.GLOW.MAX - SETTINGS.GLOW.DEFAULT) * holdProgress;
        outlinePass.edgeStrength = currentGlow;
    }
  
    garments.forEach(({ object }) => {
      // Ensure each garment has a unique rotation offset
      if (object.userData.rotationOffset === undefined) {
        object.userData.rotationOffset = Math.random() * Math.PI * 2;
      }
  
      // Define base speeds
      const baseOrbitSpeed = SETTINGS.ORBIT.BASE_SPEED;  // Normal orbit speed for non-hovered garments 0.002
      
      // Initialize orbit speed if undefined
      if (object.userData.orbitSpeed === undefined) {
        object.userData.orbitSpeed = baseOrbitSpeed;
      }
      
      // Set target orbit speed based on hover state
      const targetOrbitSpeed = object.userData.isHovered ? 0 : baseOrbitSpeed;
      
      // Slow down to a stop - increase this value for faster transitions
      object.userData.orbitSpeed = THREE.MathUtils.lerp(object.userData.orbitSpeed, targetOrbitSpeed, 0.2);
  
      // Update orbit angle and position using the interpolated speed
      object.userData.orbitAngle = (object.userData.orbitAngle || 0) + object.userData.orbitSpeed;
      object.position.set(
        Math.cos(object.userData.orbitAngle) * object.userData.orbitRadius,
        0,
        Math.sin(object.userData.orbitAngle) * object.userData.orbitRadius
      );
  
      // Set self-rotation speed (optionally slowing down the hovered garment)
      if (object.userData.rotationSpeed === undefined || isNaN(object.userData.rotationSpeed)) {
        object.userData.rotationSpeed = SETTINGS.ROTATION.BASE_SPEED;  // Fixed - use the constant you declared
      }
      const targetRotationSpeed = object.userData.isHovered ? 0.1 : SETTINGS.ROTATION.BASE_SPEED;

      // Slow rotation speed
      object.userData.rotationSpeed = THREE.MathUtils.lerp(object.userData.rotationSpeed, targetRotationSpeed, 0.02);
  
      // Apply self-rotation
      object.rotation.y += object.userData.rotationSpeed * delta + Math.sin(object.userData.rotationOffset) * 0.01;

      // Update helpers position
      if (object.userData.updateHelpers) {
        object.userData.updateHelpers();
      }
    });
  
    // Rotate avatar (if present)
    if (window.avatar) {
      window.avatar.rotation.y += 0.005;
    }
  
    controls.update();
    updateSparkles(delta); 
    
    // ✨ NEW: SELECTIVE BLOOM RENDERING PROCESS
    // 1. First render the bloom pass with only sparkles visible
    scene.traverse(darkenNonBloomed);

    // Explicitly handle the scene background

    darkenNonBloomed(scene);
    bloomEffect.bloomComposer.render();
    scene.traverse(restoreMaterial);

    // Explicitly restore the scene background
    restoreMaterial(scene);
    
    // 2. Use the bloom result as input to the final composite render
    bloomEffect.finalPass.uniforms["bloomTexture"].value = 
        bloomEffect.bloomComposer.renderTarget2.texture;
    
    // 3. Render the final composite to screen
    bloomEffect.finalComposer.render();
    
    stats.end(); // End performance measuring
  }

  animate();

// Add this callback to properly handle PBR materials
// Replace your processPBRMaterials function with this streamlined version
function processPBRMaterials(object) {
    // Force anisotropy on all textures for better distance appearance
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    
    object.traverse((node) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => {
                if (material.isMeshStandardMaterial || material.type === 'MeshPhysicalMaterial') {
                    // Apply proper mipmapping to ALL textures
                    const textureTypes = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
                    
                    textureTypes.forEach(texType => {
                        if (material[texType]) {
                            const texture = material[texType];
                            
                            // These settings are critical for distance visibility
                            texture.generateMipmaps = true;
                            texture.minFilter = THREE.LinearMipmapLinearFilter;
                            texture.magFilter = THREE.LinearFilter;
                            texture.anisotropy = maxAnisotropy;
                            
                            // Set colorspace based on texture type
                            if (texType === 'map' || texType === 'emissiveMap') {
                                texture.colorSpace = THREE.SRGBColorSpace;
                            } else {
                                texture.colorSpace = THREE.LinearSRGBColorSpace;
                            }
                            
                            // Force texture update
                            texture.needsUpdate = true;
                        }
                    });
                    
                    // Prevent black materials at a distance with subtle emissive
                    if (!material.emissive) {
                        material.emissive = new THREE.Color(0x333333);
                    }
                    
                    material.needsUpdate = true;
                }
            });
        }
    });
}