import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

// xhash 2D rng
function rand(x, y) {
    /* mix around the bits in x: */
    x = x * 3266489917 + 374761393;
    x = (x << 17) | (x >> 15);

    /* mix around the bits in y and mix those into x: */
    x += y * 3266489917;

    /* Give x a good stir: */
    x *= 668265263;
    x ^= x >> 15;
    x *= 2246822519;
    x ^= x >> 13;
    x *= 3266489917;
    x ^= x >> 16;

    /* trim the result and scale it to a float in [0,1): */
    return (x & 0x00ffffff) * (1.0 / 0x1000000);
}

// random perlin noise implementation from the interwebs, many edits to make it continuous
function get_gradient(i, j) {
    return {x: rand(i,j) * 2 - 1, y: rand(i,j) * 2 - 1}
}

// Interpolation function
function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

// Perlin noise function
function perlinNoise(x, y) {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;

    const vec00 = get_gradient(x0, y0);
    const vec01 = get_gradient(x0, y1);
    const vec10 = get_gradient(x1, y0);
    const vec11 = get_gradient(x1, y1);

    const dx = x - x0;
    const dy = y - y0;

    const dot00 = vec00.x * dx + vec00.y * dy;
    const dot01 = vec01.x * dx + vec01.y * (dy - 1);
    const dot10 = vec10.x * (dx - 1) + vec10.y * dy;
    const dot11 = vec11.x * (dx - 1) + vec11.y * (dy - 1);

    const u = fade(dx);
    const v = fade(dy);

    const lerpedX0 = lerp(dot00, dot10, u);
    const lerpedX1 = lerp(dot01, dot11, u);
    const lerpedY = lerp(lerpedX0, lerpedX1, v);

    return (lerpedY + 1) / 2;
}

// Fade function for interpolation
function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}
export function generatePerlinNoiseArray(width, height, scale, z_scale = 1) {
    // Initialize the 2D array
    const noiseArray = new Array(height);
    for (let i = 0; i < height; i++) {
        noiseArray[i] = new Array(width);
    }

    // Generate Perlin noise values
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const noiseValue = perlinNoise(x / scale, y / scale);
            noiseArray[y][x] = noiseValue * z_scale;
        }
    }

    return noiseArray;
}

export function getTerrainNoise(y, x) {
    let scale = 60, z_scale = 300
    let small_scale = 24, small_z_scale = 30
    let smallest_scale = 8, smallest_z_scale = 10

    return z_scale * perlinNoise(x / scale, y / scale) + small_z_scale * perlinNoise(x/small_scale,  y/small_scale) + smallest_z_scale * perlinNoise(x/smallest_scale,  y/smallest_scale)
}

export function getTerrainNoiseArray(subdivisions, output_size, x_offset, y_offset) {
    const noiseArray = new Array(subdivisions);
    for (let i = 0; i < subdivisions; i++) {
        noiseArray[i] = new Array(subdivisions);
    }

    for (let y = 0; y < subdivisions; y++) {
        for (let x = 0; x < subdivisions; x++) {
            noiseArray[y][x] = getTerrainNoise(x*output_size/subdivisions + x_offset,y*output_size/subdivisions + y_offset)
        }
    }
    return noiseArray;
}

// Elementwise multiplication of two 2D arrays
export function elementwiseMultiply(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1[0].length !== arr2[0].length) {
        //console.log(arr1.length.toString())
        //console.log(arr2.length.toString())
        //console.log(arr1[0].length.toString())
        //console.log(arr2[0].length.toString())
        throw new Error("Array dimensions must match for elementwise multiplication.");
    }

    const result = [];
    for (let i = 0; i < arr1.length; i++) {
        result[i] = [];
        for (let j = 0; j < arr1[i].length; j++) {
            result[i][j] = arr1[i][j] * arr2[i][j];
        }
    }

    return result;
}

