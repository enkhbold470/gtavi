import * as THREE from 'three';
import { LoadingManager } from 'three';
import { City } from './scenes/City.js';
import { Physics } from './systems/Physics.js';
import { Player } from './components/Player.js';
import { Vehicle } from './components/Vehicle.js';
import { MissionSystem } from './systems/Mission.js';

// Global variables
let scene, camera, renderer;
let physics;
let city;
let player;
let vehicles = [];
let missionSystem;
let clock = new THREE.Clock();
let loadingManager;
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    missionActive: false,
    currentMission: null,
    debugMode: false
};

// UI elements
let uiElements = {
    healthBar: null,
    moneyDisplay: null,
    speedometer: null,
    minimap: null,
    wantedLevel: null
};
/**
 * Initialize the application
 */
function init() {
    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create Camera
    camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    camera.position.set(5, 5, 10);
    
    // Create Renderer
    const canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add Lighting
    addLights();
    
    // Initialize Physics system
    initPhysics();
    
    // Create the city
    createCity();
    
    // Create player character
    createPlayer();
    
    // Create vehicles
    createVehicles();
    
    // Create UI
    createUI();
    
    // Set up asset loading manager
    setupLoadingManager();
    
    // Initialize mission system
    initializeMissionSystem();
    
    // Set up event listeners
    setupEventListeners();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start the game
    startGame();
    
    // Start the animation loop
    animate();
}

/**
 * Initialize the physics system
 */
function initPhysics() {
    physics = new Physics();
    
    // Create ground plane in physics world
    const groundSize = 500;
    physics.createGround(groundSize, groundSize);
    
    // Enable debug mode if needed
    if (gameState.debugMode) {
        physics.enableDebug(scene);
    }
}

/**
 * Create the city environment
 */
function createCity() {
    // Create city with a 5x5 grid of blocks
    city = new City(5, 20);
    scene.add(city);
}

/**
 * Create the player character
 */
function createPlayer() {
    // Create player at a specific starting position
    player = new Player(scene, physics, camera);
    
    // Position player in the city
    player.position.set(10, 2, 10);
    player.body.position.copy(player.position);
}
/**
 * Create vehicles in the world
 */
function createVehicles() {
    // Create a few vehicles of different types
    const vehicleTypes = [
        {
            type: 'sedan',
            color: 0x3366CC,
            position: new THREE.Vector3(20, 1, 20),
            rotation: new THREE.Euler(0, Math.PI / 4, 0)
        },
        {
            type: 'sports',
            color: 0xCC3333,
            position: new THREE.Vector3(-15, 1, 30),
            rotation: new THREE.Euler(0, -Math.PI / 3, 0),
            maxSpeed: 180,
            acceleration: 15,
            handling: 0.85
        },
        {
            type: 'truck',
            color: 0x33CC33,
            position: new THREE.Vector3(40, 1, -10),
            rotation: new THREE.Euler(0, Math.PI, 0),
            dimensions: {
                length: 6.5,
                width: 2.4,
                height: 2.2
            }
        }
    ];
    
    // Create each vehicle and add to the array
    vehicleTypes.forEach(options => {
        const vehicle = new Vehicle(scene, physics, options);
        vehicles.push(vehicle);
    });
}

