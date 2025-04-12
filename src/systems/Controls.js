import * as THREE from 'three';

/**
 * Controls system class that manages user input for the game.
 */
export class Controls {
    constructor(camera, domElement) {
        // DOM element to listen for events
        this.domElement = domElement || document;
        
        // Camera reference
        this.camera = camera;
        
        // Input state tracking
        this.keys = {};
        this.mouseButtons = {};
        this.mousePosition = new THREE.Vector2();
        this.mouseDelta = new THREE.Vector2();
        this.touchStartPosition = new THREE.Vector2();
        this.touchCurrentPosition = new THREE.Vector2();
        this.touchDelta = new THREE.Vector2();
        
        // Control mode
        this.controlMode = Controls.MODE_CHARACTER;
        
        // View mode
        this.viewMode = Controls.VIEW_THIRD_PERSON;
        
        // Camera settings
        this.cameraSensitivity = 0.002;
        this.cameraZoomSpeed = 0.1;
        this.cameraDistance = 5; // For third-person view
        this.cameraHeight = 1.7; // Default camera height for first-person
        this.cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.cameraTarget = new THREE.Vector3();
        
        // Lock state
        this.isPointerLocked = false;
        
        // Touch controls
        this.virtualJoystick = {
            active: false,
            center: new THREE.Vector2(),
            current: new THREE.Vector2(),
            delta: new THREE.Vector2(),
            maxDistance: 50,
            direction: new THREE.Vector2(),
            magnitude: 0
        };
        
        // Action states
        this.actions = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            jump: false,
            sprint: false,
            crouch: false,
            enterVehicle: false,
            exitVehicle: false,
            handbrake: false,
            shoot: false,
            reload: false,
            switchWeapon: false,
            interact: false,
            aim: false
        };
        
