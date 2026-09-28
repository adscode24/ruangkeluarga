import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useFamily } from '@/lib/familyContext';
import { base44 } from '@/api/base44Client';
import { ROLE_LABELS } from '@/lib/familyConstants';
import { useToast } from '@/components/ui/use-toast';
import Joystick from '@/components/family/Joystick';
import { LogOut, MessageCircle, Camera } from 'lucide-react';

const ROOMS = [
  { name: 'kamar_orang_tua', color: 0xe8a87c, pos: [-3.5, -3.5] },
  { name: 'kamar_kakak', color: 0xa78bfa, pos: [3.5, -3.5] },
  { name: 'kamar_adik', color: 0xf9a8d4, pos: [3.5, 3.5] },
  { name: 'ruang_keluarga', color: 0x5eead4, pos: [-3.5, 3.5] },
];

const ROLE_3D = {
  ayah: 0x3b82f6, ibu: 0xec4899, kakak: 0x8b5cf6, adik: 0xf59e0b,
  kakek: 0x94a3b8, nenek: 0x94a3b8, om: 0x10b981, tante: 0x10b981
};

// Wall colliders (AABB: minX, maxX, minZ, maxZ) — with doorway gaps
const WALL_COLLIDERS = [
  { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: -6.2 },
  { minX: -6.6, maxX: 6.6, minZ: 6.2, maxZ: 6.6 },
  { minX: -6.6, maxX: -6.2, minZ: -6.6, maxZ: 6.6 },
  { minX: 6.2, maxX: 6.6, minZ: -6.6, maxZ: 6.6 },
  { minX: -6.5, maxX: -0.6, minZ: -0.15, maxZ: 0.15 },
  { minX: 0.6, maxX: 6.5, minZ: -0.15, maxZ: 0.15 },
  { minX: -0.15, maxX: 0.15, minZ: -6.5, maxZ: -0.6 },
  { minX: -0.15, maxX: 0.15, minZ: 0.6, maxZ: 6.5 },
];

// Static furniture colliders
const FURN_COLLIDERS = [
  { x: -4.5, z: 5, w: 2.4, d: 1.0 },
  { x: -3, z: 3.5, w: 1.2, d: 1.2 },
  { x: -2.5, z: 2.5, w: 1.4, d: 0.4 },
  { x: -5, z: 2.5, w: 0.6, d: 0.6 },
  { x: -4.5, z: -3.5, w: 2.0, d: 2.4 },
  { x: -3.3, z: -4.5, w: 0.6, d: 0.6 },
  { x: 4.5, z: -4, w: 1.7, d: 2.2 },
  { x: 3, z: -2.5, w: 1.4, d: 0.8 },
  { x: 4.5, z: -2.5, w: 1.2, d: 0.4 },
  { x: 4.5, z: 4.5, w: 1.5, d: 2.0 },
  { x: 3, z: 5, w: 1.0, d: 0.6 },
];

const PURCHASED_FURN_SIZES = {
  sofa: { w: 2.2, d: 0.9 }, bed: { w: 1.8, d: 2.2 }, table: { w: 1.2, d: 1.2 },
  plant: { w: 0.6, d: 0.6 }, tv: { w: 1.2, d: 0.3 }, desk: { w: 1.4, d: 0.8 },
  bookshelf: { w: 1.2, d: 0.4 }, toybox: { w: 1.0, d: 0.6 }, lamp: { w: 0.3, d: 0.3 },
};

function parseColor(hex) {
  if (!hex) return null;
  return parseInt(hex.replace('#', ''), 16);
}

