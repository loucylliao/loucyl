import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { OBJLoader } from "https://unpkg.com/three@0.170.0/examples/jsm/loaders/OBJLoader.js";

/* ==========================================================================
 * OPENING SCENE (three.js postcard)
 * ======================================================================== */

const openingScene = document.getElementById("opening-scene");
const postcardCanvas = document.getElementById("postcard-canvas");
const typingElement = document.getElementById("opening-typing");

// Put postcard.obj and both postcard images in the same folder, or change this path.
const modelPath = "logo/postcard.obj";

// The MTL file has C:/ paths that won't work on a website, so the images are
// attached here by material name.
const envelopeTextures = {
  "Material.001": "logo/postcard_pink_back.png",   // back panel (writing side)
  "Material.002": "logo/postcard_pink_front.png",  // front panel (plain paper)
  "Material.004": "logo/postcard_pink_front.png",  // flap
};

function startOpeningScene() {
  if (!openingScene || !postcardCanvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas: postcardCanvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfbf3f7, 0x4a3d44, 1.8));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-3, 5, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd8c4cf, 1.5);
  fillLight.position.set(4, 1, 3);
  scene.add(fillLight);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const clock = new THREE.Clock();

  const pageOffset = 5;
  const restScale = window.innerWidth <= 700 ? 0.43 : 0.65;
  const entranceStartScaleFactor = 0.5;

  const restRotation = new THREE.Euler(
    THREE.MathUtils.degToRad(0),
    THREE.MathUtils.degToRad(8),
    THREE.MathUtils.degToRad(-110)
  );

  const entranceDuration = 1;
  const entranceStartOffset = new THREE.Vector3(0, 1.9, -3.6);
  const screenShiftRight = 0.22;

  const flipAngleStart = THREE.MathUtils.degToRad(180);
  const flipAxis = new THREE.Vector3(0, 1, 0);

  const baseQuat = new THREE.Quaternion();
  const flipQuat = new THREE.Quaternion();
  const tempEuler = new THREE.Euler();

  const floatBobAmount = 0.04;
  const floatBobSpeed = 1.4;
  const wobbleXAmount = 0.05;
  const wobbleXSpeed = 1.1;
  const wobbleYAmount = 0.09;
  const wobbleYSpeed = 0.9;
  const wobbleZAmount = 0.025;
  const wobbleZSpeed = 1.25;

  const scrollFlipAngle = THREE.MathUtils.degToRad(360);
  const scrollFlipSmoothing = 6;

  const scrollFlipAxis = new THREE.Vector3(0, 1, 0)
    .applyAxisAngle(new THREE.Vector3(0, 0, 1), restRotation.z + Math.PI / 2);

  const startFaceOffset = THREE.MathUtils.degToRad(180);
  const startFaceQuat = new THREE.Quaternion().setFromAxisAngle(scrollFlipAxis, startFaceOffset);

  const scrollTiltAdjust = 0;
  const pitchAxis = new THREE.Vector3(0, 0, 1);
  const pitchQuat = new THREE.Quaternion();

  let model;
  let restPosition;
  let entranceStartPosition;
  let entranceStartScale;
  let cameraLookAt;
  let phaseStartTime = null;
  let modelReady = false;
  let typingFinished = true;
  let hasRevealed = false;
  let scrollProgress = 0;
  let scrollFlipCurrent = 0;
  let lastFrameTime = performance.now();

  function updateScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = maxScroll > 0
      ? THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1)
      : 0;
  }

  function beginEntrance() {
    if (!modelReady || !typingFinished || phaseStartTime !== null) return;
    phaseStartTime = clock.getElapsedTime();
  }

  function startTyping() {
    if (!typingElement) {
      typingFinished = true;
      beginEntrance();
      return;
    }

    const word = "dear,";
    let index = 0;
    const typeSpeed = 130;
    const eraseSpeed = 170;
    const eraseDelay = 200;
    const entranceDelay = 50;

    const typeNext = () => {
      if (index < word.length) {
        typingElement.textContent += word[index++];
        window.setTimeout(typeNext, typeSpeed);
        return;
      }
      window.setTimeout(eraseNext, eraseDelay);
    };

    const eraseNext = () => {
      if (typingElement.textContent.length) {
        typingElement.textContent = typingElement.textContent.slice(0, -1);
        window.setTimeout(eraseNext, eraseSpeed);
        return;
      }
      window.setTimeout(() => {
        typingFinished = true;
        beginEntrance();
      }, entranceDelay);
    };

    window.setTimeout(typeNext, typeSpeed);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    const shift = w > 400 ? w * screenShiftRight : 0;
    camera.setViewOffset(w, h, -shift, 0, w, h);
    camera.updateProjectionMatrix();
    updateScrollProgress();
  }

  function frameModelAtRest(object) {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;
    const distance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewDistance = distance * 0.17;

    cameraLookAt = center.clone();
    camera.position.set(center.x - pageOffset, center.y + viewDistance, center.z);
    camera.lookAt(cameraLookAt);
  }

  function centerModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());

    object.traverse((part) => {
      if (part.isMesh) {
        part.geometry.translate(-center.x, -center.y, -center.z);
      }
    });
  }

  function applyEnvelopeMaterials(object) {
    const textureLoader = new THREE.TextureLoader();
    const loading = {};

    const getTexture = (path) => {
      if (!loading[path]) {
        loading[path] = new Promise((resolve, reject) =>
          textureLoader.load(path, resolve, undefined, reject)
        );
      }
      return loading[path];
    };

    object.traverse((part) => {
      if (!part.isMesh) return;

      const materials = Array.isArray(part.material) ? part.material : [part.material];

      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        material.color.set("#d3c0c3");

        const path = envelopeTextures[material.name];
        if (!path) {
          console.warn(
            `No texture mapped for material "${material.name}". ` +
            `Add it to envelopeTextures if it should have one.`
          );
          return;
        }

        getTexture(path)
          .then((texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            material.map = texture;
            material.color.set("#ffffff");
            material.needsUpdate = true;
          })
          .catch(() => {
            console.warn(`Couldn't load the texture "${path}" (check the file is really at that path).`);
          });
      });
    });
  }

  const loader = new OBJLoader();

  loader.load(
    modelPath,
    (object) => {
      model = object;
      scene.add(model);

      centerModel(model);
      applyEnvelopeMaterials(model);

      model.scale.setScalar(restScale);
      model.rotation.copy(restRotation);
      model.position.x += pageOffset;

      restPosition = model.position.clone();
      frameModelAtRest(model);

      entranceStartPosition = restPosition.clone().add(entranceStartOffset);
      entranceStartScale = restScale * entranceStartScaleFactor;

      model.position.copy(entranceStartPosition);
      model.scale.setScalar(entranceStartScale);

      modelReady = true;
    },
    undefined,
    (error) => {
      console.error("Unable to load the model OBJ.", error);
      openingScene.classList.add("is-finished");
    }
  );

  function updateEntrance(entranceElapsed) {
    const t = Math.min(entranceElapsed / entranceDuration, 1);
    const fallProgress = t * t * (3 - 2 * t);
    const flutterFade = 1 - fallProgress;
    const flutter = Math.sin(entranceElapsed * 5.5) * flutterFade;
    const airDrift = Math.sin(entranceElapsed * 3.1) * flutterFade;

    model.position.lerpVectors(entranceStartPosition, restPosition, fallProgress);
    model.position.x += airDrift * 0.8 + flutter * 0.18;
    model.position.y += Math.sin(t * Math.PI) * 0.3 * flutterFade;
    model.position.z += Math.cos(entranceElapsed * 4.8) * flutterFade * 0.35;

    tempEuler.set(
      restRotation.x + Math.cos(entranceElapsed * 5.2) * flutterFade * 0.2,
      restRotation.y + flutter * 0.18,
      restRotation.z + airDrift * 0.55,
      restRotation.order
    );
    baseQuat.setFromEuler(tempEuler);

    flipQuat.setFromAxisAngle(flipAxis, flipAngleStart * flutterFade);
    model.quaternion.copy(flipQuat).multiply(startFaceQuat).multiply(baseQuat);

    model.scale.setScalar(THREE.MathUtils.lerp(entranceStartScale, restScale, fallProgress));
  }

  function updateFloat(floatElapsed) {
    model.position.x = restPosition.x;
    model.position.y = restPosition.y + Math.sin(floatElapsed * floatBobSpeed) * floatBobAmount;
    model.position.z = restPosition.z;

    tempEuler.set(
      restRotation.x + Math.sin(floatElapsed * wobbleXSpeed) * wobbleXAmount,
      restRotation.y + Math.sin(floatElapsed * wobbleYSpeed) * wobbleYAmount,
      restRotation.z + Math.sin(floatElapsed * wobbleZSpeed) * wobbleZAmount,
      restRotation.order
    );
    baseQuat.setFromEuler(tempEuler);

    flipQuat.setFromAxisAngle(scrollFlipAxis, scrollFlipAngle * scrollFlipCurrent + startFaceOffset);
    pitchQuat.setFromAxisAngle(
      pitchAxis,
      -THREE.MathUtils.degToRad(scrollTiltAdjust) * scrollFlipCurrent
    );
    model.quaternion.copy(pitchQuat).multiply(flipQuat).multiply(baseQuat);

    model.scale.setScalar(restScale);
  }

  function render() {
    requestAnimationFrame(render);

    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    scrollFlipCurrent +=
      (scrollProgress - scrollFlipCurrent) * (1 - Math.exp(-dt * scrollFlipSmoothing));

    if (model && phaseStartTime !== null) {
      const elapsed = clock.getElapsedTime() - phaseStartTime;

      if (elapsed < entranceDuration) {
        updateEntrance(elapsed);
      } else {
        updateFloat(elapsed - entranceDuration);

        if (!hasRevealed) {
          hasRevealed = true;
          openingScene.classList.add("is-finished");
        }
      }
    }

    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  startTyping();
  render();
}

