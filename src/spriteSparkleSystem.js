import * as THREE from 'three';

export function createSpriteSparkleSystem(scene, texturePath, options = {}) {
    const sparkleGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();
    const sparkleTexture = textureLoader.load(texturePath);

    const sparkleCount = options.count || 50;
    const sparkleSize = options.size || 0.2;
    const sparkleRange = options.range || 5;
    const pulseSpeed = options.pulseSpeed || 1;
    const motionSpeed = options.motionSpeed || 0.01;

    const sparkles = [];

    for (let i = 0; i < sparkleCount; i++) {
        const spriteMaterial = new THREE.SpriteMaterial({
            map: sparkleTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.8,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(sparkleSize, sparkleSize, 1);

        // Randomize initial position
        sprite.position.set(
            (Math.random() - 0.5) * sparkleRange,
            (Math.random() - 0.5) * sparkleRange,
            (Math.random() - 0.5) * sparkleRange
        );

        // Store additional data for motion and pulsing
        sprite.userData = {
            baseScale: sparkleSize,
            pulseOffset: Math.random() * Math.PI * 2, // Randomize pulse phase
            motionOffset: new THREE.Vector3(
                Math.random() * motionSpeed,
                Math.random() * motionSpeed,
                Math.random() * motionSpeed
            ),
        };

        sparkleGroup.add(sprite);
        sparkles.push(sprite);
    }

    scene.add(sparkleGroup);

    // Update function for animation
    sparkleGroup.userData.update = (delta) => {
        sparkles.forEach((sprite) => {
            // Pulsing effect
            const pulse = Math.sin(delta * pulseSpeed + sprite.userData.pulseOffset) * 0.1 + 1;
            sprite.scale.set(sprite.userData.baseScale * pulse, sprite.userData.baseScale * pulse, 1);

            // Optional motion
            sprite.position.add(sprite.userData.motionOffset.clone().multiplyScalar(delta));
            if (sprite.position.length() > sparkleRange) {
                sprite.position.set(
                    (Math.random() - 0.5) * sparkleRange,
                    (Math.random() - 0.5) * sparkleRange,
                    (Math.random() - 0.5) * sparkleRange
                );
            }
        });
    };

    return sparkleGroup;
}
