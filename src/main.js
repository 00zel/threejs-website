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
    "jumpsuit": "./jumpsuit_cursor.png",
    "charam": "./chara_cursor.png",
    "puffer": "./puffer_cursor.png",
    "nb": "./NB_cursor.png",
    "domi": "./test.png",
};

const posedAvatars = {};
const activeDissolves = [];


let currentAvatar = window.avatar || null;
let currentPosedAvatar = null;
let isLoadingPosedAvatar = false;
let garmentsVisible = true;
let refreshArrow;

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const BASE_SCALE = 1; // original size


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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight); // scale whole frame
  renderer.setSize(window.innerWidth, window.innerHeight); // also update renderer size
  scaleSceneToWindow(); // 🔥 call the scene scaler
});


// CAMERA SETUP 
camera.position.set(0, 1.2, 4);  // Position camera at (0, 1.2, 6), making it look at the center of the scene
camera.lookAt(new THREE.Vector3(0, 0, 0));  // Make sure it looks at the origin (0, 0, 0)
camera.layers.enable(BLOOM_LAYER); // Layer 1


  
//RENDER SCENE
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputEncoding = THREE.LinearEncoding;

//ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;  // Enable screen space panning
controls.minDistance = 0.5;          // Allow closer zoom
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI;    // Allow full vertical rotation
controls.target.set(0, 0.5, 0);      // Set target to face height instead of center

function preloadAllPosedAvatars() {
    Object.entries(garmentToPosedAvatarMap).forEach(([key, url]) => {
      gltfLoader.load(url, (gltf) => {
        posedAvatars[key] = gltf.scene;
      });
    });
  }
  