startOpeningScene();

/* ==========================================================================
 * TYPING TAGLINE
 * ======================================================================== */

const taglineElement = document.getElementById("tagline-text");

const taglineSentences = [
  "what is meant for you will find its way.",
  "plant roses in the ruins.",
  "some words wait years to be understood.",
  "memories keep their own kind of time.",
  "what sleeps beneath the past may bloom again.",
];

function startTagline() {
  if (!taglineElement) return;

  const typeSpeed = 70;
  const eraseSpeed = 35;
  const holdAfterTyped = 1800;
  const pauseAfterErased = 500;

  let sentenceIndex = 0;
  let charIndex = 0;

  const type = () => {
    const sentence = taglineSentences[sentenceIndex];
    if (charIndex < sentence.length) {
      charIndex++;
      taglineElement.textContent = sentence.slice(0, charIndex);
      window.setTimeout(type, typeSpeed);
    } else {
      window.setTimeout(erase, holdAfterTyped);
    }
  };

  const erase = () => {
    if (charIndex > 0) {
      charIndex--;
      taglineElement.textContent = taglineSentences[sentenceIndex].slice(0, charIndex);
      window.setTimeout(erase, eraseSpeed);
    } else {
      sentenceIndex = (sentenceIndex + 1) % taglineSentences.length;
      window.setTimeout(type, pauseAfterErased);
    }
  };

  type();
}

