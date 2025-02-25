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


//  DECLARING CONSTANTS
let garments = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedGarment = null;
let movementEnabled = true;
const keysPressed = {};
const movementSpeed = 0.1;
let avatarReplaced = false; // Flag to track if the avatar has been replaced
let currentHoveredGarment = null;
const BASE_ORBIT_SPEED = 0.002;
const BASE_ROTATION_SPEED = 1;
let garmentSelected = false; // Add this flag at the top with your other constants
const loadingManager = new THREE.LoadingManager();
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN path
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);


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

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;

// LIGHTING

// const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1); // Soft white light
// scene.add(ambientLight);


function createCustomMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xfddeff, // Pink color
        roughness: 0.5,  // Roughness value
        metalness: 0.5,  // Metalness value
        side: THREE.DoubleSide, // Double-sided material
    });
}

// FUNCTION TO LOAD THE AVATAR
// Replace the existing loadAvatar function with this one
function loadAvatar() {
    gltfLoader.load(  // Use gltfLoader instead of creating a new GLTFLoader
        '/public/Avatar_Base2.glb',
        (gltf) => {
            const avatar = gltf.scene;
            
            // Scale & Position Avatar
            avatar.scale.set(0.008, 0.008, 0.008);
            avatar.position.set(0, -0.5, 0);

            // ATTACH LIGHTS TO THE AVATAR
            const keyLight = new THREE.DirectionalLight(0xffffff, 1, 10, 2);
            keyLight.position.set(2, 5, 5);
            keyLight.castShadow = true;

            const rimLight = new THREE.PointLight(0xffffff, 1, 10, 2);
            rimLight.position.set(-1, 3, -2);

            const fillLight = new THREE.PointLight(0xffffff, 1, 10, 2);
            fillLight.position.set(0, 2, -3);

            avatar.add(keyLight, rimLight, fillLight);

            window.avatar = avatar;
            scene.add(avatar);

            // Log materials for debugging
            avatar.traverse((child) => {
                if (child.isMesh) {
                    console.log(`🎨 Loaded mesh: ${child.name}`, child.material);
                }
            });
        },
        (progress) => {
            console.log(`Loading avatar: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error("❌ Failed to load Avatar GLB:", error);
        }
    );
}


// FUNCTION TO APPLY GLOW TO BASE AVATAR
function applyGlowToBaseAvatar() {
    if (!window.avatar) return;

    outlinePass.selectedObjects = [window.avatar];

    // Gradually increase glow
    gsap.fromTo(outlinePass, 
        { edgeStrength: 1.5 },  // Start with medium glow
        { edgeStrength: 3.5, duration: 1.5, ease: "power2.out" } // Max glow
    );

    // Fade out the glow after 2 seconds
    setTimeout(() => {
        fadeOutGlowEffect(window.avatar, 2.0);
    }, 2000);
}

//  FUNCTION TO FADE OUT GLOW
function fadeOutGlowEffect(object, duration = 2.0) {
    if (!object) return;

    gsap.to(outlinePass, {
        edgeStrength: 0,  
        duration: duration,  
        ease: "power2.out", 
        onComplete: () => {
            outlinePass.selectedObjects = [];
        }
    });
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




// Function to add glow effect to the avatar --- this is the rececing glow
function addGlowEffect(object) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 25;
    outlinePass.edgeGlow = 10;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set(0xfddeff);
    outlinePass.hiddenEdgeColor.set(0x000000);
    outlinePass.selectedObjects = [object];
    composer.addPass(outlinePass);

                function addGlowEffect(object) {
            outlinePass.selectedObjects = [object];
        }
        
        function removeGlowEffect() {
            outlinePass.selectedObjects = [];
        }
           function fadeOutGlowEffect(object, duration) {
        gsap.to(outlinePass, {
            edgeStrength: 0,  
            duration: duration / 100,  // Convert milliseconds to seconds
            ease: "power3.out", 
            onComplete: () => {
                outlinePass.selectedObjects = [];  // Remove glow effect
            }
        });
    }
}

// Function to replace the avatar with the clicked garment

function replaceAvatar(garment, posedAvatarUrl) {
    if (window.avatar) {
        scene.remove(window.avatar); // Remove the current avatar from the scene
        window.avatar = null;
    }

    console.log(`Loading posed avatar from: ${posedAvatarUrl}`);

    const loader = new GLTFLoader();
    loader.load(posedAvatarUrl, (gltf) => {
        const avatar = gltf.scene;

        // Position & Scale Avatar
        avatar.scale.set(0.008, 0.008, 0.008);
        avatar.position.set(0, -0.5, 0);

        // Attach Lights
        const keyLight = new THREE.DirectionalLight(0xffffff, 1, 10, 2); //color, intensity, distance, decay
        keyLight.position.set(2, 5, 5);
        keyLight.castShadow = true;

        const rimLight = new THREE.PointLight(0xffffff, 1, 10, 2); 
        rimLight.position.set(-1, 3, -2);

        const fillLight = new THREE.PointLight(0xffffff, 1, 10, 2);
        fillLight.position.set(0, 2, -3);

        avatar.add(keyLight, rimLight, fillLight);

        window.avatar = avatar;
        scene.add(avatar);

        // Add glow effect to new posed avatar
        applyGlowEffect(avatar);
    }, undefined, (error) => {    });
}

// Mapping between garments and their associated posed avatars
const garmentToPosedAvatarMap = {
    'jumpsuit': '/public/Jumpsuit_Posed.glb',
    'charam': '/public/CharaM_Posed.glb',
    'charaw': '/public/CharaW_Posed.glb',
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
outlinePass.visibleEdgeColor.set(0xfddeff);
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

// ✅ GARMENT FILES
const garmentFiles = [
    { path: '/Puffer.glb', offset: 0 },
    { path: '/CharaM.glb', offset: 1 },
    { path: '/CharaW.glb', offset: 2 },
    { path: '/Jumpsuit.glb', offset: 3 },
    { path: '/NB1.glb', offset: 4 }
];


const garmentTextures = {
    'Puffer': {
         diffuse: '/textures/Jumpsuit_Jumpsuit_BaseColor.jpg',
        normal: '/textures/Jumpsuit_Jumpsuit_Normal.jpg',
        roughness: '/textures/Jumpsuit_Jumpsuit_roughness.jpg',
    },
    'CharaM': {
        diffuse: '/textures/Jumpsuit_Jumpsuit_BaseColor.jpg',
        normal: '/textures/Jumpsuit_Jumpsuit_Normal.jpg',
        roughness: '/textures/Jumpsuit_Jumpsuit_roughness.jpg',
    },
    'CharaW': {
        diffuse: '/textures/Jumpsuit_Jumpsuit_BaseColor.jpg',
        normal: '/textures/Jumpsuit_Jumpsuit_Normal.jpg',
        roughness: '/textures/Jumpsuit_Jumpsuit_roughness.jpg',
    },
   'Jumpsuit': [
        { // Material 1 (Main Fabric)
            diffuse: '/textures/Jumpsuit_Jumpsuit_BaseColor.jpg',
            normal: '/textures/Jumpsuit_Jumpsuit_Normal.jpg',
            roughness: '/textures/Jumpsuit_Jumpsuit_Roughness.jpg',
            metalness: '/textures/Jumpsuit_Jumpsuit_Metallic.jpg'
        },
        { // Material 2 (Zippers or Metal Accents)
            diffuse: '/textures/Jumpsuit_Belt_BaseColor.jpg',
            normal: '/textures/Jumpsuit_Belt_Normal.jpg',
            roughness: '/textures/Jumpsuit_Belt_Roughness.jpg',
            metalness: '/textures/Jumpsuit_Belt_Metallic.jpg'
        },
        { // Material 3 (Lace/Mesh)
            diffuse: '/textures/Jumpsuit_Lace_BaseColor.png',
            normal: '/textures/Jumpsuit_Lace_Normal.jpg',
            roughness: '/textures/Jumpsuit_Lace_Roughness.jpg',
            alpha: '/textures/Jumpsuit_Lace_Opacity.png' // Transparency for lace
        }
    ],
    'NB1': {
        diffuse: '/textures/Jumpsuit_Jumpsuit_BaseColor.jpg',
        normal: '/textures/Jumpsuit_Jumpsuit_Normal.jpg',
        roughness: '/textures/Jumpsuit_Jumpsuit_roughness.jpg',
       // alpha: '/textures/NB1_alpha.jpg', // Example for lace transparency
    }
};


// LOAD GARMENTS AND POSITION THEM
function loadGarment(filePath, index) {
    const loader = new GLTFLoader();
    loader.load(
        filePath,
        (gltf) => {
            const garment = gltf.scene;
            const garmentName = filePath.split('/').pop().split('.')[0]; // Extract garment name
            const garmentMaterialMaps = garmentTextures[garmentName] || []; // Get correct textures

            console.log(`🔍 Applying textures for: ${garmentName}`, garmentMaterialMaps);

            // Ensure garment is fully loaded before applying materials
            if (!garment) {
                console.error(`❌ Garment failed to load: ${filePath}`);
                return;
            }

            garment.traverse((child) => {
                if (child.isMesh) {
                    // ✅ If it's the Jumpsuit, override material with editable basic material
                    if (garmentName === "Jumpsuit") {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xfddeff, // Pink
                            roughness: 1,
                            metalness: 0.5,
                            side: THREE.DoubleSide,
                        });
                    }
                }
            });
  //  CREATE LIGHTS FOR GARMENT
  const primaryLight = new THREE.PointLight(0xffffff, 1, 10, 2); // Key Light // color, intensity, distance, decay
  const secondaryLight1 = new THREE.PointLight(0xffffff, 1, 10, 2); // Rim Left
  const secondaryLight2 = new THREE.PointLight(0xffffff, 1, 10, 2); // Accent Right
  const highlightLight = new THREE.PointLight(0xffffff, 1, 10, 2); // Extra Highlight

  // Position lights relative to the garment
  primaryLight.position.set(0, 0, 0);
  secondaryLight1.position.set(-0.5, 1, -0.5);
  secondaryLight2.position.set(0.5, 1, -0.5);
  highlightLight.position.set(0, 3, 0);

  //  Attach the lights to the garment so they move with it
  garment.add(primaryLight, secondaryLight1, secondaryLight2, highlightLight);


              //  Garment Positioning & Rotation
              garment.scale.set(0.5, 0.5, 0.5);
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


//  WASD MOVEMENT CONTROLS
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

// Simplified mousemove event listener
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(garments.flatMap(g => g.object.children), true);
  
    outlinePass.selectedObjects = [];
    
    if (intersects.length > 0) {
        let hoveredGarment = intersects[0].object;
        while (hoveredGarment.parent && hoveredGarment.parent !== scene) {
            hoveredGarment = hoveredGarment.parent;
        }
  
        outlinePass.selectedObjects = [hoveredGarment];
        
        // Update hover states
        garments.forEach(garment => {
            const isHovered = garment.object === hoveredGarment;
            garment.object.userData.isHovered = isHovered;
            // Directly update orbit speed without GSAP
            garment.object.userData.orbitSpeed = isHovered ? 0 : BASE_ORBIT_SPEED;
        });
    } else {
        // Reset all garments to default state
        garments.forEach(garment => {
            garment.object.userData.isHovered = false;
            garment.object.userData.orbitSpeed = BASE_ORBIT_SPEED;
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
        selectedGarment = clickedGarment;

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
    }
});

window.addEventListener('mouseup', (event) => {
// Fade out the glow effect when the mouse button is released
fadeOutGlowEffect(window.avatar, 1000); // Adjust the duration as needed
});


function animate() {
    stats.begin(); // Start performance measuring
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
  
    garments.forEach(({ object }) => {
      // Ensure each garment has a unique rotation offset
      if (object.userData.rotationOffset === undefined) {
        object.userData.rotationOffset = Math.random() * Math.PI * 2;
      }
  
      // Define base speeds
      const baseOrbitSpeed = 0.002;  // Normal orbit speed for non-hovered garments
      const baseRotationSpeed = 1;   // Base self-rotation speed
  
      // Set orbitSpeed individually based on hover state:
      if (object.userData.isHovered) {
        object.userData.orbitSpeed = 0;
      } else {
        object.userData.orbitSpeed = baseOrbitSpeed;
      }
  
      // Update orbit angle and position using the individual orbitSpeed
      object.userData.orbitAngle = (object.userData.orbitAngle || 0) + object.userData.orbitSpeed;
      object.position.set(
        Math.cos(object.userData.orbitAngle) * object.userData.orbitRadius,
        0,
        Math.sin(object.userData.orbitAngle) * object.userData.orbitRadius
      );
  
      // Set self-rotation speed (optionally slowing down the hovered garment)
      if (object.userData.rotationSpeed === undefined || isNaN(object.userData.rotationSpeed)) {
        object.userData.rotationSpeed = baseRotationSpeed;
      }
      const targetRotationSpeed = object.userData.isHovered ? 0.1 : baseRotationSpeed;
      object.userData.rotationSpeed = THREE.MathUtils.lerp(object.userData.rotationSpeed, targetRotationSpeed, 0.1);
  
      // Apply self-rotation
      object.rotation.y += object.userData.rotationSpeed * delta + Math.sin(object.userData.rotationOffset) * 0.01;
    });
  
    // Rotate avatar (if present)
    if (window.avatar) {
      window.avatar.rotation.y += 0.005;
    }
  
    controls.update();
    composer.render();
    stats.end(); // End performance measuring
  }
  
  animate();

