"use strict";
// A journey's street is seen first-person (docs/journey-streets.md of the platform's plugin): a
// painted panorama on a cylinder round the viewer (all the way round, or a part), turned by a finger.
// Every pixel is also moved by how near it is (its depth map), more as the view swings: near things
// slide past far ones, which is what makes a flat picture deep. Both players turn a street with
// these functions (the site's features/journeys, the app's journeys screens): the same point of the
// picture lands on the same point of the screen. Exported as `panorama`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearnessAt = exports.lerp = exports.clamp = exports.ZOOM_MAX = exports.ZOOM_MIN = exports.FOCUS = void 0;
exports.geometry = geometry;
exports.tanUp = tanUp;
exports.clampCam = clampCam;
exports.frameCam = frameCam;
exports.homeCam = homeCam;
exports.depthAt = depthAt;
exports.uniformsOf = uniformsOf;
exports.sceneToScreen = sceneToScreen;
exports.screenToScene = screenToScene;
exports.scenePx = scenePx;
exports.nearestX = nearestX;
exports.FOCUS = 0.42;
exports.ZOOM_MIN = 1;
exports.ZOOM_MAX = 2.6;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
exports.clamp = clamp;
const lerp = (from, to, t) => from + (to - from) * t;
exports.lerp = lerp;
const aspectOf = (view) => view.width / Math.max(1, view.height);
/** The scene as a cylinder: its radius in pixels of the picture, whether it goes all the way round. */
function geometry(scene) {
    const span = ((scene.span || 120) * Math.PI) / 180;
    return { R: scene.W / span, wrap: (scene.span || 120) >= 360, v0: scene.horizon / scene.H };
}
/** tan of half the field up and down at a zoom: at zoom 1 the picture's height just fits. */
function tanUp(scene, zoom) {
    return scene.H / 2 / geometry(scene).R / zoom;
}
/** Keeps the view inside the picture: up and down always, across unless it goes all the way round. */
function clampCam(c, scene, view) {
    const { R, wrap } = geometry(scene);
    c.zoom = (0, exports.clamp)(c.zoom, exports.ZOOM_MIN, exports.ZOOM_MAX);
    const halfH = tanUp(scene, c.zoom) * R;
    c.y = (0, exports.clamp)(c.y, halfH, scene.H - halfH);
    if (wrap) {
        c.x = ((c.x % scene.W) + scene.W) % scene.W;
    }
    else {
        const tanAcross = tanUp(scene, c.zoom) * aspectOf(view);
        const halfW = (0, exports.lerp)(tanAcross, Math.atan(tanAcross), c.round) * R;
        c.x = scene.W > 2 * halfW ? (0, exports.clamp)(c.x, halfW, scene.W - halfW) : scene.W / 2;
    }
    return c;
}
/** The camera that shows a frame of the scene (16:9 unless it says its height) as a video covers the screen. */
function frameCam(rect, scene, view) {
    const ratio = rect.h ? rect.w / rect.h : 16 / 9;
    const frameHeight = rect.w / ratio;
    const a = aspectOf(view);
    const shownHeight = a >= ratio ? rect.w / a : frameHeight;
    return { x: rect.x + rect.w / 2, y: rect.y + frameHeight / 2, zoom: scene.H / shownHeight, round: 0, depth: 0, dolly: 0 };
}
/** The view a street opens on: its own, or the middle of the picture, a little nearer than all of it. */
function homeCam(scene, view) {
    const home = scene.view || {};
    return clampCam({ x: home.x ?? scene.W / 2, y: home.y ?? scene.H / 2, zoom: home.zoom ?? 1.15, round: 1, depth: 1, dolly: 0 }, scene, view);
}
/** How far (0 near … 1 far) the picture is at a point of it. */
function depthAt(depth, scene, x, y) {
    const u = geometry(scene).wrap ? (((x / scene.W) % 1) + 1) % 1 : (0, exports.clamp)(x / scene.W, 0, 1);
    const px = (0, exports.clamp)(Math.round(u * (depth.width - 1)), 0, depth.width - 1);
    const py = (0, exports.clamp)(Math.round((y / scene.H) * (depth.height - 1)), 0, depth.height - 1);
    const at = (py * depth.width + px) * 4;
    return (depth.pixels[at] * 256 + depth.pixels[at + 1]) / 65535;
}
const nearnessAt = (depth, scene, x, y) => 1 - depthAt(depth, scene, x, y);
exports.nearnessAt = nearnessAt;
/**
 * The shader's numbers now. The sway of a turn, the tilt of the phone and a slow breath move near
 * things against far ones: a twentieth of the view's width at most, in the picture's own measure.
 */