// Create UI elements
function createUI() {
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '0';
    uiContainer.style.left = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.height = '100%';
    uiContainer.style.pointerEvents = 'none';
    document.body.appendChild(uiContainer);
    
    // Health bar
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.position = 'absolute';
    healthBar.style.bottom = '20px';
    healthBar.style.left = '20px';
    healthBar.style.width = '200px';
    healthBar.style.height = '20px';
    healthBar.style.backgroundColor = '#333';
    healthBar.style.border = '2px solid #fff';
    healthBar.style.borderRadius = '10px';
    healthBar.style.overflow = 'hidden';
    
    const healthFill = document.createElement('div');
    healthFill.id = 'health-fill';
    healthFill.style.width = '100%';
    healthFill.style.height = '100%';
    healthFill.style.backgroundColor = '#f00';
    healthFill.style.transition = 'width 0.3s';
    
    healthBar.appendChild(healthFill);
    uiContainer.appendChild(healthBar);
    uiElements.healthBar = healthFill;
    
    // Money display
    const moneyDisplay = document.createElement('div');
    moneyDisplay.id = 'money-display';
    moneyDisplay.style.position = 'absolute';
    moneyDisplay.style.top = '20px';
    moneyDisplay.style.right = '20px';
    moneyDisplay.style.color = '#fff';
    moneyDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    moneyDisplay.style.padding = '10px';
    moneyDisplay.style.borderRadius = '5px';
    moneyDisplay.style.fontFamily = 'Arial, sans-serif';
    moneyDisplay.style.fontSize = '24px';
    moneyDisplay.textContent = '$1000';
    
    uiContainer.appendChild(moneyDisplay);
    uiElements.moneyDisplay = moneyDisplay;
    
    // Speedometer (only shown when in vehicle)
    const speedometer = document.createElement('div');
    speedometer.id = 'speedometer';
    speedometer.style.position = 'absolute';
    speedometer.style.bottom = '20px';
    speedometer.style.right = '20px';
    speedometer.style.color = '#fff';
    speedometer.style.backgroundColor = 'rgba(0,0,0,0.5)';
    speedometer.style.padding = '10px';
    speedometer.style.borderRadius = '5px';
    speedometer.style.fontFamily = 'Arial, sans-serif';
    speedometer.style.fontSize = '20px';
    speedometer.style.display = 'none'; // Hidden by default
    speedometer.textContent = '0 km/h';
    
    uiContainer.appendChild(speedometer);
    uiElements.speedometer = speedometer;
    
    // Wanted level
    const wantedLevel = document.createElement('div');
    wantedLevel.id = 'wanted-level';
    wantedLevel.style.position = 'absolute';
    wantedLevel.style.top = '20px';
    wantedLevel.style.left = '20px';
    wantedLevel.style.color = '#fff';
    wantedLevel.style.display = 'flex';
    wantedLevel.style.gap = '5px';
    
    // Create five star placeholders
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.style.width = '20px';
        star.style.height = '20px';
        star.style.backgroundColor = 'rgba(255,255,255,0.3)';
        star.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        star.className = 'wanted-star';
        star.dataset.level = i + 1;
        wantedLevel.appendChild(star);
    }
    
    uiContainer.appendChild(wantedLevel);
    uiElements.wantedLevel = wantedLevel;
    
    // Instructions panel (for controls info)
    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.style.position = 'absolute';
    instructions.style.bottom = '50px';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.color = '#fff';
    instructions.style.backgroundColor = 'rgba(0,0,0,0.7)';
    instructions.style.padding = '15px';
    instructions.style.borderRadius = '5px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '16px';
    instructions.style.textAlign = 'center';
    instructions.style.pointerEvents = 'none';
    instructions.innerHTML = `
        <h3>Controls</h3>
        <p>WASD - Movement</p>
        <p>Shift - Sprint</p>
        <p>Space - Jump</p>
        <p>F - Enter/Exit Vehicle</p>
        <p>Mouse - Look Around</p>
        <p>Mouse Click - Interact</p>
        <p>F5 - Toggle View</p>
        <p>ESC - Pause Game</p>
    `;
    
    // Initially show instructions for a few seconds
    uiContainer.appendChild(instructions);
    setTimeout(() => {
        instructions.style.opacity = '0';
        instructions.style.transition = 'opacity 1s';
        setTimeout(() => {
            instructions.style.display = 'none';
        }, 1000);
    }, 6000);
}
/**
 * Initialize the mission system and create sample missions
 */
function initializeMissionSystem() {
    // Create mission system
    missionSystem = new MissionSystem(scene, player);
    
    // Create sample missions
    createSampleMissions();
}

/**
 * Create sample missions for the game
 */
