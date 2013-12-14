sign = (x) -> if x < 0 then -1 else 1

make_vertices = (vertices) ->
    vertices.map((v) -> new THREE.Vector3(v[0], v[1], v[2]))

box_size = 100
increment = box_size * .01
precision = 100
region =
    x: [-5, 5]
    y: [-5, 5]
    z: [-25, 25]

make_line_box = (h, color) ->
    geometry = new THREE.Geometry()
    h *= .5
    geometry.vertices = make_vertices [
        [-h, -h, -h],
        [-h, h, -h],
        [-h, h, -h],
        [h, h, -h],
        [h, h, -h],
        [h, -h, -h],
        [h, -h, -h],
        [-h, -h, -h],
        [-h, -h, h],
        [-h, h, h],
        [-h, h, h],
        [h, h, h],
        [h, h, h],
        [h, -h, h],
        [h, -h, h],
        [-h, -h, h],
        [-h, -h, -h],
        [-h, -h, h],
        [-h, h, -h],
        [-h, h, h],
        [h, h, -h],
        [h, h, h],
        [h, -h, -h],
        [h, -h, h]
    ]
    geometry.computeLineDistances()
    material = new THREE.LineBasicMaterial
        color: color
    type = THREE.LinePieces
    new THREE.Line(geometry, material, type)

make_plot = (color) ->
    geometry = new THREE.PlaneGeometry box_size, box_size, precision, precision
    geometry.dynamic = true

    material = new THREE.MeshPhongMaterial
        color: color
        # wireframe: true
        side: THREE.DoubleSide
        specular: color
        shininess: 10
        vertexColors: THREE.FaceColors
        metal: true

    mesh = new THREE.Mesh geometry, material
    mesh

class GraphIt
    constructor: ->
        @camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, box_size * 10)
        @camera.position.z = 2.5 * box_size
        @fun = (x, y) -> 0
        @controls = new THREE.TrackballControls(@camera)
        @controls.rotateSpeed = 1.0
        @controls.zoomSpeed = 1.2
        @controls.panSpeed = 0.8
        @controls.noZoom = false
        @controls.noPan = false
        @controls.staticMoving = true
        @controls.dynamicDampingFactor = 0.3

        @scene = new THREE.Scene()

        @line =  make_line_box box_size, 0x5e3fbe
        @scene.add @line

        @plot = make_plot 0xff5995
        @scene.add @plot


        @hemi_light = new THREE.HemisphereLight 0xffffff, 0xffffff, 0.6
        @hemi_light.color.setHSL 0.6, 1, 0.6
        @hemi_light.groundColor.setHSL 0.095, 1, 0.75
        @hemi_light.position.set 0, 0, -500
        @scene.add @hemi_light

        @point_light = new THREE.PointLight 0xffffff, 1, 500
        @point_light.position = @camera.position
        @scene.add @point_light

        @renderer = new THREE.WebGLRenderer(antialias: true)
        @renderer.setClearColor 0x1b1d1e
        @renderer.setSize window.innerWidth, window.innerHeight

        @renderer.gammaInput = true
        @renderer.gammaOutput = true

        @controls.addEventListener('change',=> @renderer.render(@scene, @camera))

        document.body.appendChild @renderer.domElement

    animate: =>
        requestAnimationFrame @animate
        if @dirty and @apply_fun()
            @plot.geometry.computeCentroids()
            @plot.geometry.computeFaceNormals()
            @plot.geometry.computeVertexNormals()
            @plot.geometry.normalsNeedUpdate = true
            @plot.geometry.verticesNeedUpdate = true

            @renderer.render @scene, @camera
        else
            @dirty = false
        @controls.update()

    apply_fun: =>
        dirty = false
        for v in @plot.geometry.vertices
            x = v.x * (region.x[1] - region.x[0]) / box_size
            y = v.y * (region.y[1] - region.y[0]) / box_size
            z = @fun x, y
            vz = z * box_size / (region.z[1] - region.z[0])
            delta = v.z - vz
            if abs(delta) > increment
                dirty = true
                v.z -= sign(delta) * increment
            else if v.z isnt vz
                dirty = true
                v.z = vz
        dirty

    input: (event) =>
        if event.target.value is ''
            return
        try
            fun =  new Function('x', 'y', 'return ' + event.target.value)
            rv = fun 0, 0
        catch
            return
        if typeof rv is 'number'
            @fun = fun
            @dirty = true

$ =>
    @git = new GraphIt()
    @git.animate()

    $('input').on('input', git.input).focus().trigger('input')

    $(window)
        .resize =>
            @git.camera.aspect = window.innerWidth / window.innerHeight
            @git.renderer.setSize window.innerWidth, window.innerHeight
            @git.camera.updateProjectionMatrix()
            @git.controls.handleResize()

# Horrible hack to get rid of the math module:
for key in [
    'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
    'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan',
    'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2']
    window[key.toLowerCase()] = Math[key]
