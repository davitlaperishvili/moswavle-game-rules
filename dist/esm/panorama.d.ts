export type Point = [number, number];
export interface PanoramaScene {
    /** The picture's width and height, pixels. */
    W: number;
    H: number;
    /** How much of the circle the picture holds, degrees (360: all the way round). */
    span: number;
    /** The row of the picture at the eye's height. */
    horizon: number;
    /** The view the street opens on. */
    view?: {
        x?: number;
        y?: number;
        zoom?: number;
    } | null;
}
/**
 * Where the viewer looks: `x` the column of the picture in the middle of the screen (pixels),
 * `y` the row there, `zoom` (1 = the picture's height fills the screen), how round the view is
 * (0 = flat, as a clip's frame; 1 = the cylinder), how deep (0 = no depth, as a clip), and the
 * push of a dolly (near things grow faster than far ones). `swing` is the sway of a turn, `vx`
 * and `vy` how fast it turns (pixels of the picture a millisecond).
 */
export interface Cam {
    x: number;
    y: number;
    zoom: number;
    round: number;
    depth: number;
    dolly: number;
    swing: number;
    vx: number;
    vy: number;
}
export type CamTarget = Partial<Pick<Cam, "x" | "y" | "zoom" | "round" | "depth" | "dolly">>;
export interface Viewport {
    width: number;
    height: number;
}
/** A tilt of the phone or the mouse: a window looked through, -1..1 each way. */
export interface Look {
    x: number;
    y: number;
}
/** What the shader is given, and what the screen's points are measured by. */
export interface Uniforms {
    cam1: [number, number, number, number];
    cam2: [number, number, number, number];
    wrap: number;
    par: [number, number];
    dolly: number;
    focus: number;
}
/** The depth map's pixels: 16-bit, the high byte in red and the low byte in green; far is 1. */
export interface DepthField {
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
}
export declare const FOCUS = 0.42;
export declare const ZOOM_MIN = 1;
export declare const ZOOM_MAX = 2.6;
export declare const clamp: (value: number, low: number, high: number) => number;
export declare const lerp: (from: number, to: number, t: number) => number;
/** The scene as a cylinder: its radius in pixels of the picture, whether it goes all the way round. */
export declare function geometry(scene: PanoramaScene): {
    R: number;
    wrap: boolean;
    v0: number;
};
/** tan of half the field up and down at a zoom: at zoom 1 the picture's height just fits. */
export declare function tanUp(scene: PanoramaScene, zoom: number): number;
/** Keeps the view inside the picture: up and down always, across unless it goes all the way round. */
export declare function clampCam<T extends Pick<Cam, "x" | "y" | "zoom" | "round">>(c: T, scene: PanoramaScene, view: Viewport): T;
/** The camera that shows a frame of the scene (16:9 unless it says its height) as a video covers the screen. */
export declare function frameCam(rect: {
    x: number;
    y: number;
    w: number;
    h?: number;
}, scene: PanoramaScene, view: Viewport): {
    x: number;
    y: number;
    zoom: number;
    round: number;
    depth: number;
    dolly: number;
};
/** The view a street opens on: its own, or the middle of the picture, a little nearer than all of it. */
export declare function homeCam(scene: PanoramaScene, view: Viewport): {
    x: number;
    y: number;
    zoom: number;
    round: number;
    depth: number;
    dolly: number;
};
/** How far (0 near … 1 far) the picture is at a point of it. */
export declare function depthAt(depth: DepthField, scene: PanoramaScene, x: number, y: number): number;
export declare const nearnessAt: (depth: DepthField, scene: PanoramaScene, x: number, y: number) => number;
/**
 * The shader's numbers now. The sway of a turn, the tilt of the phone and a slow breath move near
 * things against far ones: a twentieth of the view's width at most, in the picture's own measure.
 */
export declare function uniformsOf(scene: PanoramaScene, cam: Cam, look: Look, view: Viewport, seconds: number): Uniforms;
/**
 * Where a point of the picture is on the screen, as the shader draws it (its depth's shift taken
 * back once); null when it is behind the viewer. `nearness` is left out for a point drawn flat.
 */
export declare function sceneToScreen([px, py]: Point, scene: PanoramaScene, u: Uniforms, view: Viewport, nearness?: (x: number, y: number) => number): Point | null;
/** The point of the picture under a point of the screen (its depth's shift taken in once). */
export declare function screenToScene(sx: number, sy: number, scene: PanoramaScene, u: Uniforms, view: Viewport, nearness?: (x: number, y: number) => number): Point;
/** Screen pixels to a pixel of the picture, about the middle of the screen. */
export declare function scenePx(scene: PanoramaScene, zoom: number, view: Viewport): number;
/** Where a camera move ends across: the shortest way round a full panorama. */
export declare function nearestX(fromX: number, toX: number, scene: PanoramaScene): number;
