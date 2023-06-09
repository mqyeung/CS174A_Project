import {defs, tiny} from './examples/common.js';
import {Text_Line} from "./examples/text-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
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
import {Explosion} from "./kaboom.js";
import {ExhaustTrail} from "./trail.js";

class ShipPhysics {
    constructor(model) {

        //HYPERPARAMETERS
        this.ship_mat4 = Mat4.identity()

        this.pos = vec3(0,500,20); //initial position
        this.chunk = vec3(0,0,0);
        this.velocity = vec3(0,0,0); //initial velocity
        this.facing = vec3(1,0,0); //initial direction the ship's facing
        this.height = 10;
        this.up = vec3(0,1,0); //initial up (to make sure we turn the right way when pressing up
        this.third = vec3(0,0,1); //the third axis here (just so we don't recompute)
        this.accel = 0; //initial acceleration

        this.daccel = 20; //change in acceleration per second of held controls
        this.dturn = Math.PI / 2; //radial turning per second of held controls
        this.droll = Math.PI //rolling speed

        this.ag = 9; //acceleration due to gravity. haven't tried messing with this
        this.drag = .1; //drag, necessary for good turning. .1 has worked well
        this.wingdrag = 1.6; //increased drag along the axis perpendicular to the wings
        this.camdist = 15; //render distance of camera in units
        this.blendfactor = .7; //number between -1 and 1, ideally close to 1. cos(facing-velocity)<blendfactor induces bleed.

        this.startingManeuverHeight = 20; //the point at which a maneuver starts
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

        this.accel = 15 * acc;
        if(turn[0] != 0){
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
            this.up = this.up.times(Math.cos(-1 * turn[2] * this.droll * dt)).plus(this.third.times(Math.sin(-1 * turn[2] * this.droll * dt)));
            //recompute up
            this.third = this.facing.cross(this.up);
        }

        //normalize everything (fpoint stuff)
        this.facing = this.facing.times(1 / this.facing.norm());
        this.up = this.up.times(1 / this.up.norm());
        this.third = this.third.times(1 / this.third.norm());
    }

    reset() {
        this.structuralcoherence = true;
        this.pos = vec3(0,500,20);
        this.velocity = vec3(0,0,0);
        this.chunk = vec3(0,0,0);
        this.accel = 0;
        this.facing = vec3(1,0,0);
        this.up = vec3(0,1,0);
        this.third = vec3(0,0,1);
        this.bestTime = 0;
        this.bestManeuver = 0;
        this.maneuverTime = 0;
        this.maneuverPoints = 0;
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


    }

    updateChunks(agp,gen,rd,cs){
        let newchunk = vec3(Math.floor(this.pos[0] / cs),0,Math.floor(this.pos[2] / cs));
        if(newchunk[0] - this.chunk[0] > 0){
            //we've moved at least one chunk to the left (let's just assume one
            //pop the last row
            agp.shift();
            agp.push(Array.from(new Array(2 * rd + 1),(x,i) => gen(newchunk[0] + rd,newchunk[2] - rd + i))); //push a new row of chunks onto agp
        }
        if(newchunk[0] - this.chunk[0] < 0){
            //we've moved at least one chunk to negative x (let's just assume one
            //pop the last row
            agp.pop();
            agp.unshift(Array.from(new Array(2 * rd + 1),(x,i) => gen(newchunk[0] - rd,newchunk[2] - rd + i))); //push a new row of chunks onto agp
        }
        if(newchunk[2] - this.chunk[2] > 0){
            //we've moved at least one chunk in positive z
            //pop the last row
            for(let i=0;i<2 * rd + 1;i++){
                agp[i].push(gen(newchunk[0] - rd + i,newchunk[2] + rd));
                agp[i].shift();
            }

        }
        if(newchunk[2] - this.chunk[2] < 0){
            //we've moved at least one chunk in positive z
            //pop the last row
            for(let i=0;i<2 * rd + 1;i++){
                agp[i].unshift(gen(newchunk[0] - rd + i,newchunk[2] - rd));
                agp[i].pop();
            }
        }
        this.chunk = newchunk;
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
            if(this.maneuverTime > .01 && (this.bestTime < .01 || this.maneuverPoints / this.maneuverTime > this.bestManeuver / this.bestTime)){
                this.bestManeuver = this.maneuverPoints;
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
        this.ship_mat4 = model_transform
        this.model.display(context, program_state, model_transform);
    }

    ssc(v) {
        return Matrix.of([0,-1 * v[2],v[1],0],[v[2],0,-1 * v[0],0],[-1 * v[1],v[0],0,0],[0,0,0,1]);
    }

    get_camera(animation_time){
        let v1 = this.facing;
        let v2 = this.up;

        let vu = this.velocity.times(-1 / this.velocity.norm());
        let dot = vu.dot(this.facing);
        if(this.velocity.norm() > .1 && dot < .999 && false){ //if there's a nontrivial discrepancy
            //follow velocity
            //camera is following velocity, so we copy the facing -> velocity transform and spin the entire axis like that
            let cross = this.facing.cross(vu);
            let sscross = this.ssc(cross);
            let rot = Mat4.identity();
            rot = rot.plus(sscross).plus(sscross.times(sscross).times(1 / (1 + dot)));

            v2 = rot.times(v2);
            v1 = vu;
        }
        let screenshake = Mat4.identity()
        if (this.accel !== 0) {
            screenshake = Mat4.translation(0,0.05 * Math.sin(0.1 * animation_time),0.05 * Math.sin(0.1 * animation_time))
        }
        return Mat4.look_at(v1.times(this.camdist).plus(this.up.times(4)).plus(this.pos),this.pos,v2).post_multiply(screenshake);
    }

}

export class Project extends Scene {
    cs = 25; //size of chunk
    rd = 8; //# of chunks rendered
    get_agp(i,j){
        return new Array_Grid_Patch(getTerrainNoiseArray(20,25,25 * i,25 * j),25,25 * i, 25 * j)
    }
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
            agp: [],

