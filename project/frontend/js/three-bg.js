function initThreeBg() {
  if (!window.THREE) {
    console.error('Three.js not loaded');
    return;
  }

  const canvas = document.getElementById('three-bg');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Starfield
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ color: 0x6c63ff, size: 0.7, transparent: true, opacity: 0.8 });
  const starVertices = [];
  for (let i = 0; i < 2500; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // Floating shapes
  const shapes = [];
  const geometries = [
    new THREE.IcosahedronGeometry(10, 0),
    new THREE.OctahedronGeometry(10, 0),
    new THREE.TetrahedronGeometry(10, 0)
  ];

  for (let i = 0; i < 18; i++) {
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new THREE.MeshPhongMaterial({
      color: 0x6c63ff,
      wireframe: true,
      transparent: true,
      opacity: Math.random() * 0.2 + 0.1,
      emissive: 0x6c63ff,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 500,
      (Math.random() - 0.5) * 500,
      (Math.random() - 0.5) * 500
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.userData = {
      rotX: (Math.random() - 0.5) * 0.01,
      rotY: (Math.random() - 0.5) * 0.01,
      floatSpeed: Math.random() * 0.002,
      floatOffset: Math.random() * Math.PI * 2
    };
    scene.add(mesh);
    shapes.push(mesh);
  }

  // Grid
  const grid = new THREE.GridHelper(1000, 50, 0x6c63ff, 0x6c63ff);
  grid.position.y = -120;
  grid.material.opacity = 0.15;
  grid.material.transparent = true;
  scene.add(grid);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0x6c63ff, 1);
  pointLight.position.set(50, 50, 50);
  scene.add(pointLight);

  camera.position.z = 100;

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
  });

  function animate(time) {
    requestAnimationFrame(animate);

    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0002;

    shapes.forEach(mesh => {
      mesh.rotation.x += mesh.userData.rotX;
      mesh.rotation.y += mesh.userData.rotY;
      mesh.position.y += Math.sin(time * 0.001 + mesh.userData.floatOffset) * 0.1;
      mesh.material.emissiveIntensity = 0.5 + Math.sin(time * 0.002) * 0.2;
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate(0);
}

window.initThreeBg = initThreeBg;
