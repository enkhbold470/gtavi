import * as THREE from 'three';

/**
 * Mission system for managing game missions
 */
export class MissionSystem {
    constructor(scene, player) {
        // References to scene and player
        this.scene = scene;
        this.player = player;
        
        // Mission tracking
        this.missions = [];
        this.activeMission = null;
        this.completedMissions = [];
        
        // UI elements
        this.missionUI = {
            container: null,
            title: null,
            description: null,
            objectives: null,
            timer: null
        };
        
        // Mission markers in the world
        this.missionMarkers = [];
        
        // Initialize mission UI
        this.createMissionUI();
    }
    
    /**
     * Create UI elements for mission display
     */
    createMissionUI() {
        // Create main container for mission info
        const container = document.createElement('div');
        container.id = 'mission-container';
        container.style.position = 'absolute';
        container.style.top = '70px';
        container.style.right = '20px';
        container.style.width = '300px';
        container.style.backgroundColor = 'rgba(0,0,0,0.7)';
        container.style.color = '#fff';
        container.style.padding = '15px';
        container.style.borderRadius = '5px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.display = 'none'; // Hidden by default
        
        // Mission title
        const title = document.createElement('h2');
        title.id = 'mission-title';
        title.style.margin = '0 0 10px 0';
        title.style.color = '#ffcc00';
        title.style.fontSize = '20px';
        
        // Mission description
        const description = document.createElement('p');
        description.id = 'mission-description';
        description.style.margin = '0 0 15px 0';
        description.style.fontSize = '14px';
        
        // Mission objectives
        const objectives = document.createElement('div');
        objectives.id = 'mission-objectives';
        
        // Mission timer (for timed missions)
        const timer = document.createElement('div');
        timer.id = 'mission-timer';
        timer.style.textAlign = 'right';
        timer.style.fontSize = '18px';
        timer.style.fontWeight = 'bold';
        timer.style.marginTop = '10px';
        timer.style.display = 'none'; // Hidden by default
        
        // Add elements to container
        container.appendChild(title);
        container.appendChild(description);
        container.appendChild(objectives);
        container.appendChild(timer);
        
        // Add to document
        document.body.appendChild(container);
        
        // Store references
        this.missionUI.container = container;
        this.missionUI.title = title;
        this.missionUI.description = description;
        this.missionUI.objectives = objectives;
        this.missionUI.timer = timer;
    }
    
    /**
     * Create a new mission
     * @param {object} missionData - Mission configuration data
     * @returns {Mission} - The created mission
     */
    createMission(missionData) {
        const mission = new Mission(this, missionData);
        this.missions.push(mission);
        
        // Create mission marker in the world if start location is specified
        if (missionData.startLocation) {
            this.createMissionMarker(mission, missionData.startLocation);
        }
        
        return mission;
    }
    