function onOpeningFinished() {
  document.body.classList.add("is-scrollable");
  startTagline();
}

if (openingScene) {
  if (openingScene.classList.contains("is-finished")) {
    onOpeningFinished();
  } else {
    new MutationObserver((_, observer) => {
      if (openingScene.classList.contains("is-finished")) {
        observer.disconnect();
        onOpeningFinished();
      }
    }).observe(openingScene, { attributes: true, attributeFilter: ["class"] });
  }
}

/* ==========================================================================
 * MOBILE HAMBURGER MENU
 * ======================================================================== */

const menuTrigger = document.getElementById("menu-trigger");
const mobileMenu = document.getElementById("mobile-menu");

function closeMobileMenu() {
  mobileMenu?.classList.remove("open");
  menuTrigger?.setAttribute("aria-expanded", "false");
}

menuTrigger?.addEventListener("click", () => {
  const isOpen = mobileMenu?.classList.toggle("open");
  menuTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

// Tap outside the menu closes it.
document.addEventListener("click", (event) => {
  if (!mobileMenu?.classList.contains("open")) return;
  if (mobileMenu.contains(event.target) || menuTrigger.contains(event.target)) return;
  closeMobileMenu();
});

/* ==========================================================================
 * NAV ACTIONS (delegated)
 * ======================================================================== */

document.addEventListener("click", (event) => {
  const t = event.target;

  // Static preview: "write something to keep" just glides down to the how-it-works section.
  if (t.closest(".write-button")) {
    event.preventDefault();
    closeMobileMenu();
    document.getElementById("page-two")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (t.closest("#about-trigger") || t.closest("#mobile-about-trigger")) {
    event.preventDefault();
    closeMobileMenu();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    return;
  }

  if (t.closest("#home-trigger")) {
    event.preventDefault();
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
});

/* ==========================================================================
 * MOBILE ONLY: PAGE-ONE COVER
 * ======================================================================== */

const pageOneSection = document.getElementById("page-one");
const pageOneCover = document.getElementById("page-one-cover");
const pageTwo = document.getElementById("page-two");
const pageThreeSection = document.getElementById("page-three");

function syncPageOneCover() {
  if (!pageOneSection || !pageOneCover) return;
  document.documentElement.style.setProperty(
    "--page-one-height",
    pageOneSection.offsetHeight + "px"
  );
  pageOneCover.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
}

window.addEventListener("scroll", syncPageOneCover, { passive: true });
window.addEventListener("resize", syncPageOneCover);

if (pageOneSection && "ResizeObserver" in window) {
  new ResizeObserver(syncPageOneCover).observe(pageOneSection);
}

syncPageOneCover();

/* ==========================================================================
 * PAGE TWO: WRITE FLOW
 * ======================================================================== */

const writeFields = document.querySelectorAll(".write-field");
const writeDescriptions = document.querySelectorAll(".write-description");
const writePrompt = document.getElementById("write-prompt");
const writeStepNumberEl = document.getElementById("write-step-number");

const writeStepPrompts = {
  1: "dear, whoever...",
  2: "where it belongs...",
  3: "words for later...",
  4: "until it finds you...",
};

const totalWriteSteps = 4;
let currentWriteStep = 1;

function positionWriteNav() {
  const activeDescription = document.querySelector(".write-description.active");
  const writeFlowEl = document.getElementById("write-flow");
  const writeNavEl = document.querySelector(".write-nav");
  if (!activeDescription || !writeFlowEl || !writeNavEl) return;

  const descRect = activeDescription.getBoundingClientRect();
  const flowRect = writeFlowEl.getBoundingClientRect();
  writeNavEl.style.top = `${descRect.bottom - flowRect.top + 20}px`;
}

window.addEventListener("resize", positionWriteNav);

function setWriteStep(step) {
  currentWriteStep = step;

  writeFields.forEach((field) => {
    field.classList.toggle("active", Number(field.dataset.field) === step);
  });

  writeDescriptions.forEach((description) => {
    description.classList.toggle("active", Number(description.dataset.description) === step);
  });

  if (writePrompt) {
    writePrompt.textContent = writeStepPrompts[step] || "";
    writePrompt.classList.remove("write-prompt-1", "write-prompt-2", "write-prompt-3");
    writePrompt.classList.add(`write-prompt-${step}`);
  }

  if (writeStepNumberEl) {
    writeStepNumberEl.textContent = `${step}.`;
  }

  if (pageTwo) {
    pageTwo.classList.remove("step-1", "step-2", "step-3", "step-4");
    pageTwo.classList.add(`step-${step}`);
  }

  positionWriteNav();
}

const writePrevButton = document.getElementById("write-prev");
const writeNextButton = document.getElementById("write-next");

writePrevButton?.addEventListener("click", () => {
  const prevStep = currentWriteStep === 1 ? totalWriteSteps : currentWriteStep - 1;
  setWriteStep(prevStep);
});

writeNextButton?.addEventListener("click", () => {
  const nextStep = currentWriteStep === totalWriteSteps ? 1 : currentWriteStep + 1;
  setWriteStep(nextStep);
});

if (pageTwo && "IntersectionObserver" in window) {
  const pageTwoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          pageTwo.classList.add("in-view");
          setWriteStep(currentWriteStep);
        }
      });
    },
    { threshold: 0.5 }
  );

  pageTwoObserver.observe(pageTwo);
}

let exitingViaPageOne = false;
let exitingViaPageThree = false;

function updateStackExitingState() {
  pageTwo.classList.toggle("exiting", exitingViaPageOne || exitingViaPageThree);
}

if (pageTwo && pageThreeSection && "IntersectionObserver" in window) {
  const pageThreeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        exitingViaPageThree = entry.isIntersecting;
        updateStackExitingState();
      });
    },
    { threshold: 0.5 }
  );

  pageThreeObserver.observe(pageThreeSection);
}

if (pageTwo && pageOneSection && "IntersectionObserver" in window) {
  const pageOneExitObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        exitingViaPageOne = entry.isIntersecting;
        updateStackExitingState();
      });
    },
    { threshold: 0.5 }
  );

  pageOneExitObserver.observe(pageOneSection);
}

/* ==========================================================================
 * PAGE THREE: reveal the origin story as it scrolls into view
 * ======================================================================== */

if (pageThreeSection && "IntersectionObserver" in window) {
  const pageThreeRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          pageThreeSection.classList.add("in-view");
        }
      });
    },
    { threshold: 0.25 }
  );

  pageThreeRevealObserver.observe(pageThreeSection);
}

setWriteStep(1);