function makeAvatar(defaultColor, config) {
  const g = new THREE.Group();
  const bodyColor = (config?.body_color && parseColor(config.body_color)) || defaultColor;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.45, 4, 8),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45 })
  );
  body.castShadow = true; body.position.y = 0.1;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf5d4b0, roughness: 0.5 })
  );
  head.castShadow = true; head.position.y = 0.62;
  g.add(head);

  const hat = config?.hat;
  if (hat === 'cap') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 })
    );
    cap.position.y = 0.66; cap.castShadow = true;
    g.add(cap);
  } else if (hat === 'crown') {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
    );
    crown.position.y = 0.84; crown.castShadow = true;
    g.add(crown);
  } else if (hat === 'hijab') {
    const hijab = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.7 })
    );
    hijab.position.y = 0.62; hijab.castShadow = true;
    g.add(hijab);
  }
  return { group: g, body, head };
}

function makeFurnitureMesh(type) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  switch (type) {
    case 'sofa':
      add(new THREE.BoxGeometry(1.5, 0.4, 0.7), new THREE.MeshStandardMaterial({ color: 0x2a7fff }), 0, 0.4, 0);
      add(new THREE.BoxGeometry(1.5, 0.5, 0.15), new THREE.MeshStandardMaterial({ color: 0x2a7fff }), 0, 0.75, 0.3);
      break;
    case 'bed':
      add(new THREE.BoxGeometry(1.5, 0.3, 2), new THREE.MeshStandardMaterial({ color: 0x997a55 }), 0, 0.3, 0);
      add(new THREE.BoxGeometry(1.4, 0.15, 1.9), new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }), 0, 0.55, 0);
      break;
    case 'table':
      add(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x997a55 }), 0, 0.35, 0);
      break;
    case 'plant':
      add(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x8b6f47 }), 0, 0.25, 0);
      add(new THREE.ConeGeometry(0.35, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x2d6a4f }), 0, 0.75, 0);
      break;
    case 'tv':
      add(new THREE.BoxGeometry(1, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 0.8, 0);
      break;
    case 'desk':
      add(new THREE.BoxGeometry(1, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x997a55 }), 0, 0.6, 0);
      add(new THREE.BoxGeometry(0.08, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x997a55 }), -0.4, 0.3, 0.2);
      add(new THREE.BoxGeometry(0.08, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x997a55 }), 0.4, 0.3, 0.2);
      break;
    case 'bookshelf':
      add(new THREE.BoxGeometry(0.8, 1, 0.3), new THREE.MeshStandardMaterial({ color: 0x6b4f3a }), 0, 0.5, 0);
      break;
    case 'toybox':
      add(new THREE.BoxGeometry(0.7, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xf59e0b }), 0, 0.3, 0);
      break;
    case 'lamp':
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x4a3f33 }), 0, 0.4, 0);
      add(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xfff59d, emissiveIntensity: 0.3 }), 0, 0.85, 0);
      break;
    case 'rug': {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x8c2d32 }));
      rug.rotation.x = -Math.PI / 2; rug.position.y = 0.02; rug.receiveShadow = true; g.add(rug);
      break;
    }
  }
  return g;
}

function checkCollision(x, z, colliders, r = 0.35) {
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}

