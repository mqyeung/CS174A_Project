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
        this.num_skips = 4
        this.skip_count = 0

        for (let i = 0; i < this.num_items; i++) {
            this.shapes[i] = (new defs.Subdivision_Sphere(1))
            this.positions[i] = (Mat4.translation(0,-1000,0))
        }

        this.materials = {
            grey: new Material(new Trans_Shader(),
                {ambient: 0, diffusivity: 1, specularity: 0.1, color: hex_color("#aaaaaa")}),
        }
    }

    update_trail(context, program_state, ship_transform) {
        for (let i = 0; i < this.num_items; i++) {
            this.shapes[i].draw(context, program_state, this.positions[i].times(Mat4.scale(0.4,0.4,0.4)), this.materials.grey)
        }

        if (this.skip_count === 0) {
            this.positions.unshift(ship_transform)
            this.positions.pop()
            this.skip_count = this.num_skips
        }
        this.skip_count--

    }

}

class Trans_Shader extends defs.Phong_Shader {
    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
                void main(){                                                           
                    // Compute an initial (ambient) color:
                    gl_FragColor = vec4( shape_color.xyz * ambient, 0.5 );
                    // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                  } `;
    }
}