"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type SceneRefs = {
  animationId: number | null
  camera: THREE.OrthographicCamera | null
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial> | null
  renderer: THREE.WebGLRenderer | null
  scene: THREE.Scene | null
  uniforms: {
    distortion: { value: number }
    resolution: { value: [number, number] }
    time: { value: number }
    xScale: { value: number }
    yScale: { value: number }
  } | null
}

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneRefs>({
    animationId: null,
    camera: null,
    mesh: null,
    renderer: null,
    scene: null,
    uniforms: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return undefined

    const canvas = canvasRef.current
    const refs = sceneRef.current
    let lastFrameTime = 0

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float d = length(p) * distortion;

        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      const width = window.innerWidth
      const height = window.innerHeight
      refs.renderer.setSize(width, height, false)
      refs.uniforms.resolution.value = [width, height]
    }

    refs.scene = new THREE.Scene()
    refs.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      canvas,
      powerPreference: "high-performance",
    })
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
    refs.renderer.setClearColor(new THREE.Color(0x000000), 0)

    refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    refs.uniforms = {
      resolution: { value: [window.innerWidth, window.innerHeight] },
      time: { value: 0 },
      xScale: { value: 1 },
      yScale: { value: 0.5 },
      distortion: { value: 0.05 },
    }

    const position = [
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0,
      -1.0, 1.0, 0.0,
      1.0, -1.0, 0.0,
      -1.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
    ]

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(position), 3))

    const material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: refs.uniforms,
      side: THREE.DoubleSide,
      transparent: true,
    })

    refs.mesh = new THREE.Mesh(geometry, material)
    refs.scene.add(refs.mesh)

    handleResize()

    const animate = (time: number) => {
      if (time - lastFrameTime < 32) {
        refs.animationId = window.requestAnimationFrame(animate)
        return
      }

      lastFrameTime = time

      if (refs.uniforms) refs.uniforms.time.value += 0.01
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }
      refs.animationId = window.requestAnimationFrame(animate)
    }

    animate()
    window.addEventListener("resize", handleResize)

    return () => {
      if (refs.animationId) window.cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", handleResize)

      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        refs.mesh.material.dispose()
      }

      refs.renderer?.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  )
}
