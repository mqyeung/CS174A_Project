WingStorm

Ava Ankenbrandt, Anya Martin, Courtney Gibbons, Matt Yeung

WingStorm is open-world flight simulator which lets a player explore beautiful procedurally generated landscapes.  The player races to stay close to the ground to collect points, but too close and the ship will explode!

Your job is to explore the landscape, performing diving maneuvers to collect the most points per second by flying as close to the terrain as possible. Your current and best maneuver scores are tracked.  A maneuver ends when you are sufficiently high, and a maneuver only counts towards your best if you successfully finish the maneuver without crashing.  Race your friends to see who can perform the best diving maneuver before exploding! Good luck!


Controls:

- (Space) Accelerate&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(o) Decelerate
- (w) Pitch up&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(s) Pitch down
- (q) Yaw left&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(e) Yaw right
- (a) Roll counter-clockwise&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(d) Roll clockwise
- (r) Pause&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(p) Restart

Features:

- Custom ship model with custom vertex shapes
- Ship exhaust particles responding to acceleration and steering
- Acceleration screen shake
- Text shaders to display score on screen
- Infinite procedural generation of terrain with stacked perlin noise
- Terrain shaders based on angle of normal
- Psueorandom noise-based explosion geometry shader
- Collision detection with terrain
- Distance checking for scoring
- Physics simulation for aircraft flight and drag calculations

Code Overview:

- project.js: Displays scene, creates control panel, calculates ship physics, calculates score, creates chunks
- procgen.js: Procedural generation of terrain by stacking perlin noise
- terrain_shader.js: Terrain shader based on angle of normal
- obj-file.js: Creates custom ship model
- trail.js: Creates ship exhaust trail
- kaboom.js: Creates endgame explosion and geometry shader