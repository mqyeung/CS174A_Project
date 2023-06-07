import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

import {
    generatePerlinNoiseArray,
    elementwiseMultiply,
    elementwiseAddition,
    scalarMultiply,
    scalarAdd,
    Array_Grid_Patch,
    getTerrainNoiseArray, getTerrainNoise
} from './procgen.js';
import {Terrain_Shader} from "./terrain_shader.js";
import {Ship} from './obj-file.js';

class ShipPhysics {
    constructor(model) {

        //HYPERPARAMETERS

        this.pos = vec3(0,20,20); //initial position
        this.velocity = vec3(0,0,0); //initial velocity
        this.facing = vec3(1,0,0); //initial direction the ship's facing
        this.height = 10;
        this.up = vec3(0,1,0); //initial up (to make sure we turn the right way when pressing up
        this.third = vec3(0,0,1); //the third axis here (just so we don't recompute)
        this.accel = 0; //initial acceleration

        this.daccel = 20; //change in acceleration per second of held controls
        this.dturn = Math.PI / 2; //radial turning per second of held controls
        this.droll = Math.PI //rolling speed

        this.ag = 0; //acceleration due to gravity. haven't tried messing with this
        this.drag = .1; //drag, necessary for good turning. .1 has worked well
        this.wingdrag = .9; //increased drag along the axis perpendicular to the wings
        this.camdist = 15; //render distance of camera in units
        this.blendfactor = .7; //number between -1 and 1, ideally close to 1. cos(facing-velocity)<blendfactor induces bleed.

        this.startingManeuverHeight = 10; //the point at which a maneuver starts
        this.maneuverPoints = 0; //the number of points in the current maneuver
        this.totalPoints = 0; //the number of points across all maneuvers this run
        this.bestManeuver = 0; //the best maneuver
        this.maneuverTime = 0; //the time this maneuver started
        this.bestTime = 0;

        this.structuralcoherence = true;

        //consider blending velocity into current facing? kind of mean bc it makes it very hard to turn...
        //update: probably necessary to prevent glitches when people mess around too much. maybe start blending after a certain angle?

        this.model = model; //model (external)
    }
    controlTick(acc,turn,dt) {
        //skip the update if velocity's too far from facing
        // if(this.velocity.norm() > 1){
        //     let component = this.facing.dot(this.velocity) / this.velocity.norm();
        //     if(component < this.blendfactor) {
        //         //start bleeding stuff in
        //         this.facing = this.facing.times(this.blendfactor * dt) + this.velocity.times((1 - this.blendfactor) * dt)
        //     }
        // }
        if(acc != 0){
            //this.accel += acc * this.daccel * dt;

        }
        this.accel = 10 * acc;
        if(turn[0] != 0){ //turning towards the axis orthogonal to up and facing
            //console.log("turning");
            //shift the angle slightly
            this.facing = this.facing.times(Math.cos(turn[0] * this.dturn * dt)).plus(this.third.times(Math.sin(turn[0] * this.dturn * dt)));
            //recompute third
            this.third = this.facing.cross(this.up);

        }
        if(turn[1] != 0){ //turning towards up
            //shift the angle slightly
            this.facing = this.facing.times(Math.cos(turn[1] * this.dturn * dt)).plus(this.up.times(Math.sin(turn[1] * this.dturn * dt)));
            //recompute up
            this.up = this.third.cross(this.facing); //this order's important
        }

        if(turn[2] != 0){ //rolling
            this.up = this.up.times(Math.cos(turn[2] * this.droll * dt)).plus(this.third.times(Math.sin(turn[2] * this.droll * dt)));
            //recompute up
            this.third = this.facing.cross(this.up);
        }

        //normalize everything (fpoint stuff)
        this.facing = this.facing.times(1 / this.facing.norm());
        this.up = this.up.times(1 / this.up.norm());
        this.third = this.third.times(1 / this.third.norm());
    }
    tick(dt,program_state){

        //update velocity:

        //drag
        this.velocity = this.velocity.minus(this.velocity.times(this.drag * dt));

        //wing drag
        this.velocity = this.velocity.minus(this.up.times(this.velocity.dot(this.up) * this.wingdrag * dt));

        //engine acceleration
        this.velocity = this.velocity.plus(this.facing.times(-1 * this.accel * dt));

        //gravity
        this.velocity[1] -= dt * this.ag;

        this.pos = this.pos.plus(this.velocity.times(dt));


        //spin!
        //this.facing = vec3(Math.cos(2 * Math.PI * program_state.animation_time / 5000),0,Math.sin(2 * Math.PI * program_state.animation_time / 5000));
    }