function createSampleMissions() {
    // Wait until player is fully initialized
    setTimeout(() => {
        // Mission 1: Simple delivery mission
        const deliveryMission = missionSystem.createMission({
            id: 'mission_delivery_1',
            title: 'Special Delivery',
            description: 'Deliver a package to the location marked on your map.',
            type: 'side',
            startLocation: new THREE.Vector3(30, 1, 30),
            endLocation: new THREE.Vector3(-30, 1, -30),
            objectives: [
                {
                    id: 'obj_pickup',
                    description: 'Pick up the package',
                    type: 'pickup',
                    completed: false
                },
                {
                    id: 'obj_deliver',
                    description: 'Deliver the package to the destination',
                    type: 'destination',
                    completed: false
                }
            ],
            timeLimit: 180, // 3 minutes
            rewards: {
                money: 500,
                items: [
                    { id: 'item_1', name: 'Pistol', type: 'weapon', ammo: 30, damage: 20, maxAmmo: 100 }
                ]
            },
            // Custom callback when mission starts
            onStart: (player, mission) => {
                console.log('Delivery mission started!');
                // Auto-complete the first objective (pick up)
                setTimeout(() => {
                    mission.completeObjective('obj_pickup');
                }, 2000);
            }
        });
        
        // Mission 2: Collection mission
        const collectionMission = missionSystem.createMission({
            id: 'mission_collection_1',
            title: 'Collect and Return',
            description: 'Find three hidden packages around the city and return them.',
            type: 'side',
            startLocation: new THREE.Vector3(-20, 1, 20),
            objectives: [
                {
                    id: 'obj_collect_1',
                    description: 'Find package 1',
                    type: 'collect',
                    itemId: 'package_1',
                    completed: false
                },
                {
                    id: 'obj_collect_2',
                    description: 'Find package 2',
                    type: 'collect',
                    itemId: 'package_2',
                    completed: false
                },
                {
                    id: 'obj_collect_3',
                    description: 'Find package 3',
                    type: 'collect',
                    itemId: 'package_3',
                    completed: false
                },
                {
                    id: 'obj_return',
                    description: 'Return to the starting point',
                    type: 'destination',
                    completed: false
                }
            ],
            rewards: {
                money: 750,
                reduceWantedLevel: 1
            },
            onStart: (player, mission) => {
                // Create collection points for packages
                // In a full implementation, these would be actual collectible items
                
                // Simulate finding packages by completing objectives after some time
                setTimeout(() => {
                    mission.completeObjective('obj_collect_1');
                }, 5000);
                
                setTimeout(() => {
                    mission.completeObjective('obj_collect_2');
                }, 10000);
                
                setTimeout(() => {
                    mission.completeObjective('obj_collect_3');
                }, 15000);
                
                // Create a checkpoint to return to
                missionSystem.createCheckpoint(mission, new THREE.Vector3(-20, 1, 20), () => {
                    mission.completeObjective('obj_return');
                });
            }
        });
        
        // Mission 3: Vehicle chase mission
        const chaseMission = missionSystem.createMission({
            id: 'mission_chase_1',
            title: 'High Speed Chase',
            description: 'Steal a vehicle and escape the police by reaching the hideout.',
            description: 'Steal a vehicle and escape the police by reaching the hideout.',
            type: 'main',
            startLocation: new THREE.Vector3(0, 1, 40),
            endLocation: new THREE.Vector3(40, 1, -40),
            objectives: [
                {
                    id: 'obj_steal_car',
                    description: 'Steal a vehicle',
                    type: 'vehicle',
                    completed: false
                },
                {
                    id: 'obj_escape',
                    description: 'Escape the police by reaching the hideout',
                    type: 'destination',
                    completed: false
                }
            ],
            timeLimit: 240, // 4 minutes
            rewards: {
                money: 1000,
                items: [
                    { id: 'item_2', name: 'Shotgun', type: 'weapon', ammo: 10, damage: 50, maxAmmo: 50 }
                ]
            },
            props: {
                requireVehicle: true
            },
            onStart: (player, mission) => {
                console.log('Chase mission started!');
                
                // Increase player's wanted level
                player.updateWantedLevel(2);
                
                // Auto-complete steal car objective when player enters a vehicle
                const checkVehicleInterval = setInterval(() => {
                    if (player.isInVehicle) {
                        mission.completeObjective('obj_steal_car');
                        clearInterval(checkVehicleInterval);
                    }
                }, 1000);
            }
        });
        
        console.log('Sample missions created.');
    }, 1000); // Delay to ensure player is initialized
}
// Add lights to the scene
function addLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Optimize shadow settings
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    scene.add(directionalLight);
    
    // Add some hemisphere light for better ambient illumination
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.5);
    scene.add(hemisphereLight);
}

// Set up the loading manager for assets
// Set up the loading manager for assets
function setupLoadingManager() {
    loadingManager = new LoadingManager();
    
    loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
        console.log('Started loading: ' + url);
        showLoadingScreen(true);
    };
    
    loadingManager.onLoad = function() {
        console.log('Loading complete!');
        showLoadingScreen(false);
    };
    
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        updateLoadingProgress(progress);
        console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };
    
    loadingManager.onError = function(url) {
        console.log('Error loading ' + url);
    };
}

