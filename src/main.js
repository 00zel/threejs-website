// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let combinedGroup; // Global variable for the garment group

// 2️⃣ SCENE SETUP: Create a Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 2); // Move it away from the model
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3️⃣ LIGHTING: Add light to make objects visible
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 4️⃣ HDRI BACKGROUND: Retain the previous working HDRI
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/env5.jpg'); // Your existing working HDRI
scene.background = backgroundTexture;

// 5️⃣ LOAD TEXTURES FROM SUBSTANCE PAINTER
const Puffer = {
    baseColor: textureLoader.load('/textures/Puffer_Puffer_BaseColor.png'),
    normalMap: textureLoader.load('/textures/Puffer_Puffer_Normal.png'),
    roughnessMap: textureLoader.load('/textures/Puffer_Puffer_Roughness.png'),
    metallicMap: textureLoader.load('/textures/Puffer_Puffer_Metallic.png'),
    emissiveMap: textureLoader.load('/textures/Puffer_Puffer_Emissive.png'),
};

const Accent = {
    baseColor: textureLoader.load('/textures/Puffer_Accent_BaseColor.png'),
    normalMap: textureLoader.load('/textures/Puffer_Accent_Normal.png'),
    roughnessMap: textureLoader.load('/textures/Puffer_Accent_Roughness.png'),
    metallicMap: textureLoader.load('/textures/Puffer_Accent_Metallic.png'),
    emissiveMap: textureLoader.load('/textures/Puffer_Accent_Emissive.png'),
};

const Lining = {
    baseColor: textureLoader.load('/textures/Puffer_Lining_BaseColor.png'),
    normalMap: textureLoader.load('/textures/Puffer_Lining_Normal.png'),
    roughnessMap: textureLoader.load('/textures/Puffer_Lining_Roughness.png'),
    metallicMap: textureLoader.load('/textures/Puffer_Lining_Metallic.png'),
    emissiveMap: textureLoader.load('/textures/Puffer_Lining_Emissive.png'),
};

// 6️⃣ LOAD 3D MODEL (GLTF/GLB)
const loader = new GLTFLoader();
loader.load('/Puffer.glb', function (gltf) {
    const garment = gltf.scene;
    combinedGroup = new THREE.Group(); // Initialize group

    // Traverse the model and assign textures
    garment.traverse((child) => {
        if (child.isMesh) {
            console.log('Mesh:', child.name, 'Material:', child.material.name, 'UVs:', child.geometry.attributes.uv.array);

            // Assign textures based on material name
            switch (child.material.name) {
                case 'Puffer_996005': // Puffer material
                    child.material.map = Puffer.baseColor;
                    child.material.normalMap = Puffer.normalMap;
                    child.material.roughnessMap = Puffer.roughnessMap;
                    child.material.metalnessMap = Puffer.metallicMap;
                    child.material.emissiveMap = Puffer.emissiveMap;
                    break;
                case 'Accent_996008': // Accent material
                    child.material.map = Accent.baseColor;
                    child.material.normalMap = Accent.normalMap;
                    child.material.roughnessMap = Accent.roughnessMap;
                    child.material.metalnessMap = Accent.metallicMap;
                    child.material.emissiveMap = Accent.emissiveMap;
                    break;
                case 'Lining_996011': // Lining material
                    child.material.map = Lining.baseColor;
                    child.material.normalMap = Lining.normalMap;
                    child.material.roughnessMap = Lining.roughnessMap;
                    child.material.metalnessMap = Lining.metallicMap;
                    child.material.emissiveMap = Lining.emissiveMap;
                    break;
                default:
                    console.warn('⚠️ Unexpected material:', child.material.name);
            }

            // Safely set flipY for textures
            if (child.material.map) child.material.map.flipY = false;
            if (child.material.normalMap) child.material.normalMap.flipY = false;
            if (child.material.roughnessMap) child.material.roughnessMap.flipY = false;
            if (child.material.metalnessMap) child.material.metalnessMap.flipY = false;
            if (child.material.emissiveMap) child.material.emissiveMap.flipY = false;

            child.material.needsUpdate = true; // Ensure the material updates
        }
    });

    // Add the garment to the combined group and scene
    combinedGroup.add(garment);
    scene.add(combinedGroup);
});

// 7️⃣ ANIMATION LOOP: Rotate the combined garment group
function animate() {
    requestAnimationFrame(animate);

    if (combinedGroup) {
        combinedGroup.rotation.y += 0.01; // Rotate the garment group
    }

    renderer.render(scene, camera);
}
animate();
