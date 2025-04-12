import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Vehicle class that manages vehicle state, appearance, and physics
 */
export class Vehicle {
    constructor(scene, physics, options = {}) {
        // References to scene and physics system
        this.scene = scene;
        this.physics = physics;
        
        // Vehicle properties
        this.options = {
            type: options.type || 'sedan',  // sedan, sports, truck, etc.
            color: options.color || 0x333333,
            position: options.position || new THREE.Vector3(0, 1, 0),
            rotation: options.rotation || new THREE.Euler(0, 0, 0),
            
            // Performance attributes
            maxSpeed: options.maxSpeed || 150,        // km/h
            acceleration: options.acceleration || 10,  // 0-100 km/h time in seconds
            handling: options.handling || 0.7,         // 0-1 handling rating
            braking: options.braking || 0.8,           // 0-1 braking rating
            
            // Physical dimensions
            dimensions: options.dimensions || {
                length: 4.5,  // meters
                width: 1.8,   // meters
                height: 1.4,  // meters
            }
        };
        
        // Vehicle state
        this.state = {
            health: 100,            // 0-100 health percentage
            fuel: 100,              // 0-100 fuel percentage
            speed: 0,               // current speed in km/h
            engineOn: false,        // engine state
            handbrakeActive: false, // handbrake state
            headlightsOn: false,    // headlights state
            hornActive: false,      // horn state
            damaged: false,         // visual damage state
            driver: null,           // reference to driver (player or NPC)
        };
        
        // Vehicle unique ID
        this.id = Math.random().toString(36).substr(2, 9);
        
        // Controls state
        this.controls = {
            throttle: 0,    // 0-1 for acceleration
            brake: 0,       // 0-1 for braking
            steering: 0,    // -1 to 1 for steering
            handbrake: false
        };
        
        // Create vehicle mesh and physics body
        this.createVehicleMesh();
        this.createVehiclePhysics();
        
        // Entry and exit points
        this.entryPoints = this.createEntryPoints();
        this.exitPoints = this.createExitPoints();
        
        // Driver position for camera and controls
        this.driverPosition = new THREE.Vector3(0, 0.8, 0.2);
    }
    