// Show/hide loading screen
function showLoadingScreen(visible) {
    // Create loading screen if it doesn't exist
    let loadingScreen = document.getElementById('loading-screen');
    
    if (!loadingScreen && visible) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.position = 'absolute';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.backgroundColor = '#000';
        loadingScreen.style.display = 'flex';
        loadingScreen.style.flexDirection = 'column';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.zIndex = '1000';
        
        const title = document.createElement('h1');
        title.textContent = 'GTA VI WebGL';
        title.style.color = '#fff';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.fontSize = '48px';
        title.style.marginBottom = '20px';
        
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '50%';
        progressContainer.style.height = '30px';
        progressContainer.style.backgroundColor = '#333';
        progressContainer.style.borderRadius = '15px';
        progressContainer.style.overflow = 'hidden';
        
        const progressBar = document.createElement('div');
        progressBar.id = 'loading-progress';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = '#f00';
        progressBar.style.transition = 'width 0.3s';
        
        progressContainer.appendChild(progressBar);
        loadingScreen.appendChild(title);
        loadingScreen.appendChild(progressContainer);
        document.body.appendChild(loadingScreen);
    }
    
    if (loadingScreen) {
        loadingScreen.style.display = visible ? 'flex' : 'none';
    }
}

// Update loading progress
function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('loading-progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (event) => {
        // Pause game when ESC is pressed
        if (event.code === 'Escape') {
            if (gameState.running && !gameState.paused) {
                pauseGame();
            } else if (gameState.paused) {
                resumeGame();
            }
        }
        
        // Toggle debug mode with backtick key
        if (event.code === 'Backquote') {
            gameState.debugMode = !gameState.debugMode;
            
            // Update physics debug visualization
            if (gameState.debugMode) {
                physics.enableDebug(scene);
                
                // Show list of available missions when in debug mode
                showDebugMissionList();
            } else {
                // In a real implementation, would disable debug visualization
                console.log('Debug mode disabled');
                hideDebugMissionList();
            }
        }
        
        // Debug key M to show all missions
        if (event.code === 'KeyM' && gameState.debugMode) {
            showDebugMissionList();
        }
    });
    
    
    // Handle clicks on UI elements that should be interactive
    document.getElementById('game').addEventListener('click', (event) => {
        // Handle any clickable UI elements here
    });
}

/**
 * Show debug mission list when in debug mode
 */
function showDebugMissionList() {
    if (!gameState.debugMode || !missionSystem) return;
    
    // Remove existing debug panel if any
    hideDebugMissionList();
    
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-mission-panel';
    debugPanel.style.position = 'absolute';
    debugPanel.style.top = '100px';
    debugPanel.style.left = '20px';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = '#fff';
    debugPanel.style.padding = '15px';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = '#fff';
    debugPanel.style.padding = '15px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.fontSize = '14px';
    debugPanel.style.zIndex = '100';
    debugPanel.style.maxHeight = '80%';
    debugPanel.style.overflow = 'auto';
    
    // Add content to panel
    let content = '<h3 style="margin-top:0;">Debug Mission Panel</h3>';
    
    if (missionSystem && missionSystem.missions.length > 0) {
        content += '<h4>Available Missions:</h4>';
        content += '<ul style="list-style:none; padding:0;">';
        
        missionSystem.missions.forEach(mission => {
            const statusColor = mission.status === 'completed' ? '#00ff00' : 
                              mission.status === 'active' ? '#ffcc00' : '#ffffff';
            
            content += `<li style="margin-bottom:10px;">
                <div style="color:${statusColor};font-weight:bold;">${mission.title}</div>
                <div>${mission.description}</div>
                <div>Status: ${mission.status}</div>
                <button onclick="window.startDebugMission('${mission.id}')" style="margin-top:5px;padding:3px 8px;">Start Mission</button>
            </li>`;
        });
        
        content += '</ul>';
    } else {
        content += '<p>No missions available.</p>';
    }
    
    debugPanel.innerHTML = content;
    document.body.appendChild(debugPanel);
    
    // Add global function to start missions from debug panel
    window.startDebugMission = (missionId) => {
        const mission = missionSystem.missions.find(m => m.id === missionId);
        if (mission) {
            missionSystem.startMission(mission);
            hideDebugMissionList();
        }
    };
}