export default function VirtualHouse3D({ onClose }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef({ active: false, t: 0 });
  const nearbyRef = useRef(null);
  const initRef = useRef(false);
  const { member, members } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nearby, setNearby] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 360;
    const H = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8b3e0);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const CAM_OFFSET = new THREE.Vector3(7, 9, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(6, 12, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -10; dir.shadow.camera.right = 10;
    dir.shadow.camera.top = 10; dir.shadow.camera.bottom = -10;
    scene.add(dir);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ color: 0x8f96b3, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);

    ROOMS.forEach((r) => {
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: r.color, transparent: true, opacity: 0.22, roughness: 0.8 }));
      rf.rotation.x = -Math.PI / 2; rf.position.set(r.pos[0], 0.01, r.pos[1]); rf.receiveShadow = true;
      scene.add(rf);
    });

    const wallH = 1.5;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const addWall = (w, h, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); };
    addWall(13, wallH, 0.15, 0, -6.5); addWall(13, wallH, 0.15, 0, 6.5);
    addWall(0.15, wallH, 13, -6.5, 0); addWall(0.15, wallH, 13, 6.5, 0);
    addWall(6, wallH, 0.1, -3.5, 0); addWall(6, wallH, 0.1, 3.5, 0);
    addWall(0.1, wallH, 6, 0, -3.5); addWall(0.1, wallH, 6, 0, 3.5);

    addFurniture(scene);

    // Build full collider list (walls + static furniture)
    const colliders = [...WALL_COLLIDERS];
    FURN_COLLIDERS.forEach((f) => {
      colliders.push({ minX: f.x - f.w / 2, maxX: f.x + f.w / 2, minZ: f.z - f.d / 2, maxZ: f.z + f.d / 2 });
    });

    const player = makeAvatar(0x5eead4, member?.avatar_config);
    player.group.position.set(-3.5, 0, 3.5);
    scene.add(player.group);
    camera.position.copy(player.group.position).add(CAM_OFFSET);
    camera.lookAt(player.group.position);

    stateRef.current = { scene, camera, renderer, player, npcs: {}, colliders, CAM_OFFSET };

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const j = joyRef.current;
      const speed = 4;
      const mx = 0.707 * (j.x + j.y);
      const mz = 0.707 * (j.y - j.x);
      const moving = Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01;
      const { colliders: cols, player: p } = stateRef.current;

      if (moving && cols) {
        const nx = Math.max(-5.8, Math.min(5.8, p.group.position.x + mx * speed * delta));
        const nz = Math.max(-5.8, Math.min(5.8, p.group.position.z + mz * speed * delta));
        // Try full move, then slide on X or Z only
        if (!checkCollision(nx, nz, cols)) {
          p.group.position.x = nx; p.group.position.z = nz;
        } else if (!checkCollision(nx, p.group.position.z, cols)) {
          p.group.position.x = nx;
        } else if (!checkCollision(p.group.position.x, nz, cols)) {
          p.group.position.z = nz;
        }
        p.group.rotation.y = Math.atan2(mx, mz);
        p.body.position.y = 0.1 + Math.abs(Math.sin(t * 8)) * 0.08;
      } else {
        p.body.position.y = 0.1;
      }

      // Jump animation
      if (jumpRef.current.active) {
        jumpRef.current.t += delta;
        const jy = Math.sin(Math.min(jumpRef.current.t / 0.5, 1) * Math.PI) * 0.8;
        p.group.position.y = jy;
        if (jumpRef.current.t >= 0.5) { jumpRef.current.active = false; p.group.position.y = 0; }
      }

      p.head.position.y = 0.62 + (moving ? Math.abs(Math.sin(t * 8)) * 0.08 : Math.sin(t * 2) * 0.04);

      Object.values(stateRef.current.npcs).forEach((npc) => {
        npc.head.position.y = 0.62 + Math.sin(t * 2 + npc.phase) * 0.04;
      });

      const camTarget = new THREE.Vector3().copy(p.group.position).add(CAM_OFFSET);
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(p.group.position.x, 0.5, p.group.position.z);

      // Nearby member detection
      let nearest = null;
      let nearestDist = Infinity;
      Object.values(stateRef.current.npcs).forEach((npc) => {
        const d = Math.hypot(p.group.position.x - npc.group.position.x, p.group.position.z - npc.group.position.z);
        if (d < 1.8 && d < nearestDist) { nearest = npc.member; nearestDist = d; }
      });
      if (nearest?.id !== nearbyRef.current?.id) { nearbyRef.current = nearest; setNearby(nearest); }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (w < 1 || h < 1) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!member || !stateRef.current.player || initRef.current) return;
    const color = ROLE_3D[member.family_role] || 0x5eead4;
    stateRef.current.player.body.material.color.setHex(color);
    const room = ROOMS.find((r) => r.name === member.current_location);
    if (room) stateRef.current.player.group.position.set(room.pos[0], 0, room.pos[1]);
    initRef.current = true;
  }, [member]);

  useEffect(() => {
    if (!ready || !member) return;
    const { scene, npcs } = stateRef.current;
    if (!scene) return;
    const others = members.filter((m) => m.is_active && m.id !== member.id);
    const byRoom = {};
    others.forEach((m) => { const loc = m.current_location || 'ruang_keluarga'; (byRoom[loc] = byRoom[loc] || []).push(m); });
    const seen = new Set();
    others.forEach((m) => {
      seen.add(m.id);
      const loc = m.current_location || 'ruang_keluarga';
      const group = byRoom[loc];
      const idx = group.indexOf(m);
      const room = ROOMS.find((r) => r.name === loc);
      const base = room ? room.pos : [-3.5, 3.5];
      const offset = group.length > 1 ? (idx - (group.length - 1) / 2) * 1.2 : 0;
      const x = base[0] + offset;
      const z = base[1];
      const color = ROLE_3D[m.family_role] || 0x888888;
      if (npcs[m.id]) {
        npcs[m.id].group.position.set(x, 0, z);
        npcs[m.id].body.material.color.setHex(color);
        npcs[m.id].member = m;
      } else {
        const av = makeAvatar(color, m.avatar_config);
        av.group.position.set(x, 0, z);
        scene.add(av.group);
        npcs[m.id] = { ...av, member: m, phase: Math.random() * Math.PI * 2 };
      }
    });
    Object.keys(npcs).forEach((id) => {
      if (!seen.has(id)) { scene.remove(npcs[id].group); npcs[id].body.geometry.dispose(); npcs[id].head.geometry.dispose(); delete npcs[id]; }
    });
  }, [members, member, ready]);

  // Load purchased furniture + add colliders
  useEffect(() => {
    if (!ready || !member) return;
    const { scene, colliders } = stateRef.current;
    if (!scene) return;
    const fg = new THREE.Group();
    scene.add(fg);
    let cancelled = false;
    base44.entities.Furniture.filter({ family_id: member.family_id }).then((items) => {
      if (cancelled) return;
      items.forEach((f) => {
        const mesh = makeFurnitureMesh(f.type);
        mesh.position.set(f.pos_x || 0, 0, f.pos_z || 0);
        fg.add(mesh);
        const sz = PURCHASED_FURN_SIZES[f.type];
        if (sz) {
          colliders.push({ minX: (f.pos_x || 0) - sz.w / 2, maxX: (f.pos_x || 0) + sz.w / 2, minZ: (f.pos_z || 0) - sz.d / 2, maxZ: (f.pos_z || 0) + sz.d / 2 });
        }
      });
    });
    return () => { cancelled = true; scene.remove(fg); };
  }, [ready, member]);

  const handleJoy = (x, y) => { joyRef.current = { x, y }; };

  const takeScreenshot = () => {
    const { renderer } = stateRef.current;
    if (!renderer) return;
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `rumah-keluarga-${Date.now()}.png`; a.click();
    toast({ title: 'Screenshot disimpan' });
  };

  const handleJump = () => {
    if (!jumpRef.current.active) jumpRef.current = { active: true, t: 0 };
  };

  const handlePickup = () => {
    if (nearby) {
      navigate(`/messages/${nearby.user_id}`);
    } else {
      toast({ title: 'Tidak ada yang bisa diambil', description: 'Dekati furnitur atau anggota keluarga' });
    }
  };

  const startChat = () => {
    if (nearby) navigate(`/messages/${nearby.user_id}`);
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#a8b3e0' }}>
      <div ref={mountRef} className="absolute inset-0" style={{ touchAction: 'none' }} />

      <button onClick={onClose} className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-lg z-20 active:scale-95 transition-transform">
        <LogOut className="h-4 w-4 text-gray-700" />
        <span className="text-sm font-bold text-gray-800">Keluar</span>
      </button>

      {nearby && (
        <button onClick={startChat} className="absolute top-4 right-4 flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg z-20 active:scale-95 transition-transform">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-bold">Chat {nearby.full_name}</span>
        </button>
      )}

      <Joystick onMove={handleJoy} />

      {/* A button (jump) */}
      <button
        onPointerDown={(e) => { e.preventDefault(); handleJump(); }}
        className="absolute bottom-32 right-8 w-16 h-16 rounded-full bg-primary/80 backdrop-blur border-2 border-white/50 flex items-center justify-center shadow-lg z-20 active:scale-90 transition-transform touch-none select-none"
      >
        <span className="text-xl font-extrabold text-white">A</span>
      </button>

      {/* B button (pickup) */}
      <button
        onPointerDown={(e) => { e.preventDefault(); handlePickup(); }}
        className="absolute bottom-8 right-8 w-14 h-14 rounded-full bg-accent/80 backdrop-blur border-2 border-white/50 flex items-center justify-center shadow-lg z-20 active:scale-90 transition-transform touch-none select-none"
      >
        <span className="text-lg font-extrabold text-white">B</span>
      </button>

      <button onClick={takeScreenshot} className="absolute top-20 right-4 w-11 h-11 rounded-full bg-white/30 backdrop-blur border-2 border-white/40 flex items-center justify-center shadow-lg z-20 active:scale-95 transition-transform">
        <Camera className="h-5 w-5 text-white" />
      </button>

      <div className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-black/25 text-white text-xs font-medium px-3 py-1.5 rounded-full z-10 pointer-events-none">
        {nearby ? `🟢 ${nearby.full_name} di dekat Anda — tekan Chat` : 'Joystick: jalan · A: lompat · B: ambil'}
      </div>
    </div>
  );
}