    getHeight(){
        return this.pos[1] - getTerrainNoise(this.pos[0], this.pos[2]);
    }
    point_management(dt){
        let h = this.height;
        if(h < 0){
            console.log("negative height");
            return;
        }
        if(h > this.startingManeuverHeight && this.maneuverTime > .1){
            //end maneuver
            let pps = this.maneuverPoints / this.maneuverTime;
            if(pps > this.bestManeuver){
                this.bestManeuver = pps;
                this.bestTime = this.maneuverTime;
                console.log("new record!");
            }
            this.maneuverPoints = 0;
            this.maneuverTime = 0;

        } else if(h < this.startingManeuverHeight){
            //we are in a maneuver
            this.maneuverTime += dt;
            this.maneuverPoints += dt / h * 100;
        }
    }
    draw(context, program_state) {
        //console.log(this.pos[0]);
        let model_transform = Mat4.translation(...this.pos); //translate

        //just use the ship's facing
        let cob = Mat4.of(vec4(...this.facing,0),vec4(...this.third,0),vec4(...this.up,0),vec4(0,0,0,1)).times(Mat4.scale(-1,-1,-1));

        model_transform = model_transform.times(Mat4.inverse(cob)); //and multiply
        this.model.display(context, program_state, model_transform);
    }

    ssc(v) {
        return Matrix.of([0,-1 * v[2],v[1],0],[v[2],0,-1 * v[0],0],[-1 * v[1],v[0],0,0],[0,0,0,1]);
    }

    get_camera(){
        let v1 = this.facing;
        let v2 = this.up;

        let vu = this.velocity.times(-1 / this.velocity.norm());
        let dot = vu.dot(this.facing);
        if(this.velocity.norm() > .1 && dot < .999 && false){ //if there's a major discrepancy
            //follow velocity
            //camera is following velocity, so we copy the facing -> velocity transform and spin the entire axis like that
            let cross = this.facing.cross(vu);
            let sscross = this.ssc(cross);
            let rot = Mat4.identity();
            rot = rot.plus(sscross).plus(sscross.times(sscross).times(1 / (1 + dot)));

            console.log(sscross.toString());
            console.log(rot.toString());
            //console.log(dot.toString());
            console.log(vec4(...vu,0).toString());
            console.log(rot.times(vec4(...vu,0)).toString());

            v2 = rot.times(v2);
            v1 = vu;
        }
        //let dpos = this.pos.plus(this.up.times(.5))
        return Mat4.look_at(v1.times(this.camdist).plus(this.up.times(4)).plus(this.pos),this.pos,v2);
    }

}