/**
 * Hide debug mission list
 */
function hideDebugMissionList() {
    const panel = document.getElementById('debug-mission-panel');
    if (panel) {
        panel.remove();
    }
}

// Start the game
function startGame() {
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    
    // Set initial camera position behind player (third-person view)
    camera.position.set(
        player.position.x - 5,
        player.position.y + 2,
        player.position.z - 5
    );
    camera.lookAt(player.position);
    
    // Show startup message with game instructions
    showStartupMessage();
    
    console.log('Game started');
}

/**
 * Show startup message with game instructions
 */
function showStartupMessage() {
    const message = document.createElement('div');
    message.id = 'startup-message';
    message.style.position = 'absolute';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.backgroundColor = 'rgba(0,0,0,0.8)';
    message.style.color = '#fff';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';
    message.style.textAlign = 'center';
    message.style.fontFamily = 'Arial, sans-serif';
    message.style.zIndex = '100';
    message.style.minWidth = '400px';
    
    message.innerHTML = `
        <h1 style="color: #ffcc00; margin-top: 0;">Welcome to GTA VI WebGL</h1>
        <p>Explore the city, find missions, and complete objectives to earn money and rewards.</p>
        <h3 style="margin-bottom: 5px;">Controls:</h3>
        <ul style="text-align: left; list-style-type: none; padding: 0;">
            <li>WASD - Move</li>
            <li>Mouse - Look around</li>
            <li>Shift - Sprint</li>
            <li>Space - Jump</li>
            <li>F - Enter/Exit Vehicles</li>
            <li>E - Interact with objects and missions</li>
            <li>Escape - Pause game</li>
        </ul>
        <p>Missions are marked with floating icons in the city. Approach them and press E to start.</p>
        <button id="start-playing-btn" style="padding: 10px 20px; margin-top: 15px; background-color: #ffcc00; border: none; color: #000; font-weight: bold; cursor: pointer; border-radius: 5px;">Start Playing</button>
    `;
    
    document.body.appendChild(message);
    
    // Add click event to button
    document.getElementById('start-playing-btn').addEventListener('click', () => {
        message.style.opacity = '0';
        message.style.transition = 'opacity 1s';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 1000);
    });
}

// Pause the game
function pauseGame() {
    gameState.paused = true;
    
    // Create or show pause menu
    let pauseMenu = document.getElementById('pause-menu');
    
    if (!pauseMenu) {
        pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.style.position = 'absolute';
        pauseMenu.style.top = '50%';
        pauseMenu.style.left = '50%';
        pauseMenu.style.transform = 'translate(-50%, -50%)';
        pauseMenu.style.backgroundColor = 'rgba(0,0,0,0.8)';
        pauseMenu.style.color = '#fff';
        pauseMenu.style.padding = '20px';
        pauseMenu.style.borderRadius = '10px';
        pauseMenu.style.textAlign = 'center';
        pauseMenu.style.fontFamily = 'Arial, sans-serif';
        pauseMenu.style.zIndex = '100';
        pauseMenu.style.minWidth = '200px';
        
        pauseMenu.innerHTML = `
            <h2>Game Paused</h2>
            <button id="resume-btn" style="margin: 10px; padding: 8px 16px;">Resume</button>
            <button id="restart-btn" style="margin: 10px; padding: 8px 16px;">Restart</button>
        `;
        
        document.body.appendChild(pauseMenu);
        
        // Add event listeners to buttons
        document.getElementById('resume-btn').addEventListener('click', resumeGame);
        document.getElementById('restart-btn').addEventListener('click', restartGame);
    } else {
        pauseMenu.style.display = 'block';
    }
    
    console.log('Game paused');
}

// Resume the game
function resumeGame() {
    gameState.paused = false;
    
    // Hide pause menu
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.style.display = 'none';
    }
    
    // Reset clock to prevent large delta time after unpausing
    clock.getDelta();
    
    console.log('Game resumed');
}

// Restart the game
function restartGame() {
    // Reset player position
    player.position.set(10, 2, 10);
    player.body.position.copy(player.position);
    
    // Reset player stats
    player.stats.health = player.stats.maxHealth;
    player.stats.stamina = player.stats.maxStamina;
    player.stats.money = 1000;
    player.stats.wanted = 0;
    
    // Reset vehicles
    vehicles.forEach(vehicle => {
        // Reset vehicle state (position, health, etc.)
        if (vehicle.state.driver) {
            vehicle.removeDriver();
        }
    });
    
    // Reset game state
    gameState.gameOver = false;
    gameState.missionActive = false;
    gameState.currentMission = null;
    
    // Resume game
    resumeGame();
    
    console.log('Game restarted');
}