            triangle: new defs.Triangle(),
            cube: new defs.Cube(),
            item: new defs.Item(4, 10),
            player: new defs.Player(),
            sky: new defs.Subdivision_Sphere(4),
            text: new Text_Line(100),
        };

        for (let i = -1 * this.rd; i < this.rd + 1; i++) {
            this.shapes.agp.push([]);
            for (let j = -1 * this.rd; j < this.rd + 1; j++) {
                this.shapes.agp[i + this.rd].push(this.get_agp(i, j));
            }
        }


        this.ship = new Ship();
        this.explosion = new Explosion();
        this.trail = new ExhaustTrail()

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            max_ambient: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0, specularity: 0, color: hex_color("#ffffff")}),
            diffuse_only: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 0.8, specularity: 0, color: color(0.3, 0.3, 0.3, 1)}),
            terrain_material: new Material(new Terrain_Shader(),
                {ambient: 0, diffusivity: 0.8, specularity: 0, color: color(0.3, 0.3, 0.3, 1)}),
            sky: new Material(new defs.Phong_Shader(),
                {ambient: 1.0, diffusivity: 0, specularity: 0, color: hex_color("#b49597")}),
        }

        this.shiplock = true;
        this.t = 0;
        this.accel = 0;
        this.paused = false;
        this.waspaused = false;
        this.turn = vec3(0, 0, 0); //we use all three
        this.s = new ShipPhysics(this.ship);

        const texture = new defs.Textured_Phong(1);
        this.text_image = new Material(texture, {
            ambient: 1, diffusivity: 0, specularity: 0,
            texture: new Texture("assets/text.png")
        });
    }


    make_html_text() {
        let bestManeuver = document.getElementById("bestManeuver");
        bestManeuver.innerHTML = (this.s.bestManeuver / this.s.maneuverTime).toFixed(2);
        let maneuverPoints = document.getElementById("maneuverPoints");
        maneuverPoints.innerHTML = this.s.maneuverPoints.toFixed(2);
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        //this.key_triggered_button("Toggle camera lock on ship", ["Control", "0"], () => this.shiplock = !this.shiplock);
        this.key_triggered_button("Restart", ["p"], () => this.tp = true);

        this.live_string(box => box.textContent = "- Ship position: " + this.s.pos[0].toFixed(2) + ", " + this.s.pos[1].toFixed(2)
            + ", " + this.s.pos[2].toFixed(2) + " , chunk " + this.s.chunk[0] + ", " + this.s.chunk[2]);
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
        this.live_string(box => box.textContent = "- Best maneuver: " + this.s.bestManeuver.toFixed(2) + " points in " + this.s.bestTime.toFixed(2) + " seconds.");
        this.new_line();
        this.live_string(box => box.textContent = "You are: " + (this.s.structuralcoherence ? "structurally capable" : "blown to smithereens"));
        this.new_line();
        this.key_triggered_button("Accelerate", [" "], () => this.accel = 1, undefined, () => this.accel = 0);
        this.key_triggered_button("Decelerate", ["o"], () => this.accel = -1, undefined, () => this.accel = 0);
        this.new_line();
        this.key_triggered_button("Yaw Left", ["q"], () => this.turn[0] = -1, undefined, () => this.turn[0] = 0);
        this.key_triggered_button("Yaw Right", ["e"], () => this.turn[0] = 1, undefined, () => this.turn[0] = 0);
        this.key_triggered_button("Pitch Up", ["w"], () => this.turn[1] = -1, undefined, () => this.turn[1] = 0);
        this.key_triggered_button("Pitch Down", ["s"], () => this.turn[1] = 1, undefined, () => this.turn[1] = 0);
        this.key_triggered_button("Roll CCW", ["a"], () => this.turn[2] = -0.5, undefined, () => this.turn[2] = 0);
        this.key_triggered_button("Roll CW", ["d"], () => this.turn[2] = 0.5, undefined, () => this.turn[2] = 0);
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
        this.s.height = this.s.getHeight();
        if(this.s.height < 0) this.s.structuralcoherence = false;
        if(this.tp){
            this.tp = false;
            this.s.reset();
            this.shapes.agp = [];
            for(let i=-1 * this.rd;i<this.rd + 1;i++){
                this.shapes.agp.push([]);
                for (let j = -1 * this.rd; j < this.rd + 1; j++){
                    this.shapes.agp[i+this.rd].push(this.get_agp(i,j));
                }
            }
        }
        if(this.paused || !this.s.structuralcoherence){
            this.waspaused = true;
            if (!this.s.structuralcoherence) {
                this.explosion.kaboom(context, program_state, Mat4.translation(...this.s.pos).post_multiply(Mat4.scale(2.5,2.5,2.5)))
            }
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
            this.s.updateChunks(this.shapes.agp,this.get_agp,this.rd,this.cs);
            this.s.point_management(dt);
        }
        if(this.shiplock){
            let target = this.s.get_camera(program_state.animation_time);
            program_state.set_camera(target);//
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        let time = program_state.animation_time / 1000

        // draw light
        let sun_tx = Mat4.identity()
        let sun_scale = 2 + Math.sin(time * (2*Math.PI/8))
        let sun_color_single = (sun_scale - 1) / 2
        let sun_color = color(1, sun_color_single, sun_color_single, 1)
        let white_color = color(1,1,1,1)
        sun_tx = Mat4.scale(sun_scale, sun_scale, sun_scale).times(sun_tx)
        const light_position = vec4(0, 10, 0, 0);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, white_color, 100)];

        this.s.draw(context, program_state);
        this.shapes.agp.forEach(i => i.forEach(j => j.draw(context, program_state, Mat4.translation(j.xpos,0,j.zpos).times(Mat4.scale(1,1,-1).times(Mat4.rotation(Math.PI / 2,0,1,0))), this.materials.terrain_material.override({color:white_color}))))

        if (this.s.accel === 0) {
            this.trail.update_trail(context, program_state, this.s.ship_mat4.post_multiply(Mat4.translation(-2.5,0,0).post_multiply(Mat4.identity().post_multiply(Mat4.rotation(Math.random() * 360, 0, 1, 0)))))
        }else{
            this.trail.update_trail(context, program_state, this.s.ship_mat4.post_multiply(Mat4.translation(-2.5,0,0).post_multiply(Mat4.scale(2,2,2).post_multiply(Mat4.rotation(Math.random() * 360, 0, 1, 0)))))
        }

        const sky_transform = Mat4.translation(...this.s.pos).times(Mat4.scale(600, 600, 600)).times(Mat4.identity())
        this.shapes.sky.draw(context, program_state, sky_transform, this.materials.sky)

        if (!this.s.structuralcoherence) {
            let out = `Game Over!`;
            let text_transform = Mat4.translation(-.4, 0, -1);
            this.shapes.text.set_string(out, context.context);
            this.shapes.text.draw(context, program_state, program_state.camera_transform.times(text_transform.times(Mat4.scale(0.06, 0.06, 1))), this.text_image);
            out = `Press p to restart.`;
            text_transform = Mat4.translation(-.29, -.09, -1);
            this.shapes.text.set_string(out, context.context);
            this.shapes.text.draw(context, program_state, program_state.camera_transform.times(text_transform.times(Mat4.scale(0.02, 0.02, 1))), this.text_image);

            let bestManeuverNum = 0
            if (this.s.bestTime > .1) {
                bestManeuverNum = (this.s.bestManeuver / this.s.bestTime).toFixed(2);
            }
            out = `Best Maneuver: ${bestManeuverNum.toString(10)}`;
            text_transform = Mat4.translation(-.25, -.14, -1);
            this.shapes.text.set_string(out, context.context);
            this.shapes.text.draw(context, program_state, program_state.camera_transform.times(text_transform.times(Mat4.scale(0.02, 0.02, 1))), this.text_image);
        } else {
            let curManeuverNum = 0
            if (this.s.maneuverTime > .1) {
                curManeuverNum = (this.s.maneuverPoints/ this.s.maneuverTime).toFixed(2);
            }

            let bestManeuverNum = 0
            if (this.s.bestTime > .1) {
                bestManeuverNum = (this.s.bestManeuver / this.s.bestTime).toFixed(2);
            }

            let out = `Current Maneuver: ${curManeuverNum.toString(10)}`;
            let text_transform = Mat4.translation(-.67, -.29, -1);
            this.shapes.text.set_string(out, context.context);
            this.shapes.text.draw(context, program_state, program_state.camera_transform.times(text_transform.times(Mat4.scale(0.025, 0.025, 1))), this.text_image);
            out = `Best Maneuver: ${bestManeuverNum.toString(10)}`;
            text_transform = Mat4.translation(-.67, -.35, -1);
            this.shapes.text.set_string(out, context.context);
            this.shapes.text.draw(context, program_state, program_state.camera_transform.times(text_transform.times(Mat4.scale(0.025, 0.025, 1))), this.text_image);
        }
    }
}
