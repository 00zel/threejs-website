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

// SETTINGS
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
    ACTIVATION_HOLD: 20 // ms to hold before selection activates
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
let garmentSelected = false; 
const loadingManager = new THREE.LoadingManager();
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Use CDN path
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);
const BLOOM_LAYER = 1;

let isMouseDown = false;
let mouseDownStartTime = 0;
const lightHelpers = []; 



let isHoveringRefreshArrow = false;
let refreshRotationSpeed = 0.015; // Default rotation speed for the refresh arrow
const ANIMATION_DURATION = 1.5; // or try 1.5 for more drama

const garmentToCursorMap = {
    "jumpsuit": "./test.png",
    "charam": "./test.png",
    "puffer": "./puffer_cursor.png",
    "nb1": "./test.png",
    "domi": "./test.png",
};

let currentAvatar = window.avatar || null;
let currentPosedAvatar = null;
let isLoadingPosedAvatar = false;
let garmentsVisible = true;
let refreshArrow;

//STATS GUI 
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

// CAMERA SETUP 
camera.position.set(0, 1.2, 6);  // Position camera at (0, 1.2, 6), making it look at the center of the scene
camera.lookAt(new THREE.Vector3(0, 0, 0));  // Make sure it looks at the origin (0, 0, 0)

  
//RENDER SCENE
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

//ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;  // Enable screen space panning
controls.minDistance = 0.5;          // Allow closer zoom
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI;    // Allow full vertical rotation
controls.target.set(0, 0.5, 0);      // Set target to face height instead of center

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
             const keyLight = new THREE.PointLight(0xFFFFFF, 10, 10, 2); // white
            keyLight.position.set(80, 140, 80);
            keyLight.castShadow = true;

            const rimLight = new THREE.PointLight(0xFFFFFF, 5, 10, 2); // FFA0B0 purple
            rimLight.position.set(-80, 130, -80);

            const fillLight = new THREE.PointLight(0xFFFFFF, 8, 10, 2); // DCFFCB green 
            fillLight.position.set(50, 80, -50);

            avatar.add(keyLight, rimLight, fillLight);

            avatar.userData.noBloom = true;



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

gltfLoader.load('/public/arrow_draco.glb', (gltf) => {
    refreshArrow = gltf.scene;
    refreshArrow.scale.set(0.1, 0.1, 0.1);
    refreshArrow.position.set(0, 1.5, 0);
    refreshArrow.userData.isRefreshArrow = true;

    refreshArrow.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.raycast = THREE.Mesh.prototype.raycast; 
        }
    });

    scene.add(refreshArrow); 

});


//CLICK EVENT
window.addEventListener('click', (event) => {
    raycaster.setFromCamera(mouse, camera);

  const allClickables = [
    ...garments.map(g => g.object),
    ...(refreshArrow ? [refreshArrow] : [])];

    const intersects = raycaster.intersectObjects(allClickables, true);

   // const intersects = raycaster.intersectObjects(garments.map(g => g.object), true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;

        // If user clicked the refresh arrow
        let target = clickedObject;
        while (target && target !== scene) {
            if (target.userData.isRefreshArrow) {
                location.reload(); // Full page reload
                return;
            }
            target = target.parent;
        }
        
        let clickedGarment = clickedObject;
                
        

        // Traverse up to find the main garment group
        while (clickedGarment.parent && clickedGarment.parent !== scene) {
            clickedGarment = clickedGarment.parent;
        }
        selectedGarment = clickedGarment;

        // Extract a valid garment name
        let garmentName = selectedGarment.name?.trim().toLowerCase() || "";

        // 🔍 If the name is empty, check the parent
        if (!garmentName && selectedGarment.parent) {
            garmentName = selectedGarment.parent.name?.trim().toLowerCase() || "";
        }

        // 🔍 If still empty, check children
        if (!garmentName && selectedGarment.children.length > 0) {
            garmentName = selectedGarment.children[0].name?.trim().toLowerCase() || "";
        }

        // 🔍 If still empty, fallback to file path
        if (!garmentName && selectedGarment.userData.sourceFile) {
            garmentName = selectedGarment.userData.sourceFile.split('/').pop().split('.')[0].toLowerCase();
        }

        //**Prevent selecting an empty name**
        if (!garmentName) {
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

            Object.keys(garmentToPosedAvatarMap).forEach(key => {
                if (garmentName.includes(key) || key.includes(garmentName)) {
                    posedAvatarUrl = garmentToPosedAvatarMap[key];                }
            });
        }

        // Only replace the avatar if a valid match is found
        if (posedAvatarUrl) {
            replaceAvatar(selectedGarment, posedAvatarUrl);
            avatarReplaced = true;
        } 
    } 
});