    /**
     * Create the vehicle's visual representation
     */
    createVehicleMesh() {
        // Create a group to hold all vehicle parts
        this.group = new THREE.Group();
        
        // Create vehicle body
        const bodyDimensions = this.options.dimensions;
        const bodyGeometry = new THREE.BoxGeometry(
            bodyDimensions.width,
            bodyDimensions.height * 0.6,  // Make body shorter than total height
            bodyDimensions.length
        );
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.options.color,
            metalness: 0.7,
            roughness: 0.3
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Position body relative to wheels
        this.body.position.y = bodyDimensions.height * 0.3;
        this.group.add(this.body);
        
        // Create cabin/windows
        const cabinWidth = bodyDimensions.width * 0.9;
        const cabinHeight = bodyDimensions.height * 0.4;
        const cabinLength = bodyDimensions.length * 0.6;
        const cabinGeometry = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
        const cabinMaterial = new THREE.MeshStandardMaterial({
            color: 0x111122,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.7
        });
        this.cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        this.cabin.position.y = bodyDimensions.height * 0.6 + cabinHeight * 0.5;
        this.group.add(this.cabin);
        
        // Create wheels
        this.wheels = [];
        const wheelRadius = bodyDimensions.height * 0.3;
        const wheelWidth = bodyDimensions.width * 0.1;
        
        // Wheel positions relative to vehicle center
        const wheelPositions = [
            // Front Left
            new THREE.Vector3(
                -bodyDimensions.width / 2 + wheelWidth / 2,
                wheelRadius,
                bodyDimensions.length / 3
            ),
            // Front Right
            new THREE.Vector3(
                bodyDimensions.width / 2 - wheelWidth / 2,
                wheelRadius,
                bodyDimensions.length / 3
            ),
            // Rear Left
            new THREE.Vector3(
                -bodyDimensions.width / 2 + wheelWidth / 2,
                wheelRadius,
                -bodyDimensions.length / 3
            ),
            // Rear Right
            new THREE.Vector3(
                bodyDimensions.width / 2 - wheelWidth / 2,
                wheelRadius,
                -bodyDimensions.length / 3
            )
        ];
        
        // Create wheel meshes
        const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        wheelPositions.forEach((position, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
            wheel.position.copy(position);
            this.wheels.push(wheel);
            this.group.add(wheel);
        });
        
        // Create headlights
        this.headlights = [];
        
        // Headlight positions (front of car)
        const headlightPositions = [
            // Left Headlight
            new THREE.Vector3(
                -bodyDimensions.width / 3,
                bodyDimensions.height * 0.3,
                bodyDimensions.length / 2 + 0.05
            ),
            // Right Headlight
            new THREE.Vector3(
                bodyDimensions.width / 3,
                bodyDimensions.height * 0.3,
                bodyDimensions.length / 2 + 0.05
            )
        ];
        
        // Create headlight meshes
        const headlightGeometry = new THREE.CircleGeometry(0.2, 16);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0
        });
        
        headlightPositions.forEach(position => {
            const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial.clone());
            headlight.position.copy(position);
            headlight.rotation.y = Math.PI; // Face forward
            this.headlights.push(headlight);
            this.group.add(headlight);
            
            // Add actual light source (spotlight)
            const spotlight = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 6, 0.5, 2);
            spotlight.position.copy(position);
            spotlight.target.position.set(position.x, position.y, position.z + 10);
            spotlight.visible = false;
            this.group.add(spotlight);
            this.group.add(spotlight.target);
            headlight.spotlight = spotlight;
        });
        
        // Create brake lights
        this.brakelights = [];
        
        // Brakelight positions (back of car)
        const brakelightPositions = [
            // Left Brakelight
            new THREE.Vector3(
                -bodyDimensions.width / 3,
                bodyDimensions.height * 0.3,
                -bodyDimensions.length / 2 - 0.05
            ),
            // Right Brakelight
            new THREE.Vector3(
                bodyDimensions.width / 3,
                bodyDimensions.height * 0.3,
                -bodyDimensions.length / 2 - 0.05
            )
        ];
        
        // Create brakelight meshes
        const brakelightGeometry = new THREE.CircleGeometry(0.15, 16);
        const brakelightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0
        });
        
        brakelightPositions.forEach(position => {
            const brakelight = new THREE.Mesh(brakelightGeometry, brakelightMaterial.clone());
            brakelight.position.copy(position);
            brakelight.rotation.y = 0; // Face backward
            this.brakelights.push(brakelight);
            this.group.add(brakelight);
        });
        
        // Set initial position and rotation
        this.group.position.copy(this.options.position);
        this.group.rotation.copy(this.options.rotation);
        
        // Add to scene
        this.scene.add(this.group);
    }
    
    /**
     * Create physics representation of the vehicle
     */
    createVehiclePhysics() {
        const bodyDimensions = this.options.dimensions;
        
        // Create vehicle physics with cannon.js
        const chassisDimensions = new THREE.Vector3(
            bodyDimensions.width,
            bodyDimensions.height,
            bodyDimensions.length
        );
        
        // Create vehicle
        const vehicleOptions = {
            chassisDimensions: chassisDimensions,
            wheelRadius: bodyDimensions.height * 0.3,
            wheelWidth: bodyDimensions.width * 0.1,
            position: this.options.position,
            mass: 1500 // 1500 kg
        };
        
        // Create vehicle physics object
        const vehiclePhysics = this.physics.createVehicle(vehicleOptions);
        this.vehicle = vehiclePhysics.vehicle;
        this.chassisBody = vehiclePhysics.chassisBody;
        this.wheelBodies = vehiclePhysics.wheelBodies;
        
        // Set up vehicle physics properties
        // Tune these values for different vehicle types
        this.vehicle.maxForce = 800 * this.options.acceleration;
        this.vehicle.maxBrake = 50 * this.options.braking;
        
        // Differentiate steering based on vehicle type
        if (this.options.type === 'sports') {
            this.vehicle.steeringClamp = 0.6; // Sports cars have tighter steering
        } else if (this.options.type === 'truck') {
            this.vehicle.steeringClamp = 0.4; // Trucks have slower steering
        } else {
            this.vehicle.steeringClamp = 0.5; // Default steering
        }
        
        // Set user data for collision detection
        this.chassisBody.userData = {
            type: 'vehicle',
            vehicle: this,
            id: this.id
        };
        
        // Link physics body to mesh for rendering updates
        this.physics.addObject(this.group, this.chassisBody);
    }
    
    /**
     * Create entry points for the vehicle
     * @returns {Array} - Array of entry point positions
     */
    createEntryPoints() {
        const bodyDimensions = this.options.dimensions;
        
        // Entry points around the vehicle
        return [
            // Driver door (left side)
            new THREE.Vector3(
                -bodyDimensions.width - 0.5, // Left side + buffer distance
                0,
                bodyDimensions.length / 6 // Driver's position
            ),
            
            // Passenger door (right side)
            new THREE.Vector3(
                bodyDimensions.width + 0.5, // Right side + buffer distance
                0,
                bodyDimensions.length / 6 // Front passenger position
            ),
            
            // Rear left door
            new THREE.Vector3(
                -bodyDimensions.width - 0.5, // Left side + buffer distance
                0,
                -bodyDimensions.length / 6 // Rear position
            ),
            
            // Rear right door
            new THREE.Vector3(
                bodyDimensions.width + 0.5, // Right side + buffer distance
                0,
                -bodyDimensions.length / 6 // Rear position
            )
        ];
    }
    
    /**
     * Create exit points for the vehicle
     * @returns {Array} - Array of exit point positions
     */
    createExitPoints() {
        const bodyDimensions = this.options.dimensions;
        
        // Exit points are similar to entry points but ensure they're clear of obstacles
        return [
            // Driver side exit
            new THREE.Vector3(
                -bodyDimensions.width - 1.0, // Left side + larger buffer
                0,
                bodyDimensions.length / 6 // Driver's position
            ),
            
            // Passenger side exit
            new THREE.Vector3(
                bodyDimensions.width + 1.0, // Right side + larger buffer
                0,
                bodyDimensions.length / 6 // Front passenger position
            ),
            
            // Rear exit points
            new THREE.Vector3(
                -bodyDimensions.width - 1.0, // Left side + larger buffer
                0,
                -bodyDimensions.length / 6 // Rear position
            ),
            
            new THREE.Vector3(
                bodyDimensions.width + 1.0, // Right side + larger buffer
                0,
                -bodyDimensions.length / 6 // Rear position
            )
        ];
    }
    
    /**
     * Get the best exit position based on surroundings
     * @returns {THREE.Vector3} - The best exit position
     */
    getExitPosition() {
        // In a complete implementation, you'd check each exit point
        // for obstacles using raycasting and return the best one.
        // For the MVP, we'll just use the driver side exit
        
        // Transform local exit position to world coordinates
        const worldExitPos = this.exitPoints[0].clone();
        worldExitPos.applyMatrix4(this.group.matrixWorld);
        
        // Ensure the exit position is above ground
        worldExitPos.y = Math.max(0.5, worldExitPos.y);
        
        return worldExitPos;
    }
    
    /**
     * Get the driver view position for camera placement
     * @returns {THREE.Vector3} - The driver view position
     */
    getDriverViewPosition() {
        // Transform local driver position to world coordinates
        const worldDriverPos = this.driverPosition.clone();
        worldDriverPos.applyMatrix4(this.group.matrixWorld);
        
        return worldDriverPos;
    }
    
    /**
     * Get the current rotation of the vehicle
     * @returns {THREE.Euler} - Vehicle rotation
     */
    getRotation() {
        return this.group.rotation;
    }
    
    /**
     * Apply control inputs to the vehicle
     * @param {object} controls - Control inputs object
     */
    applyControls(controls) {
        if (!this.state.engineOn && (controls.throttle > 0 || controls.brake > 0)) {
            // Auto-start engine if controls are applied
            this.startEngine();
        }
        
        // Store control values
        this.controls = {
            throttle: controls.throttle || 0,
            brake: controls.brake || 0,
            steering: controls.steering || 0,
            handbrake: controls.handbrake || false
        };
        
        // Apply steering
        // Scale steering based on speed - less responsive at high speeds
        const speedFactor = Math.max(0.5, 1 - (this.state.speed / this.options.maxSpeed));
        const steeringValue = this.controls.steering * this.vehicle.steeringClamp * speedFactor;
        
        for (let i = 0; i < 2; i++) {
            this.vehicle.setSteeringValue(steeringValue, i);
        }
        
        // Apply engine force (throttle)
        const engineForce = this.controls.throttle * this.vehicle.maxForce;
        for (let i = 2; i < 4; i++) {  // Apply to rear wheels for rear-wheel drive
            this.vehicle.applyEngineForce(engineForce, i);
        }
        
        // Apply braking
        const brakeForce = this.controls.brake * this.vehicle.maxBrake;
        for (let i = 0; i < 4; i++) {
            this.vehicle.setBrake(brakeForce, i);
        }
        
        // Apply handbrake (stronger brake to rear wheels)
        if (this.controls.handbrake) {
            const handbrakeForce = this.vehicle.maxBrake * 2;
            for (let i = 2; i < 4; i++) {  // Apply to rear wheels
                this.vehicle.setBrake(handbrakeForce, i);
            }
            this.state.handbrakeActive = true;
        } else {
            this.state.handbrakeActive = false;
        }
        
        // Update brake lights based on brake or handbrake
        this.updateBrakeLights(this.controls.brake > 0 || this.controls.handbrake);
    }
    
    /**
     * Update brake lights visibility
     * @param {boolean} active - Whether brakes are active
     */
    updateBrakeLights(active) {
        this.brakelights.forEach(light => {
            light.material.emissiveIntensity = active ? 1 : 0;
        });
    }
    
    /**
     * Start the vehicle engine
     */
    startEngine() {
        if (!this.state.engineOn) {
            this.state.engineOn = true;
            console.log(`Vehicle ${this.id} engine started`);
            
            // In a full implementation:
            // - Play engine start sound
            // - Add particle effects (exhaust)
            // - Start idle engine animation/sound
        }
    }
    
    /**
     * Stop the vehicle engine
     */
    stopEngine() {
        if (this.state.engineOn) {
            this.state.engineOn = false;
            
            // Reset controls
            this.controls = {
                throttle: 0,
                brake: 0,
                steering: 0,
                handbrake: false
            };
            
            // Apply controls to fully stop the vehicle
            for (let i = 0; i < 4; i++) {
                this.vehicle.applyEngineForce(0, i);
                this.vehicle.setBrake(10, i);
            }
            
            console.log(`Vehicle ${this.id} engine stopped`);
            
            // In a full implementation:
            // - Play engine stop sound
            // - Stop particle effects
            // - Stop engine animations/sounds
        }
    }
    
    /**
     * Toggle headlights on/off
     */
    toggleHeadlights() {
        this.state.headlightsOn = !this.state.headlightsOn;
        
        // Update headlight visuals
        this.headlights.forEach(light => {
            light.material.emissiveIntensity = this.state.headlightsOn ? 1 : 0;
            if (light.spotlight) {
                light.spotlight.visible = this.state.headlightsOn;
                light.spotlight.intensity = this.state.headlightsOn ? 2 : 0;
            }
        });
        
        console.log(`Vehicle ${this.id} headlights ${this.state.headlightsOn ? 'on' : 'off'}`);
    }
    
    /**
     * Activate horn
     * @param {boolean} active - Whether horn is active
     */
    activateHorn(active) {
        this.state.hornActive = active;
        
        if (active) {
            console.log(`Vehicle ${this.id} horn activated`);
            // In a full implementation, play horn sound
        } else {
            console.log(`Vehicle ${this.id} horn deactivated`);
            // In a full implementation, stop horn sound
        }
    }
    
    /**
     * Set driver of the vehicle
     * @param {object} driver - The driver (player or NPC)
     */
    setDriver(driver) {
        this.state.driver = driver;
        
        // Start engine when driver enters
        this.startEngine();
        
        console.log(`Driver set for vehicle ${this.id}`);
    }
    
    /**
     * Remove driver from the vehicle
     */
    removeDriver() {
        this.state.driver = null;
        
        // Stop engine when driver exits
        this.stopEngine();
        
        console.log(`Driver removed from vehicle ${this.id}`);
    }
    
    /**
     * Apply damage to the vehicle
     * @param {number} amount - Amount of damage to apply
     */
    takeDamage(amount) {
        // Reduce health
        this.state.health = Math.max(0, this.state.health - amount);
        
        // Update damaged state if health falls below threshold
        if (this.state.health < 50 && !this.state.damaged) {
            this.state.damaged = true;
            this.applyDamageVisuals();
        }
        
        // Check if vehicle is destroyed
        if (this.state.health <= 0) {
            this.destroy();
        }
        
        console.log(`Vehicle ${this.id} took ${amount} damage. Health: ${this.state.health}`);
    }
    
    /**
     * Apply visual effects for damage
     */
    applyDamageVisuals() {
        // In a full implementation, this would:
        // - Deform the vehicle mesh
        // - Add smoke/fire particles depending on damage level
        // - Change materials (add scratches, dents, etc.)
        // - Apply performance penalties
        
        // For MVP, just modify the material
        this.body.material.roughness += 0.3;
        this.body.material.metalness -= 0.2;
        
        console.log(`Applied damage visuals to vehicle ${this.id}`);
    }
    
    /**
     * Repair the vehicle
     * @param {number} amount - Amount to repair (0-100)
     */
    repair(amount) {
        const oldHealth = this.state.health;
        
        // Increase health
        this.state.health = Math.min(100, this.state.health + amount);
        
        // Reset damaged state if health goes above threshold
        if (this.state.health >= 50 && this.state.damaged) {
            this.state.damaged = false;
            this.resetDamageVisuals();
        }
        
        console.log(`Vehicle ${this.id} repaired for ${amount}. Health: ${this.state.health}`);
        
        return this.state.health - oldHealth; // Return actual amount repaired
    }
    
    /**
     * Reset visual effects from damage
     */
    resetDamageVisuals() {
        // Reset materials to original state
        this.body.material.roughness = 0.3;
        this.body.material.metalness = 0.7;
        
        console.log(`Reset damage visuals for vehicle ${this.id}`);
    }
    
    /**
     * Destroy the vehicle (when health reaches 0)
     */
    destroy() {
        console.log(`Vehicle ${this.id} destroyed`);
        
        // Eject driver if present
        if (this.state.driver) {
            // In a full implementation, this would damage the driver
            const exitPos = this.getExitPosition();
            if (typeof this.state.driver.exitVehicle === 'function') {
                this.state.driver.exitVehicle();
            }
        }
        
        // In a full implementation:
        // - Play explosion effect
        // - Create fire/smoke particles
        // - Play sound effect
        // - Deform vehicle mesh heavily
        // - Make vehicle unusable
        
        // For MVP, just update appearance
        this.body.material.color.set(0x111111); // Blackened
        this.body.material.roughness = 1;
        this.body.material.metalness = 0;
    }
    
    /**
     * Add fuel to the vehicle
     * @param {number} amount - Amount of fuel to add (0-100)
     * @returns {number} - Actual amount of fuel added
     */
    addFuel(amount) {
        const oldFuel = this.state.fuel;
        
        // Increase fuel
        this.state.fuel = Math.min(100, this.state.fuel + amount);
        
        console.log(`Added ${amount} fuel to vehicle ${this.id}. Fuel: ${this.state.fuel}`);
        
        return this.state.fuel - oldFuel; // Return actual amount added
    }
    
    /**
     * Update vehicle state every frame
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Skip update if vehicle is not active
        if (!this.chassisBody) return;
        
        // Calculate current speed in km/h from physics
        const velocity = this.chassisBody.velocity;
        const speed = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        ) * 3.6; // Convert m/s to km/h
        
        this.state.speed = speed;
        
        // Update wheel rotations based on physics
        if (this.wheels && this.vehicle.wheelInfos) {
            for (let i = 0; i < Math.min(this.wheels.length, this.vehicle.wheelInfos.length); i++) {
                // Update wheel rotation
                const wheel = this.wheels[i];
                const wheelInfo = this.vehicle.wheelInfos[i];
                
                // Rotate wheel around its axis
                wheel.rotation.x += wheelInfo.deltaRotation;
            }
        }
        
        // Consume fuel based on throttle and engine state
        if (this.state.engineOn) {
            // Idle fuel consumption
            let fuelConsumption = 0.01 * deltaTime;
            
            // Additional consumption based on throttle
            fuelConsumption += this.controls.throttle * 0.05 * deltaTime;
            
            // Deduct fuel
            this.state.fuel = Math.max(0, this.state.fuel - fuelConsumption);
            
            // Engine dies if out of fuel
            if (this.state.fuel <= 0 && this.state.engineOn) {
                this.stopEngine();
                console.log(`Vehicle ${this.id} ran out of fuel`);
            }
        }
    }
    
    /**
     * Remove vehicle from scene and physics world
     */
    dispose() {
        // Remove from physics world
        if (this.chassisBody) {
            this.physics.world.removeBody(this.chassisBody);
        }
        
        // Remove wheel bodies
        if (this.wheelBodies) {
            this.wheelBodies.forEach(body => {
                if (body) {
                    this.physics.world.removeBody(body);
                }
            });
        }
        
        // Remove from scene
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Remove any event listeners or references
        this.state.driver = null;
        
        console.log(`Vehicle ${this.id} disposed`);
    }
}