    /**
     * Create a mission marker in the world
     * @param {Mission} mission - The mission to mark
     * @param {THREE.Vector3} position - Position for the marker
     */
    createMissionMarker(mission, position) {
        // Create visual marker (a floating letter M)
        const markerGroup = new THREE.Group();
        
        // Create a cylinder base
        const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: mission.type === 'main' ? 0xffcc00 : 0x00ccff,
            emissive: mission.type === 'main' ? 0x663300 : 0x003366,
            emissiveIntensity: 0.5
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.05;
        markerGroup.add(base);
        
        // Add letter M
        const loader = new THREE.FontLoader();
        // In a real implementation, you would load an actual font
        // For this example, we'll use a simple shape as a placeholder
        
        const letterGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 16);
        const letterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3
        });
        const letter = new THREE.Mesh(letterGeometry, letterMaterial);
        letter.position.y = 0.5;
        letter.rotation.x = Math.PI / 2;
        markerGroup.add(letter);
        
        // Add pulsing light
        const light = new THREE.PointLight(
            mission.type === 'main' ? 0xffcc00 : 0x00ccff,
            1,
            5
        );
        light.position.y = 1;
        markerGroup.add(light);
        
        // Position the marker
        markerGroup.position.copy(position);
        markerGroup.position.y += 0.1; // Slightly above ground
        
        // Add to scene
        this.scene.add(markerGroup);
        
        // Store reference with mission data
        this.missionMarkers.push({
            mesh: markerGroup,
            mission: mission,
            light: light,
            originalIntensity: 1,
            originalY: position.y + 0.1
        });
    }
    
    /**
     * Start a mission
     * @param {Mission} mission - The mission to start
     */
    startMission(mission) {
        // Cannot start a new mission if one is already active
        if (this.activeMission) {
            console.log("Cannot start a new mission while another is active.");
            return false;
        }
        
        // Set as active mission
        this.activeMission = mission;
        mission.status = 'active';
        
        // Initialize mission
        mission.initialize();
        
        // Update UI
        this.updateMissionUI();
        
        console.log(`Mission started: ${mission.title}`);
        return true;
    }
    
    /**
     * Complete a mission objective
     * @param {string} objectiveId - ID of the objective to complete
     */
    completeObjective(objectiveId) {
        if (!this.activeMission) return;
        
        const completed = this.activeMission.completeObjective(objectiveId);
        
        if (completed) {
            // Update UI
            this.updateMissionUI();
            
            // Check if mission is complete
            if (this.activeMission.isComplete()) {
                this.completeMission();
            }
        }
    }
    
    /**
     * Complete the active mission
     */
    completeMission() {
        if (!this.activeMission) return;
        
        // Mark mission as completed
        this.activeMission.status = 'completed';
        
        // Award rewards
        this.awardMissionRewards(this.activeMission);
        
        // Add to completed missions
        this.completedMissions.push(this.activeMission);
        
        // Show completion message
        this.showMissionComplete(this.activeMission);
        
        // Remove mission marker
        this.removeMissionMarker(this.activeMission);
        
        // Clear active mission
        this.activeMission = null;
        
        // Hide mission UI after delay
        setTimeout(() => {
            this.hideMissionUI();
        }, 3000);
    }
    
    /**
     * Fail the active mission
     * @param {string} reason - Reason for failing the mission
     */
    failMission(reason) {
        if (!this.activeMission) return;
        
        // Mark mission as failed
        this.activeMission.status = 'failed';
        
        // Show failure message
        this.showMissionFailed(this.activeMission, reason);
        
        // Clear active mission
        this.activeMission = null;
        
        // Hide mission UI after delay
        setTimeout(() => {
            this.hideMissionUI();
        }, 3000);
    }
    
    /**
     * Award mission rewards to the player
     * @param {Mission} mission - The completed mission
     */
    awardMissionRewards(mission) {
        if (mission.rewards) {
            // Award money
            if (mission.rewards.money) {
                this.player.addMoney(mission.rewards.money);
                console.log(`Awarded $${mission.rewards.money} for completing mission.`);
            }
            
            // Award items
            if (mission.rewards.items && mission.rewards.items.length > 0) {
                mission.rewards.items.forEach(item => {
                    this.player.collectItem(item);
                    console.log(`Awarded item: ${item.name} for completing mission.`);
                });
            }
            
            // Reduce wanted level if specified
            if (mission.rewards.reduceWantedLevel) {
                const reduction = mission.rewards.reduceWantedLevel;
                this.player.updateWantedLevel(-reduction);
                console.log(`Reduced wanted level by ${reduction} stars.`);
            }
        }
    }
    
    /**
     * Update the mission UI to reflect current mission state
     */
    updateMissionUI() {
        if (!this.activeMission) {
            this.hideMissionUI();
            return;
        }
        
        // Show mission container
        this.missionUI.container.style.display = 'block';
        
        // Update title and description
        this.missionUI.title.textContent = this.activeMission.title;
        this.missionUI.description.textContent = this.activeMission.description;
        
        // Update objectives
        this.updateObjectivesUI();
        
        // Update timer if mission is timed
        if (this.activeMission.timeLimit > 0) {
            this.missionUI.timer.style.display = 'block';
            const timeLeft = Math.max(0, this.activeMission.timeLimit - this.activeMission.elapsedTime);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = Math.floor(timeLeft % 60);
            this.missionUI.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color if time is running low
            if (timeLeft < 30) {
                this.missionUI.timer.style.color = '#f00';
            } else {
                this.missionUI.timer.style.color = '#fff';
            }
        } else {
            this.missionUI.timer.style.display = 'none';
        }
    }
    
    /**
     * Update the objectives list in the UI
     */
    updateObjectivesUI() {
        if (!this.activeMission) return;
        
        // Clear existing objectives
        this.missionUI.objectives.innerHTML = '';
        
        // Add each objective
        this.activeMission.objectives.forEach(objective => {
            const objectiveElement = document.createElement('div');
            objectiveElement.className = 'mission-objective';
            objectiveElement.style.margin = '5px 0';
            objectiveElement.style.display = 'flex';
            objectiveElement.style.alignItems = 'center';
            
            // Checkbox or icon indicating completion status
            const statusIcon = document.createElement('div');
            statusIcon.style.width = '16px';
            statusIcon.style.height = '16px';
            statusIcon.style.marginRight = '10px';
            statusIcon.style.borderRadius = '50%';
            
            if (objective.completed) {
                statusIcon.style.backgroundColor = '#0f0';
                statusIcon.innerHTML = '✓';
                statusIcon.style.textAlign = 'center';
                statusIcon.style.lineHeight = '16px';
                statusIcon.style.color = '#000';
                statusIcon.style.fontWeight = 'bold';
                statusIcon.style.fontSize = '12px';
            } else {
                statusIcon.style.border = '2px solid #fff';
                statusIcon.style.boxSizing = 'border-box';
            }
            
            // Objective text
            const objectiveText = document.createElement('span');
            objectiveText.textContent = objective.description;
            
            // Add components to objective element
            objectiveElement.appendChild(statusIcon);
            objectiveElement.appendChild(objectiveText);
            
            // Add to objectives container
            this.missionUI.objectives.appendChild(objectiveElement);
        });
    }
    
    /**
     * Hide the mission UI
     */
    hideMissionUI() {
        this.missionUI.container.style.display = 'none';
    }
    
    /**
     * Show mission completion message
     * @param {Mission} mission - The completed mission
     */
    showMissionComplete(mission) {
        // Create completion notification
        const notification = document.createElement('div');
        notification.id = 'mission-complete';
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0,0,0,0.8)';
        notification.style.color = '#ffcc00';
        notification.style.padding = '20px';
        notification.style.borderRadius = '10px';
        notification.style.textAlign = 'center';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.zIndex = '100';
        notification.style.minWidth = '300px';
        
        // Mission completed message
        const title = document.createElement('h2');
        title.textContent = 'MISSION COMPLETED';
        title.style.margin = '0 0 10px 0';
        
        // Mission name
        const missionName = document.createElement('p');
        missionName.textContent = mission.title;
        missionName.style.fontSize = '20px';
        missionName.style.margin = '0 0 20px 0';
        
        // Rewards section
        const rewards = document.createElement('div');
        rewards.style.textAlign = 'left';
        rewards.style.backgroundColor = 'rgba(255,255,255,0.1)';
        rewards.style.padding = '10px';
        rewards.style.borderRadius = '5px';
        
        // Add rewards info
        let rewardsHtml = '<h3 style="margin-top:0;">Rewards:</h3>';
        
        if (mission.rewards) {
            if (mission.rewards.money) {
                rewardsHtml += `<p>$${mission.rewards.money}</p>`;
            }
            
            if (mission.rewards.items && mission.rewards.items.length > 0) {
                mission.rewards.items.forEach(item => {
                    rewardsHtml += `<p>${item.name}</p>`;
                });
            }
            
            if (mission.rewards.reduceWantedLevel) {
                rewardsHtml += `<p>Wanted Level -${mission.rewards.reduceWantedLevel} ★</p>`;
            }
        } else {
            rewardsHtml += '<p>None</p>';
        }
        
        rewards.innerHTML = rewardsHtml;
        
        // Add elements to notification
        notification.appendChild(title);
        notification.appendChild(missionName);
        notification.appendChild(rewards);
        
        document.body.appendChild(notification);
        
        // Remove notification after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 1s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 1000);
        }, 5000);
    }
    
    /**
     * Show mission failure message
     * @param {Mission} mission - The failed mission
     * @param {string} reason - Reason for failure
     */
    showMissionFailed(mission, reason) {
        // Create failure notification
        const notification = document.createElement('div');
        notification.id = 'mission-failed';
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0,0,0,0.8)';
        notification.style.color = '#ff0000';
        notification.style.padding = '20px';
        notification.style.borderRadius = '10px';
        notification.style.textAlign = 'center';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.zIndex = '100';
        notification.style.minWidth = '300px';
        
        // Mission failed message
        const title = document.createElement('h2');
        title.textContent = 'MISSION FAILED';
        title.style.margin = '0 0 10px 0';
        
        // Mission name
        const missionName = document.createElement('p');
        missionName.textContent = mission.title;
        missionName.style.fontSize = '20px';
        missionName.style.margin = '0 0 20px 0';
        
        // Failure reason
        const failureReason = document.createElement('p');
        failureReason.textContent = reason || 'You failed the mission';
        failureReason.style.backgroundColor = 'rgba(255,0,0,0.2)';
        failureReason.style.padding = '10px';
        failureReason.style.borderRadius = '5px';
        
        // Add elements to notification
        notification.appendChild(title);
        notification.appendChild(missionName);
        notification.appendChild(failureReason);
        
        document.body.appendChild(notification);
        
        // Remove notification after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 1s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 1000);
        }, 5000);
    }
    
    /**
     * Remove a mission marker from the world
     * @param {Mission} mission - The mission whose marker should be removed
     */
    removeMissionMarker(mission) {
        const markerIndex = this.missionMarkers.findIndex(marker => marker.mission === mission);
        
        if (markerIndex !== -1) {
            const marker = this.missionMarkers[markerIndex];
            
            // Remove from scene
            this.scene.remove(marker.mesh);
            
            // Remove from array
            this.missionMarkers.splice(markerIndex, 1);
        }
    }
    
    /**
     * Create a checkpoint for a mission
     * @param {Mission} mission - The mission the checkpoint belongs to
     * @param {THREE.Vector3} position - Position for the checkpoint
     * @param {Function} triggerCallback - Callback when player enters checkpoint
     * @returns {object} - The created checkpoint
     */
    createCheckpoint(mission, position, triggerCallback) {
        // Create visual marker (a ring)
        const markerGroup = new THREE.Group();
        
        // Create a ring geometry
        const ringGeometry = new THREE.TorusGeometry(2, 0.3, 16, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Make ring horizontal
        markerGroup.add(ring);
        
        // Add pulsing light
        const light = new THREE.PointLight(0x00ff00, 1, 10);
        light.position.y = 1;
        markerGroup.add(light);
        
        // Position the marker
        markerGroup.position.copy(position);
        markerGroup.position.y += 1; // Slightly above ground
        
        // Add to scene
        this.scene.add(markerGroup);
        
        // Create checkpoint object
        const checkpoint = {
            mesh: markerGroup,
            position: position.clone(),
            radius: 2, // Activation radius
            active: true,
            triggered: false,
            triggerCallback: triggerCallback,
            mission: mission
        };
        
        // Add to mission checkpoints
        if (!mission.checkpoints) {
            mission.checkpoints = [];
        }
        mission.checkpoints.push(checkpoint);
        
        return checkpoint;
    }
    
    /**
     * Check if player is within checkpoint radius
     * @param {object} checkpoint - The checkpoint to check
     * @returns {boolean} - Whether player is within checkpoint
     */
    isPlayerInCheckpoint(checkpoint) {
        if (!checkpoint.active || checkpoint.triggered) return false;
        
        // Calculate distance from player to checkpoint
        const distance = this.player.position.distanceTo(checkpoint.position);
        
        // Check if within radius
        return distance <= checkpoint.radius;
    }
    
    /**
     * Trigger a checkpoint when player enters it
     * @param {object} checkpoint - The checkpoint to trigger
     */
    triggerCheckpoint(checkpoint) {
        if (!checkpoint.active || checkpoint.triggered) return;
        
        // Mark as triggered
        checkpoint.triggered = true;
        
        // Call the trigger callback
        if (checkpoint.triggerCallback) {
            checkpoint.triggerCallback(this.player, checkpoint);
        }
        
        // Update visual appearance
        if (checkpoint.mesh) {
            // Change color to indicate it's been triggered
            const ring = checkpoint.mesh.children[0];
            if (ring && ring.material) {
                ring.material.color.set(0xffcc00);
                ring.material.emissive.set(0xffcc00);
            }
            
            // Fade out and remove after delay
            setTimeout(() => {
                const fadeOut = setInterval(() => {
                    ring.material.opacity -= 0.05;
                    if (ring.material.opacity <= 0) {
                        clearInterval(fadeOut);
                        this.scene.remove(checkpoint.mesh);
                    }
                }, 50);
            }, 1000);
        }
    }
    
    /**
     * Update mission system every frame
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Skip if no player
        if (!this.player) return;
        
        // Update active mission
        if (this.activeMission) {
            this.activeMission.update(deltaTime);
            
            // Update UI
            this.updateMissionUI();
            
            // Check checkpoints
            if (this.activeMission.checkpoints) {
                this.activeMission.checkpoints.forEach(checkpoint => {
                    if (this.isPlayerInCheckpoint(checkpoint)) {
                        this.triggerCheckpoint(checkpoint);
                    }
                });
            }
        }
        
        // Update mission markers
        this.updateMissionMarkers(deltaTime);
        
        // Check for mission start triggers
        this.checkMissionTriggers();
    }
    
    /**
     * Update mission markers (visual effects)
     * @param {number} deltaTime - Time since last update
     */
    updateMissionMarkers(deltaTime) {
        // Animate mission markers (pulsing, floating, etc.)
        this.missionMarkers.forEach(marker => {
            const time = Date.now() * 0.001;
            
            // Pulsing light
            if (marker.light) {
                marker.light.intensity = marker.originalIntensity * (0.7 + 0.3 * Math.sin(time * 3));
            }
            
            // Floating up and down
            if (marker.mesh) {
                marker.mesh.position.y = marker.originalY + 0.2 * Math.sin(time * 2);
                marker.mesh.rotation.y += deltaTime * 0.5; // Rotate slowly
            }
        });
    }
    
    /**
     * Check if player is near any mission start triggers
     */
    checkMissionTriggers() {
        // For each mission marker, check if player is nearby
        this.missionMarkers.forEach(marker => {
            const mission = marker.mission;
            
            // Skip if mission is already completed
            if (mission.status === 'completed') return;
            
            // Calculate distance from player to marker
            const markerPosition = new THREE.Vector3();
            marker.mesh.getWorldPosition(markerPosition);
            const distance = this.player.position.distanceTo(markerPosition);
            
            // If player is close enough, show prompt
            if (distance < 3) {
                this.showMissionPrompt(mission);
                
                // Check for interaction key to start mission
                if (this.player.controls.actions.interact) {
                    this.startMission(mission);
                    this.hideMissionPrompt();
                }
            } else {
                this.hideMissionPrompt();
            }
        });
    }
    
    /**
     * Show prompt to start a mission
     * @param {Mission} mission - The mission to show prompt for
     */
    showMissionPrompt(mission) {
        // Check if prompt already exists
        let prompt = document.getElementById('mission-prompt');
        
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'mission-prompt';
            prompt.style.position = 'absolute';
            prompt.style.bottom = '150px';
            prompt.style.left = '50%';
            prompt.style.transform = 'translateX(-50%)';
            prompt.style.backgroundColor = 'rgba(0,0,0,0.7)';
            prompt.style.color = '#fff';
            prompt.style.padding = '10px 20px';
            prompt.style.borderRadius = '5px';
            prompt.style.fontFamily = 'Arial, sans-serif';
            prompt.style.textAlign = 'center';
            prompt.style.zIndex = '100';
            
            document.body.appendChild(prompt);
        }
        
        // Update prompt text
        prompt.innerHTML = `
            <h3 style="margin:0 0 5px 0; color:#ffcc00;">${mission.title}</h3>
            <p style="margin:0 0 5px 0;">${mission.description}</p>
            <p style="margin:0; font-size:14px;">Press E to start mission</p>
        `;
        
        // Show prompt
        prompt.style.display = 'block';
    }
    
    /**
     * Hide mission prompt
     */
    hideMissionPrompt() {
        const prompt = document.getElementById('mission-prompt');
        
        if (prompt) {
            prompt.style.display = 'none';
        }
    }
}