function addFurniture(scene) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x997a55, roughness: 0.8 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2a7fff, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.8 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8c2d32, roughness: 0.9 });

  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); };

  add(new THREE.BoxGeometry(2.2, 0.4, 0.9), blue, -4.5, 0.4, 5);
  add(new THREE.BoxGeometry(2.2, 0.7, 0.2), blue, -4.5, 0.85, 5.4);
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), wood, -3, 0.35, 3.5);
  add(new THREE.BoxGeometry(1.2, 0.6, 0.3), dark, -2.5, 0.4, 2.5);
  add(new THREE.BoxGeometry(1, 0.6, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }), -2.5, 1.1, 2.5);
  add(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8b6f47 }), -5, 0.3, 2.5);
  add(new THREE.ConeGeometry(0.4, 0.8, 8), green, -5, 0.9, 2.5);

  add(new THREE.BoxGeometry(1.8, 0.3, 2.2), wood, -4.5, 0.3, -3.5);
  add(new THREE.BoxGeometry(1.7, 0.15, 2.1), white, -4.5, 0.55, -3.5);
  add(new THREE.BoxGeometry(1.5, 0.1, 0.4), white, -4.5, 0.7, -4.3);
  add(new THREE.BoxGeometry(0.5, 0.4, 0.5), wood, -3.3, 0.3, -4.5);

  add(new THREE.BoxGeometry(1.5, 0.3, 2), wood, 4.5, 0.3, -4);
  add(new THREE.BoxGeometry(1.4, 0.15, 1.9), white, 4.5, 0.55, -4);
  add(new THREE.BoxGeometry(1.2, 0.05, 0.6), wood, 3, 0.6, -2.5);
  add(new THREE.BoxGeometry(0.08, 0.6, 0.08), wood, 2.5, 0.3, -2.7);
  add(new THREE.BoxGeometry(0.08, 0.6, 0.08), wood, 3.5, 0.3, -2.7);
  add(new THREE.BoxGeometry(1, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x6b4f3a }), 4.5, 0.6, -2.5);

  add(new THREE.BoxGeometry(1.3, 0.3, 1.8), wood, 4.5, 0.3, 4.5);
  add(new THREE.BoxGeometry(1.2, 0.15, 1.7), pink, 4.5, 0.55, 4.5);
  add(new THREE.BoxGeometry(0.8, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xf59e0b }), 3, 0.3, 5);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), red);
  rug.rotation.x = -Math.PI / 2; rug.position.set(3, 0.02, 3.5); rug.receiveShadow = true; scene.add(rug);
}