import * as THREE from 'three';
import { Controls } from '../systems/Controls.js';

/**
 * Player class that manages the player character's state, appearance, and behavior
 */
export class Player {
    constructor(scene, physics, camera) {
        // Reference to scene, physics system, and camera
        this.scene = scene;
        this.physics = physics;
        this.camera = camera;
        
        // Player state
        this.position = new THREE.Vector3(0, 2, 0); // Start slightly above ground
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.isGrounded = false;
        this.isJumping = false;
        this.isInVehicle = false;
        this.currentVehicle = null;
        
        // Player stats
        this.stats = {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            money: 1000,
            wanted: 0 // Wanted level 0-5
        };
        
        // Inventory
        this.inventory = {
            weapons: [],
            items: [],
            currentWeapon: null,
            cash: 1000,
            maxItems: 10
        };
        
        // Player dimensions
        this.height = 1.8; // Player height in meters
        this.radius = 0.3; // Player radius in meters
        
        // Movement parameters
        this.walkSpeed = 5;     // 5 units per second
        this.runSpeed = 9;      // 9 units per second
        this.jumpForce = 7;     // Jump force
        this.rotationSpeed = 3; // Rotation speed in radians per second
        
        // Create player mesh and physics body
        this.createPlayerMesh();
        this.createPhysicsBody();
        
        // Animation states (would connect to actual animations in a full implementation)
        this.animationState = 'idle'; // idle, walk, run, jump, fall, etc.
        
        // Control system
        this.controls = new Controls(camera, document.getElementById('game'));
        
        // Set up player-specific collision handling
        this.setupCollisionHandling();
    }
    
