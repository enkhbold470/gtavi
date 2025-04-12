import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Physics system class that manages the physics simulation for the game.
 */
export class Physics {
    constructor() {
        // Physics world setup
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0) // Earth gravity
        });
        
        // Set up default material properties
        this.defaultMaterial = new CANNON.Material('default');
        this.defaultContactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.3,
                restitution: 0.2
            }
        );
        this.world.addContactMaterial(this.defaultContactMaterial);
        
        // Vehicle material for better car physics
        this.vehicleMaterial = new CANNON.Material('vehicle');
        this.vehicleGroundContactMaterial = new CANNON.ContactMaterial(
            this.vehicleMaterial,
            this.defaultMaterial,
            {
                friction: 0.5,
                restitution: 0.1
            }
        );
        this.world.addContactMaterial(this.vehicleGroundContactMaterial);
        
        // Set the default contact material
        this.world.defaultContactMaterial = this.defaultContactMaterial;
        
        // Collections of objects to update
        this.objects = [];
        this.vehicles = [];
        
        // Debug objects
        this.debugMode = false;
        this.debugObjects = [];
        
        // Collision event listeners
        this.collisionCallbacks = {};
        this.setupCollisionEvents();
    }
    
    /**
     * Set up collision event listeners
     */
    setupCollisionEvents() {
        this.world.addEventListener('beginContact', (event) => {
            const bodyA = event.bodyA;
            const bodyB = event.bodyB;
            
            // Call any registered collision callbacks
            if (bodyA.id in this.collisionCallbacks) {
                this.collisionCallbacks[bodyA.id](bodyA, bodyB);
            }
            if (bodyB.id in this.collisionCallbacks) {
                this.collisionCallbacks[bodyB.id](bodyB, bodyA);
            }
        });
    }
    
    /**
     * Register a callback for when a body collides with another
     * @param {CANNON.Body} body - The body to register the callback for
     * @param {Function} callback - The function to call on collision
     */
    onCollision(body, callback) {
        this.collisionCallbacks[body.id] = callback;
    }
    
    /**
     * Create a ground plane
     * @param {number} width - Width of the ground plane
     * @param {number} height - Height of the ground plane
     * @returns {CANNON.Body} - The created physics body
     */
    createGround(width, height) {
        // Create a static ground plane
        const groundShape = new CANNON.Box(new CANNON.Vec3(width / 2, 0.1, height / 2));
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.defaultMaterial,
            shape: groundShape,
            type: CANNON.Body.STATIC
        });
        
        // Rotate to be flat on the xz plane
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
        
        return groundBody;
    }
    
    /**
     * Create a box physics body
     * @param {object} options - Options for the box body
     * @returns {CANNON.Body} - The created physics body
     */
    createBox(options) {
        const { width, height, depth, mass = 1, position, material = this.defaultMaterial } = options;
        
        const boxShape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const boxBody = new CANNON.Body({
            mass,
            material,
            shape: boxShape
        });
        
        if (position) {
            boxBody.position.copy(position);
        }
        
        this.world.addBody(boxBody);
        
        return boxBody;
    }
    
    /**
     * Create a sphere physics body
     * @param {object} options - Options for the sphere body
     * @returns {CANNON.Body} - The created physics body
     */
    createSphere(options) {
        const { radius, mass = 1, position, material = this.defaultMaterial } = options;
        
        const sphereShape = new CANNON.Sphere(radius);
        const sphereBody = new CANNON.Body({
            mass,
            material,
            shape: sphereShape
        });
        
        if (position) {
            sphereBody.position.copy(position);
        }
        
        this.world.addBody(sphereBody);
        
        return sphereBody;
    }
    
    /**
     * Create a compound physics body (for complex shapes)
     * @param {object} options - Options for the compound body
     * @returns {CANNON.Body} - The created physics body
     */
    createCompoundBody(options) {
        const { shapes, mass = 1, position, material = this.defaultMaterial } = options;
        
        const compoundBody = new CANNON.Body({
            mass,
            material
        });
        
        // Add all shapes to the compound body
        shapes.forEach(shape => {
            compoundBody.addShape(shape.shape, shape.offset, shape.orientation);
        });
        
        if (position) {
            compoundBody.position.copy(position);
        }
        
        this.world.addBody(compoundBody);
        
        return compoundBody;
    }
    
    /**
     * Create a vehicle body with wheels
     * @param {object} options - Options for the vehicle
     * @returns {object} - The created vehicle components
     */
    createVehicle(options) {
        const { 
            chassisDimensions, 
            wheelRadius, 
            wheelWidth, 
            position, 
            mass = 800
        } = options;
        
        // Create chassis body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            chassisDimensions.x / 2,
            chassisDimensions.y / 2,
            chassisDimensions.z / 2
        ));
        
        const chassisBody = new CANNON.Body({
            mass,
            material: this.vehicleMaterial,
            shape: chassisShape,
            allowSleep: false
        });
        
        if (position) {
            chassisBody.position.copy(position);
        }
        
        this.world.addBody(chassisBody);
        
        // Create vehicle
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody,
            indexRightAxis: 0, // x
            indexUpAxis: 1,    // y
            indexForwardAxis: 2 // z
        });
        
        // Wheel options
        const wheelOptions = {
            radius: wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0), // Down
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 1.5, // 5.0 makes it grip a lot, 1.0 makes it slide
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(1, 0, 0), // Along the x-axis
            chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1), // Will be updated for each wheel
            useCustomSlidingRotationalSpeed: true,
            customSlidingRotationalSpeed: -30
        };
        
        // Front left wheel
        wheelOptions.chassisConnectionPointLocal.set(
            -chassisDimensions.x / 2 + wheelWidth / 2,
            -chassisDimensions.y / 2 + wheelRadius * 0.3,
            chassisDimensions.z / 2 - wheelRadius
        );
        vehicle.addWheel(wheelOptions);
        
        // Front right wheel
        wheelOptions.chassisConnectionPointLocal.set(
            chassisDimensions.x / 2 - wheelWidth / 2,
            -chassisDimensions.y / 2 + wheelRadius * 0.3,
            chassisDimensions.z / 2 - wheelRadius
        );
        vehicle.addWheel(wheelOptions);
        
        // Back left wheel
        wheelOptions.chassisConnectionPointLocal.set(
            -chassisDimensions.x / 2 + wheelWidth / 2,
            -chassisDimensions.y / 2 + wheelRadius * 0.3,
            -chassisDimensions.z / 2 + wheelRadius
        );
        vehicle.addWheel(wheelOptions);
        
        // Back right wheel
        wheelOptions.chassisConnectionPointLocal.set(
            chassisDimensions.x / 2 - wheelWidth / 2,
            -chassisDimensions.y / 2 + wheelRadius * 0.3,
            -chassisDimensions.z / 2 + wheelRadius
        );
        vehicle.addWheel(wheelOptions);
        
        // Initialize wheels
        vehicle.addToWorld(this.world);
        
        // Create wheel bodies for more accurate physics and collisions
        const wheelBodies = [];
        
        vehicle.wheelInfos.forEach((wheel, index) => {
            const wheelShape = new CANNON.Cylinder(
                wheelRadius, 
                wheelRadius, 
                wheelWidth, 
                20
            );
            
            const wheelBody = new CANNON.Body({
                mass: 1,
                material: this.vehicleMaterial
            });
            
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            
            // Transform wheel shape to align with wheel orientation
            wheelBody.addShape(wheelShape, new CANNON.Vec3(), quaternion);
            wheelBodies.push(wheelBody);
            
            // Skip adding wheel bodies to world - the vehicle will manage them
        });
        
        // Store vehicle for updates
        this.vehicles.push({
            vehicle,
            chassisBody,
            wheelBodies,
            wheels: vehicle.wheelInfos
        });
        
        return {
            vehicle,
            chassisBody,
            wheelBodies,
            wheels: vehicle.wheelInfos
        };
    }
    
    /**
     * Create a character body (player or NPC)
     * @param {object} options - Options for the character body
     * @returns {CANNON.Body} - The created physics body
     */
    createCharacter(options) {
        const { 
            height = 1.8, 
            radius = 0.3, 
            mass = 70, 
            position,
            stepHeight = 0.1
        } = options;
        
        // Create character capsule from a cylinder and two spheres
        const characterBody = new CANNON.Body({
            mass,
            material: this.defaultMaterial,
            allowSleep: false,
            linearDamping: 0.95, // Damping to prevent sliding
            fixedRotation: true, // Prevent the body from rotating
            type: CANNON.Body.DYNAMIC
        });
        
        // Cylinder shape for the body
        const cylinderShape = new CANNON.Cylinder(
            radius, 
            radius, 
            height - 2 * radius, 
            16
        );
        
        // Transform to align the cylinder with the y-axis
        const quaternion = new CANNON.Quaternion();
        quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        
        // Add cylinder and spheres to create a capsule
        characterBody.addShape(
            cylinderShape, 
            new CANNON.Vec3(0, 0, 0), 
            quaternion
        );
        
        // Top sphere
        characterBody.addShape(
            new CANNON.Sphere(radius), 
            new CANNON.Vec3(0, (height - 2 * radius) / 2, 0)
        );
        
        // Bottom sphere
        characterBody.addShape(
            new CANNON.Sphere(radius), 
            new CANNON.Vec3(0, -(height - 2 * radius) / 2, 0)
        );
        
        if (position) {
            characterBody.position.copy(position);
        }
        
        // Add step handling (simple ray casting for stepping up)
        characterBody.stepHeight = stepHeight;
        
        this.world.addBody(characterBody);
        
        return characterBody;
    }
    
    /**
     * Add an object to the physics system and link it to a Three.js mesh
     * @param {THREE.Object3D} mesh - The Three.js mesh
     * @param {CANNON.Body} body - The cannon.js physics body
     */
    addObject(mesh, body) {
        // Set the user data on the body to reference the mesh
        body.userData = { mesh };
        // Add to the list of objects to update
        this.objects.push({ mesh, body });
    }
    
    /**
     * Remove an object from the physics system
     * @param {THREE.Object3D} mesh - The Three.js mesh
     */
    removeObject(mesh) {
        const index = this.objects.findIndex(obj => obj.mesh === mesh);
        if (index !== -1) {
            const { body } = this.objects[index];
            this.world.removeBody(body);
            this.objects.splice(index, 1);
        }
    }
    
    /**
     * Enable debug mode to visualize physics bodies
     * @param {THREE.Scene} scene - The scene to add debug objects to
     */
    enableDebug(scene) {
        this.debugMode = true;
        this.debugScene = scene;
        
        // Create debug meshes for all existing bodies
        this.world.bodies.forEach(body => {
            this.createDebugMesh(body);
        });
    }
    
    /**
     * Create a debug mesh for a physics body
     * @param {CANNON.Body} body - The physics body
     */
    createDebugMesh(body) {
        if (!this.debugMode || !this.debugScene) return;
        
        const meshGroup = new THREE.Group();
        this.debugScene.add(meshGroup);
        
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        // Create a mesh for each shape in the body
        body.shapes.forEach((shape, i) => {
            let mesh;
            
            if (shape instanceof CANNON.Box) {
                const geometry = new THREE.BoxGeometry(
                    shape.halfExtents.x * 2,
                    shape.halfExtents.y * 2,
                    shape.halfExtents.z * 2
                );
                mesh = new THREE.Mesh(geometry, material);
            } else if (shape instanceof CANNON.Sphere) {
                const geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
                mesh = new THREE.Mesh(geometry, material);
            } else if (shape instanceof CANNON.Cylinder) {
                const geometry = new THREE.CylinderGeometry(
                    shape.radiusTop,
                    shape.radiusBottom,
                    shape.height,
                    shape.numSegments
                );
                mesh = new THREE.Mesh(geometry, material);
                
                // Rotate to match cannon.js cylinder orientation
                mesh.rotation.x = Math.PI / 2;
            } else {
                // Fallback for other shapes - use a small sphere
                const geometry = new THREE.SphereGeometry(0.1, 8, 8);
                mesh = new THREE.Mesh(geometry, material);
            }
            
            // Get position and orientation of the shape within the body
            if (body.shapeOffsets[i]) {
                mesh.position.copy(body.shapeOffsets[i]);
            }
            
            if (body.shapeOrientations[i]) {
                mesh.quaternion.copy(body.shapeOrientations[i]);
            }
            
            meshGroup.add(mesh);
        });
        
        // Store reference to debug mesh for updates
        this.debugObjects.push({
            body,
            meshGroup
        });
        
        return meshGroup;
    }
    
    /**
     * Update the physics world and synchronize objects
     * @param {number} deltaTime - Time step in seconds
     */
    update(deltaTime) {
        // Fixed time step for physics
        const timeStep = 1 / 60;
        
        // Update physics world
        this.world.step(timeStep, deltaTime, 3);
        
        // Update regular objects
        this.objects.forEach(obj => {
            const { mesh, body } = obj;
            
            // Update position
            mesh.position.copy(body.position);
            
            // Update rotation
            mesh.quaternion.copy(body.quaternion);
        });
        
        // Update vehicles
        this.vehicles.forEach(vehicleObj => {
            const { vehicle, chassisBody, wheelBodies, wheels } = vehicleObj;
            
            // Update wheel positions
            vehicle.updateVehicle(timeStep);
            
            // Update wheel bodies if they exist
            if (wheelBodies && wheelBodies.length === wheels.length) {
                for (let i = 0; i < wheels.length; i++) {
                    const wheel = wheels[i];
                    const wheelBody = wheelBodies[i];
                    
                    // Get wheel world transform
                    vehicle.updateWheelTransform(i);
                    
                    // Update wheel body position and rotation
                    wheelBody.position.copy(wheel.worldTransform.position);
                    wheelBody.quaternion.copy(wheel.worldTransform.quaternion);
                }
            }
        });
        
        // Update debug objects
        if (this.debugMode) {
            this.debugObjects.forEach(obj => {
                const { body, meshGroup } = obj;
                
                // Update position
                meshGroup.position.copy(body.position);
                
                // Update rotation
                meshGroup.quaternion.copy(body.quaternion);
            });
        }
    }
    
    /**
     * Apply a force to a body at a specific point
     * @param {CANNON.Body} body - The body to apply force to
     * @param {CANNON.Vec3} force - The force vector
     * @param {CANNON.Vec3} point - The point at which to apply the force
     */
    applyForce(body, force, point) {
        body.applyForce(force, point);
    }
    
    /**
     * Apply an impulse to a body at a specific point
     * @param {CANNON.Body} body - The body to apply impulse to
     * @param {CANNON.Vec3} impulse - The impulse vector
     * @param {CANNON.Vec3} point - The point at which to apply the impulse
     */
    applyImpulse(body, impulse, point) {
        body.applyImpulse(impulse, point);
    }
    
    /**
     * Set the velocity of a body
     * @param {CANNON.Body} body - The body to set velocity for
     * @param {CANNON.Vec3} velocity - The velocity vector
     */
    setVelocity(body, velocity) {
        body.velocity.copy(velocity);
    }
    
    /**
     * Perform a ray test from a point in a specific direction
     * @param {CANNON.Vec3} from - Starting point
     * @param {CANNON.Vec3} to - End point
     * @returns {object} - Ray test result
     */
    rayTest(from, to) {
        const result = new CANNON.RaycastResult();
        this.world.rayTest(from, to, result);
        return result;
    }
    
    /**
     * Check if a character can step up onto a surface
     * @param {CANNON.Body} characterBody - The character's physics body
     * @param {CANNON.Vec3} direction - Direction of movement
     * @returns {boolean} - Whether the character can step up
     */
    canStepUp(characterBody, direction) {
        // Cast ray down from slightly in front of the character
        const start = new CANNON.Vec3().copy(characterBody.position);
        start.y += characterBody.shapes[0].height / 2; // Adjust based on character height
        
        // Add some offset in the movement direction
        start.x += direction.x * 0.5;
        start.z += direction.z * 0.5;
        
        const end = new CANNON.Vec3().copy(start);
        end.y -= characterBody.stepHeight * 2; // Check slightly below step height
        
        const result = this.rayTest(start, end);
        
        // If we hit something and it's within the step height, character can step up
        return result.hasHit && (start.y - result.hitPointWorld.y <= characterBody.stepHeight);
    }
}
