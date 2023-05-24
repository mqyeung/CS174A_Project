import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

import {generatePerlinNoise, elementwiseMultiply, elementwiseAddition, scalarMultiply, scalarAdd, Array_Grid_Patch} from './procgen.js';

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
            plane: new Array_Grid_Patch(elementwiseAddition(generatePerlinNoise(20,20,5), generatePerlinNoise(20,20,2, 0.5)))
            // plane2: new Array_Grid_Patch(generatePerlinNoise(20,20,2))
        };



        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            max_ambient: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0, specularity: 0, color: hex_color("#ffffff")}),
            diffuse_only: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 0.8, specularity: 0, color: color(0.3, 0.3, 0.3, 1)})
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
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
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
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

        this.shapes.torus.draw(context, program_state, Mat4.identity(), this.materials.test.override({color: white_color}));
        // this.shapes.sphere_4.draw(context, program_state, sun_tx, this.materials.max_ambient.override({color: sun_color}))

        this.shapes.plane.draw(context, program_state, Mat4.scale(10,10,10), this.materials.diffuse_only.override({color:white_color}))
        // this.shapes.plane2.draw(context, program_state, Mat4.scale(10,10,10), this.materials.diffuse_only.override({color:white_color}))


    }
}

