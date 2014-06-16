sign = (x) -> if x < 0 then -1 else 1

make_vertices = (vertices) ->
  vertices.map((v) -> new THREE.Vector3(v[0], v[1], v[2]))

steps = 5

box_size = 100
precision = 100
region =
  x: [-5, 5]
  y: [-5, 5]
  z: [-5, 5]

make_box_lines = (h, color) ->
  geometry = new THREE.Geometry()
  h *= .5
  geometry.vertices = make_vertices [
    [-h, -h, -h],
    [-h,  h, -h],
    [-h,  h, -h],
    [ h,  h, -h],
    [ h,  h, -h],
    [ h, -h, -h],
    [ h, -h, -h],
    [-h, -h, -h],
    [-h, -h,  h],
    [-h,  h,  h],
    [-h,  h,  h],
    [ h,  h,  h],
    [ h,  h,  h],
    [ h, -h,  h],
    [ h, -h,  h],
    [-h, -h,  h],
    [-h, -h, -h],
    [-h, -h,  h],
    [-h,  h, -h],
    [-h,  h,  h],
    [ h,  h, -h],
    [ h,  h,  h],
    [ h, -h, -h],
    [ h, -h,  h]
  ]
  geometry.computeLineDistances()
  material = new THREE.LineBasicMaterial
    color: color
    linewidth: 2
  type = THREE.LinePieces

  new THREE.Line(geometry, material, type)

make_axis_lines = (h, color) ->
  geometry = new THREE.Geometry()
  h *= .75
  geometry.vertices = make_vertices [
    [ 0,  0,  0],
    [-h,  0,  0],
    [ h,  0,  0],
    [ 0,  0,  0],
    [ 0, -h,  0],
    [ 0,  h,  0],
    [ 0,  0,  0],
    [ 0,  0, -h],
    [ 0,  0,  h]
    [ 0,  0,  0],
  ]

  type = THREE.LinePieces
  geometry.computeLineDistances()
  material = new THREE.LineBasicMaterial
    color: color
    linewidth: 2

  new THREE.Line(geometry, material, type)

make_plot = (color) ->
  geometry = new THREE.PlaneGeometry box_size, box_size, precision, precision
  geometry.dynamic = true

  phmaterial = new THREE.MeshPhongMaterial
    color: color
    shading: THREE.SmoothShading
    blending: THREE.AdditiveBlending
    # wireframe: true
    side: THREE.DoubleSide
    specular: color
    shininess: 10
    opacity: .4
    vertexColors: THREE.FaceColors
    metal: true

#   shmaterial = new THREE.ShaderMaterial
#     fragmentShader: '''
#   varying vec2 vUv;
#   void main() {
#     float c = 0.;
#     if (mod(vUv.x * 10., 2.) > 1. != mod(vUv.y * 10., 2.) > 1.) {
#       c = 1.;
#     }
#     gl_FragColor = vec4( c, c, c, 1. - c );
#   }
# '''
#     vertexShader: '''
#   varying vec2 vUv;
#   void main()
#   {
#     vUv = uv;
#     vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
#     gl_Position = projectionMatrix * mvPosition;
#   }
# '''

  # mesh = new THREE.SceneUtils.createMultiMaterialObject(
  #   geometry, [phmaterial, shmaterial])
  mesh = new THREE.Mesh geometry, phmaterial
  mesh

class GraphIt
  constructor: (fun) ->
    @camera = new THREE.PerspectiveCamera(
      30, window.innerWidth / window.innerHeight, 1, box_size * 100)
    @camera.position.z = 2.5 * box_size
    @controls = new THREE.TrackballControls(@camera)

    @controls._rotateStart = new THREE.Vector3 0, -.125, 1
    @controls._rotateEnd = new THREE.Vector3 0, .125, 1

    @scene = new THREE.Scene()

    @line = make_box_lines box_size, 0x5e3fbe
    @scene.add @line

    @axis = make_axis_lines box_size, 0x5e3fbe
    @scene.add @axis

    @plot = make_plot 0xff5995
    @scene.add @plot

    @hemi_light = new THREE.HemisphereLight 0xffffff, 0xffffff, 0.6
    @hemi_light.color.setHSL 0.6, 1, 0.6
    @hemi_light.groundColor.setHSL 0.095, 1, 0.75
    @hemi_light.position.set 0, 0, -500
    @scene.add @hemi_light

    @point_light = new THREE.PointLight 0xffffff, .5, 1000
    @point_light.position = @camera.position
    @scene.add @point_light

    @renderer = new THREE.WebGLRenderer(antialias: true)
    @renderer.setClearColor 0x1b1d1e
    @renderer.setSize window.innerWidth, window.innerHeight

    @controls.addEventListener('change',=> @renderer.render(@scene, @camera))
    @first = true
    @time_parametric = false
    document.body.appendChild @renderer.domElement

  refresh: ->
    @plot.geometry.computeCentroids()
    @plot.geometry.computeFaceNormals()
    @plot.geometry.computeVertexNormals()
    @plot.geometry.normalsNeedUpdate = true
    @plot.geometry.verticesNeedUpdate = true
    @renderer.render @scene, @camera

  animate: =>
    requestAnimationFrame @animate
    @step() if @dirty
    @apply_fun(false) if @time_parametric
    @refresh() if @dirty or @time_parametric
    @controls.update()

  step: =>
    @dirty = false
    return unless steps
    for v in @plot.geometry.vertices
      return unless v.target?
      if abs(v.target - v.z) > abs v.increment
        v.z += v.increment
        @dirty = true
      else if v.z isnt v.target
        v.z = v.target

  apply_fun: (animate=true) =>
    for v in @plot.geometry.vertices
      x = v.x * (region.x[1] - region.x[0]) / box_size
      y = v.y * (region.y[1] - region.y[0]) / box_size
      z = @fun x, y, ((new Date()).getTime() - @base_time) / 1000

      if animate and steps
        v.target = z * box_size / (region.z[1] - region.z[0])
        v.increment = (v.target - v.z) / steps
      else
        v.z = z * box_size / (region.z[1] - region.z[0])

  input: (event, fake) =>
    if event.target.value is ''
      return
    try
      fun =  new Function('x', 'y', 't', 'return ' + event.target.value)
      # Test random values
      x = random()
      y = random()
      t1 = random()
      t2 = random()
      rv = fun x, y, t1
      # Hack to see if it changes along time
      @time_parametric = rv != fun x, y, t2
    catch
      return
    if typeof rv is 'number' and fun isnt @fun
      unless fake
        history.pushState null, null, '#' + btoa(event.target.value)
      @base_time = (new Date()).getTime()
      @fun = fun
      @dirty = true
      if @first or @time_parametric
        @apply_fun false
        @refresh()
      else
        @apply_fun true

      @first = false

$ =>
  @git = new GraphIt()
  @git.animate()

  fun = atob(location.hash.slice(1)) or "cos(x) * sin(y)"
  $('input').on('input', git.input).focus().val(fun).trigger('input', true)

  $(window)
    .resize =>
      @git.camera.aspect = window.innerWidth / window.innerHeight
      @git.renderer.setSize window.innerWidth, window.innerHeight
      @git.camera.updateProjectionMatrix()
      @git.controls.handleResize()
      @git.renderer.render @git.scene, @git.camera

  @addEventListener "popstate", ->
    if location.hash and atob(location.hash.slice(1)) != $('input').val()
      $('input').val(atob(location.hash.slice(1))).trigger('input', true)

# Horrible hack to get rid of the math module:
for key in [
  'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
  'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan',
  'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2']
  window[key.toLowerCase()] = Math[key]
