# GTA VI WebGL

An open-world GTA VI-inspired game built with Three.js and WebGL, featuring a full 3D city environment, vehicles, player character, physics, and missions.

![GTA VI WebGL Gameplay](screenshots/gameplay.png)

## 🎮 Features

- **Open City Environment**: Navigate through a dynamically generated city with buildings, roads, and traffic lights
- **Character Control**: Fully controllable player character with walking, running, and jumping
- **Vehicle System**: Enter, drive, and exit vehicles with realistic physics
- **Mission System**: Complete various mission types (delivery, collection, chase)
- **Physics Simulation**: Realistic interactions using cannon.js physics engine
- **Inventory & Weapons**: Collect and use items and weapons
- **Economy System**: Earn and spend money, track player stats
- **Save System**: Locally persistent game progress

## 📋 Core Gameplay Loop

1. **Walk** through the city using WASD controls
2. **Enter** a vehicle by approaching and pressing F
3. **Drive** to mission markers in the city
4. Complete **missions** to earn money and rewards
5. Progress through the game by completing more challenging missions

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/enkhbold470/gtavi.git
   cd gtavi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 🛠️ Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run serve
```

The optimized files will be generated in the `dist` directory, ready for deployment.

## 🎮 Controls

### Player Controls
- **W, A, S, D**: Move forward, left, backward, right
- **Shift**: Sprint
- **Space**: Jump
- **F**: Enter/Exit vehicles
- **E**: Interact with objects and missions
- **Mouse**: Look around
- **Mouse Click**: Interact/Shoot
- **ESC**: Pause game
- **F5**: Toggle between first-person and third-person view

### Vehicle Controls
- **W, S**: Accelerate, Brake/Reverse
- **A, D**: Steer left, right
- **Space**: Handbrake
- **F**: Exit vehicle
- **H**: Horn
- **L**: Toggle headlights

## 🗺️ Project Structure

```
gtavi/
├── assets/            # Game assets (models, textures, sounds)
├── src/               # Source code
│   ├── components/    # Game components (Player, Vehicle)
│   ├── scenes/        # Scene components (City)
│   ├── systems/       # Game systems (Physics, Controls, Mission)
│   ├── utils/         # Utility functions
│   └── main.js        # Main entry point
├── index.html         # HTML entry point
├── package.json       # Project dependencies and scripts
└── vite.config.js     # Vite configuration
```

### Key Components

- **Player.js**: Manages player state, physics, inventory, and interactions
- **Vehicle.js**: Handles vehicle physics, controls, and state
- **City.js**: Generates the city environment with buildings, roads, and decorations
- **Physics.js**: Manages all physics interactions using cannon.js
- **Controls.js**: Handles user input and camera control
- **Mission.js**: Implements the mission system with objectives and rewards

## 🧪 Technologies Used

- **Three.js**: 3D rendering engine
- **Cannon.js**: Physics simulation
- **Vite**: Build tool and development server
- **ES Modules**: Modern JavaScript module system
- **HTML5 & CSS3**: For UI elements
- **Local Storage**: For saving game progress

## 🗓️ Future Roadmap

- [ ] **Enhanced NPC System**: Pedestrians and AI traffic
- [ ] **Advanced Weather System**: Dynamic weather conditions
- [ ] **Multiplayer Capability**: Networked multiplayer
- [ ] **Property System**: Buy and own buildings
- [ ] **Advanced Mission System**: Branching storylines
- [ ] **Mobile Controls**: Touch interface for mobile devices
- [ ] **Custom Character Creation**: Player customization
- [ ] **Enhanced Graphics**: PBR materials and effects

## 🖼️ Screenshots

![City Environment](screenshots/city.png)
*The open city environment with buildings, roads, and ambient lighting*

![Vehicle Driving](screenshots/vehicle.png)
*Player driving a sports car through the city streets*

![Mission Interface](screenshots/mission.png)
*A sample mission interface showing objectives and rewards*

## 🙏 Credits & Acknowledgements

This project was created as a demonstration of WebGL and Three.js capabilities for creating complex interactive 3D web applications.

### Inspiration
- The Grand Theft Auto series by Rockstar Games
- Various Three.js open-world examples and tutorials

### Special Thanks
- Three.js contributors
- Cannon.js physics engine
- The WebGL community

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Disclaimer**: This is an educational project and is not affiliated with or endorsed by Rockstar Games or the Grand Theft Auto franchise. All trademarks and registered trademarks are the property of their respective owners.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

