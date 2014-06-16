module.exports = (grunt) ->

  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')

    uglify:
      options:
        banner: '/*! <%= pkg.name %>
           <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        sourceMap: true

      graphit:
        files:
          'javascripts/main.min.js': 'javascripts/main.js'

    sass:
      graphit:
        expand: true
        cwd: 'sass'
        src: '*.sass'
        dest: 'stylesheets/'
        ext: '.css'

    coffee:
      options:
        sourceMap: true

      graphit:
        files:
          'javascripts/main.js': 'coffee/*.coffee'

    coffeelint:
      graphit:
        'coffee/*.coffee'

    connect:
      serve:
        options:
          port: 7007
          base: ''

    watch:
      options:
        livereload: true
      coffee:
        files: [
          'coffee/*.coffee'
          'Gruntfile.coffee'
        ]
        tasks: ['coffeelint', 'coffee']

      sass:
        files: [
          'sass/*.sass'
        ]
        tasks: ['sass']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-sass'

  grunt.registerTask 'dev', [
    'coffeelint', 'coffee', 'sass', 'watch']
  grunt.registerTask 'css', ['sass']
  grunt.registerTask 'default', [
    'coffeelint', 'coffee',
    'sass',
    'uglify']

  grunt.registerTask 'graphit', [
    'connect', 'watch'
  ]
