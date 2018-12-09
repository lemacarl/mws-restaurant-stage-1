const gulp = require("gulp");
const browserSync = require("browser-sync").create();
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const autoprefixer = require('gulp-autoprefixer');

gulp.task("default",['copy-html', 'copy-images', 'copy-css', 'copy-sw', 'scripts'],() => {
	gulp.watch('./*.html', ['copy-html']);
	gulp.watch('js/**/*.js', ['scripts'])
	gulp.watch('dist/*.html').on('change', browserSync.reload);
	gulp.watch('dist/js/**/*.js').on('change', browserSync.reload);
	gulp.watch('dist/sw.js').on('change', browserSync.reload);
	gulp.watch('sw.js', ['copy-sw']);
	gulp.watch('css/**/*.css', ['copy-css']);
	gulp.watch('dist/css/**/*.css').on('change', browserSync.reload);

	browserSync.init({
		server: 'dist'
	});
})

gulp.task('dist', [
	'copy-html',
	'copy-images',
	'copy-css',
	'copy-sw',
	'scripts-dist'
	], () => {
		browserSync.init({
			server: 'dist'
		});
	})

gulp.task('copy-html', () => {
	gulp.src('./*.html').pipe(gulp.dest('./dist'));
})

gulp.task('copy-sw', () => {
	gulp.src('./sw.js').pipe(gulp.dest('dist'));
});

gulp.task('scripts', () => {
	gulp
		.src(['js/**/*.js', '!js/restaurant_info.js', '!js/main.js', '!js/worker.js'])
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(concat('libs.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/main.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/restaurant_info.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/worker.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))
});

gulp.task('scripts-dist', () => {
	gulp
		.src(['js/**/*.js', '!js/restaurant_info.js', '!js/main.js', '!js/worker.js'])
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(concat('libs.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/main.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/restaurant_info.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))

	gulp
		.src('js/worker.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/js'))
});

gulp.task('copy-images', () => {
	gulp
		.src('img/*')
		.pipe(imagemin({
			progressive: true,
			use: [pngquant()]
		}))
		.pipe(gulp.dest('dist/img'));
});

gulp.task('copy-css', () => {
	gulp
		.src('css/*')
		.pipe(
			autoprefixer({
				browsers: ['last 2 versions']
			})
		)
		.pipe(gulp.dest('dist/css'))
});