        // Initialize event listeners
        this.setupEventListeners();
    }
    
    // Control modes
    static MODE_CHARACTER = 'character';
    static MODE_VEHICLE = 'vehicle';
    
    // View modes
    static VIEW_FIRST_PERSON = 'first-person';
    static VIEW_THIRD_PERSON = 'third-person';
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Keyboard events
        this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Mouse events
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
        
        // Touch events for mobile
        this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Pointer lock (for first-person camera)
        this.domElement.addEventListener('click', this.onPointerLockRequest.bind(this));
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
        
        // Prevent context menu on right-click
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window blur event (reset keys when user tabs out)
        window.addEventListener('blur', this.onWindowBlur.bind(this));
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event 
     */
    onKeyDown(event) {
        // Update key state
        this.keys[event.code] = true;
        
        // Update action states based on key presses
        this.updateActionsFromKeys();
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event 
     */
    onKeyUp(event) {
        // Update key state
        this.keys[event.code] = false;
        
        // Update action states based on key presses
        this.updateActionsFromKeys();
    }
    
    /**
     * Update action states based on current key states
     */
    updateActionsFromKeys() {
        // Common controls for both modes
        this.actions.enter = this.isKeyPressed('KeyE');
        
        // Mode-specific controls
        if (this.controlMode === Controls.MODE_CHARACTER) {
            // Character mode controls
            this.actions.moveForward = this.isKeyPressed('KeyW');
            this.actions.moveBackward = this.isKeyPressed('KeyS');
            this.actions.moveLeft = this.isKeyPressed('KeyA');
            this.actions.moveRight = this.isKeyPressed('KeyD');
            this.actions.jump = this.isKeyPressed('Space');
            this.actions.sprint = this.isKeyPressed('ShiftLeft');
            this.actions.crouch = this.isKeyPressed('ControlLeft');
            this.actions.enterVehicle = this.isKeyPressed('KeyF');
            this.actions.interact = this.isKeyPressed('KeyE');
            this.actions.shoot = this.isMouseButtonPressed(0); // Left mouse button
            this.actions.aim = this.isMouseButtonPressed(2);   // Right mouse button
            this.actions.reload = this.isKeyPressed('KeyR');
            this.actions.switchWeapon = this.isKeyPressed('Tab');
        } else if (this.controlMode === Controls.MODE_VEHICLE) {
            // Vehicle mode controls
            this.actions.moveForward = this.isKeyPressed('KeyW'); // Acceleration
            this.actions.moveBackward = this.isKeyPressed('KeyS'); // Brake/Reverse
            this.actions.moveLeft = this.isKeyPressed('KeyA'); // Turn left
            this.actions.moveRight = this.isKeyPressed('KeyD'); // Turn right
            this.actions.handbrake = this.isKeyPressed('Space');
            this.actions.exitVehicle = this.isKeyPressed('KeyF');
            this.actions.horn = this.isKeyPressed('KeyH');
            this.actions.headlights = this.isKeyPressed('KeyL');
            this.actions.radio = this.isKeyPressed('KeyR');
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} event 
     */
    onMouseDown(event) {
        this.mouseButtons[event.button] = true;
        
        // Update action states
        this.updateActionsFromKeys();
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event 
     */
    onMouseUp(event) {
        this.mouseButtons[event.button] = false;
        
        // Update action states
        this.updateActionsFromKeys();
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event 
     */
    onMouseMove(event) {
        // Calculate mouse delta
        if (this.isPointerLocked) {
            // When pointer is locked, use movementX/Y
            this.mouseDelta.x = event.movementX || 0;
            this.mouseDelta.y = event.movementY || 0;
        } else {
            // Otherwise calculate delta from previous position
            const newX = event.clientX;
            const newY = event.clientY;
            
            this.mouseDelta.x = newX - this.mousePosition.x;
            this.mouseDelta.y = newY - this.mousePosition.y;
            
            this.mousePosition.x = newX;
            this.mousePosition.y = newY;
        }
        
        // Update camera rotation if pointer is locked
        if (this.isPointerLocked) {
            this.updateCameraRotation();
        }
    }
    
    /**
     * Handle mouse wheel events
     * @param {WheelEvent} event 
     */
    onMouseWheel(event) {
        // Zoom in/out in third-person view
        if (this.viewMode === Controls.VIEW_THIRD_PERSON) {
            this.cameraDistance += event.deltaY * this.cameraZoomSpeed * 0.01;
            
            // Clamp camera distance between min and max values
            this.cameraDistance = Math.max(2, Math.min(10, this.cameraDistance));
        }
    }
    
    /**
     * Handle touch start events
     * @param {TouchEvent} event 
     */
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch - handle as virtual joystick
            const touch = event.touches[0];
            this.touchStartPosition.set(touch.clientX, touch.clientY);
            this.touchCurrentPosition.copy(this.touchStartPosition);
            
            // Initialize virtual joystick
            this.virtualJoystick.active = true;
            this.virtualJoystick.center.copy(this.touchStartPosition);
            this.virtualJoystick.current.copy(this.touchStartPosition);
            this.virtualJoystick.delta.set(0, 0);
        } else if (event.touches.length === 2) {
            // Two touches - handle as look/rotate
            // Could be implemented for camera rotation
        }
    }
    
    /**
     * Handle touch move events
     * @param {TouchEvent} event 
     */
    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.virtualJoystick.active) {
            // Update virtual joystick for movement
            const touch = event.touches[0];
            this.touchCurrentPosition.set(touch.clientX, touch.clientY);
            
            // Calculate virtual joystick displacement
            this.virtualJoystick.current.copy(this.touchCurrentPosition);
            this.virtualJoystick.delta.subVectors(this.virtualJoystick.current, this.virtualJoystick.center);
            
            // Calculate magnitude and normalize to 0-1 range for controls
            const magnitude = this.virtualJoystick.delta.length();
            this.virtualJoystick.magnitude = Math.min(1, magnitude / this.virtualJoystick.maxDistance);
            
            // Calculate normalized direction vector
            if (magnitude > 0) {
                this.virtualJoystick.direction.copy(this.virtualJoystick.delta).divideScalar(magnitude);
            } else {
                this.virtualJoystick.direction.set(0, 0);
            }
            
            // Update actions based on virtual joystick
            this.updateActionsFromVirtualJoystick();
        } else if (event.touches.length === 2) {
            // Handle camera rotation with two fingers
            // Implementation would depend on desired control scheme
        }
    }
    
    /**
     * Handle touch end events
     * @param {TouchEvent} event 
     */
    onTouchEnd(event) {
        event.preventDefault();
        
        // Reset virtual joystick when touch ends
        this.virtualJoystick.active = false;
        this.virtualJoystick.magnitude = 0;
        this.virtualJoystick.direction.set(0, 0);
        
        // Reset movement actions
        this.actions.moveForward = false;
        this.actions.moveBackward = false;
        this.actions.moveLeft = false;
        this.actions.moveRight = false;
    }
    
    /**
     * Update actions based on virtual joystick state
     */
    updateActionsFromVirtualJoystick() {
        if (!this.virtualJoystick.active || this.virtualJoystick.magnitude === 0) {
            this.actions.moveForward = false;
            this.actions.moveBackward = false;
            this.actions.moveLeft = false;
            this.actions.moveRight = false;
            return;
        }
        
        // Convert joystick direction to actions
        const dir = this.virtualJoystick.direction;
        
        // Determine primary direction based on joystick angle
        this.actions.moveForward = dir.y < -0.3;
        this.actions.moveBackward = dir.y > 0.3;
        this.actions.moveLeft = dir.x < -0.3;
        this.actions.moveRight = dir.x > 0.3;
    }
    
    /**
     * Request pointer lock for first-person camera control
     */
    onPointerLockRequest() {
        // Only request pointer lock if in first-person view
        if (this.viewMode === Controls.VIEW_FIRST_PERSON) {
            this.domElement.requestPointerLock();
        }
    }
    
    /**
     * Handle pointer lock change events
     */
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
    }
    
    /**
     * Handle pointer lock error events
     */
    onPointerLockError() {
        console.error('Pointer lock failed');
    }
    
    /**
     * Handle window blur events
     */
    onWindowBlur() {
        // Reset all keys when window loses focus
        this.keys = {};
        this.mouseButtons = {};
        
        // Reset all actions
        for (const action in this.actions) {
            this.actions[action] = false;
        }
    }
    
    /**
     * Update camera rotation based on mouse movement
     */
    updateCameraRotation() {
        // Update camera rotation based on mouse delta
        this.cameraRotation.y -= this.mouseDelta.x * this.cameraSensitivity;
        this.cameraRotation.x -= this.mouseDelta.y * this.cameraSensitivity;
        
        // Clamp vertical rotation to avoid flipping
        this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
        
        // Reset mouse delta
        this.mouseDelta.set(0, 0);
    }
    
    /**
     * Update the camera position and rotation based on the current view mode
     * @param {THREE.Vector3} targetPosition - Position of the target (player/vehicle)
     * @param {THREE.Quaternion} targetRotation - Rotation of the target
     */
    updateCamera(targetPosition, targetRotation) {
        if (this.viewMode === Controls.VIEW_FIRST_PERSON) {
            // First-person: camera is positioned at the target with offset for height
            const cameraOffset = new THREE.Vector3(0, this.cameraHeight, 0);
            this.camera.position.copy(targetPosition).add(cameraOffset);
            
            // Apply camera rotation
            this.camera.quaternion.setFromEuler(this.cameraRotation);
        } else if (this.viewMode === Controls.VIEW_THIRD_PERSON) {
            // Third-person: camera follows at a distance
            
            // Calculate camera position based on target position and rotation
            const offset = new THREE.Vector3(
                0, 
                2, // Height offset
                this.cameraDistance // Distance behind the target
            );
            
            // Rotate the offset based on the target's rotation and camera rotation
            offset.applyEuler(new THREE.Euler(0, this.cameraRotation.y, 0));
            
            // Position the camera
            this.camera.position.copy(targetPosition).add(offset);
            
            // Look at the target position plus a height offset
            this.cameraTarget.copy(targetPosition).add(new THREE.Vector3(0, 1, 0));
            this.camera.lookAt(this.cameraTarget);
        }
    }
    
    /**
     * Check if a key is currently pressed
     * @param {string} code - The key code
     * @returns {boolean} - Whether the key is pressed
     */
    isKeyPressed(code) {
        return !!this.keys[code];
    }
    
    /**
     * Check if a mouse button is currently pressed
     * @param {number} button - The mouse button (0 = left, 1 = middle, 2 = right)
     * @returns {boolean} - Whether the button is pressed
     */
    isMouseButtonPressed(button) {
        return !!this.mouseButtons[button];
    }
    
    /**
     * Get the movement direction vector based on current controls
     * @returns {THREE.Vector3} - The movement direction
     */
    getMovementDirection() {
        // Create a normalized direction vector based on key inputs
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.actions.moveForward) direction.z -= 1;
        if (this.actions.moveBackward) direction.z += 1;
        if (this.actions.moveLeft) direction.x -= 1;
        if (this.actions.moveRight) direction.x += 1;
        
        // Normalize the direction vector to maintain consistent speed in all directions
        if (direction.length() > 0) {
            direction.normalize();
        }
        
        // Apply sprint modifier if sprinting
        if (this.actions.sprint) {
            direction.multiplyScalar(1.8);
        }
        
        return direction;
    }
    
    /**
     * Get vehicle control inputs
     * @returns {object} - Vehicle control values
     */
    getVehicleControls() {
        // Calculate throttle, brake, and steering values
        let throttle = 0;
        let brake = 0;
        let steering = 0;
        
        // Convert binary key presses to analog-like values
        if (this.actions.moveForward) throttle = 1;
        if (this.actions.moveBackward) brake = 1;
        
        // For steering, use both keyboard and mouse
        if (this.actions.moveLeft) steering = -1;
        if (this.actions.moveRight) steering = 1;
        
        // Use mouse for more precise steering in first person
        if (this.viewMode === Controls.VIEW_FIRST_PERSON && this.isPointerLocked) {
            steering += this.mouseDelta.x * 0.01;
            // Clamp steering between -1 and 1
            steering = Math.max(-1, Math.min(1, steering));
        }
        
        return {
            throttle,
            brake,
            steering,
            handbrake: this.actions.handbrake
        };
    }
    
    /**
     * Switch between character and vehicle control modes
     * @param {string} mode - The control mode to switch to
     */
    setControlMode(mode) {
        if (mode === Controls.MODE_CHARACTER || mode === Controls.MODE_VEHICLE) {
            this.controlMode = mode;
            
            // Reset all actions when switching modes
            for (const action in this.actions) {
                this.actions[action] = false;
            }
            
            // Update actions based on current key states
            this.updateActionsFromKeys();
        }
    }
    
    /**
     * Switch between first-person and third-person view modes
     * @param {string} mode - The view mode to switch to
     */
    setViewMode(mode) {
        if (mode === Controls.VIEW_FIRST_PERSON || mode === Controls.VIEW_THIRD_PERSON) {
            this.viewMode = mode;
            
            // If switching to first-person, reset camera rotation
            if (mode === Controls.VIEW_FIRST_PERSON) {
                // Exit pointer lock if currently locked
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        }
    }
    
    /**
     * Handle F5 key to toggle between first and third person views
     */
    toggleViewMode() {
        if (this.viewMode === Controls.VIEW_FIRST_PERSON) {
            this.setViewMode(Controls.VIEW_THIRD_PERSON);
        } else {
            this.setViewMode(Controls.VIEW_FIRST_PERSON);
        }
    }
    
    /**
     * Update the controls system
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Check for view toggle (F5 key)
        if (this.isKeyPressed('F5') && !this.previousF5State) {
            this.toggleViewMode();
        }
        this.previousF5State = this.isKeyPressed('F5');
        
        // Additional updates could be added here, such as:
        // - Handling continuous key presses
        // - Updating virtual joystick on mobile
        // - Checking for mode-specific inputs
    }
}

