import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  WebGLRenderer,
} from 'three'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls'

const steps = 5

const box_size = 100
const precision = 100
const region = {
  x: [-5, 5],
  y: [-5, 5],
  z: [-5, 5],
}

const make_box_lines = function (h, color) {
  const geometry = new BoxGeometry(h, h, h)
  geometry.setIndex([
    0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 5, 1, 4, 3, 6, 2, 7,
  ])

  const material = new LineBasicMaterial({
    color,
    linewidth: 2,
  })

  return new LineSegments(geometry, material)
}

const make_axis_lines = function (h, color) {
  h *= 0.75
  const vertices = [
    [-h, 0, 0],
    [h, 0, 0],
    [0, -h, 0],
    [0, h, 0],
    [0, 0, -h],
    [0, 0, h],
  ].flat()
  const geometry = new BufferGeometry()
  geometry.setIndex([0, 1, 2, 3, 4, 5])
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))

  const material = new LineBasicMaterial({
    color,
    linewidth: 2,
  })

  return new LineSegments(geometry, material)
}

const make_plot = function (color) {
  const geometry = new PlaneGeometry(
    box_size,
    box_size,
    precision - 1,
    precision - 1
  )

  const phmaterial = new MeshPhongMaterial({
    color,
    // wireframe: true
    side: DoubleSide,
    specular: color,
    shininess: 10,
  })

  const mesh = new Mesh(geometry, phmaterial)
  return mesh
}

class GraphIt {
  constructor() {
    this.animate = this.animate.bind(this)
    this.step = this.step.bind(this)
    this.apply_fun = this.apply_fun.bind(this)
    this.input = this.input.bind(this)
    this.camera = new PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1,
      box_size * 100
    )
    this.camera.position.y = -2.5 * box_size
    this.camera.position.z = 1.5 * box_size

    this.scene = new Scene()
    this.scene.add(this.camera)

    this.line = make_box_lines(box_size, 0x5e3fbe)
    this.scene.add(this.line)

    this.axis = make_axis_lines(box_size, 0x5e3fbe)
    this.scene.add(this.axis)

    this.plot = make_plot(0xff5995)
    this.scene.add(this.plot)

    this.hemi_light = new HemisphereLight(0xffffff, 0xffffff, 0.6)
    this.hemi_light.color.setHSL(0.6, 1, 0.6)
    this.hemi_light.groundColor.setHSL(0.095, 1, 0.75)
    this.hemi_light.position.set(0, 0, -500)
    this.scene.add(this.hemi_light)

    this.point_light = new PointLight(0xffffff, 0.5, 1000)
    this.camera.add(this.point_light)

    this.renderer = new WebGLRenderer({
      antialias: true,
      canvas: document.getElementById('gl'),
    })
    this.renderer.setClearColor(0x1b1d1e)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.controls = new TrackballControls(this.camera, this.renderer.domElement)
    this.controls.rotateSpeed = 10
    this.controls.addEventListener('change', () =>
      this.renderer.render(this.scene, this.camera)
    )
    this.first = true
    this.time_parametric = false
    this.targets = new Array(precision * precision).fill(0)
    this.increments = new Array(precision * precision).fill(0)
  }

  refresh() {
    this.plot.geometry.computeVertexNormals()
    this.plot.geometry.attributes.position.needsUpdate = true
    return this.renderer.render(this.scene, this.camera)
  }

  animate() {
    requestAnimationFrame(this.animate)
    if (this.dirty) {
      this.step()
    }
    if (this.time_parametric) {
      this.apply_fun(false)
    }
    if (this.dirty || this.time_parametric) {
      this.refresh()
    }
    return this.controls.update()
  }

  step() {
    this.dirty = false
    if (!steps) {
      return
    }
    const verts = this.plot.geometry.attributes.position.array
    for (let i = 0; i < precision * precision; i++) {
      const target = this.targets[i]
      const increment = this.increments[i]
      if (target == null) {
        continue
      }

      if (Math.abs(target - verts[i * 3 + 2]) > Math.abs(increment)) {
        verts[i * 3 + 2] += increment
        this.dirty = true
      } else {
        verts[i * 3 + 2] = target
      }
    }
  }

  apply_fun(animate = true) {
    const result = []
    const verts = this.plot.geometry.attributes.position.array
    for (let i = 0; i < precision * precision; i++) {
      const x = (verts[i * 3] * (region.x[1] - region.x[0])) / box_size
      const y = (verts[i * 3 + 1] * (region.y[1] - region.y[0])) / box_size
      const z = this.fun(x, y, (new Date().getTime() - this.base_time) / 1000)

      if (animate && steps) {
        this.targets[i] = (z * box_size) / (region.z[1] - region.z[0])
        this.increments[i] = (this.targets[i] - verts[i * 3 + 2]) / steps
      } else {
        verts[i * 3 + 2] = (z * box_size) / (region.z[1] - region.z[0])
      }
    }
    return result
  }

  input(value, fake) {
    let fun, rv
    if (value === '') {
      return
    }
    try {
      fun = new Function('x', 'y', 't', 'return ' + value)
      // Test random values
      const x = Math.random()
      const y = Math.random()
      const t1 = Math.random()
      const t2 = Math.random()
      rv = fun(x, y, t1)
      if (isNaN(rv)) {
        return
      }
      // Hack to see if it changes along time
      this.time_parametric = rv !== fun(x, y, t2)
    } catch (error) {
      return
    }
    if (typeof rv === 'number' && fun !== this.fun) {
      if (!fake) {
        history.pushState(null, null, '#' + btoa(value))
      }
      this.base_time = new Date().getTime()
      this.fun = fun
      this.dirty = true
      if (this.first || this.time_parametric) {
        this.apply_fun(false)
        this.refresh()
      } else {
        this.apply_fun(true)
      }

      return (this.first = false)
    }
  }
}

for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  window[key.toLowerCase()] = window[key] = Math[key]
}

window.addEventListener('DOMContentLoaded', () => {
  const git = new GraphIt()
  git.animate()

  const fun = atob(location.hash.slice(1)) || 'cos(x) * sin(y)'
  const input = document.getElementById('input')
  input.addEventListener('input', e => {
    git.input(e.target.value)
  })
  input.value = fun
  input.focus()
  git.input(fun, true)
  window.addEventListener('resize', () => {
    git.camera.aspect = window.innerWidth / window.innerHeight
    git.renderer.setSize(window.innerWidth, window.innerHeight)
    git.camera.updateProjectionMatrix()
    git.controls.handleResize()
    git.renderer.render(git.scene, git.camera)
  })

  window.addEventListener('popstate', () => {
    if (location.hash && atob(location.hash.slice(1)) !== input.value) {
      input.value = atob(location.hash.slice(1))
      git.input(input.value, true)
    }
  })
})