/**
 * Mission class representing a single mission in the game
 */
export class Mission {
    /**
     * Create a new mission
     * @param {MissionSystem} missionSystem - The mission system
     * @param {object} missionData - Mission configuration data
     */
    constructor(missionSystem, missionData) {
        this.missionSystem = missionSystem;
        
        // Mission properties
        this.id = missionData.id || `mission_${Date.now()}`;
        this.title = missionData.title || 'Untitled Mission';
        this.description = missionData.description || 'No description available';
        this.type = missionData.type || 'side'; // 'main' or 'side'
        
        // Mission locations
        this.startLocation = missionData.startLocation;
        this.endLocation = missionData.endLocation;
        
        // Objectives
        this.objectives = missionData.objectives || [];
        
        // Time limit (0 = no limit)
        this.timeLimit = missionData.timeLimit || 0;
        this.elapsedTime = 0;
        
        // Rewards
        this.rewards = missionData.rewards || null;
        
        // Custom props and callbacks
        this.props = missionData.props || {};
        this.onStart = missionData.onStart || null;
        this.onComplete = missionData.onComplete || null;
        this.onFail = missionData.onFail || null;
        this.onUpdate = missionData.onUpdate || null;
        
        // Mission state
        this.status = 'inactive'; // inactive, active, completed, failed
        this.checkpoints = [];
    }
    
