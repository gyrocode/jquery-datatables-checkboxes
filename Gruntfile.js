module.exports = function(grunt) {

   grunt.registerTask('default', [
      'jshint',
      'uglify'
   ]);

   grunt.registerTask('watch', [ 'watch' ]);

   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),

      jshint: {
         options:{
            jshintrc: '.jshintrc'
         },
         all: [
            'js/dataTables.checkboxes.js',
         ]
      },

      uglify: {
         options: {
            mangle: true,
            sourceMap: true,
            banner:
               '/*! <%= pkg.title %> v<%= pkg.version %>' +
               ' - <%= pkg.homepage.replace("https://", "") %>' +
               ' - License: <%= pkg.license %>' +
               ' - Author: <%= pkg.author.name %>' +
               ' / <%= pkg.author.url.replace("https://", "") %>' +
               ' */',
         },
         js: {
            files: {
               'js/dataTables.checkboxes.min.js': [ 'js/dataTables.checkboxes.js' ]
            }
         }
      },

      watch: {
         js: {
            files: [
               'js/dataTables.checkboxes.js'
            ],
            tasks: [ 'jshint', 'uglify' ],
            options: {
               livereload: true
            }
         }
      }
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-contrib-watch');
};