// REPLACE AVATAR ON CLICK WITH SELECTED GARMENT 
function replaceAvatar(garment, posedAvatarUrl) {
    if (isLoadingPosedAvatar) {
        return;
    }
    isLoadingPosedAvatar = true;
    if (avatarReplaced) return;

    
    if (window.avatar) {
        scene.remove(window.avatar);
        window.avatar = null;
    }

    gltfLoader.load(posedAvatarUrl,
        (gltf) => {
            const newAvatar = gltf.scene;
            processPBRMaterials(newAvatar); // Add this line
            newAvatar.scale.set(0.008, 0.008, 0.008);
            newAvatar.position.set(0, -0.6, 0);
            
            // Add the same lights as the original avatar
            const keyLight = new THREE.PointLight(0xFFFFFF, 7, 10, 2); // white color, intensity, distance, decay
            keyLight.position.set(-100, 150, 100);
            keyLight.castShadow = true;

            const rimLight = new THREE.PointLight(0xFFFFFF, 4, 50, 1); // purple FFA0B0
            rimLight.position.set(-100, 130, -100);

            const fillLight = new THREE.PointLight(0xFFFFFF, 6, 50, 1); // green DCFFCB
            fillLight.position.set(100, 150, -100);


            newAvatar.add(keyLight, rimLight, fillLight);
            
            // Optional: Add debug helpers if needed
            
            const keyLightHelper = new THREE.PointLightHelper(keyLight, 10, 0xff0000);
            const rimLightHelper = new THREE.PointLightHelper(rimLight, 10, 0x00ff00);
            const fillLightHelper = new THREE.PointLightHelper(fillLight, 10, 0x0000ff);
            scene.add(keyLightHelper, rimLightHelper, fillLightHelper);
            
            window.avatar = newAvatar;
            isLoadingPosedAvatar = false;

            scene.add(newAvatar);
        },
            );
}

function cleanupSceneBeforePosing() {
    // 1. Remove the current avatar (initial or previous posed)
    if (currentAvatar) {
      scene.remove(currentAvatar);
      currentAvatar.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      currentAvatar = null;
    }
  
    // 2. Hide all orbiting garments
    if (garmentsVisible) {
      garments.forEach(({ object }) => {
        object.visible = false;
      });
      garmentsVisible = false;
    }
  }
  
// Mapping between garments and their associated posed avatars
const garmentToPosedAvatarMap = {
    'jumpsuit': '/public/Avatar_Jumpsuit_draco.glb',
    'charam': '/public/Avatar_Chara_draco.glb',
    'domi': '/public/Avatar_Domi_draco.glb',
    'puffer': '/public/Avatar_Puffer_draco.glb',
    'nb1': '/public/Avatar_NB_draco.glb'
};

loadAvatar();


// BACKGROUND
// const textureLoader = new THREE.TextureLoader();
//const backgroundTexture = textureLoader.load('/black.png');
//scene.background = backgroundTexture;
scene.background = new THREE.Color(0x000000); 


// POST PROCESSING SETUP FOR GLOW EFFECT
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 1;      // intensity of glow
outlinePass.edgeGlow = 10;        // 
outlinePass.edgeThickness = 1;     
outlinePass.pulsePeriod = 5;       //pulse effect
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

bloomPass.threshold = 1;     // Only bloom pixels brighter than this value (1.0 = white)
bloomPass.strength = 200;    // stronger
bloomPass.radius = 400;      // softer

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
        garment.userData.noBloom = true;

                
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

