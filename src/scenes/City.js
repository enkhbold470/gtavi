import * as THREE from 'three';

/**
 * City class for creating and managing the city environment
 * Extends THREE.Group to allow easy addition to the main scene
 */
export class City extends THREE.Group {
    constructor(size = 5, blockSize = 20) {
        super();
        
        // City parameters
        this.size = size; // Number of blocks in each direction (size x size grid)
        this.blockSize = blockSize; // Size of each city block
        this.roadWidth = 8; // Width of roads
        this.sidewalkWidth = 2; // Width of sidewalks
        this.buildingMaxHeight = 50; // Maximum building height
        this.buildingMinHeight = 10; // Minimum building height
        
        // Grid to track occupied positions
        this.grid = Array(size).fill().map(() => Array(size).fill(0));
        
        // Materials
        this.materials = {
            road: new THREE.MeshStandardMaterial({ 
                color: 0x333333, 
                roughness: 0.9,
                metalness: 0.1 
            }),
            sidewalk: new THREE.MeshStandardMaterial({ 
                color: 0x999999, 
                roughness: 0.8,
                metalness: 0.1 
            }),
            building: [
                new THREE.MeshStandardMaterial({ color: 0x8899AA, roughness: 0.5, metalness: 0.2 }), // Glass/blue
                new THREE.MeshStandardMaterial({ color: 0xAA8866, roughness: 0.7, metalness: 0.1 }), // Brick/brown
                new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.6, metalness: 0.1 }), // Concrete/gray
            ],
            buildingWindows: new THREE.MeshStandardMaterial({ 
                color: 0x88CCFF, 
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x112233
            }),
        };
        
        // Initialize city components
        this.createCityLayout();
    }
    
    /**
     * Create the entire city layout
     */
    createCityLayout() {
        // Create the ground plane for the city
        this.createGround();
        
        // Create the road network first
        this.createRoadNetwork();
        
        // Create buildings in the blocks
        this.createBuildings();
        
        // Add some decorative elements
        this.createDecorations();
    }
    
    /**
     * Create the ground plane for the city
     */
    createGround() {
        const totalSize = this.size * this.blockSize + (this.size - 1) * this.roadWidth;
        const groundGeometry = new THREE.PlaneGeometry(totalSize * 1.5, totalSize * 1.5);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a5e1a, // Dark green for surrounding areas
            roughness: 0.8,
            metalness: 0.1
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = -0.01; // Slightly below to avoid z-fighting
        ground.receiveShadow = true;
        
        this.add(ground);
    }
    
    /**
     * Create the road network between blocks
     */
    createRoadNetwork() {
        const totalBlockSize = this.blockSize + this.roadWidth;
        
        // Calculate city bounds for positioning
        const citySize = this.size * this.blockSize + (this.size - 1) * this.roadWidth;
        const cityHalfSize = citySize / 2;
        
        // Create horizontal roads
        for (let i = 0; i < this.size - 1; i++) {
            const roadX = -cityHalfSize + this.blockSize + (i * totalBlockSize) + this.roadWidth / 2;
            
            const roadGeometry = new THREE.PlaneGeometry(this.roadWidth, citySize);
            const road = new THREE.Mesh(roadGeometry, this.materials.road);
            road.rotation.x = -Math.PI / 2; // Horizontal plane
            road.position.set(roadX, 0.05, 0); // Slightly above ground to avoid z-fighting
            road.receiveShadow = true;
            
            this.add(road);
            
            // Add sidewalks on both sides of the road
            this.createSidewalk(roadX - (this.roadWidth / 2 - this.sidewalkWidth / 2), 0.1, 0, this.sidewalkWidth, citySize);
            this.createSidewalk(roadX + (this.roadWidth / 2 - this.sidewalkWidth / 2), 0.1, 0, this.sidewalkWidth, citySize);
        }
        
        // Create vertical roads
        for (let j = 0; j < this.size - 1; j++) {
            const roadZ = -cityHalfSize + this.blockSize + (j * totalBlockSize) + this.roadWidth / 2;
            
            const roadGeometry = new THREE.PlaneGeometry(citySize, this.roadWidth);
            const road = new THREE.Mesh(roadGeometry, this.materials.road);
            road.rotation.x = -Math.PI / 2; // Horizontal plane
            road.position.set(0, 0.05, roadZ); // Slightly above ground to avoid z-fighting
            road.receiveShadow = true;
            
            this.add(road);
            
            // Add sidewalks on both sides of the road
            this.createSidewalk(0, 0.1, roadZ - (this.roadWidth / 2 - this.sidewalkWidth / 2), citySize, this.sidewalkWidth);
            this.createSidewalk(0, 0.1, roadZ + (this.roadWidth / 2 - this.sidewalkWidth / 2), citySize, this.sidewalkWidth);
        }
    }
    
    /**
     * Create a sidewalk segment
     */
    createSidewalk(x, y, z, width, length) {
        const sidewalkGeometry = new THREE.PlaneGeometry(width, length);
        const sidewalk = new THREE.Mesh(sidewalkGeometry, this.materials.sidewalk);
        sidewalk.rotation.x = -Math.PI / 2; // Horizontal plane
        sidewalk.position.set(x, y, z);
        sidewalk.receiveShadow = true;
        
        this.add(sidewalk);
    }
    
    /**
     * Create buildings in each city block
     */
    createBuildings() {
        const totalBlockSize = this.blockSize + this.roadWidth;
        
        // Calculate city bounds for positioning
        const citySize = this.size * this.blockSize + (this.size - 1) * this.roadWidth;
        const cityHalfSize = citySize / 2;
        
        // Create buildings in each block
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                // Calculate block center position
                const blockX = -cityHalfSize + (this.blockSize / 2) + (i * totalBlockSize);
                const blockZ = -cityHalfSize + (this.blockSize / 2) + (j * totalBlockSize);
                
                // Create multiple buildings in each block
                this.createBuildingsInBlock(blockX, blockZ, i, j);
            }
        }
    }
    
    /**
     * Create buildings within a single city block
     */
    createBuildingsInBlock(blockX, blockZ, gridI, gridJ) {
        // Number of potential building spots in the block
        const spots = 4;
        
        // Block size with margin for buildings
        const effectiveBlockSize = this.blockSize - 4;
        const subBlockSize = effectiveBlockSize / 2;
        
        // Positions for buildings in the block
        const positions = [
            { x: blockX - subBlockSize / 2, z: blockZ - subBlockSize / 2 },
            { x: blockX + subBlockSize / 2, z: blockZ - subBlockSize / 2 },
            { x: blockX - subBlockSize / 2, z: blockZ + subBlockSize / 2 },
            { x: blockX + subBlockSize / 2, z: blockZ + subBlockSize / 2 }
        ];
        
        // Create buildings on some or all positions
        const buildingCount = 2 + Math.floor(Math.random() * 3); // 2-4 buildings per block
        
        for (let i = 0; i < buildingCount; i++) {
            const pos = positions[i];
            
            // Randomize building size
            const width = 2 + Math.random() * (subBlockSize - 4);
            const depth = 2 + Math.random() * (subBlockSize - 4);
            const height = this.buildingMinHeight + Math.random() * (this.buildingMaxHeight - this.buildingMinHeight);
            
            // Choose material
            const materialIndex = Math.floor(Math.random() * this.materials.building.length);
            
            this.createBuilding(pos.x, pos.z, width, depth, height, this.materials.building[materialIndex]);
        }
    }
    
    /**
     * Create a single building
     */
    createBuilding(x, z, width, depth, height, material) {
        // Building base
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(buildingGeometry, material);
        
        // Position building with bottom at ground level
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        
        this.add(building);
        
        // Add windows (simplified representation)
        this.addBuildingWindows(x, z, width, depth, height);
    }
    
    /**
     * Add windows to a building
     */
    addBuildingWindows(x, z, width, depth, height) {
        // Calculate rows and columns of windows
        const windowSize = 1.2;
        const windowSpacing = 2;
        const windowInset = 0.05;
        
        const rows = Math.floor((height - 4) / windowSpacing);
        const colsWidth = Math.floor((width - 2) / windowSpacing);
        const colsDepth = Math.floor((depth - 2) / windowSpacing);
        
        if (rows <= 0 || colsWidth <= 0 || colsDepth <= 0) return;
        
        // Calculate starting positions for windows
        const startY = 2 + windowSpacing / 2;
        const startX = -(width / 2) + windowSpacing / 2 + 1;
        const startZ = -(depth / 2) + windowSpacing / 2 + 1;
        
        // Add windows on width sides
        for (let i = 0; i < rows; i++) {
            const windowY = startY + (i * windowSpacing);
            
            for (let j = 0; j < colsWidth; j++) {
                const windowX = startX + (j * windowSpacing);
                
                // Front face windows
                this.createWindow(
                    x + windowX,
                    windowY,
                    z + depth / 2 - windowInset,
                    windowSize, windowSize,
                    0, 0, 0
                );
                
                // Back face windows
                this.createWindow(
                    x + windowX,
                    windowY,
                    z - depth / 2 + windowInset,
                    windowSize, windowSize,
                    0, Math.PI, 0
                );
            }
            
            for (let k = 0; k < colsDepth; k++) {
                const windowZ = startZ + (k * windowSpacing);
                
                // Right face windows
                this.createWindow(
                    x + width / 2 - windowInset,
                    windowY,
                    z + windowZ,
                    windowSize, windowSize,
                    0, Math.PI / 2, 0
                );
                
                // Left face windows
                this.createWindow(
                    x - width / 2 + windowInset,
                    windowY,
                    z + windowZ,
                    windowSize, windowSize,
                    0, -Math.PI / 2, 0
                );
            }
        }
    }
    
    /**
     * Create a window for a building
     */
    createWindow(x, y, z, width, height, rotX, rotY, rotZ) {
        const windowGeometry = new THREE.PlaneGeometry(width, height);
        const window = new THREE.Mesh(windowGeometry, this.materials.buildingWindows);
        
        window.position.set(x, y, z);
        window.rotation.set(rotX, rotY, rotZ);
        
        this.add(window);
    }
    
    /**
     * Add decorative elements to the city
     */
    createDecorations() {
        // Could add things like street lamps, traffic lights, etc.
        // For simplicity, we'll just add some basic elements
        
        // Add traffic lights at each intersection
        this.addTrafficLights();
    }
    
    /**
     * Add traffic lights at intersections
     */
    addTrafficLights() {
        const totalBlockSize = this.blockSize + this.roadWidth;
        
        // Calculate city bounds for positioning
        const citySize = this.size * this.blockSize + (this.size - 1) * this.roadWidth;
        const cityHalfSize = citySize / 2;
        
        // Add traffic lights at each intersection
        for (let i = 0; i < this.size - 1; i++) {
            for (let j = 0; j < this.size - 1; j++) {
                const x = -cityHalfSize + this.blockSize + (i * totalBlockSize) + this.roadWidth / 2;
                const z = -cityHalfSize + this.blockSize + (j * totalBlockSize) + this.roadWidth / 2;
                
                this.createTrafficLight(x + this.roadWidth / 2 - 1, z - this.roadWidth / 2 + 1);
                this.createTrafficLight(x - this.roadWidth / 2 + 1, z + this.roadWidth / 2 - 1);
            }
        }
    }
    
    /**
     * Create a traffic light
     */
    createTrafficLight(x, z) {
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x, 2.5, z);
        pole.castShadow = true;
        
        // Traffic light box
        const boxGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(x, 5.5, z);
        box.castShadow = true;
        
        // Traffic lights
        const redLightGeometry = new THREE.CircleGeometry(0.2, 16);
        const yellowLightGeometry = new THREE.CircleGeometry(0.2, 16);
        const greenLightGeometry = new THREE.CircleGeometry(0.2, 16);
        
        const redLightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const yellowLightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const greenLightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        
        const redLight = new THREE.Mesh(redLightGeometry, redLightMaterial);
        const yellowLight = new THREE.Mesh(yellowLightGeometry, yellowLightMaterial);
        const greenLight = new THREE.Mesh(greenLightGeometry, greenLightMaterial);
        
        // Position lights
        redLight.position.set(0, 0.4, 0.26);
        yellowLight.position.set(0, 0, 0.26);
        greenLight.position.set(0, -0.4, 0.26);
        
        // Add lights to box
        box.add(redLight);
        box.add(yellowLight);
        box.add(greenLight);
        
        // Create traffic light group
        const trafficLight = new THREE.Group();
        trafficLight.add(pole);
        trafficLight.add(box);
        
        // Add to city
        this.add(trafficLight);
        
        return trafficLight;
    }
    
    /**
     * Update the city (for animations, traffic lights, etc.)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update city elements (could animate traffic lights, etc.)
    }
}

export { City };
