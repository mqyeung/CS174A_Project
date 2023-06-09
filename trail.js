// this file implements a trail of exhaust that spits out behind the ship.
// this is nontrivial because the exhaust exists in worldspace but is procedurally generated in ship-space.
import {defs, tiny} from "./examples/common.js";
const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class ExhaustTrail {
    constructor() {
        this.shapes = []
        this.positions = []
        this.num_items = 10
        // distance between trail dots
        this.num_skips = 100
        this.skip_count = 0

        for (let i = 0; i < this.num_items; i++) {
            this.shapes.append(new defs.Tetrahedron.prototype.make_flat_shaded_version())
            this.positions.append(Mat4.translation(0,-1000,0))
        }

        this.materials = {
            grey: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, specularity: 0.1, color: hex_color("#aaaaaa")}),
        }
    }

    update_trail(context, program_state, ship_transform) {
        for (let i = 0; i < this.num_items; i++) {
            this.shapes[i].draw(context, program_state, this.positions[i], this.materials.grey)
        }

        if (this.skip_count === 0) {
            this.positions.unshift(ship_transform)
            this.positions.pop()
            this.skip_count = this.num_skips
        }
        this.skip_count--

    }

}