function getObjectUnderMouse() {
    raycaster.setFromCamera(mouse, camera);

    const garmentMeshes = garments.flatMap(g => {
        const meshes = [];
        g.object.traverse(child => {
            if (child.isMesh) meshes.push(child);
        });
        return meshes;
    });

    const arrowMeshes = [];
    if (refreshArrow) {
        refreshArrow.traverse(child => {
            if (child.isMesh) arrowMeshes.push(child);
        });
    }

    const hoverables = [...garmentMeshes, ...arrowMeshes];

    const intersects = raycaster.intersectObjects(hoverables, true);
    if (intersects.length === 0) {
        return null;
    }

    let hovered = intersects[0].object;    

    // Traverse upward to top-level object (garment or arrow)
    while (hovered.parent && hovered.parent !== scene) {
        hovered = hovered.parent;
    }

    return hovered;
}






window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
    raycaster.setFromCamera(mouse, camera);

    
        const allHoverables = [
            ...garments.map(g => g.object),
            ...(refreshArrow ? [refreshArrow] : [])
        ];

        const intersects = raycaster.intersectObjects(allHoverables, true);
        let hoveredObject = intersects.length > 0 ? intersects[0].object : null;

        // Traverse up to get the main parent group
        let topLevelHovered = hoveredObject;
        while (topLevelHovered?.parent && topLevelHovered.parent !== scene) {
            topLevelHovered = topLevelHovered.parent;
        }

        // Apply outline glow
        outlinePass.selectedObjects = topLevelHovered ? [topLevelHovered] : [];
        if (!topLevelHovered) {
            outlinePass.selectedObjects = [];
        }
        outlinePass.edgeStrength = topLevelHovered ? SETTINGS.GLOW.DEFAULT : 0;

        // Update hover state for garments only
        garments.forEach(garment => {
            garment.object.userData.isHovered = (garment.object === topLevelHovered);
        });

        // === 🔁 Refresh Arrow Hover Logic ===
        if (refreshArrow && (topLevelHovered === refreshArrow || refreshArrow.children.includes(topLevelHovered))) {
            if (!isHoveringRefreshArrow) {
                isHoveringRefreshArrow = true;
                gsap.to({ speed: refreshRotationSpeed }, {
                    speed: 0,
                    duration: 0.4,
                    ease: "power2.out",
                    onUpdate: function () {
                        refreshRotationSpeed = this.targets()[0].speed;
                    }
                });
            }
        } else if (isHoveringRefreshArrow) {
            isHoveringRefreshArrow = false;
            gsap.to({ speed: refreshRotationSpeed }, {
                speed: 0.015,
                duration: 0.4,
                ease: "power2.out",
                onUpdate: function () {
                    refreshRotationSpeed = this.targets()[0].speed;
                }
            });
        }
    }
);



// CLICK-AND-HOLD EFFECT: Gradually Increase Glow
window.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    mouseDownStartTime = Date.now();
  
    if (avatarReplaced) return; // Prevent further interactions if the avatar has already been replaced

    raycaster.setFromCamera(mouse, camera);
    const allClickable = [
        ...garments.map(g => g.object),
        ...(refreshArrow ? refreshArrow.children : [])
    ];

    const intersects = raycaster.intersectObjects(allClickable, true);
    refreshArrow.userData.isRefreshArrow = true;


    if (intersects.length > 0) {

        const clickedObject = intersects[0].object;

// Check if user clicked the refresh arrow
if (clickedObject.userData.isRefreshArrow) {
    location.reload();
    return;
}
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

function fadeOutGlowEffect(object) {
    gsap.to(outlinePass, {
        edgeStrength: 0,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
            outlinePass.edgeStrength = outlinePass.edgeStrength;
        }
    });
}

