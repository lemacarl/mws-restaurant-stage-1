/*
 After you have changed the settings at "Your code goes here",
 run this with one of these options:
  "grunt" alone creates a new, completed images directory
  "grunt clean" removes the images directory
  "grunt responsive_images" re-processes images without removing the old ones
*/

module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      dev: {
        options: {
          engine: 'im',
          sizes: [{
            name: "small",
            width: 320,
            height: 240, 
            aspectRatio: false
          }, {
            name: "medium",
            width: 640,
            quality: 95,
            aspectRatio: false
          }, {
            width: 800,
            suffix: '_large_1x',
            quality: 50
          },{
            width: 1200,
            suffix: '_large_2x',
            quality: 95
          }]
        },

        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'images/',
          dest: 'img/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.registerTask('default', ['responsive_images']);

};
