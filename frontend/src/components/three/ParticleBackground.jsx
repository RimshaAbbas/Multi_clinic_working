import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * ParticleBackground
 * A performant, subtle animated particle-network backdrop built with vanilla Three.js.
 * Renders onto a fixed canvas behind all page content (z-index: 0).
 *
 * Design:
 *  - ~120 floating particles in navy/blue palette
 *  - Connecting lines drawn between nearby particles (< LINK_DISTANCE apart)
 *  - Gentle drift motion with boundary wrapping
 *  - Responds to window resize
 *  - Uses a single RAF loop; cleans up properly on unmount
 */

const PARTICLE_COUNT  = 120
const LINK_DISTANCE   = 130       // px equivalent in world units
const PARTICLE_SPEED  = 0.18
const COLORS = [0x3B82F6, 0x1E3A8A, 0x60A5FA, 0x93C5FD]

export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000)
    camera.position.z = 600

    // ── Helpers ───────────────────────────────────────────────────────────────
    let W = window.innerWidth
    let H = window.innerHeight
    const halfW = () => W * 0.65
    const halfH = () => H * 0.65

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      renderer.setSize(W, H, false)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    resize()

    // ── Particles ─────────────────────────────────────────────────────────────
    const positions = []  // { x, y, z, vx, vy, vz }
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions.push({
        x:  (Math.random() - 0.5) * halfW() * 2,
        y:  (Math.random() - 0.5) * halfH() * 2,
        z:  (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED,
        vz: (Math.random() - 0.5) * PARTICLE_SPEED * 0.3,
      })
    }

    // Dot geometry
    const dotGeo = new THREE.BufferGeometry()
    const dotPositions = new Float32Array(PARTICLE_COUNT * 3)
    const dotColors    = new Float32Array(PARTICLE_COUNT * 3)
    positions.forEach((p, i) => {
      dotPositions[i * 3]     = p.x
      dotPositions[i * 3 + 1] = p.y
      dotPositions[i * 3 + 2] = p.z
      const c = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)])
      dotColors[i * 3]     = c.r
      dotColors[i * 3 + 1] = c.g
      dotColors[i * 3 + 2] = c.b
    })
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3))
    dotGeo.setAttribute('color',    new THREE.BufferAttribute(dotColors,    3))

    const dotMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    })
    const dots = new THREE.Points(dotGeo, dotMat)
    scene.add(dots)

    // Line geometry (max PARTICLE_COUNT*PARTICLE_COUNT/2 segments)
    const MAX_LINES     = PARTICLE_COUNT * 20
    const linePositions = new Float32Array(MAX_LINES * 6)   // 2 verts × 3 floats
    const lineColors    = new Float32Array(MAX_LINES * 6)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeo.setAttribute('color',    new THREE.BufferAttribute(lineColors,    3))
    const lineMat = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.18,
      })
    )
    scene.add(lineMat)

    // ── Animation Loop ────────────────────────────────────────────────────────
    let rafId
    let lineCount = 0

    function animate() {
      rafId = requestAnimationFrame(animate)

      const hW = halfW()
      const hH = halfH()

      // Move particles & wrap around bounds
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = positions[i]
        p.x += p.vx
        p.y += p.vy
        p.z += p.vz
        if (p.x >  hW) p.x = -hW
        if (p.x < -hW) p.x =  hW
        if (p.y >  hH) p.y = -hH
        if (p.y < -hH) p.y =  hH
        if (p.z >  100) p.z = -100
        if (p.z < -100) p.z =  100

        dotPositions[i * 3]     = p.x
        dotPositions[i * 3 + 1] = p.y
        dotPositions[i * 3 + 2] = p.z
      }
      dotGeo.attributes.position.needsUpdate = true

      // Build connecting lines
      lineCount = 0
      for (let i = 0; i < PARTICLE_COUNT && lineCount < MAX_LINES; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineCount < MAX_LINES; j++) {
          const a = positions[i]
          const b = positions[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dz = a.z - b.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < LINK_DISTANCE) {
            const alpha = 1 - dist / LINK_DISTANCE
            const base  = lineCount * 6
            linePositions[base]     = a.x
            linePositions[base + 1] = a.y
            linePositions[base + 2] = a.z
            linePositions[base + 3] = b.x
            linePositions[base + 4] = b.y
            linePositions[base + 5] = b.z
            // tint: blend of navy and blue
            const r = 0.12 + alpha * 0.11
            const g = 0.31 + alpha * 0.20
            const bv = 0.96
            lineColors[base] = lineColors[base + 3] = r
            lineColors[base + 1] = lineColors[base + 4] = g
            lineColors[base + 2] = lineColors[base + 5] = bv
            lineCount++
          }
        }
      }
      lineGeo.setDrawRange(0, lineCount * 2)
      lineGeo.attributes.position.needsUpdate = true
      lineGeo.attributes.color.needsUpdate    = true

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize handler ────────────────────────────────────────────────────────
    window.addEventListener('resize', resize)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      dotGeo.dispose()
      dotMat.dispose()
      lineGeo.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="three-canvas-bg"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.65,
      }}
    />
  )
}