window.addEventListener('mouseup', (event) => {
    if (!isMouseDown || !selectedGarment) return;
    isMouseDown = false;

    const holdDuration = Date.now() - mouseDownStartTime;

    if (holdDuration > SETTINGS.GLOW.ACTIVATION_HOLD) {

        // Prevent further interactions
        if (avatarReplaced) return;

        // Hide all other garments
        garments.forEach(({ object }) => {
            object.visible = (object === selectedGarment);
            object.userData.isClickable = (object === selectedGarment);
        });

        // Get garment mesh to move/scale
        let garmentMesh = null;
        selectedGarment.traverse(child => {
            if (child.isMesh && !garmentMesh) {
                garmentMesh = child;
            }
        });


        // Convert mouse to world position
        raycaster.setFromCamera(mouse, camera);
        const box = new THREE.Box3().setFromObject(garmentMesh);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        // Build a plane at the garment's Z depth
        const zOffset = -0.5; // Negative values move it closer to camera, positive move it deeper
        const planeatGarment = new THREE.Plane(new THREE.Vector3(0, 0, 1), -center.z);        
        
        const intersectPoint = new THREE.Vector3();
        const didIntersect = raycaster.ray.intersectPlane(planeatGarment, intersectPoint);


        // Lock orbiting
        selectedGarment.userData.isLocked = true;

        // Animate move
        gsap.to(selectedGarment.position, {
            x: intersectPoint.x,
            y: intersectPoint.y,
            z: intersectPoint.z,
            duration: ANIMATION_DURATION,
            ease: "power2.out"
        });

        // Animate scale down and THEN replace avatar
        let garmentName = selectedGarment.name?.trim().toLowerCase() || "";
                if (!garmentName) {
                    garmentName = selectedGarment.userData.sourceFile?.split('/').pop().split('.')[0].toLowerCase() || "";
                }
                   gsap.to(selectedGarment.scale, {
            x: 0.01,
            y: 0.01,
            z: 0.01,
            duration: ANIMATION_DURATION,
            ease: "power2.out",
            onComplete: () => {
                avatarReplaced = true;
                selectedGarment.visible = false;
               // createBurstEffectAt(selectedGarment.position);
               const cursorUrl = garmentToCursorMap[garmentName];
               if (cursorUrl) {
                   document.body.style.cursor = `url('${cursorUrl}') 16 16, auto`;
               } else {
                   console.warn("⚠️ No cursor image found for:", garmentName);
               }
               
                // Look up avatar URL
              

                const posedAvatarUrl = garmentToPosedAvatarMap[garmentName];
                if (posedAvatarUrl) {
                    replaceAvatar(selectedGarment, posedAvatarUrl);
                } 
            }
        });
    } 
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



// Selective Bloom Effect Setup
function setupSelectiveBloom() {

    // Create a separate layer for bloom objects
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(1); // Layer 1 for sparkles

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

// Initialize the bloom effect
const bloomEffect = setupSelectiveBloom();

// Darken Non-Bloomed Objects 
function darkenNonBloomed(obj) {
    if (obj === scene) {
        obj.userData.originalBackground = obj.background;
        obj.background = null;
        return;
      }
    
      if (
        obj.isMesh &&
        !bloomEffect.bloomLayer.test(obj.layers) &&
        obj.userData.noBloom !== true
      ) {
        obj.userData.originalMaterial = obj.material;
        obj.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
      }}

// Restore Original Materials After Bloom Pass
function restoreMaterial(obj) {
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
        const maxVisualStrength = 1.25;
        const currentGlow = SETTINGS.GLOW.DEFAULT + (maxVisualStrength - SETTINGS.GLOW.DEFAULT) * holdProgress;
                outlinePass.edgeStrength = currentGlow;
    }
  
    garments.forEach(({ object }) => {

        if (object.userData.isLocked) return;

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
  
    // Rotate avatar 
    if (window.avatar) {
      window.avatar.rotation.y += 0.005;
    }
  
    // Rotate arrow
    if (refreshArrow) {
        refreshArrow.rotation.y += refreshRotationSpeed;
    }
    
    controls.update(); 





camera.updateMatrixWorld(); 
    
    // SELECTIVE BLOOM RENDERING PROCESS
    
    // 1. First render the bloom pass 
    scene.traverse(darkenNonBloomed);

    darkenNonBloomed(scene);
    bloomEffect.bloomComposer.render();
    scene.traverse(restoreMaterial);

    restoreMaterial(scene);
    
    // 2. Use the bloom result as input to the final composite render
    bloomEffect.finalPass.uniforms["bloomTexture"].value = 
        bloomEffect.bloomComposer.renderTarget2.texture;
    
    // 3. Render the final composite to screen
    bloomEffect.finalComposer.render();

    stats.end(); // End performance measuring

  }
  
  raycaster.setFromCamera(mouse, camera);
  const testIntersects = raycaster.intersectObjects(scene.children, true);
  
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