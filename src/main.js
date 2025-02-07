// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let garments = []; // Array to store all garments

// 2️⃣ SCENE SETUP: Create a Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 5); // Slightly closer for a better view
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3️⃣ LIGHTING: Add light to make objects visible
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 4️⃣ HDRI BACKGROUND: Keep working HDRI setup
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/env5.jpg'); // Your existing working HDRI
scene.background = backgroundTexture;

// 5️⃣ LOAD TEXTURES FROM SUBSTANCE PAINTER (Updated Naming)
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

// 6️⃣ GARMENT FILES: Your already loaded garments (Expanding for 9 garments)
const garmentFiles = [
    { path: '/Puffer.glb', offset: 0 },
    { path: '/CharaM.glb', offset: 1 },
    { path: '/CharaW.glb', offset: 2 },
    { path: '/Jumpsuit.glb', offset: 3 },
    { path: '/NB1.glb', offset: 4 },
    { path: '/Marc.glb', offset: 5 },  // Placeholder for future garment
    { path: '/CharaM.glb', offset: 6 },  // Placeholder for future garment
    { path: '/CharaW.glb', offset: 7 },  // Placeholder for future garment
    { path: '/Jumpsuit.glb', offset: 8 }   // Placeholder for future garment
];

// 7️⃣ FUNCTION TO LOAD GARMENTS
function loadGarment(filePath, index) {
    const loader = new GLTFLoader();
    loader.load(filePath, function (gltf) {
        const garment = gltf.scene;

        // Assign textures
        garment.traverse((child) => {
            if (child.isMesh) {
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

                // Ensure textures are flipped correctly
                if (child.material.map) child.material.map.flipY = false;
                if (child.material.normalMap) child.material.normalMap.flipY = false;
                if (child.material.roughnessMap) child.material.roughnessMap.flipY = false;
                if (child.material.metalnessMap) child.material.metalnessMap.flipY = false;
                if (child.material.emissiveMap) child.material.emissiveMap.flipY = false;
                child.material.needsUpdate = true;
            }
        });

        // Position the garment in orbit
        const radius = 2.5; // **🔹 Smaller orbit radius**
        const angle = (index / garmentFiles.length) * Math.PI * 2;
        garment.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

        garments.push({ object: garment, angle: angle });
        scene.add(garment);
    });
}

// 8️⃣ LOAD ALL GARMENTS INTO THE SCENE
garmentFiles.forEach((file, index) => {
    loadGarment(file.path, index);
});

// 9️⃣ ANIMATION LOOP: Orbit + Individual Rotation
function animate() {
    requestAnimationFrame(animate);

    const orbitSpeed = 0.002; // Slower orbiting movement
    const spinSpeed = 0.01; // Individual garment rotation

    garments.forEach((garment) => {
        const radius = 2.5; // **🔹 Smaller orbit radius**
        garment.angle += orbitSpeed; // Move along orbit path
        garment.object.position.x = Math.cos(garment.angle) * radius;
        garment.object.position.z = Math.sin(garment.angle) * radius;
        garment.object.rotation.y += spinSpeed; // Rotate on its own axis
    });

    renderer.render(scene, camera);
}
animate();
