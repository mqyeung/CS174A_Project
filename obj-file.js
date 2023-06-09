import {defs, tiny} from './examples/common.js';
const {vec3, Vector3, vec4, vec, color, Mat4, Light, Shape, Material, Shader, Texture, Scene, hex_color} = tiny;

class Trapezoid extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -.5, -.5], [-1, -1, 1], [1, -.5, .5], [1, .5, -.5], [-1, 1, -1], [1, .5, .5], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -.5, .5], [1, -.5, -.5], [1, .5, .5], [1, .5, -.5],
            [-1, -1, 1], [1, -.5, .5], [-1, 1, 1], [1, .5, .5], [1, -.5, -.5], [-1, -1, -1], [1, .5, -.5], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

class Trapezoid2 extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -.05, -.05], [-1, -1, 1], [1, -.05, .05], [1, .05, -.05], [-1, 1, -1], [1, .05, .05], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -.05, .05], [1, -.05, -.05], [1, .05, .05], [1, .05, -.05],
            [-1, -1, 1], [1, -.05, .05], [-1, 1, 1], [1, .05, .05], [1, -.05, -.05], [-1, -1, -1], [1, .05, -.05], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

// class ThiccTriangle extends Shape {
//     constructor() {
//         super("position", "normal",);
//         // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
//         this.arrays.position = Vector3.cast(
//             [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [.25, -1, 1], [1, 1, -1], [-1, 1, -1], [.25, 1, 1], [-1, 1, 1],
//             [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [.25, -1, 1], [1, -1, -1], [.25, 1, 1], [1, 1, -1],
//             [-1, -1, 1], [.25, -1, 1], [-1, 1, 1], [.25, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
//         this.arrays.normal = Vector3.cast(
//             [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
//             [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
//             [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
//         // Arrange the vertices into a square shape in texture space too:
//         this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
//             14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
//     }
// }

export class Objects {
    constructor() {
        this.shapes = {
            triangle: new defs.Triangle(),
            cube: new defs.Cube(),
            item: new defs.Item(4, 10),
            trapezoid: new Trapezoid(),
            trapezoid2: new Trapezoid2,
        };

        this.materials = {
            item: new Material(new defs.Phong_Shader(),
                {ambient: 0.3, diffusivity: 0.8, specularity: 0.8, color: hex_color("#950706")}),
            ship_body: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ff1d8e")}),
            ship_wings: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ff83c1")}),
            ship_fin: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ffffff")}),
            ship_tail: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.3, specularity: 0.3, color: hex_color("#ffffff")}),
        }
    }

    display(context, program_state, model_transform) {
    }
}

export class Ship extends Objects {
    constructor() {
        super();
    }

    display(context, program_state, model_transform) {
        const model_transform_1 = model_transform.times(Mat4.scale(2, 1, 1));
        const model_transform_2 = model_transform.times(Mat4.translation(-2, 0, 0)).times(Mat4.scale(0.5, 0.5, 0.5));
        // const model_transform_3 = model_transform.times(Mat4.translation(-1, .5, 0)).times(Mat4.scale(3, 2, 2));
        // const model_transform_4 = model_transform.times(Mat4.translation(-1, -.5, 0)).times(Mat4.scale(3, -2, 2));
        // const model_transform_5 = model_transform.times(Mat4.translation(-1, 0, -.5)).times(Mat4.scale(2, 1, 1)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0));
        const model_transform_3 = model_transform.times(Mat4.translation(-0.8, 1, 0)).times(Mat4.scale(1, 1, 0.05));
        const model_transform_4 = model_transform.times(Mat4.translation(-0.8, -1, 0)).times(Mat4.scale(1, -1, 0.05));
        const model_transform_5 = model_transform.times(Mat4.translation(-0.8, 0, -.6)).times(Mat4.scale(1, 0.05, 1)).times(Mat4.rotation(-Math.PI/2, 1, 0, 0));

        this.shapes.trapezoid.draw(context, program_state, model_transform_1, this.materials.ship_body);
        this.shapes.cube.draw(context, program_state, model_transform_2, this.materials.ship_tail);
        this.shapes.trapezoid2.draw(context, program_state, model_transform_3, this.materials.ship_wings);
        this.shapes.trapezoid2.draw(context, program_state, model_transform_4, this.materials.ship_wings);
        this.shapes.trapezoid2.draw(context, program_state, model_transform_5, this.materials.ship_fin);
        // this.shapes.triangle.draw(context, program_state, model_transform_3, this.materials.ship_wings);
        // this.shapes.triangle.draw(context, program_state, model_transform_4, this.materials.ship_wings);
        // this.shapes.triangle.draw(context, program_state, model_transform_5, this.materials.ship_fin);
    }
}