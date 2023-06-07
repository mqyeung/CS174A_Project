import {defs, tiny} from './examples/common.js';

export class Terrain_Shader extends defs.Phong_Shader {
        // Terrain_Shader based on Phong

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` precision mediump float;
                const int N_LIGHTS = ` + this.num_lights + `;
                uniform float ambient, diffusivity, specularity, smoothness;
                uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
                uniform float light_attenuation_factors[N_LIGHTS];
                vec4 shape_color;
                uniform vec3 squared_scale, camera_center;
        
                // Specifier "varying" means a variable's final value will be passed from the vertex shader
                // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
                varying vec3 N, vertex_worldspace, N_worldspace;
                // ***** PHONG SHADING HAPPENS HERE: *****                                       
                vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
                    // phong_model_lights():  Add up the lights' contributions.
                    vec3 E = normalize( camera_center - vertex_worldspace );
                    vec3 result = vec3( 0.0 );
                    for(int i = 0; i < N_LIGHTS; i++){
                        // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                        // light will appear directional (uniform direction from all points), and we 
                        // simply obtain a vector towards the light by directly using the stored value.
                        // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                        // the point light's location from the current surface point.  In either case, 
                        // fade (attenuate) the light as the vector needed to reach it gets longer.  
                        vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                                       light_positions_or_vectors[i].w * vertex_worldspace;                                             
                        float distance_to_light = length( surface_to_light_vector );
        
                        vec3 L = normalize( surface_to_light_vector );
                        vec3 H = normalize( L + E );
                        // Compute the diffuse and specular components from the Phong
                        // Reflection Model, using Blinn's "halfway vector" method:
                        float diffuse  =      max( dot( N, L ), 0.0 );
                        float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                        float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                        
                        vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                                  + light_colors[i].xyz * specularity * specular;
                        result += attenuation * light_contribution;
                      }
                    return result;
                  } `;
    }

        constructor(num_lights = 2) {
            super();
            this.num_lights = num_lights;
        }
        vertex_glsl_code() {
            // ********* VERTEX SHADER *********
            return this.shared_glsl_code() + `
                attribute vec3 position, normal;
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;
        
                void main(){                                                                   
                    // The vertex's final resting place (in NDCS):
                    gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                    // The final normal vector in screen space.
                    N = normalize( mat3( model_transform ) * normal / squared_scale);
                    vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                    N_worldspace = normal;
                  } `;
        }

        fragment_glsl_code() {
            // ********* FRAGMENT SHADER *********
            // A fragment is a pixel that's overlapped by the current triangle.
            // Fragments affect the final image or get discarded due to depth.
            return this.shared_glsl_code() + `
                
                void main(){             
                    // use dot product to compute angle. Dot prod is 0 for perpendicular.
                    // so we clamp it to a = -0.2, 0.2, then a2 = (-abs(a) + 0.2) * 1.0/0.2 peaks at 0
                    vec3 up = vec3(0.0,1.0,0.0);
                    float thr = 0.99; // threshold
                    float ang = ( clamp(length(cross(up, N_worldspace)), 0.0, thr) ) * 1.0/thr;
                    float clamped_height = clamp(vertex_worldspace.y/20.0, 0.0, 1.0);
                    vec4 low_color = vec4(1.0, 0.0, 0.0, 1.0);
                    vec4 high_color = vec4(1.0, 0.6, 0.7, 1.0);
                    vec4 steep_color = vec4(1, 0.9, 0.9, 1.0);
                    
                    
                    // shape_color = mix(vec4(1.0,0.0,0.0, 1.0), vec4(0.0,1.0,0.0, 1.0), clamped_height);
                    shape_color = mix(high_color, steep_color, ang);
                                                              
                    // Compute an initial (ambient) color:
                    gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                    // Compute the final color with contributions from lights:
                    gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                  } `;
        }

        send_material(gl, gpu, material) {
            // send_material(): Send the desired shape-wide material qualities to the
            // graphics card, where they will tweak the Phong lighting formula.
            gl.uniform1f(gpu.ambient, material.ambient);
            gl.uniform1f(gpu.diffusivity, material.diffusivity);
            gl.uniform1f(gpu.specularity, material.specularity);
            gl.uniform1f(gpu.smoothness, material.smoothness);
        }

        update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
            // update_GPU(): Add a little more to the base class's version of this method.
            super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
            // future: we can maybe set an offset for the noisemap here!
        }
    }