export class Assignment3 extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        const ground_array_test = [
            [0.06, 0.13, 0.13, 0.06],
            [0.13, 0.25, 0.25, 0.13],
            [0.13, 0.25, 0.25, 0.13],
            [0.06, 0.13, 0.13, 0.06]
        ];

        const ground_array_test_2 = [
            [0.082085, 0.135335, 0.199471, 0.239954, 0.239954, 0.199471],
            [0.135335, 0.223131, 0.328798, 0.393469, 0.393469, 0.328798],
            [0.199471, 0.328798, 0.483941, 0.581759, 0.581759, 0.483941],
            [0.239954, 0.393469, 0.581759, 0.698805, 0.698805, 0.581759],
            [0.239954, 0.393469, 0.581759, 0.698805, 0.698805, 0.581759],
            [0.199471, 0.328798, 0.483941, 0.581759, 0.581759, 0.483941]
        ];

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 32),
            sphere_4: new defs.Subdivision_Sphere(4),
            plane: new Array_Grid_Patch(getTerrainNoiseArray(100,20), 20),
            triangle: new defs.Triangle(),
            cube: new defs.Cube(),
            // plane2: new Array_Grid_Patch(generatePerlinNoise(20,20,2)),
            item: new defs.Item(4, 10),
            player: new defs.Player(),
        };

        this.ship = new Ship();

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            max_ambient: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0, specularity: 0, color: hex_color("#ffffff")}),
            diffuse_only: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 0.8, specularity: 0, color: color(0.3, 0.3, 0.3, 1)}),
            terrain_material: new Material(new Terrain_Shader(),
                {ambient: 0, diffusivity: 0.8, specularity: 0, color: color(0.3,0.3,0.3,1)}),
            item: new Material(new defs.Phong_Shader(),
                {ambient: 0.3, diffusivity: 0.8, specularity: 0.8, color: hex_color("#950706")}),
            player: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ffffff")}),
            ship_body: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#950706")}),
            ship_wings: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#E3242B")}),
            ship_fin: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ffffff")}),
            ship_tail: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ffffff")}),
        }

        this.shiplock = true;
        this.t = 0;
        this.accel = 0;
        this.paused = false;
        this.waspaused = false;
        this.turn = vec3(0,0,0); //we use all three
        this.s = new ShipPhysics(this.ship);
        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        //this.key_triggered_button("Toggle camera lock on ship", ["Control", "0"], () => this.shiplock = !this.shiplock);
        this.key_triggered_button("Teleport ship to starting pos", ["Control", "1"], () => this.tp = true);

        this.live_string(box => box.textContent = "- Ship position: " + this.s.pos[0].toFixed(2) + ", " + this.s.pos[1].toFixed(2)
            + ", " + this.s.pos[2].toFixed(2));
        this.new_line();
        this.live_string(box => box.textContent = "- Ship velocity: " + this.s.velocity[0].toFixed(2) + ", " + this.s.velocity[1].toFixed(2)
            + ", " + this.s.velocity[2].toFixed(2));
        this.new_line();
        this.live_string(box => box.textContent = "- Ship orientation: " + this.s.facing[0].toFixed(2) + ", " + this.s.facing[1].toFixed(2)
            + ", " + this.s.facing[2].toFixed(2));
        this.new_line();
        this.live_string(box => box.textContent = "- Ship acceleration: " + this.s.accel.toFixed(2));
        this.new_line();
        this.live_string(box => box.textContent = "- Ship height: " + this.s.height.toFixed(2));
        this.new_line();
        this.live_string(box => box.textContent = "- In maneuver for: " + this.s.maneuverTime.toFixed(2) + " seconds.");
        this.new_line();
        this.live_string(box => box.textContent = "- Best maneuver: " + this.s.bestManeuver.toFixed(2) + " points/sec for " + this.s.bestTime.toFixed(2) + " seconds.");
        this.new_line();
        this.live_string(box => box.textContent = "You are: " + (this.s.structuralcoherence ? "structurally capable" : "blown to smithereens"));
        this.new_line();
        this.key_triggered_button("Accelerate", [" "], () => this.accel = 1, undefined, () => this.accel = 0);
        this.key_triggered_button("Decelerate", ["o"], () => this.accel = -1, undefined, () => this.accel = 0);
        this.new_line();
        this.key_triggered_button("Turn Left", ["a"], () => this.turn[0] = -1, undefined, () => this.turn[0] = 0);
        this.key_triggered_button("Turn Right", ["d"], () => this.turn[0] = 1, undefined, () => this.turn[0] = 0);
        this.key_triggered_button("Turn Up", ["w"], () => this.turn[1] = -1, undefined, () => this.turn[1] = 0);
        this.key_triggered_button("Turn Down", ["s"], () => this.turn[1] = 1, undefined, () => this.turn[1] = 0);
        this.key_triggered_button("Roll CCW", ["q"], () => this.turn[2] = -1, undefined, () => this.turn[2] = 0);
        this.key_triggered_button("Roll CW", ["e"], () => this.turn[2] = 1, undefined, () => this.turn[2] = 0);
        this.new_line();
        this.key_triggered_button("Pause", ["r"], () => this.paused = !this.paused);

    }

    mat4_difference(matrix1, matrix2) {
        let difference = 0
        for (let i = 0; i < 4; i++) {
            if (matrix1[i].length !== 4 || matrix2[i].length !== 4) {
                throw new Error('Invalid matrices. Both matrices must be 4x4.');
            }

            for (let j = 0; j < 4; j++) {
                difference += Math.abs(matrix1[i][j] - matrix2[i][j])
            }
        }
        return difference
    }

    roundToFiveDecimalPlaces(number) {
        let multiplier = Math.pow(10, 5);
        return Math.round(number * multiplier) / multiplier;
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        //if (!context.scratchpad.controls) {
        //    this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
        //    program_state.set_camera(this.initial_camera_location);
        //}
        this.s.height = this.s.getHeight();
        if(this.s.height < 0) this.s.structuralcoherence = false;
        if(this.tp){
            this.tp = false;
            this.s.structuralcoherence = true;
            this.s.pos = vec3(0,20,20);
            this.s.velocity = vec3(0,0,0);
            this.s.accel = 0;
            this.s.facing = vec3(1,0,0);
            this.s.up = vec3(0,1,0);
            this.s.third = vec3(0,0,1);
            this.s.bestTime = 0;
            this.s.bestManeuver = 0;
            this.s.maneuverTime = 0;
            this.s.maneuverPoints = 0;
        }
        if(this.paused || !this.s.structuralcoherence){
            this.waspaused = true;
        } else {

            let dt = 0;
            if(this.waspaused) {
                //coming off of pause so just burn off the spare time (dt==0)
                this.waspaused = false;
            } else {
                //set dt properly
                dt = (program_state.animation_time - this.t ) / 1000;
            }
            this.t = program_state.animation_time;
            this.s.controlTick(this.accel,this.turn,dt);
            this.s.tick(dt,program_state);
            this.s.point_management(dt);
        }
        if(this.shiplock){
            let target = this.s.get_camera();
            program_state.set_camera(target);//
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Create Planets (Requirement 1)
        let time = program_state.animation_time / 1000

        let sun_tx = Mat4.identity()
        let sun_scale = 2 + Math.sin(time * (2*Math.PI/8))
        let sun_color_single = (sun_scale - 1) / 2
        let sun_color = color(1, sun_color_single, sun_color_single, 1)
        let white_color = color(1,1,1,1)
        sun_tx = Mat4.scale(sun_scale, sun_scale, sun_scale).times(sun_tx)

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 10, 0, 0);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, white_color, 100)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)

        this.s.draw(context, program_state);
        // this.shapes.sphere_4.draw(context, program_state, sun_tx, this.materials.max_ambient.override({color: sun_color}))

        // let model_transform = Mat4.translation(10, 10, 10)
        //     .times(Mat4.rotation(90, 1, 0, 0))
        //     .times(Mat4.identity());
        // this.shapes.item.draw(context, program_state, model_transform, this.materials.item);
        //
        // model_transform = Mat4.translation(3, 3, 3).times(model_transform);
        //
        // this.ship.display(context, program_state, model_transform);

        this.shapes.plane.draw(context, program_state, Mat4.identity(), this.materials.terrain_material.override({color:white_color}))
        // this.shapes.plane2.draw(context, program_state, Mat4.scale(10,10,10), this.materials.diffuse_only.override({color:white_color}))
    }
}