    /**
     * Create the player's visual representation
     */
    createPlayerMesh() {
        // Create a simple player model (a capsule)
        // In a real game, you would load a character model with animations
        const geometry = new THREE.CapsuleGeometry(this.radius, this.height - this.radius * 2, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        
        // Create a group to hold the player and any attachments (weapons, etc.)
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        
        // Add a head for first-person view reference
        const headGeometry = new THREE.SphereGeometry(this.radius * 0.8, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = this.height / 2 - this.radius * 0.5; // Position at the top of the capsule
        this.group.add(this.head);
        
        // Add to scene
        this.scene.add(this.group);
    }
    
    /**
     * Create physics body for the player
     */
    createPhysicsBody() {
        // Create a character physics body using the physics system
        const characterOptions = {
            height: this.height,
            radius: this.radius,
            mass: 70, // 70 kg
            position: new THREE.Vector3(this.position.x, this.position.y, this.position.z),
            stepHeight: 0.3 // Allow stepping up small obstacles
        };
        
        this.body = this.physics.createCharacter(characterOptions);
        
        // Link physics body to mesh for rendering updates
        this.physics.addObject(this.group, this.body);
    }
    
    /**
     * Set up collision handling for the player
     */
    setupCollisionHandling() {
        // Set up collision callback
        this.physics.onCollision(this.body, (playerBody, otherBody) => {
            // Check what the player collided with based on user data or other properties
            if (otherBody.userData && otherBody.userData.type === 'vehicle') {
                // Near a vehicle - could enable entering
                if (this.controls.actions.enterVehicle) {
                    this.enterVehicle(otherBody.userData.vehicle);
                }
            } 
            else if (otherBody.userData && otherBody.userData.type === 'item') {
                // Collision with pickup item
                this.collectItem(otherBody.userData.item);
            }
            else if (otherBody.userData && otherBody.userData.type === 'ground') {
                // Collision with ground - player is grounded
                this.isGrounded = true;
                this.isJumping = false;
            }
        });
    }
    
    /**
     * Update player state and position based on controls and physics
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update controls
        this.controls.update(deltaTime);
        
        if (this.isInVehicle) {
            this.updateInVehicle(deltaTime);
        } else {
            this.updateOnFoot(deltaTime);
        }
        
        // Update camera based on player position and rotation
        this.updateCamera();
        
        // Update animation state based on movement
        this.updateAnimation();
        
        // Regenerate stamina when not sprinting
        if (!this.controls.actions.sprint) {
            this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + deltaTime * 15);
        }
    }
    
    /**
     * Update player when on foot
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateOnFoot(deltaTime) {
        // Get movement direction from controls
        const moveDirection = this.controls.getMovementDirection();
        
        // Rotate movement direction based on camera rotation
        const rotatedDirection = new THREE.Vector3(moveDirection.x, 0, moveDirection.z);
        rotatedDirection.applyEuler(new THREE.Euler(0, this.controls.cameraRotation.y, 0));
        
        // Determine speed based on sprint status
        let speed = this.walkSpeed;
        if (this.controls.actions.sprint && this.stats.stamina > 0) {
            speed = this.runSpeed;
            // Reduce stamina while sprinting
            this.stats.stamina = Math.max(0, this.stats.stamina - deltaTime * 25);
        }
        
        // Apply movement to velocity
        this.velocity.x = rotatedDirection.x * speed;
        this.velocity.z = rotatedDirection.z * speed;
        
        // Handle jumping
        if (this.controls.actions.jump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
        }
        
        // Apply velocity to physics body
        this.physics.setVelocity(this.body, this.velocity);
        
        // Update player orientation to face movement direction
        if (rotatedDirection.length() > 0.1) {
            const targetRotation = Math.atan2(rotatedDirection.x, rotatedDirection.z);
            this.rotation.y = targetRotation;
            this.group.rotation.y = this.rotation.y;
        }
        
        // Check for vehicle entry
        if (this.controls.actions.enterVehicle) {
            this.checkForNearbyVehicles();
        }
        
        // Update player position from physics
        this.position.copy(this.body.position);
    }
    
    /**
     * Update player when in a vehicle
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateInVehicle(deltaTime) {
        // Handle vehicle controls
        if (this.currentVehicle) {
            // Get vehicle control inputs
            const vehicleControls = this.controls.getVehicleControls();
            
            // Send controls to vehicle
            this.currentVehicle.applyControls(vehicleControls);
            
            // Check if player wants to exit vehicle
            if (this.controls.actions.exitVehicle) {
                this.exitVehicle();
            }
            
            // Update player position to match vehicle driver position
            if (this.currentVehicle.driverPosition) {
                this.position.copy(this.currentVehicle.driverPosition);
            }
        }
    }
    
    /**
     * Update camera based on player state and controls
     */
    updateCamera() {
        // Get target position and rotation
        let targetPosition, targetRotation;
        
        if (this.isInVehicle && this.currentVehicle) {
            // Use vehicle position when driving
            targetPosition = this.currentVehicle.getDriverViewPosition();
            targetRotation = this.currentVehicle.getRotation();
        } else {
            // Use player position when on foot
            targetPosition = new THREE.Vector3().copy(this.position);
            targetRotation = this.rotation;
        }
        
        // Update camera using controls
        this.controls.updateCamera(targetPosition, targetRotation);
    }
    
    /**
     * Update animation state based on player movement
     */
    updateAnimation() {
        // Determine animation state based on player movement and actions
        let newState = 'idle';
        
        if (this.isInVehicle) {
            newState = 'driving';
        } else if (!this.isGrounded) {
            if (this.isJumping) {
                newState = 'jump';
            } else {
                newState = 'fall';
            }
        } else if (this.velocity.length() > 0.5) {
            if (this.controls.actions.sprint) {
                newState = 'run';
            } else {
                newState = 'walk';
            }
        }
        
        // Only update if state has changed
        if (newState !== this.animationState) {
            this.animationState = newState;
            this.playAnimation(newState);
        }
    }
    
    /**
     * Play animation based on state
     * @param {string} state - Animation state to play
     */
    playAnimation(state) {
        // This would connect to an animation system in a full implementation
        console.log(`Playing animation: ${state}`);
        
        // Implement animation transitions here
        // If using a loaded model with animations, you would play the appropriate animation clip
    }
    
    /**
     * Check for nearby vehicles to enter
     */
    checkForNearbyVehicles() {
        // Cast a ray to check for nearby vehicles
        const rayStart = new THREE.Vector3().copy(this.position);
        rayStart.y += this.height / 2;
        
        // Cast rays in multiple directions to check all around the player
        const rayDirections = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];
        
        // Check each direction
        for (const direction of rayDirections) {
            const rayEnd = new THREE.Vector3().copy(rayStart).add(direction.multiplyScalar(2));
            const result = this.physics.rayTest(rayStart, rayEnd);
            
            if (result.hasHit && result.body.userData && result.body.userData.type === 'vehicle') {
                // Found a vehicle - enter it
                this.enterVehicle(result.body.userData.vehicle);
                break;
            }
        }
    }
    
    /**
     * Enter a vehicle
     * @param {object} vehicle - The vehicle to enter
     */
    enterVehicle(vehicle) {
        if (!vehicle || this.isInVehicle) return;
        
        // Store current vehicle
        this.currentVehicle = vehicle;
        this.isInVehicle = true;
        
        // Hide player mesh when in vehicle
        this.group.visible = false;
        
        // Disable player physics while in vehicle
        this.body.sleep();
        
        // Switch to vehicle control mode
        this.controls.setControlMode(Controls.MODE_VEHICLE);
        
        // Tell the vehicle it has a driver
        vehicle.setDriver(this);
    }
    
    /**
     * Exit the current vehicle
     */
    exitVehicle() {
        if (!this.isInVehicle || !this.currentVehicle) return;
        
        // Get exit position from vehicle
        const exitPosition = this.currentVehicle.getExitPosition();
        
        // Update player position to exit position
        this.position.copy(exitPosition);
        this.body.position.copy(exitPosition);
        
        // Show player mesh
        this.group.visible = true;
        
        // Wake up player physics
        this.body.wakeUp();
        
        // Switch back to character control mode
        this.controls.setControlMode(Controls.MODE_CHARACTER);
        
        // Tell the vehicle it no longer has a driver
        this.currentVehicle.removeDriver();
        
        // Clear current vehicle
        this.currentVehicle = null;
        this.isInVehicle = false;
    }
    
    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     */
    takeDamage(amount) {
        this.stats.health = Math.max(0, this.stats.health - amount);
        
        // Check for death
        if (this.stats.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Handle player death
     */
    die() {
        // Reset position
        this.position.set(0, 2, 0);
        this.body.position.copy(this.position);
        
        // Reset stats
        this.stats.health = this.stats.maxHealth;
        
        // Exit vehicle if in one
        if (this.isInVehicle) {
            this.exitVehicle();
        }
        
        // Play death animation
        this.playAnimation('death');
        
        // Additional death logic would go here
        console.log("Player died and respawned");
    }
    
    /**
     * Add money to player
     * @param {number} amount - Amount of money to add
     */
    addMoney(amount) {
        this.stats.money += amount;
        // Update UI or show notification
        console.log(`Added $${amount}. New balance: $${this.stats.money}`);
    }
    
    /**
     * Remove money from player
     * @param {number} amount - Amount of money to remove
     * @returns {boolean} - Whether the transaction was successful
     */
    removeMoney(amount) {
        if (this.stats.money >= amount) {
            this.stats.money -= amount;
            // Update UI or show notification
            console.log(`Spent $${amount}. New balance: $${this.stats.money}`);
            return true;
        } else {
            // Not enough money
            console.log(`Not enough money. Current balance: $${this.stats.money}`);
            return false;
        }
    }
    
    /**
     * Collect an item from the world
     * @param {object} item - The item to collect
     */
    collectItem(item) {
        if (!item) return;
        
        // Check if inventory has space
        if (this.inventory.items.length >= this.inventory.maxItems) {
            console.log("Inventory full");
            return false;
        }
        
        // Process different item types
        if (item.type === 'weapon') {
            this.addWeapon(item);
        } else if (item.type === 'cash') {
            this.addMoney(item.value);
        } else {
            // Add generic item to inventory
            this.inventory.items.push(item);
            console.log(`Collected item: ${item.name}`);
        }
        
        // Remove item from world if needed
        if (item.mesh && item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
        }
        
        return true;
    }
    
    /**
     * Add a weapon to inventory
     * @param {object} weapon - Weapon to add
     */
    addWeapon(weapon) {
        // Check if player already has this weapon
        const existingWeapon = this.inventory.weapons.find(w => w.id === weapon.id);
        
        if (existingWeapon) {
            // Add ammo to existing weapon
            existingWeapon.ammo += weapon.ammo;
            console.log(`Added ${weapon.ammo} ammo to ${weapon.name}`);
        } else {
            // Add new weapon
            this.inventory.weapons.push(weapon);
            console.log(`Added weapon: ${weapon.name}`);
            
            // Auto-equip if no weapon is currently equipped
            if (this.inventory.currentWeapon === null) {
                this.equipWeapon(weapon);
            }
        }
    }
    
    /**
     * Equip a weapon
     * @param {object} weapon - Weapon to equip
     */
    equipWeapon(weapon) {
        // Set as current weapon
        this.inventory.currentWeapon = weapon;
        
        // Update player state
        console.log(`Equipped weapon: ${weapon.name}`);
        
        // In a full implementation, would change player visuals and animations
        this.playAnimation('equip_weapon');
    }
    
    /**
     * Cycle to next weapon
     */
    nextWeapon() {
        if (this.inventory.weapons.length === 0) return;
        
        // Find current weapon index
        const currentIndex = this.inventory.currentWeapon ? 
            this.inventory.weapons.findIndex(w => w.id === this.inventory.currentWeapon.id) : -1;
        
        // Get next weapon (or first if at end)
        const nextIndex = (currentIndex + 1) % this.inventory.weapons.length;
        this.equipWeapon(this.inventory.weapons[nextIndex]);
    }
    
    /**
     * Fire current weapon
     */
    fireWeapon() {
        if (!this.inventory.currentWeapon) return;
        
        const weapon = this.inventory.currentWeapon;
        
        // Check if weapon has ammo
        if (weapon.ammo <= 0) {
            console.log("Out of ammo");
            return;
        }
        
        // Reduce ammo
        weapon.ammo--;
        
        // Play weapon fire animation
        this.playAnimation('shoot');
        
        // In a full implementation:
        // - Create projectile
        // - Add muzzle flash effect
        // - Add sound effect
        // - Apply recoil
        
        console.log(`Fired weapon: ${weapon.name}. Ammo remaining: ${weapon.ammo}`);
        
        // Cast ray to check for hits
        this.performWeaponRaycast();
    }
    
    /**
     * Perform raycast to check for weapon hits
     */
    performWeaponRaycast() {
        // Get ray start position (camera or player position)
        const rayStart = new THREE.Vector3();
        this.camera.getWorldPosition(rayStart);
        
        // Get ray direction (camera forward direction)
        const rayDirection = new THREE.Vector3(0, 0, -1);
        rayDirection.applyQuaternion(this.camera.quaternion);
        
        // Compute ray end point
        const rayEnd = new THREE.Vector3().copy(rayStart).add(
            rayDirection.multiplyScalar(100) // Weapon range
        );
        
        // Perform ray test
        const result = this.physics.rayTest(rayStart, rayEnd);
        
        if (result.hasHit) {
            // Hit something
            const hitBody = result.body;
            
            // Check what was hit
            if (hitBody.userData && hitBody.userData.type === 'npc') {
                // Hit an NPC - deal damage
                hitBody.userData.npc.takeDamage(this.inventory.currentWeapon.damage);
            } else if (hitBody.userData && hitBody.userData.type === 'vehicle') {
                // Hit a vehicle - damage vehicle
                hitBody.userData.vehicle.takeDamage(this.inventory.currentWeapon.damage);
            } else if (hitBody.userData && hitBody.userData.type === 'prop') {
                // Hit a prop - could break or apply force
                if (hitBody.userData.breakable) {
                    hitBody.userData.prop.break();
                }
            }
            
            // Create impact effect at hit point
            this.createImpactEffect(result.hitPointWorld);
        }
    }
    
    /**
     * Create a visual effect at impact point
     * @param {THREE.Vector3} position - Position for the effect
     */
    createImpactEffect(position) {
        // Simple implementation - just a placeholder in the MVP
        console.log("Impact effect at", position);
        
        // In a full implementation:
        // - Create particle effect
        // - Add sound effect
        // - Add decal to surface
    }
    
    /**
     * Reload current weapon
     */
    reloadWeapon() {
        if (!this.inventory.currentWeapon) return;
        
        // Play reload animation
        this.playAnimation('reload');
        
        // In a full implementation:
        // - Check for available ammo
        // - Wait for reload animation
        // - Add sound effect
        
        // For MVP, just refill ammo
        this.inventory.currentWeapon.ammo = this.inventory.currentWeapon.maxAmmo;
        console.log(`Reloaded weapon. Ammo: ${this.inventory.currentWeapon.ammo}`);
    }
    
    /**
     * Start a mission
     * @param {object} mission - Mission to start
     */
    startMission(mission) {
        if (!mission) return;
        
        console.log(`Starting mission: ${mission.name}`);
        
        // In a full implementation:
        // - Set active mission in game state
        // - Show mission objectives
        // - Start tracking mission progress
        // - Trigger mission intro cutscene if needed
    }
    
    /**
     * Complete a mission objective
     * @param {object} objective - Objective that was completed
     */
    completeObjective(objective) {
        if (!objective) return;
        
        console.log(`Completed objective: ${objective.description}`);
        
        // Reward player if specified
        if (objective.reward) {
            if (objective.reward.money) {
                this.addMoney(objective.reward.money);
            }
            if (objective.reward.item) {
                this.collectItem(objective.reward.item);
            }
        }
        
        // In a full implementation:
        // - Update mission state
        // - Show notification or UI update
        // - Check if mission is complete
    }
    
    /**
     * Interact with an object in the world
     */
    interact() {
        // Cast ray to check for interactive objects
        const rayStart = new THREE.Vector3().copy(this.position);
        rayStart.y += this.height / 2;
        
        // Direction is based on player facing direction
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyEuler(this.rotation);
        
        const rayEnd = new THREE.Vector3().copy(rayStart).add(
            direction.multiplyScalar(2) // Interaction range
        );
        
        const result = this.physics.rayTest(rayStart, rayEnd);
        
        if (result.hasHit) {
            const hitBody = result.body;
            
            // Check what was hit and interact accordingly
            if (hitBody.userData && hitBody.userData.interactive) {
                const interactive = hitBody.userData.interactive;
                
                // Call object's interact method
                if (typeof interactive.interact === 'function') {
                    interactive.interact(this);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Update wanted level
     * @param {number} change - Amount to change wanted level (+/-)
     */
    updateWantedLevel(change) {
        this.stats.wanted = Math.max(0, Math.min(5, this.stats.wanted + change));
        console.log(`Wanted level: ${this.stats.wanted}`);
        
        // In a full implementation:
        // - Update UI
        // - Trigger police response based on level
        // - Change NPC behaviors
    }
    
    /**
     * Save player state
     * @returns {object} - Serialized player state
     */
    save() {
        // Create a serializable object with player state
        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            stats: { ...this.stats },
            inventory: {
                weapons: this.inventory.weapons.map(w => ({ ...w })),
                items: this.inventory.items.map(i => ({ ...i })),
                currentWeapon: this.inventory.currentWeapon ? this.inventory.currentWeapon.id : null,
                cash: this.inventory.cash
            },
            isInVehicle: this.isInVehicle,
            currentVehicle: this.currentVehicle ? this.currentVehicle.id : null
        };
    }
    
    /**
     * Load player state
     * @param {object} state - Serialized player state
     */
    load(state) {
        if (!state) return;
        
        // Restore position
        if (state.position) {
            this.position.set(state.position.x, state.position.y, state.position.z);
            this.body.position.copy(this.position);
        }
        
        // Restore stats
        if (state.stats) {
            this.stats = { ...state.stats };
        }
        
        // Restore inventory
        if (state.inventory) {
            this.inventory.weapons = state.inventory.weapons.map(w => ({ ...w }));
            this.inventory.items = state.inventory.items.map(i => ({ ...i }));
            this.inventory.cash = state.inventory.cash;
            
            // Restore current weapon if any
            if (state.inventory.currentWeapon) {
                const weapon = this.inventory.weapons.find(w => w.id === state.inventory.currentWeapon);
                if (weapon) {
                    this.inventory.currentWeapon = weapon;
                }
            }
        }
        
        console.log("Player state loaded");
    }
}