    /**
     * Initialize the mission
     */
    initialize() {
        // Reset elapsed time
        this.elapsedTime = 0;
        
        // Reset objectives
        this.objectives.forEach(objective => {
            objective.completed = false;
        });
        
        // Call custom onStart callback if defined
        if (typeof this.onStart === 'function') {
            this.onStart(this.missionSystem.player, this);
        }
        // Create checkpoints if end location is defined
        if (this.endLocation) {
            this.missionSystem.createCheckpoint(this, this.endLocation, () => {
                // Complete "reach destination" objective if it exists
                const destinationObjective = this.objectives.find(obj => 
                    obj.type === 'destination' || obj.description.includes('reach') || obj.description.includes('go to'));
                
                if (destinationObjective) {
                    this.completeObjective(destinationObjective.id);
                }
                
                // If no other objectives, complete the mission
                if (this.isComplete()) {
                    this.missionSystem.completeMission();
                }
            });
        }
    }
    
    /**
     * Complete a specific mission objective
     * @param {string} objectiveId - ID of the objective to complete
     * @returns {boolean} - Whether the objective was completed
     */
    completeObjective(objectiveId) {
        // Find the objective by ID
        const objective = this.objectives.find(obj => obj.id === objectiveId);
        
        if (!objective) {
            console.warn(`Objective with ID ${objectiveId} not found in mission ${this.id}`);
            return false;
        }
        
        // Skip if already completed
        if (objective.completed) {
            return false;
        }
        
        // Mark as completed
        objective.completed = true;
        
        console.log(`Completed objective: ${objective.description}`);
        
        // Call custom callback if defined
        if (objective.onComplete && typeof objective.onComplete === 'function') {
            objective.onComplete(this.missionSystem.player, this);
        }
        
        // Check if mission is now complete
        if (this.isComplete() && this.status === 'active') {
            // If custom logic allows, complete the mission
            if (this.onComplete) {
                this.onComplete(this.missionSystem.player, this);
            } else {
                // Auto-complete if no custom completion logic
                this.missionSystem.completeMission();
            }
        }
        
        return true;
    }
    