// Update UI elements
function updateUI() {
    // Update health bar
    if (uiElements.healthBar) {
        const healthPercent = (player.stats.health / player.stats.maxHealth) * 100;
        uiElements.healthBar.style.width = `${healthPercent}%`;
        
        // Change color based on health level
        if (healthPercent < 25) {
            uiElements.healthBar.style.backgroundColor = '#f00'; // Red for low health
        } else if (healthPercent < 50) {
            uiElements.healthBar.style.backgroundColor = '#f80'; // Orange for medium health
        } else {
            uiElements.healthBar.style.backgroundColor = '#0f0'; // Green for good health
        }
    }
    
    // Update money display
    if (uiElements.moneyDisplay) {
        uiElements.moneyDisplay.textContent = `$${player.stats.money}`;
    }
    
    // Update speedometer (only when in vehicle)
    if (uiElements.speedometer) {
        if (player.isInVehicle && player.currentVehicle) {
            // Show speedometer and update value
            uiElements.speedometer.style.display = 'block';
            uiElements.speedometer.textContent = `${Math.round(player.currentVehicle.state.speed)} km/h`;
        } else {
            // Hide speedometer when not in vehicle
            uiElements.speedometer.style.display = 'none';
        }
    }
    
    // Update wanted level stars
    if (uiElements.wantedLevel) {
        const stars = uiElements.wantedLevel.querySelectorAll('.wanted-star');
        stars.forEach(star => {
            const level = parseInt(star.dataset.level);
            if (player.stats.wanted >= level) {
                star.style.backgroundColor = '#fff'; // Active star
            } else {
                star.style.backgroundColor = 'rgba(255,255,255,0.3)'; // Inactive star
            }
        });
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Skip updates if game is paused
    if (gameState.paused) return;
    
    const delta = clock.getDelta();
    
    // Update physics world
    physics.update(delta);
    
    // Update player
    if (player) {
        player.update(delta);
    }
    
    // Update vehicles
    if (vehicles && vehicles.length > 0) {
        vehicles.forEach(vehicle => {
            if (vehicle && typeof vehicle.update === 'function') {
                vehicle.update(delta);
            }
        });
    }
    
    // Update city if it has an update method
    if (city && typeof city.update === 'function') {
        city.update(delta);
    }
    
    // Update UI
    updateUI();
    
    // Check for game over
    if (player.stats.health <= 0 && !gameState.gameOver) {
        gameState.gameOver = true;
        handleGameOver();
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Handle game over
function handleGameOver() {
    console.log('Game over!');
    
    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.top = '50%';
    gameOverScreen.style.left = '50%';
    gameOverScreen.style.transform = 'translate(-50%, -50%)';
    gameOverScreen.style.backgroundColor = 'rgba(0,0,0,0.8)';
    gameOverScreen.style.color = '#f00';
    gameOverScreen.style.padding = '30px';
    gameOverScreen.style.borderRadius = '10px';
    gameOverScreen.style.textAlign = 'center';
    gameOverScreen.style.fontFamily = 'Arial, sans-serif';
    gameOverScreen.style.zIndex = '100';
    gameOverScreen.style.minWidth = '300px';
    
    gameOverScreen.innerHTML = `
        <h1>WASTED</h1>
        <p>You have been wasted!</p>
        <button id="respawn-btn" style="margin: 20px; padding: 10px 20px; background-color: #f00; color: #fff; border: none; cursor: pointer;">Respawn</button>
    `;
    
    document.body.appendChild(gameOverScreen);
    
    // Add event listener to respawn button
    document.getElementById('respawn-btn').addEventListener('click', () => {
        // Hide game over screen
        gameOverScreen.style.display = 'none';
        
        // Restart the game
        restartGame();
    });
}

// Initialize the application when the DOM is ready
window.addEventListener('DOMContentLoaded', init);

// Expose variables to window for debugging
window.THREE = THREE;
window.scene = scene;
window.player = player;
window.vehicles = vehicles;
window.physics = physics;
