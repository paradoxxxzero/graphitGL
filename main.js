import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const steps = 10

const precision = 100
const region = {
  x: [-5, 5],
  y: [-5, 5],
  z: [-2.5, 2.5],
}

const lerp = function (a, b, t) {
  return a + (b - a) * t
}

const inverseLerp = function (a, b, v) {
  return (v - a) / (b - a)
}

const make_box_lines = function (color) {
  const geometry = new BoxGeometry()
  geometry.setIndex([
    0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 5, 1, 4, 3, 6, 2, 7,
  ])

  const material = new LineBasicMaterial({
    color,
    linewidth: 2,
  })

  return new LineSegments(geometry, material)
}

const make_axis_lines = function (color) {
  const h = 0.5
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
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  const mesh = new LineSegments(geometry, material)
  mesh.renderOrder = 1000
  return mesh
}

const make_plot = function (color) {
  const geometry = new PlaneGeometry(1, 1, precision - 1, precision - 1)

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
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    )
    this.camera.up.set(0, 0, 1)
    this.camera.lookAt(0, 0, 0)
    this.camera.zoom = Math.min(1, window.innerWidth / window.innerHeight)
    this.camera.position.y = -1.5
    this.camera.position.z = 1.5

    this.scene = new Scene()
    this.scene.add(this.camera)

    this.box = make_box_lines(0x5e3fbe)
    this.scene.add(this.box)

    this.axis = make_axis_lines(0x5e3fbe)
    this.scene.add(this.axis)

    this.plot = make_plot(0xff5995)
    this.scene.add(this.plot)

    this.hemi_light = new HemisphereLight(
      new Color().setHSL(0.6, 1, 0.4),
      new Color().setHSL(0.1, 1, 0.75),
      0.6
    )
    this.hemi_light.position.set(0, 0, -500)
    this.scene.add(this.hemi_light)

    this.point_light = new PointLight(0xffffff, 0.5)
    this.camera.add(this.point_light)

    this.renderer = new WebGLRenderer({
      antialias: true,
      canvas: document.getElementById('gl'),
    })
    this.renderer.setClearColor(0x1b1d1e)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
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
      const x = lerp(region.x[0], region.x[1], 0.5 + verts[i * 3])
      const y = lerp(region.y[0], region.y[1], 0.5 + verts[i * 3 + 1])
      const z = this.fun(x, y, (performance.now() - this.base_time) / 1000)

      const target = inverseLerp(region.z[0], region.z[1], z) - 0.5

      if (animate && steps) {
        this.targets[i] = target
        this.increments[i] = (this.targets[i] - verts[i * 3 + 2]) / steps
      } else {
        verts[i * 3 + 2] = target
      }
    }

    this.axis.position.set(
      inverseLerp(region.x[0], region.x[1], 0) - 0.5,
      inverseLerp(region.y[0], region.y[1], 0) - 0.5,
      inverseLerp(region.z[0], region.z[1], 0) - 0.5
    )
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
      this.base_time = performance.now()
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
    git.camera.zoom = Math.min(1, window.innerWidth / window.innerHeight)
    git.renderer.setSize(window.innerWidth, window.innerHeight)
    git.camera.updateProjectionMatrix()
    git.renderer.render(git.scene, git.camera)
  })
  Array.from(document.getElementsByClassName('domain')).forEach(el => {
    el.addEventListener('input', e => {
      const name = e.target.name
      const value = e.target.value
      e.target.style.width = 2 + value.replace(/^-/, '').length + 'ch'
      region[name[0]][name.slice(1) === 'min' ? 0 : 1] = +value
      git.input(input.value, true)
    })
  })
  document.getElementById('helpers').addEventListener('change', e => {
    git.box.visible = e.target.checked
    git.axis.visible = e.target.checked
    git.refresh()
  })

  window.addEventListener('popstate', () => {
    if (location.hash && atob(location.hash.slice(1)) !== input.value) {
      input.value = atob(location.hash.slice(1))
      git.input(input.value, true)
    }
  })
})
