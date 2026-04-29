import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ScrollControls, Scroll, useScroll,
  Environment, MeshReflectorMaterial, Grid, useProgress,
  Float, RoundedBox, useVideoTexture, ContactShadows
} from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import BMWE36 from './components/BMWE36';

import bgMusic from './assets/fundo.mp3';
import edit1Video from './assets/edit1.mp4';
import edit2Video from './assets/edit2.mp4';

/* ================================================================
   LOADING SCREEN
   ================================================================ */
function LoadingScreen({ started, setStarted, audioRef }) {
  const { progress } = useProgress();

  // Auto-start as soon as assets are ready (small delay for polish)
  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => {
        setStarted(true);
        if (audioRef.current) {
          audioRef.current.volume = 0.5;
          audioRef.current.play().catch(e => console.log('Audio play failed', e));
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [progress, setStarted, audioRef]);

  return (
    <div className={`loading-screen ${started ? 'started' : ''}`}>
      <div className="loading-content">
        <h1>BMW E36</h1>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        {progress === 100 && <p style={{ opacity: 0.5, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading complete…</p>}
      </div>
    </div>
  );
}

/* ================================================================
   PHONE 3D MOCKUP — Interactive drag + hover impulse
   ================================================================ */
function Phone3DModel({ src, audioRef, inView, interactionRef }) {
  const groupRef = useRef();
  const texture = useVideoTexture(src, { muted: true, loop: true, start: true });

  // Rotation state: current, target and inertia velocity
  const rotState = useRef({
    rotX: 0, rotY: 0,
    velX: 0, velY: 0,
    floatY: 0, floatPhase: 0,
  });

  useEffect(() => {
    if (inView) {
      if (audioRef.current) audioRef.current.pause();
      if (texture?.image) { texture.image.muted = false; texture.image.volume = 0.8; }
    } else {
      if (audioRef.current) audioRef.current.play().catch(() => {});
      if (texture?.image) { texture.image.muted = true; }
    }
  }, [inView, texture, audioRef]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const r = rotState.current;
    const ia = interactionRef.current;

    // Gentle float
    r.floatPhase += delta * 1.2;
    const floatTarget = Math.sin(r.floatPhase) * 0.12;

    if (ia.dragging) {
      // Direct drag — apply drag delta as velocity
      r.velX = ia.dragDeltaY * 0.018;
      r.velY = ia.dragDeltaX * 0.018;
      ia.dragDeltaX = 0;
      ia.dragDeltaY = 0;
    } else if (ia.hovering) {
      // Hover impulse: nudge velocity in mouse movement direction
      r.velX += ia.hoverDY * 0.004;
      r.velY += ia.hoverDX * 0.004;
      ia.hoverDX *= 0.85;
      ia.hoverDY *= 0.85;
    }

    // Inertia damping
    const damping = ia.dragging ? 0.9 : 0.93;
    r.velX *= damping;
    r.velY *= damping;
    r.rotX += r.velX;
    r.rotY += r.velY;

    // Spring back to 0 when idle (not hovering, not dragging, low velocity)
    if (!ia.dragging && !ia.hovering) {
      const stiffness = 0.06; // spring strength toward origin
      r.rotX += (0 - r.rotX) * stiffness;
      r.rotY += (0 - r.rotY) * stiffness;
    }

    // Lerp actual mesh rotation
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, r.rotX, 0.18);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, r.rotY, 0.18);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, floatTarget, 0.05);
  });

  return (
    <group ref={groupRef}>
      {/* Phone Body */}
      <RoundedBox args={[1.5, 3.1, 0.15]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </RoundedBox>

      {/* Screen */}
      <mesh position={[0, 0, 0.081]}>
        <planeGeometry args={[1.35, 2.9]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {/* Screen glass reflection layer */}
      <mesh position={[0, 0, 0.083]}>
        <planeGeometry args={[1.35, 2.9]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} transparent opacity={0.04} />
      </mesh>

      {/* Top Notch */}
      <mesh position={[0, 1.35, 0.085]}>
        <planeGeometry args={[0.4, 0.12]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Camera dot */}
      <mesh position={[0.12, 1.35, 0.086]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#111" />
      </mesh>

      {/* Volume buttons */}
      <mesh position={[-0.76, 0.6, 0]}>
        <boxGeometry args={[0.05, 0.25, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.76, 0.25, 0]}>
        <boxGeometry args={[0.05, 0.25, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Power button */}
      <mesh position={[0.76, 0.4, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.06]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Home indicator bar */}
      <mesh position={[0, -1.38, 0.085]}>
        <planeGeometry args={[0.35, 0.04]} />
        <meshBasicMaterial color="#444" />
      </mesh>
    </group>
  );
}

function PhoneVideo({ src, side = "left", audioRef }) {
  const [inView, setInView] = useState(false);

  // Shared interaction state passed to 3D model via ref
  const interactionRef = useRef({
    hovering: false,
    dragging: false,
    dragDeltaX: 0,
    dragDeltaY: 0,
    hoverDX: 0,
    hoverDY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  const handleMouseMove = (e) => {
    const ia = interactionRef.current;
    const dx = e.clientX - ia.lastMouseX;
    const dy = e.clientY - ia.lastMouseY;
    ia.lastMouseX = e.clientX;
    ia.lastMouseY = e.clientY;
    if (ia.dragging) {
      ia.dragDeltaX += dx;
      ia.dragDeltaY += dy;
    } else {
      ia.hoverDX = dx;
      ia.hoverDY = dy;
    }
  };

  const handleMouseEnter = (e) => {
    interactionRef.current.hovering = true;
    interactionRef.current.lastMouseX = e.clientX;
    interactionRef.current.lastMouseY = e.clientY;
  };

  const handleMouseLeave = () => {
    interactionRef.current.hovering = false;
    interactionRef.current.dragging = false;
  };

  const handleMouseDown = (e) => {
    interactionRef.current.dragging = true;
    interactionRef.current.lastMouseX = e.clientX;
    interactionRef.current.lastMouseY = e.clientY;
  };

  const handleMouseUp = () => {
    interactionRef.current.dragging = false;
  };

  return (
    <motion.div
      className={`phone-canvas-container ${side}`}
      initial={{ opacity: 0, y: 150 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
      viewport={{ once: false, amount: 0.5 }}
      onViewportEnter={() => setInView(true)}
      onViewportLeave={() => setInView(false)}
      style={{ cursor: interactionRef.current.dragging ? 'grabbing' : 'grab' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]} transparent>
        <ambientLight intensity={1.2} />
        <spotLight position={[5, 8, 5]} angle={0.4} penumbra={1} intensity={3} color="#ffffff" />
        <spotLight position={[-5, 5, -5]} angle={0.4} penumbra={1} intensity={1.5} color="#0066b1" />
        <Environment preset="city" />
        <Phone3DModel src={src} audioRef={audioRef} inView={inView} interactionRef={interactionRef} />
        <ContactShadows position={[0, -2.2, 0]} opacity={0.5} blur={2.5} scale={8} />
      </Canvas>
    </motion.div>
  );
}

/* ================================================================
   O CARRO — Fica no centro correndo em alta velocidade
   Adicionamos vibração da suspensão e balanço suave para
   vender a ilusão de velocidade.
   ================================================================ */
function DrivingCar() {
  const carRef = useRef();

  useFrame((state) => {
    if (!carRef.current) return;
    const time = state.clock.getElapsedTime();

    // Vibração de alta velocidade (bump do motor/pista)
    const bounceY = -0.3 + Math.sin(time * 40) * 0.003 + Math.sin(time * 15) * 0.008;
    
    // Leve movimentação na direção para simular correção de volante
    const swayX = Math.sin(time * 1.5) * 0.08;
    
    // Leve inclinação (roll) do carro
    const rollZ = Math.sin(time * 1.5) * 0.015;

    carRef.current.position.y = THREE.MathUtils.lerp(carRef.current.position.y, bounceY, 0.5);
    carRef.current.position.x = THREE.MathUtils.lerp(carRef.current.position.x, swayX, 0.1);
    carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, rollZ, 0.1);
  });

  return (
    // Rotacionamos em 180 (Math.PI) caso o modelo esteja de costas pro eixo Z
    <group ref={carRef} position={[0, -0.3, 0]} rotation={[0, Math.PI, 0]}>
      <BMWE36 scale={0.2} />
    </group>
  );
}

/* ================================================================
   PISTA EM MOVIMENTO — Cria o efeito de túnel de vento/velocidade
   ================================================================ */
function MovingRoad() {
  const roadRef = useRef();
  const speed = 60; // Velocidade da pista

  useFrame((state, delta) => {
    if (!roadRef.current) return;
    // Move os elementos da pista no eixo Z para simular velocidade
    roadRef.current.position.z += speed * delta;
    
    // Efeito de loop infinito (reseta a posição suavemente)
    if (roadRef.current.position.z > 20) {
      roadRef.current.position.z -= 20;
    }
  });

  return (
    <group>
      <group ref={roadRef}>
        {/* Marcações centrais da pista (Stripes) */}
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh key={i} position={[0, -0.54, -60 + i * 8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
          </mesh>
        ))}
        {/* Linhas laterais (Bordas) */}
        <mesh position={[-3, -0.54, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 120]} />
          <meshBasicMaterial color="#0066b1" transparent opacity={0.6} />
        </mesh>
        <mesh position={[3, -0.54, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 120]} />
          <meshBasicMaterial color="#0066b1" transparent opacity={0.6} />
        </mesh>
        
        {/* Pilares laterais passando voando */}
        {Array.from({ length: 10 }).map((_, i) => (
          <group key={`pillar-${i}`} position={[0, 0, -60 + i * 15]}>
            <mesh position={[-4, 1.5, 0]}>
              <boxGeometry args={[0.2, 4, 0.2]} />
              <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            <mesh position={[4, 1.5, 0]}>
              <boxGeometry args={[0.2, 4, 0.2]} />
              <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Grid High-Tech fixo (Drei) para dar sensação de profundidade */}
      <Grid 
        position={[0, -0.545, 0]} 
        args={[100, 100]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#111" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#333" 
        fadeDistance={40} 
        fadeStrength={1} 
      />

      {/* Chão reflexivo (Fixo na tela, reflete o carro) */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[400, 80]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050505"
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

/* ================================================================
   CÂMERA DRONE — Coreografia com base no scroll
   ================================================================ */
function DroneCameraRig() {
  const scroll = useScroll();

  useFrame((state) => {
    const t = scroll.offset; // 0 → 1

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3(0, 0, 0);

    // Timeline dos ângulos da câmera do Drone
    if (t < 0.2) {
      // 1. Início: Drone baixo, frente ao carro
      const localT = t / 0.2;
      targetCamPos.set(
        Math.sin(localT * Math.PI) * 2, 
        0.5 + localT * 0.5, 
        -5 - localT * 2
      );
    } else if (t < 0.4) {
      // 2. Lateral em tracking shot (Acompanhando porta a porta)
      const localT = (t - 0.2) / 0.2;
      targetCamPos.set(
        3.5 + Math.sin(localT * Math.PI) * 1.5, 
        0.8, 
        -7 + localT * 12 // Drone voa da frente pra trás
      );
    } else if (t < 0.6) {
      // 3. Drone Top-Down (Vista de cima épica)
      const localT = (t - 0.4) / 0.2;
      targetCamPos.set(
        3.5 - localT * 7, // Cruzando por cima
        5 + Math.sin(localT * Math.PI) * 2, 
        0
      );
      targetLookAt.set(0, 0, -1);
    } else if (t < 0.8) {
      // 4. Perseguição baixa (Chase cam por trás)
      const localT = (t - 0.6) / 0.2;
      targetCamPos.set(
        -3.5 + localT * 5, 
        0.6 + Math.sin(localT * Math.PI) * 0.5, 
        5 + localT * 2
      );
    } else {
      // 5. Epic orbit final de trás pra frente
      const localT = (t - 0.8) / 0.2;
      targetCamPos.set(
        1.5 + Math.cos((localT - 0.5) * Math.PI) * 3.5, 
        1.2 + localT * 0.5, 
        7 - localT * 13
      );
    }

    // Interpolação suave para a câmera
    state.camera.position.lerp(targetCamPos, 0.05);

    // Sistema suave para o lookAt (onde o drone está mirando)
    if (!state.camera.userData.lookTarget) {
      state.camera.userData.lookTarget = new THREE.Vector3(0, 0, 0);
    }
    state.camera.userData.lookTarget.lerp(targetLookAt, 0.08);
    state.camera.lookAt(state.camera.userData.lookTarget);
  });

  return null;
}

/* ================================================================
   APP
   ================================================================ */
export default function App() {
  const [started, setStarted] = useState(false);
  const audioRef = useRef(null);

  return (
    <>
      <audio ref={audioRef} src={bgMusic} loop />
      <LoadingScreen started={started} setStarted={setStarted} audioRef={audioRef} />

      <Canvas camera={{ position: [0, 0.5, -5], fov: 45 }} dpr={[1, 2]} shadows gl={{ antialias: true }}>
        <color attach="background" args={['#030303']} />
        <fog attach="fog" args={['#030303', 10, 50]} />

        {/* Iluminação */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={3} color="#ffffff" castShadow />
        <spotLight position={[-8, 8, -5]} angle={0.4} penumbra={1} intensity={2} color="#0066b1" />
        <spotLight position={[5, 5, -8]} angle={0.3} penumbra={1} intensity={1} color="#00a3e0" />
        <Environment preset="night" />

        <ScrollControls pages={6} damping={0.12}>
          <Suspense fallback={null}>
            <MovingRoad />
            <DrivingCar />
            <DroneCameraRig />
          </Suspense>

          <Scroll html style={{ width: '100%', height: '100%' }}>
            <div className="section">
              <div className="section-subtitle">The Ultimate Driving Machine</div>
              <h1 className="hero-title">
                BMW<br /><span className="gradient-text">E36 M3</span>
              </h1>
              <p className="section-body">
                Uma lenda nascida nas pistas. Potência bruta, equilíbrio perfeito e design que desafia o tempo.
              </p>
              <div className="scroll-indicator">
                <span>Scroll</span>
                <div className="scroll-line"></div>
              </div>
            </div>

            <div className="section section-right">
              <PhoneVideo src={edit1Video} side="left" audioRef={audioRef} />
              
              <div className="section-divider"></div>
              <div className="section-subtitle">Estética Alemã</div>
              <h2 className="section-title">
                Design<br /><span className="gradient-text">Atemporal</span>
              </h2>
              <p className="section-body">
                Faróis redondos. Kidney grills icônicas. Cada detalhe esculpido no túnel de vento de Munique.
              </p>
            </div>

            <div className="section">
              <div className="section-divider"></div>
              <div className="section-subtitle">S50B32 — 3.2L Inline-6</div>
              <h2 className="section-title">
                Potência<br /><span className="gradient-text">Pura</span>
              </h2>
              <div className="spec-grid">
                <div className="spec-item">
                  <div className="spec-value">321</div>
                  <div className="spec-label">Cavalos</div>
                </div>
                <div className="spec-item">
                  <div className="spec-value">5.5<small>s</small></div>
                  <div className="spec-label">0–100 km/h</div>
                </div>
                <div className="spec-item">
                  <div className="spec-value">250</div>
                  <div className="spec-label">km/h</div>
                </div>
              </div>
            </div>

            <div className="section section-right">
              <PhoneVideo src={edit2Video} side="left" audioRef={audioRef} />
              
              <div className="section-divider"></div>
              <div className="section-subtitle">Engenharia de Pista</div>
              <h2 className="section-title">
                Chassi<br /><span className="gradient-text">Perfeito</span>
              </h2>
              <p className="section-body">
                Distribuição 50:50. Suspensão multilink. Diferencial autoblocante. Feito para Nürburgring.
              </p>
            </div>

            <div className="section">
              <div className="section-divider"></div>
              <div className="section-subtitle">Mais que um Carro</div>
              <h2 className="section-title">
                Cultura<br /><span className="gradient-text">Global</span>
              </h2>
              <p className="section-body">
                Drift, track days, stance. O E36 M3 transcendeu gerações e é ícone do car culture mundial.
              </p>
            </div>

            <div className="section section-center">
              <h1 className="hero-title">
                Drive<br />The <span className="gradient-text">Legacy</span>
              </h1>
              <p className="section-body">
                Alguns carros são esquecidos. Outros se tornam eternos.
              </p>
            </div>

          </Scroll>
        </ScrollControls>

        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} intensity={0.4} />
          <Noise opacity={0.015} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </>
  );
}
