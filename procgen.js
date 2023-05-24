import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

// random garbage perlin noise implementation from the interwebs
export function generatePerlinNoise(width, height, scale, z_scale = 1) {
    // Initialize the 2D array
    const noiseArray = new Array(height);
    for (let i = 0; i < height; i++) {
        noiseArray[i] = new Array(width);
    }

    // Generate random gradient vectors
    const gradients = new Array(width * height);
    for (let i = 0; i < gradients.length; i++) {
        const gradient = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
        gradients[i] = gradient;
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

        const vec00 = gradients[y0 * width + x0];
        const vec01 = gradients[y1 * width + x0];
        const vec10 = gradients[y0 * width + x1];
        const vec11 = gradients[y1 * width + x1];

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

    // Generate Perlin noise values
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const noiseValue = perlinNoise(x / scale, y / scale);
            noiseArray[y][x] = noiseValue * z_scale;
        }
    }

    return noiseArray;
}

// Elementwise multiplication of two 2D arrays
export function elementwiseMultiply(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1[0].length !== arr2[0].length) {
        console.log(arr1.length.toString())
        console.log(arr2.length.toString())
        console.log(arr1[0].length.toString())
        console.log(arr2[0].length.toString())
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
        console.log(arr1.length.toString())
        console.log(arr2.length.toString())
        console.log(arr1[0].length.toString())
        console.log(arr2[0].length.toString())
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
    // A grid of rows and columns you can distort. A tesselation of triangles connects the
    // points, generated with a certain predictable pattern of indices.  Two callbacks
    // allow you to dynamically define how to reach the next row or column.
    constructor(array) {
        let rows = array.length - 1
        let columns = array[0].length - 1
        let texture_coord_range = [[0, rows], [0, columns]]
        let scale = 0.1

        super("position", "normal", "texture_coord");
        let points = [];
        for (let r = 0; r <= rows; r++) {
            points.push(new Array(columns + 1));
        }
        for (let r = 0; r <= rows; r++) {
            // From those, use next_column function to generate the remaining points:
            for (let c = 0; c <= columns; c++) {
                console.log(array.toString())
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
                    console.log(normal.toString())
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
