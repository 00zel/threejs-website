// 1️⃣ IMPORTS: Load necessary libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let garment; // ✅ Declared globally so it's accessible in `animate()`

// 2️⃣ SCENE SETUP: Create a Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 2); // Move it away from the model
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3️⃣ LOAD BACKGROUND IMAGE
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('/env5.jpg'); // ✅ Ensure this file exists
scene.background = backgroundTexture;

// 4️⃣ LIGHTING: Add light to make objects visible
const testLight = new THREE.DirectionalLight(0xffffff, 3);
testLight.position.set(5, 10, 5);
scene.add(testLight);

// 5️⃣ LOAD 3D MODEL (Only Once)
const loader = new GLTFLoader();
loader.load('/Puffer.glb', function (gltf) {
    garment = gltf.scene;
    scene.add(garment);

    // 🔹 DEBUG MESH NAMES (Prints All Meshes)
    garment.traverse((child) => {
        if (child.isMesh) {  
            console.log("Mesh Name:", child.name, "Material:", child.material.name);
        }
    });

    // 🔹 APPLY MATERIALS TO INDIVIDUAL MESHES
    const materialAssignments = {
        "Cloth_mesh": 0xf1caff, // Neckline
        "Cloth_mesh_1": 0xf1caff, // Back neckline
        "Cloth_mesh_2": 0xf1caff, // L sleeve cuff
        "Cloth_mesh_3": 0xa6e1ff, // L sleeve
        "Cloth_mesh_4": 0xf1caff, // R sleeve cuff
        "Cloth_mesh_5": 0xa6e1ff, // R sleeve
        "Cloth_mesh_6": 0xf7d5ee, // Front bodice
        "Cloth_mesh_7": 0xf7d5ee, // Back bodice
        "Cloth_mesh_8": 0xf1caff, // L body lining
        "Cloth_mesh_9": 0xa6e1ff, // L skirt side
        "Cloth_mesh_10": 0xa6e1ff, // R skirt side
        "Cloth_mesh_11": 0xf1caff, // R body lining
        "Cloth_mesh_12": 0xf1caff, // R skirt lining
        "Cloth_mesh_13": 0xf1caff, // L skirt lining
    };

    garment.traverse((child) => {
        if (child.isMesh && materialAssignments[child.name]) {  
            child.material = new THREE.MeshStandardMaterial({
                color: materialAssignments[child.name],
                roughness: 0.9,
                metalness: 0,
                side: THREE.DoubleSide,
            });
        }
    });

    // 🔹 APPLY NORMAL MAP AFTER MODEL IS LOADED
    textureLoader.load('/textures/Normal1.jpg', function (normalMap) {
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(3, 3); // Adjust tiling

        garment.traverse((child) => {
            if (child.isMesh) {  
                child.material.normalMap = normalMap; // ✅ Apply normal map to existing materials
            }
        });
    });
});

// 6️⃣ ANIMATION LOOP: Rotates the entire garment
function animate() {
    requestAnimationFrame(animate);

    if (garment) {  // ✅ Ensure the model is loaded before rotating
        garment.rotation.y += 0.01; // ✅ Rotates everything together
    }

    renderer.render(scene, camera);
}
animate();
