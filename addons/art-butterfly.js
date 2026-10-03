import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { OBJLoader } from "https://unpkg.com/three@0.170.0/examples/jsm/loaders/OBJLoader.js";

const sceneEl = document.getElementById("art-butterfly-scene");
const canvas  = document.getElementById("art-butterfly-canvas");

const HOLD_DELAY_MS     = 250;
const MOVE_THRESHOLD_PX = 6;

function startArtButterfly() {
    if (!sceneEl || !canvas) return;

    const gifEl = sceneEl.querySelector(".butterfly-gif");
    const gifSrc = gifEl ? gifEl.src : null;

    const USE_FLAT_SHADING = false;
    const AMBIENT_LIGHT    = 0.9;
    const CAMERA_FOV       = 30;
    const PIVOT_OFFSET_Y   = -0.13;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfbf3f7, 0x4a3d44, AMBIENT_LIGHT));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-3, 5, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8c4cf, 1.5);
    fillLight.position.set(4, 1, 3);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.001, 1000);
    const clock = new THREE.Clock();

    const restScale = 1;
    const restRotation = new THREE.Euler(
        THREE.MathUtils.degToRad(90),
        THREE.MathUtils.degToRad(0),
        THREE.MathUtils.degToRad(0)
    );

    const ROTATE_SENSITIVITY = 0.006;
    const DAMPING_FACTOR     = 0.06;
    const FLICK_MULTIPLIER   = 1.6;

    let mode = "static";
    let holdTimer = null;
    let pointerActive = false;
    let hasMoved = false;
    let pointerStartX = 0;
    let pointerStartY = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartRotX = 0;
    let dragStartRotY = 0;
    let dragRotX = 0;
    let dragRotY = 0;
    let spinX = 0;
    let spinY = 0;

    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;

    const pivot = new THREE.Group();
    scene.add(pivot);

    let model;
    let restPosition;
    let cameraLookAt;
    let modelReady = false;

    function setMode(next) {
        if (mode === next) return;
        mode = next;
        sceneEl.classList.remove("mode-static", "mode-playing", "mode-interactive");
        sceneEl.classList.add("mode-" + next);

        if (next === "playing" && gifEl && gifSrc) {
            gifEl.src = "";
            gifEl.src = gifSrc;
        }
    }

    function resize() {
        const rect = sceneEl.getBoundingClientRect();
        const w = rect.width  || 1;
        const h = rect.height || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    function frameCamera(object) {
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitHeightDistance = maxDim / (2 * Math.tan(Math.PI * camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / camera.aspect;
        const distance = 1.65 * Math.max(fitHeightDistance, fitWidthDistance);

        cameraLookAt = center.clone();
        camera.position.set(center.x, center.y, center.z + distance);
        camera.lookAt(cameraLookAt);
    }

    function applyMaterials(object) {
        object.traverse((part) => {
            if (!part.isMesh) return;

            if (part.geometry && !part.geometry.attributes.normal) {
                part.geometry.computeVertexNormals();
            }

            const materials = Array.isArray(part.material) ? part.material : [part.material];
            materials.forEach((material) => {
                material.color.set("#c7abb9");
                if ("roughness" in material) material.roughness = 0.72;
                if ("metalness" in material) material.metalness = 0;
                if (material.emissive) {
                    material.emissive.set("#a08f98");
                    material.emissiveIntensity = 0;
                }
                material.side = THREE.DoubleSide;
                material.flatShading = USE_FLAT_SHADING;
                material.needsUpdate = true;
            });
        });
    }

    const loader = new OBJLoader();

    loader.load(
        "attachments/projects/butterfly.obj",
        (object) => {
            model = object;
            pivot.add(model);
            applyMaterials(model);

            const rawBounds = new THREE.Box3().setFromObject(model);
            const rawSize = rawBounds.getSize(new THREE.Vector3());

            const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
            const autoScale = 1 / maxDim;

            model.userData._restScale = restScale * autoScale;

            model.scale.setScalar(model.userData._restScale);
            model.rotation.copy(restRotation);

            model.updateMatrixWorld(true);
            const box2 = new THREE.Box3().setFromObject(model);
            const center = box2.getCenter(new THREE.Vector3());
            model.position.sub(center);

            pivot.position.set(0, 0, 0);
            pivot.rotation.set(0, 0, 0);

            frameCamera(pivot);

            pivot.position.y = PIVOT_OFFSET_Y * maxDim * autoScale;
            restPosition = pivot.position.clone();

            modelReady = true;
        },
        undefined,
        (error) => {
            console.error("Unable to load the origami butterfly OBJ.", error);
        }
    );

    function updateFloat(floatElapsed, dt) {
        if (!model) return;
        const finalScale = model.userData._restScale || 1;

        if (!isDragging) {
            const decay = Math.pow(1 - DAMPING_FACTOR, dt * 60);
            spinX *= decay;
            spinY *= decay;

            dragRotX += spinX * dt;
            dragRotY += spinY * dt;

            if (Math.abs(spinX) < 0.001) spinX = 0;
            if (Math.abs(spinY) < 0.001) spinY = 0;
        }

        pivot.position.copy(restPosition);

        pivot.rotation.x = dragRotX;
        pivot.rotation.y = dragRotY;
        pivot.rotation.z = 0;

        model.rotation.copy(restRotation);
        model.scale.setScalar(finalScale);
    }

    function render() {
        requestAnimationFrame(render);
        const dt = Math.min(clock.getDelta(), 0.1);
        const elapsed = clock.getElapsedTime();

        updateFloat(elapsed, dt);
        renderer.render(scene, camera);
    }

    function activateDrag(e) {
        if (!modelReady) return;
        setMode("interactive");
        isDragging = true;

        try { sceneEl.setPointerCapture(e.pointerId); } catch (_) {}

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartRotX = dragRotX;
        dragStartRotY = dragRotY;

        spinX = 0;
        spinY = 0;

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerTime = performance.now();
    }

    function updateDrag(e) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        dragRotY = dragStartRotY + dx * ROTATE_SENSITIVITY;
        dragRotX = dragStartRotX + dy * ROTATE_SENSITIVITY;

        const now = performance.now();
        const dtMs = Math.max(now - lastPointerTime, 1);
        const dxNow = e.clientX - lastPointerX;
        const dyNow = e.clientY - lastPointerY;

        spinY = (dxNow * ROTATE_SENSITIVITY) / (dtMs / 1000);
        spinX = (dyNow * ROTATE_SENSITIVITY) / (dtMs / 1000);

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerTime = now;
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;

        spinX *= FLICK_MULTIPLIER;
        spinY *= FLICK_MULTIPLIER;

        const MAX_SPIN = 12;
        spinX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spinX));
        spinY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spinY));
    }

    sceneEl.addEventListener("pointerdown", (e) => {
        pointerActive = true;
        hasMoved = false;
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;

        holdTimer = setTimeout(() => {
            holdTimer = null;
            if (!hasMoved) activateDrag(e);
        }, HOLD_DELAY_MS);
    });

    sceneEl.addEventListener("pointermove", (e) => {
        if (!pointerActive) return;

        const dx = e.clientX - pointerStartX;
        const dy = e.clientY - pointerStartY;

        if (!hasMoved && Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
            hasMoved = true;
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        }

        if (isDragging) updateDrag(e);
    });

    sceneEl.addEventListener("pointerup", () => {
        pointerActive = false;

        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }

        if (isDragging) {
            endDrag();
            return;
        }

        if (hasMoved) return;

        if (mode === "static")            setMode("playing");
        else if (mode === "playing")      setMode("static");
        else if (mode === "interactive")  setMode("static");
    });

    sceneEl.addEventListener("pointercancel", () => {
        pointerActive = false;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (isDragging) endDrag();
    });

    resize();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(sceneEl);

    render();

    
}

startArtButterfly();