    /**
     * Check if all mission objectives are completed
     * @returns {boolean} - Whether the mission is complete
     */
    isComplete() {
        // Check if all required objectives are completed
        return this.objectives.every(objective => 
            objective.completed || objective.optional === true
        );
    }
    
    /**
     * Update mission state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Skip if not active
        if (this.status !== 'active') return;
        
        // Update elapsed time for timed missions
        if (this.timeLimit > 0) {
            this.elapsedTime += deltaTime;
            
            // Check for time limit
            if (this.elapsedTime >= this.timeLimit) {
                // Time's up - fail the mission
                this.missionSystem.failMission('Time expired');
                return;
            }
        }
        
        // Call custom update function if defined
        if (this.onUpdate && typeof this.onUpdate === 'function') {
            this.onUpdate(this.missionSystem.player, this, deltaTime);
        }
        
        // Check for mission-specific conditions
        this.checkMissionConditions();
    }
    
    /**
     * Check for mission-specific conditions
     */
    checkMissionConditions() {
        const player = this.missionSystem.player;
        
        // Check for each objective that could be automatically completed
        this.objectives.forEach(objective => {
            // Skip already completed objectives
            if (objective.completed) return;
            
            // Check based on objective type
            switch (objective.type) {
                case 'kill':
                    // Would check if specific NPCs are killed
                    // Not implemented in this MVP
                    break;
                
                case 'collect':
                    // Check if player has collected required items
                    if (objective.itemId && player.inventory && player.inventory.items) {
                        const hasItem = player.inventory.items.some(item => item.id === objective.itemId);
                        if (hasItem) {
                            this.completeObjective(objective.id);
                        }
                    }
                    break;
                
                case 'escape':
                    // Check if player is far enough from a location
                    if (objective.location && objective.distance) {
                        const distance = player.position.distanceTo(objective.location);
                        if (distance >= objective.distance) {
                            this.completeObjective(objective.id);
                        }
                    }
                    break;
                    
                case 'survive':
                    // For objectives like "survive for X seconds"
                    if (objective.duration && this.elapsedTime >= objective.duration) {
                        this.completeObjective(objective.id);
                    }
                    break;
                    
                // Additional objective types could be implemented
            }
        });
        
        // Check for failure conditions
        if (player.stats.health <= 0) {
            // Player died during mission
            this.missionSystem.failMission('You died');
        }
        
        // Check for vehicle-specific missions
        if (this.props.requireVehicle && !player.isInVehicle) {
            // Player left vehicle during a vehicle mission
            this.missionSystem.failMission('You left the vehicle');
        }
    }
}