function uniformsOf(scene, cam, look, view, seconds) {
    const { R, wrap, v0 } = geometry(scene);
    const tanY = tanUp(scene, cam.zoom);
    const tanX = tanY * aspectOf(view);
    const shiftY = (cam.y - scene.horizon) / R;
    const viewU = (2 * tanX * R) / scene.W;
    const sx = (cam.swing * 0.05 + look.x * 0.018 + Math.sin(seconds * 0.55) * 0.004) * cam.depth;
    const sy = (look.y * 0.012 + Math.cos(seconds * 0.41) * 0.0025) * cam.depth;
    return {
        cam1: [cam.x / scene.W, tanX, tanY, shiftY],
        cam2: [R / scene.W, R / scene.H, v0, cam.round],
        wrap: wrap ? 1 : 0,
        par: [sx * viewU, (sy * 2 * tanY * R) / scene.H],
        dolly: cam.dolly * cam.depth,
        focus: exports.FOCUS,
    };
}
/**
 * Where a point of the picture is on the screen, as the shader draws it (its depth's shift taken
 * back once); null when it is behind the viewer. `nearness` is left out for a point drawn flat.
 */
function sceneToScreen([px, py], scene, u, view, nearness) {
    const [cu, tanX, tanY, shiftY] = u.cam1;
    const [rw, rh, v0, round] = u.cam2;
    const place = (qx, qy) => {
        let du = qx / scene.W - cu;
        if (u.wrap)
            du -= Math.round(du);
        const angle = du / rw;
        if (Math.abs(angle) > 1.45)
            return null;
        const x = (0, exports.lerp)(angle, Math.tan(angle), round);
        const cosA = (0, exports.lerp)(1, Math.cos(Math.atan(x)), round);
        const y = (qy / scene.H - v0) / rh / cosA;
        return [x / tanX, (y - shiftY) / tanY];
    };
    let s = place(px, py);
    if (!s)
        return null;
    if (nearness) {
        const k = nearness(px, py) - u.focus;
        const relU = s[0] * tanX * rw;
        const relV = s[1] * tanY * rh;
        const offU = u.par[0] * k - relU * u.dolly * k;
        const offV = u.par[1] * k - relV * u.dolly * k;
        s = place(px - offU * scene.W, py - offV * scene.H) || s;
    }
    return [((s[0] + 1) / 2) * view.width, ((s[1] + 1) / 2) * view.height];
}
/** The point of the picture under a point of the screen (its depth's shift taken in once). */
function screenToScene(sx, sy, scene, u, view, nearness) {
    const [cu, tanX, tanY, shiftY] = u.cam1;
    const [rw, rh, v0, round] = u.cam2;
    const s = [(sx / view.width) * 2 - 1, (sy / view.height) * 2 - 1];
    const x = s[0] * tanX;
    const a = Math.atan(x);
    const y = s[1] * tanY + shiftY;
    let uu = (0, exports.lerp)(cu + x * rw, cu + a * rw, round);
    let vv = (0, exports.lerp)(v0 + y * rh, v0 + y * Math.cos(a) * rh, round);
    if (nearness) {
        const k = nearness(uu * scene.W, vv * scene.H) - u.focus;
        uu += u.par[0] * k - x * rw * u.dolly * k;
        vv += u.par[1] * k - s[1] * tanY * rh * u.dolly * k;
    }
    if (u.wrap)
        uu = ((uu % 1) + 1) % 1;
    return [uu * scene.W, vv * scene.H];
}
/** Screen pixels to a pixel of the picture, about the middle of the screen. */
function scenePx(scene, zoom, view) {
    return view.height / (2 * tanUp(scene, zoom) * geometry(scene).R);
}
/** Where a camera move ends across: the shortest way round a full panorama. */
function nearestX(fromX, toX, scene) {
    if (!geometry(scene).wrap)
        return toX;
    return fromX + ((((toX - fromX) % scene.W) + 1.5 * scene.W) % scene.W) - scene.W / 2;
}