function loadAvatar() {
    gltfLoader.load(  
        './Avatar_Base2.glb',
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


gltfLoader.load('./arrow_draco.glb', (gltf) => {
    refreshArrow = gltf.scene;
    refreshArrow.scale.set(0.1, 0.1, 0.1);
    refreshArrow.position.set(0, 1.3, 0);
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




// Garment overlay content map
const garmentOverlayData = {
  puffer: {
    title: "Harper Collective X MCM",
    role: "Garment Design",
    medium: "Fashion Film",
    link: "https://youtu.be/TWSm285aVpk?si=6vZ_Ce3supbNXw4-",
    tools: [
      { label: "Design & Creation", value: "CLO 3D" },
      { label: "Detailing", value: "ZBrush" },
      { label: "Rigging", value: "Autodesk Maya" },
      { label: "Texturing", value: "Substance Painter" },
      { label: "Rendering", value: "Unreal Engine" }
    ],
    finalImages: ["MCM3.png", "MCM2.png"],
    devImages: ["MCM_Wireframe.png", "MCM_Pattern.png"],
      glowColor: "rgb(255, 255, 255)" // 🧊 cyan

  },
  
  jumpsuit: {
    title: "Holly Herndon - Jolene feat. Holly +",
    role: "Garment Design",
    medium: "Music Video",
    link: "https://youtu.be/kPAEMUzDxuo?si=1ld34nq8e_OGMHiq",
    tools: [
      { label: "Design & Creation", value: "CLO 3D" },
      { label: "Rigging", value: "Autodesk Maya" },
      { label: "Texturing", value: "Substance Painter" },
      { label: "Rendering", value: "Unreal Engine" }
    ],
    finalImages: ["jumpsuit_final1.jpg", "jumpsuit_final2.jpg"],
    devImages: ["jumpsuit_dev1.jpg", "jumpsuit_dev2.jpg"], 
          glowColor: "rgba(118, 234, 255, 0.9)" // 🧊 cyan

  },

  charam: {
    title: "Harper Collective X MCM Virtual Store",
    role: "Garment Design & Animation",
    medium: "Interactive Showroom",
    link: "https://thenewface.io/harper-collective-store/",
    tools: [
      { label: "Design & Animation", value: "CLO 3D" },
      { label: "Detailing", value: "ZBrush" },
      { label: "Texturing", value: "Substance Painter" },
      { label: "Render", value: "Unreal Engine" }
    ],
    finalImages: ["final1.jpg", "final2.jpg"],
    devImages: ["dev1.jpg", "dev2.jpg"], 
          glowColor: "rgba(118, 234, 255, 0.9)" // 🧊 cyan

  },

  domi: {
    title: "Dominique Castelano - Personal Mythologies",
    role: "Garment Design & Animation",
    medium: "Promotional Video",
    link: "https://vimeo.com/1043745489",
    tools: [
      { label: "Design & Creation", value: "CLO 3D" },
      { label: "Rigging", value: "Autodesk Maya" },
      { label: "Texturing", value: "Substance Painter, Unreal Engine" },
      { label: "Render", value: "Unreal Engine" }
    ],
    finalImages: ["final1.jpg", "final2.jpg"],
    devImages: ["dev1.jpg", "dev2.jpg"], 
          glowColor: "rgba(118, 234, 255, 0.9)" // 🧊 cyan

  },

  nb: {
    title: "New Balance X Coco",
    role: "Garment Asset Manager",
    medium: "Interactive Showroom",
    tools: [
      { label: "Creation & Animation", value: "CLO 3D" },
      { label: "Detailing", value: "ZBrush" },
      { label: "Rigging", value: "Autodesk Maya" },
      { label: "Texturing", value: "Substance Painter" },
      { label: "Render", value: "Unreal Engine" }
    ],
    finalImages: ["final1.jpg", "final2.jpg"],
    devImages: ["dev1.jpg", "dev2.jpg"], 
          glowColor: "rgba(118, 234, 255, 0.9)" // 🧊 cyan

  }
};


function populateOverlay(garmentKey) {




  const data = garmentOverlayData[garmentKey];

  // Update link and text
 const titleOverlay = document.getElementById('title-overlay');
let titleLink = document.getElementById('title-link');

if (data.link && data.link.trim() !== "") {
  // Ensure it's still an <a>
  if (titleLink.tagName.toLowerCase() !== 'a') {
    const newLink = document.createElement('a');
    newLink.id = 'title-link';
    newLink.target = '_blank';
    titleOverlay.replaceChild(newLink, titleLink);
    titleLink = newLink;
  }

  titleLink.href = data.link;
  titleLink.textContent = `Project: ${data.title}`;
  titleLink.classList.remove('inactive-link');
} else {
  // Replace <a> with <span> to kill link behavior
  const span = document.createElement('span');
  span.id = 'title-link';
  span.textContent = `Project: ${data.title}`;
  span.className = 'inactive-link';
  titleOverlay.replaceChild(span, titleLink);
}


  // Show overlay
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('show');


}


let expandedClone = null;
let originalRect = null;

document.addEventListener('click', (e) => {
  const isExpanded = expandedClone !== null;

  // ✅ Case: click to collapse the expanded image
  if (isExpanded && expandedClone.contains(e.target)) {
    Object.assign(expandedClone.style, {
      top: `${originalRect.top}px`,
      left: `${originalRect.left}px`,
      width: `${originalRect.width}px`,
      height: `${originalRect.height}px`,
    });

    document.body.style.overflow = '';
    
    // Wait for transition to finish, then remove
    setTimeout(() => {
      expandedClone.remove();
      expandedClone = null;
      originalRect = null;
    }, 600);

    return;
  }

  // ✅ Case: click a new image to expand
  const original = e.target.closest('.final-stills img, .dev-graphics img');
  if (!original) return;

  // Close any existing expanded image first
  if (expandedClone) {
    expandedClone.remove();
    expandedClone = null;
    originalRect = null;
  }

  // Get original size/position
  originalRect = original.getBoundingClientRect();

  // Clone and style
  const clone = original.cloneNode(true);
  clone.classList.add('image-expanded-clone');
  Object.assign(clone.style, {
    position: 'fixed',
    top: `${originalRect.top}px`,
    left: `${originalRect.left}px`,
    width: `${originalRect.width}px`,
    height: `${originalRect.height}px`,
    zIndex: 9999,
    objectFit: 'contain',
    filter: 'grayscale(0%) drop-shadow(0 0 20px var(--glow-color))',
   // filter: 'grayscale(0%) drop-shadow(0 0 0 rgba(0, 0, 0, 0))',  - makes the glow dissappear when it gets bigger 

    transition: 'all 0.6s ease',
    cursor: 'zoom-out',
  });

  document.body.appendChild(clone);
  document.body.style.overflow = 'hidden';

  // Animate to fullscreen
  requestAnimationFrame(() => {
    Object.assign(clone.style, {
      top: '6vh',
      left: '6vw',
      width: '86vw',
      height: '86vh',     // size of image
    });
  });

  expandedClone = clone;
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
  if (isLoadingPosedAvatar || avatarReplaced) return;
  isLoadingPosedAvatar = true;

  if (window.avatar) {
    scene.remove(window.avatar);
    window.avatar = null;
  }

  const garmentName = garment.name?.toLowerCase() || '';

  updateOverlay(garmentName);

  const posedKey = Object.keys(garmentToPosedAvatarMap).find(key =>
    garmentName.includes(key) || key.includes(garmentName)
  );

  const avatar = posedAvatars[posedKey];

if (!avatar.userData.cachedClone) {
  avatar.userData.cachedClone = avatar.clone(true);
}
const newAvatar = avatar.userData.cachedClone.clone(true);
  processPBRMaterials(newAvatar);
  newAvatar.scale.set(0.008, 0.008, 0.008);
  newAvatar.position.set(0, -0.6, 0);

  const keyLight = new THREE.PointLight(0xFFFFFF, 7, 10, 2);
  keyLight.position.set(-100, 150, 100);
  keyLight.castShadow = true;

  const rimLight = new THREE.PointLight(0xFFFFFF, 4, 50, 1);
  rimLight.position.set(-100, 130, -100);

  const fillLight = new THREE.PointLight(0xFFFFFF, 6, 50, 1);
  fillLight.position.set(100, 150, -100);

  newAvatar.add(keyLight, rimLight, fillLight);

  window.avatar = newAvatar;
  isLoadingPosedAvatar = false;

  scene.add(newAvatar);

  // Animate camera first
  gsap.to(camera.position, {
    x: 0,
    y: 0,
    z: 3,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: () => controls.update()
  });

  // Then update controls and show overlay
  gsap.to(controls.target, {
    x: 0,
    y: 0.18,
    z: 0,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: () => controls.update(),
    onComplete: () => {
      // Lock camera to zoom/rotate only
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.minDistance = 1.5;
      controls.maxDistance = 5;
      controls.update();

      // Reveal overlay
      const overlay = document.getElementById("overlay");

if (!overlay.classList.contains("show")) {
  overlay.classList.add("show");
}

document.getElementById("overlay").classList.add("show");

    }
  });
}

function updateOverlay(garmentNameRaw) {
  const garmentName = garmentNameRaw.replace('_draco', '').toLowerCase();
  const data = garmentOverlayData[garmentName];

  // Update link
const linkEl = document.getElementById('title-link');

if (data.link && data.link.trim() !== "") {
  linkEl.href = data.link;
  linkEl.target = '_blank';
} else {
  linkEl.removeAttribute('href');
  linkEl.removeAttribute('target');
  linkEl.style.pointerEvents = 'none';
  linkEl.style.opacity = '0.5';
}

linkEl.innerHTML = `
  <span class="project-label">Project:</span>
  <span id="cycling-title">${data.title}</span> →
`;

cyclingTitle = document.getElementById('cycling-title');
cyclingTitle.addEventListener('mouseenter', startFontCycle);
cyclingTitle.addEventListener('mouseleave', stopFontCycle);

  // Update role and medium
  const leftEl = document.querySelector('.overlay-left');
  if (leftEl) {
leftEl.innerHTML = `
  <div class="final-stills">
    ${data.finalImages.map(src => `<img src="${src}" alt="Final Still">`).join('')}
  </div>
  <div class="text-block">
    <p><span class="label">Role:</span> <span class="info">${data.role}</span></p>
    <p><span class="label">Medium:</span> <span class="info">${data.medium}</span></p>
  </div>
`;

document.documentElement.style.setProperty('--glow-color', data.glowColor || 'rgba(173, 255, 255, 0.8)');


  }

  // Update tools and dev graphics
  const rightEl = document.querySelector('.overlay-right');
  if (rightEl) {
rightEl.innerHTML = `
  <div class="dev-graphics">
    ${data.devImages.map(src => `<img src="${src}" alt="Dev Image">`).join('')}
  </div>
  <p class="tools-label">Tools:</p>
  <ul>
    ${data.tools.map(tool => `
      <li><span class="label">${tool.label}:</span> <span class="info">${tool.value}</span></li>
    `).join('')}
  </ul>
`;



  }

  // Show overlay
  const overlay = document.getElementById("overlay");
  overlay.classList.remove("hidden");
if (!overlay.classList.contains("show")) {
  overlay.classList.add("show");
}
}

let cyclingTitle = document.getElementById('cycling-title');

const fonts = [
  'Tension',
  'Troglodyte',
  'Galaxyface',
  'Cardinal',
  'BaroqueScript'
];

let fontInterval = null;
let hoverStartTime = null;

function getSpeedFromHoverDuration(duration) {
  // Duration in ms → return interval in ms (lower = faster)
  // You can tweak these values to tune the chaos curve
  const minSpeed = 10;   // fastest
  const maxSpeed = 400;  // initial slow speed
  const rampTime = 10000; // ms to reach max chaos

  const progress = Math.min(1, duration / rampTime);
  return maxSpeed - (maxSpeed - minSpeed) * progress;
}

function startFontCycle() {
  hoverStartTime = Date.now();

  function updateFont() {
    const elapsed = Date.now() - hoverStartTime;
    const interval = getSpeedFromHoverDuration(elapsed);

    const randomIndex = Math.floor(Math.random() * fonts.length);
    cyclingTitle.style.fontFamily = `${fonts[randomIndex]}, sans-serif`;

    fontInterval = setTimeout(updateFont, interval); // recursive chaos
  }

  updateFont(); // start first cycle
}

function stopFontCycle() {
  clearTimeout(fontInterval);
  fontInterval = null;
  cyclingTitle.style.fontFamily = `'Zine', sans-serif`;
}

cyclingTitle.addEventListener('mouseenter', startFontCycle);
cyclingTitle.addEventListener('mouseleave', stopFontCycle);






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
    'jumpsuit': './Avatar_Jumpsuit_draco.glb',
    'charam': './Avatar_Chara_draco.glb',
    'domi': './Avatar_Domi_draco.glb',
    'puffer': './Avatar_Puffer_draco.glb',
    'nb': './Avatar_NB_draco.glb'
};

loadAvatar();
preloadAllPosedAvatars();


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

//Garment flash on scale
function flashEmissive(material, options = {}) {
    const {
        intensity = 5,
        duration = 0.4,
        returnTo = 0.5
    } = options;

    // Animate emissiveIntensity up then back down
    gsap.fromTo(material, 
        { emissiveIntensity: returnTo },
        {
            emissiveIntensity: intensity,
            duration: duration / 2,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                material.emissiveIntensity = returnTo;
            }
        }
    );
}

  
  
  




// GARMENT FILES
const garmentFiles = [
    { path: './Puffer_draco.glb', offset: 0 },
    { path: './CharaM_draco.glb', offset: 1 },
    { path: './Domi_draco.glb', offset: 2 },
    { path: './Jumpsuit_draco.glb', offset: 3 },
    { path: './NB_draco.glb', offset: 4 }
];


// LOAD GARMENTS AND POSITION THEM
function loadGarment(filePath, index) {
   // const loader = GLTFLoader();
    gltfLoader.load(
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

// 👇 PRECOMPUTE dissolve data for the first mesh
let targetMesh = null;
garment.traverse(child => {
  if (child.isMesh && !targetMesh) {
    targetMesh = child;
  }
});

if (targetMesh) {
  const originalGeometry = targetMesh.geometry.clone();
  const positionAttr = originalGeometry.getAttribute('position');
  const count = positionAttr.count;

  const alphaArray = new Float32Array(count).fill(1.0);
  originalGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArray, 1));

  const clusters = Array.from({ length: 9 }, () =>
    new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    )
  );

  const originalPositions = new Float32Array(count * 3);
  const targetClusters = [];

  for (let i = 0; i < count; i++) {
    const px = positionAttr.getX(i);
    const py = positionAttr.getY(i);
    const pz = positionAttr.getZ(i);

    originalPositions[i * 3 + 0] = px;
    originalPositions[i * 3 + 1] = py;
    originalPositions[i * 3 + 2] = pz;

    const cluster = clusters[Math.floor(Math.random() * clusters.length)];
    targetClusters.push(cluster.clone());
  }

  targetMesh.userData.dissolveData = {
    originalGeometry,
    originalPositions,
    alphaArray,
    targetClusters
  };
}


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






let lastRaycastTime = 0;

window.addEventListener('mousemove', (event) => {
  const now = performance.now();
  if (now - lastRaycastTime < 50) return;
  lastRaycastTime = now;

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
  outlinePass.edgeStrength = topLevelHovered ? SETTINGS.GLOW.DEFAULT : 0;

  garments.forEach(garment => {
    garment.object.userData.isHovered = (garment.object === topLevelHovered);
  });

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
});




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


function animateEmissiveBurst(material, duration = 400, peak = 25) {
    const start = performance.now();
    material.emissiveIntensity = 0;
  
    function step() {
      const now = performance.now();
      const t = Math.min(1, (now - start) / duration); // normalized [0, 1]
      material.emissiveIntensity = peak * Math.sin(t * Math.PI); // sine burst
  
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        material.emissiveIntensity = 0;
      }
    }
  
    step();
  }
  



  window.addEventListener('mouseup', (event) => {
    if (!isMouseDown || !selectedGarment) return;
    isMouseDown = false;
  
    const holdDuration = Date.now() - mouseDownStartTime;
  
    if (holdDuration > SETTINGS.GLOW.ACTIVATION_HOLD) {
      if (avatarReplaced) return;
  
      garments.forEach(({ object }) => {
        object.visible = (object === selectedGarment);
        object.userData.isClickable = (object === selectedGarment);
      });
  
      let garmentMesh = null;
      selectedGarment.traverse(child => {
        if (child.isMesh && !garmentMesh) {
          garmentMesh = child;
        }
      });
  
      raycaster.setFromCamera(mouse, camera);
      const box = new THREE.Box3().setFromObject(garmentMesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
  
      const planeAtGarment = new THREE.Plane(new THREE.Vector3(0, 0, 1), -center.z);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeAtGarment, intersectPoint);
  
      
      selectedGarment.userData.isLocked = true;
  
      selectedGarment.traverse(child => {
        if (child.isMesh) {
          child.layers.enable(bloomEffect.bloomLayer.mask);
        }
      });
  
      const garmentName = selectedGarment.name?.trim().toLowerCase() ||
                          selectedGarment.userData.sourceFile?.split('/').pop().split('.')[0].toLowerCase() || "";
  
      let glowMesh = null;
      selectedGarment.traverse(child => {
        if (child.isMesh && glowMesh === null) {
          glowMesh = child;
        }
      });

      selectedGarment.traverse(child => {
        if (child.isMesh) {
          child.userData.isSelectedGarment = true;
        }
      });
   
   
      // fire the dissolve and avatar swap
      const burstTimeline = gsap.timeline({
        onComplete: () => {
          selectedGarment.visible = false;
          avatarReplaced = true;
      
          const cursorUrl = garmentToCursorMap[garmentName];
          if (cursorUrl) {
            document.body.style.cursor = `url('${cursorUrl}') 16 16, auto`;

          }
      
const posedAvatarUrl = garmentToPosedAvatarMap[garmentName];

// Only dissolve the first mesh we find
let foundMesh = null;
selectedGarment.traverse(child => {
  if (child.isMesh && !foundMesh) {
    foundMesh = child;
  }
});

if (foundMesh) {
  dissolveMesh(foundMesh);
}



    if (posedAvatarUrl) {
  setTimeout(() => {
    replaceAvatar(selectedGarment, posedAvatarUrl);
  }, 250); // Slight delay after dissolve
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
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(1); // Layer 1

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.3, // strength
        0.5, // radius
        0.01 // threshold
    );

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
                    gl_FragColor = base + vec4(bloom.rgb, 1.0); // additive
                }
            `
        }),
        "baseTexture"
    );
    finalPass.needsSwap = true;

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(outlinePass); // keep outline
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
function darkenNonBloomed(obj, bloomLayer) {
    if (obj === scene) return;
  
    if (
      obj.isMesh &&
      !bloomLayer.test(obj.layers) &&
      obj.userData.noBloom !== true &&
      obj.userData.isSelectedGarment !== true
    ) {
      obj.userData.originalMaterial = obj.material;
      obj.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    }
  }
  
  
  
  

// Restore Original Materials After Bloom Pass
function restoreMaterial(obj) {
    if (obj.isMesh && obj.userData.originalMaterial) {

      obj.material = obj.userData.originalMaterial;
      delete obj.userData.originalMaterial;
    }
  
    if (obj === scene && obj.userData.originalBackground !== undefined) {
      obj.background = obj.userData.originalBackground;
      delete obj.userData.originalBackground;
    }
  }


  function scaleSceneToWindow() {
  const scaleFactor = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
  const newScale = BASE_SCALE * scaleFactor;

  scene.scale.set(newScale, newScale, newScale);
}

  

  function animate() {
    stats.begin();

    requestAnimationFrame(animate);
    const delta = clock.getDelta();
  
    // Glow buildup while mouse is held
    if (isMouseDown && selectedGarment) {
      const holdDuration = Date.now() - mouseDownStartTime;
      const holdProgress = Math.min(1.0, holdDuration / SETTINGS.GLOW.HOLD_DURATION);
      const maxVisualStrength = 1.25;
      const currentGlow = SETTINGS.GLOW.DEFAULT + (maxVisualStrength - SETTINGS.GLOW.DEFAULT) * holdProgress;
      outlinePass.edgeStrength = currentGlow;
    }
      
    // Garment movement and rotation
    garments.forEach(({ object }) => {
      if (object.userData.isLocked) return;
  
      if (object.userData.rotationOffset === undefined) {
        object.userData.rotationOffset = Math.random() * Math.PI * 2;
      }
  
      const baseOrbitSpeed = SETTINGS.ORBIT.BASE_SPEED;
  
      if (object.userData.orbitSpeed === undefined) {
        object.userData.orbitSpeed = baseOrbitSpeed;
      }
  
      const targetOrbitSpeed = object.userData.isHovered ? 0 : baseOrbitSpeed;
      object.userData.orbitSpeed = THREE.MathUtils.lerp(object.userData.orbitSpeed, targetOrbitSpeed, 0.2);
  
      object.userData.orbitAngle = (object.userData.orbitAngle || 0) + object.userData.orbitSpeed;
      object.position.set(
        Math.cos(object.userData.orbitAngle) * object.userData.orbitRadius,
        0,
        Math.sin(object.userData.orbitAngle) * object.userData.orbitRadius
      );
  
      if (object.userData.rotationSpeed === undefined || isNaN(object.userData.rotationSpeed)) {
        object.userData.rotationSpeed = SETTINGS.ROTATION.BASE_SPEED;
      }
  
      const targetRotationSpeed = object.userData.isHovered ? 0.1 : SETTINGS.ROTATION.BASE_SPEED;
      object.userData.rotationSpeed = THREE.MathUtils.lerp(object.userData.rotationSpeed, targetRotationSpeed, 0.02);
  
      object.rotation.y += object.userData.rotationSpeed * delta + Math.sin(object.userData.rotationOffset) * 0.01;
  
      if (object.userData.updateHelpers) {
        object.userData.updateHelpers();
      }
    });
  
    // Avatar and UI rotation
    if (window.avatar) {
      window.avatar.rotation.y += 0.005;
    }
  
    if (refreshArrow) {
      refreshArrow.rotation.y += refreshRotationSpeed;
    }
  
    controls.update();
    camera.updateMatrixWorld();
  


      
    // 🌟 Selective Bloom Pass
    scene.traverse(obj => darkenNonBloomed(obj, bloomEffect.bloomLayer));
    
   
    
    bloomEffect.bloomComposer.render();
    scene.traverse(restoreMaterial);
  
    bloomEffect.finalPass.uniforms["bloomTexture"].value = bloomEffect.bloomComposer.renderTarget2.texture;
    bloomEffect.finalComposer.render();

    updateDissolves();

      
    stats.end();
  }
  
  
  raycaster.setFromCamera(mouse, camera);
  const testIntersects = raycaster.intersectObjects(scene.children, true);

  
  
  animate();

// Add this callback to properly handle PBR materials

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

function dissolveMesh(mesh, duration = 3000, targetCenter = new THREE.Vector3(0, 0, 0)) {
  const data = mesh.userData.dissolveData;
  if (!data) {
    console.warn('No dissolve data found for this mesh');
    return;
  }

  // Transform precomputed clusters to local space of this mesh
  const localClusters = data.targetClusters.map(c =>
    mesh.worldToLocal(targetCenter.clone().add(c.clone()))
  );

  const dissolveColor = (() => {
    const name = mesh.parent?.name?.toLowerCase() || '';
    if (name.includes("puffer")) return new THREE.Color(0xb6e8f4);
    if (name.includes("charam")) return new THREE.Color(0xF4FFA1);
    if (name.includes("domi")) return new THREE.Color(0xDE9CFF);
    if (name.includes("jumpsuit")) return new THREE.Color(0xFFA3F5);
    if (name.includes("nb")) return new THREE.Color(0xD7FFB7);
    return new THREE.Color(0xb6e8f4);
  })();

  requestAnimationFrame(() => {
    // Clone geometry and reattach a fresh aAlpha attribute
    const geometry = data.originalGeometry.clone();
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(data.alphaArray.slice(), 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: dissolveColor } },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_PointSize = 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(uColor * glow, vAlpha * glow);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const particleMesh = new THREE.Points(geometry, particleMaterial);
    particleMesh.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
    particleMesh.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
    particleMesh.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
    scene.add(particleMesh);

    mesh.visible = false;

    particleMesh.userData = {
      originalPositions: data.originalPositions.slice(),
      targetClusters: localClusters,
      alphas: data.alphaArray.slice(),
      geometry,
      startTime: performance.now(),
      duration
    };

    activeDissolves.push(particleMesh);
  });
}



  
  
 function updateDissolves() {
  const now = performance.now();

  for (let i = activeDissolves.length - 1; i >= 0; i--) {
    const mesh = activeDissolves[i];
    const {
      originalPositions,
      targetClusters,
      alphas,
      geometry,
      startTime,
      duration
    } = mesh.userData;

    const positions = geometry.attributes.position.array;
    const elapsed = now - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      scene.remove(mesh);
        mesh.geometry.dispose();
  mesh.material.dispose();
      activeDissolves.splice(i, 1);
      continue;
    }

    for (let j = 0; j < alphas.length; j++) {
      const idx = j * 3;

      const ox = originalPositions[idx + 0];
      const oy = originalPositions[idx + 1];
      const oz = originalPositions[idx + 2];

      const tx = targetClusters[j].x;
      const ty = targetClusters[j].y;
      const tz = targetClusters[j].z;

      const t = 1.0 - progress;

      positions[idx + 0] = ox * t + tx * progress + Math.sin(now * 0.002 + idx) * 0.01;
      positions[idx + 1] = oy * t + ty * progress + Math.cos(now * 0.002 + idx) * 0.01;
      positions[idx + 2] = oz * t + tz * progress + Math.sin(now * 0.001 + idx) * 0.01;

      alphas[j] = 1.0 - progress;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  }
}

  renderer.domElement.addEventListener('wheel', () => {
  console.log('🎯 canvas received scroll');
});