// Elementwise addition of two 2D arrays
export function elementwiseAddition(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1[0].length !== arr2[0].length) {
        //console.log(arr1.length.toString())
        //console.log(arr2.length.toString())
        //console.log(arr1[0].length.toString())
        //console.log(arr2[0].length.toString())
        throw new Error("Array dimensions must match for elementwise addition.");
    }

    const result = [];
    for (let i = 0; i < arr1.length; i++) {
        result[i] = [];
        for (let j = 0; j < arr1[i].length; j++) {
            result[i][j] = arr1[i][j] + arr2[i][j];
        }
    }

    return result;
}

// Elementwise multiplication of a 2D array and a scalar variable
export function scalarMultiply(arr, scalar) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        result[i] = [];
        for (let j = 0; j < arr[i].length; j++) {
            result[i][j] = arr[i][j] * scalar;
        }
    }

    return result;
}

export function scalarAdd(arr, scalar) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        result[i] = [];
        for (let j = 0; j < arr[i].length; j++) {
            result[i][j] = arr[i][j] + scalar;
        }
    }

    return result;
}

// the following is a mostly-duped copy of the grid_patch code.
// I had to break it a lot to get it to take an array.
export class Array_Grid_Patch extends Shape {
    xpos = 0;
    zpos = 0;
    // A grid of rows and columns you can distort. A tesselation of triangles connects the
    // points, generated with a certain predictable pattern of indices.  Two callbacks
    // allow you to dynamically define how to reach the next row or column.
    constructor(array, output_size,xpos,zpos) {
        let rows = array.length - 1
        let columns = array[0].length - 1
        let texture_coord_range = [[0, rows], [0, columns]]
        let scale = output_size / rows

        super("position", "normal", "texture_coord");
        this.xpos = xpos;
        this.zpos = zpos;
        let points = [];
        for (let r = 0; r <= rows; r++) {
            points.push(new Array(columns + 1));
        }
        for (let r = 0; r <= rows; r++) {
            // From those, use next_column function to generate the remaining points:
            for (let c = 0; c <= columns; c++) {
                //console.log(array.toString())
                points[r][c] = vec3(r * scale, array[r][c], c * scale);

                this.arrays.position.push(points[r][c]);
                // Interpolate texture coords from a provided range.
                const a1 = c / columns, a2 = r / rows, x_range = texture_coord_range[0],
                    y_range = texture_coord_range[1];
                this.arrays.texture_coord.push(vec((a1) * x_range[1] + (1 - a1) * x_range[0], (a2) * y_range[1] + (1 - a2) * y_range[0]));
            }
        }

        for (let r = 0; r <= rows; r++) {
            // Generate normals by averaging the cross products of all defined neighbor pairs.
            for (let c = 0; c <= columns; c++) {
                let curr = points[r][c], neighbors = new Array(4), normal = vec3(0, 0, 0);
                // Store each neighbor by rotational order.
                for (let [i, dir] of [[-1, 0], [0, 1], [1, 0], [0, -1]].entries())
                    neighbors[i] = points[r + dir[1]] && points[r + dir[1]][c + dir[0]];
                // Leave "undefined" in the array wherever
                // we hit a boundary.
                // Take cross-products of pairs of neighbors, proceeding
                // a consistent rotational direction through the pairs:
                for (let i = 0; i < 4; i++)
                    if (neighbors[i] && neighbors[(i + 1) % 4]) {
                        normal = normal.plus(neighbors[i].minus(curr).cross(neighbors[(i + 1) % 4].minus(curr)));
                    }
                normal.normalize();
                // Normalize the sum to get the average vector.
                // Store the normal if it's valid (not NaN or zero length), otherwise use a default:
                if (normal.every(x => x == x) && normal.norm() > .01) {
                    this.arrays.normal.push(normal.copy().times(-1));  // the -1 is so cursed, no idea why we need it
                    //console.log(normal.toString())
                }
                else this.arrays.normal.push(vec3(0, 1, 0));
            }
        }


        for (let h = 0; h < rows; h++) {
            // Generate a sequence like this (if #columns is 10):
            for (let i = 0; i < 2 * columns; i++)    // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..."
                for (let j = 0; j < 3; j++)
                    this.indices.push(h * (columns + 1) + columns * ((i + (j % 2)) % 2) + (~~((j % 3) / 2) ?
                        (~~(i / 2) + 2 * (i % 2)) : (~~(i / 2) + 1)));
        }
    }
}
