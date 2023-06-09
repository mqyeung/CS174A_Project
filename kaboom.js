// todo: make explosion animation on crash :)
// also todo, in a separate file: make procedural tail particles
import {defs, tiny} from "./examples/common.js";
const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Explosion {
    constructor() {
        this.shapes = {
            sphere_1: new defs.Subdivision_Sphere(4),
            sphere_2: new defs.Subdivision_Sphere(3)
        }

        this.materials = {
            fire_1: new Material(new Ripply_Phong(),
                {ambient: .9, diffusivity: .6, color: hex_color("#ff0000")}),
            fire_2: new Material(new Ripply_Phong(),
                {ambient: .9, diffusivity: .6, color: hex_color("#ffaa22")})
        }
    }

    kaboom(context, program_state, ship_transform) {
        this.shapes.sphere_1.draw(context, program_state, ship_transform, this.materials.fire_1)
        this.shapes.sphere_2.draw(context, program_state, ship_transform.post_multiply(Mat4.scale(1.02,1.02,0.98)), this.materials.fire_2)
    }

}

class Ripply_Phong extends defs.Textured_Phong {
    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
                
                attribute vec3 position, normal;                            
                // Position is expressed in object coordinates.
                uniform float animation_time;
                
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
                
                float offset_mult;
                
                void main(){
                    float noise_add = (mod(normal.x, 0.81) + mod(normal.y, 0.13) + mod(normal.z, 0.27)) * 3.0;
                    offset_mult = sin(noise_add + animation_time * 15.0 / 60.0 * 2.0 * 3.14159) + 1.2;
                    
                    // compute a new position
                    vec3 position_altered = position + normal * offset_mult;
                                                                                 
                    // The vertex's final resting place (in NDCS):
                    gl_Position = projection_camera_model_transform * vec4( position_altered, 1.0 );
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position_altered, 1.0 ) ).xyz;
                  } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
                uniform sampler2D texture;
        
                void main(){
                                                                             // Compute an initial (ambient) color:
                    gl_FragColor = vec4( ( shape_color.xyz ) * ambient, shape_color.w ); 
                                                                             // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                  } `;
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
    }
}