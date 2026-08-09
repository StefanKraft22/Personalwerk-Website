/* ===========================================================================
   PERSONALWERK — Dotted Surface hero background
   Vanilla-Adaption der 21st.dev-Komponente @sshahaider/dotted-surface
   (Three.js animiertes Punkt-Gitter, das in Sinuswellen schwingt),
   eingefärbt in Personalwerk-Blau.
   =========================================================================== */
(function () {
  const canvas = document.getElementById('dottedSurface');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Grid-Auflösung des Punktfelds
  const SEPARATION = 60;
  const AMOUNTX = 98;
  const AMOUNTY = 66;

  let scene, camera, renderer, particles, count = 0;
  let mouseX = 0, mouseY = 0;
  let viewW = window.innerWidth, viewH = window.innerHeight;      // pointer reference
  let rw = canvas.clientWidth || window.innerWidth;               // render size
  let rh = canvas.clientHeight || window.innerHeight;

  init();
  animate();

  function init() {
    camera = new THREE.PerspectiveCamera(72, rw / rh, 1, 10000);
    camera.position.set(0, 300, 1080);

    scene = new THREE.Scene();

    const numParticles = AMOUNTX * AMOUNTY;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);
    const colors = new Float32Array(numParticles * 3);

    // Personalwerk-Blau: von tiefem Navy in den Tälern zu hellem Corporate-Blau
    const colLow  = new THREE.Color('#0d3a63');
    const colHigh = new THREE.Color('#4aa3ff');

    let i = 0, j = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i]     = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // x
        positions[i + 1] = 0;                                            // y
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // z

        scales[j] = 1;

        // sanfter Farbverlauf über die Tiefe des Felds
        const t = iy / AMOUNTY;
        const c = colLow.clone().lerp(colHigh, t * 0.72 + 0.14);
        colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b;

        i += 3; j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale',    new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: { uOpacity: { value: 0.85 } },
      vertexShader: `
        attribute float scale;
        attribute vec3 aColor;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * (300.0 / -mvPosition.z);
          gl_Position  = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = dot(uv, uv);
          if (d > 0.25) discard;                 // runde Punkte
          float alpha = smoothstep(0.25, 0.02, d) * uOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }`
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(rw, rh, false);
    renderer.setClearColor(0x000000, 0);

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);
  }

  function onPointerMove(e) {
    mouseX = (e.clientX - viewW / 2) * 0.42;
    mouseY = (e.clientY - viewH / 2) * 0.35;
  }

  function onResize() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    rw = canvas.clientWidth || viewW;
    rh = canvas.clientHeight || viewH;
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh, false);
  }

  function render() {
    // weiche Kamerabewegung Richtung Maus (Parallax-Feeling)
    camera.position.x += (mouseX - camera.position.x) * 0.016;
    camera.position.y += (300 - mouseY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    const pos = particles.geometry.attributes.position.array;
    const sc  = particles.geometry.attributes.scale.array;

    let i = 0, j = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        pos[i + 1] = (Math.sin((ix + count) * 0.14) * 17) +
                     (Math.sin((iy + count) * 0.22) * 17);
        sc[j] = (Math.sin((ix + count) * 0.14) + 1) * 3.4 +
                (Math.sin((iy + count) * 0.22) + 1) * 3.4;
        i += 3; j++;
      }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;

    renderer.render(scene, camera);
    count += reduceMotion ? 0 : 0.085;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }
})();
