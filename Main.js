/* 
THREE.js r100 
*/

// Global Variables
let canvas = document.getElementById("myCanvas");
let camera0, scene0, renderer, controls, clock, stats;
let composer, depthTarget, depthRendTexture, depthMaterial;
let textureLoader;
let Textures = {
	fog: null,
	smoke: null,
	smokeBig: null,
	point: null,
};
let Lights = [];
let smokeParticles, smokeAnimator, pointsParticles;
let shadows = true;
let cameraRotator, rotatingCamera = false;


function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	if(shadows){ 
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.shadowMap.autoUpdate = false;
	}
	
	// Scene
	scene0 = new THREE.Scene();
	scene0.background = new THREE.Color( 0x000000 );
	// scene0.fog = new THREE.Fog( 0x101010, 20 , 40 );
	
	// Camera
	camera0 = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 500 );
	camera0.position.set( 0 , 5.5 , 10 );
	
	// Clock
	clock = new THREE.Clock();
	
	//Stats
	stats = new Stats();
	document.body.appendChild( stats.dom );
	
	// Loaders
	textureLoader = new THREE.TextureLoader();
	
	// Inits
	depthMaterial = new THREE.MeshDepthMaterial();
	if( !rotatingCamera ) initControls();
	initTextures();
	
	initLights();
	createStartingMesh();
	initParticles();
	initPostProcessing();
	
	if( shadows ) renderer.shadowMap.needsUpdate = true;
	
	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		depthTarget.setSize( window.innerWidth, window.innerHeight );
		camera0.aspect = window.innerWidth / window.innerHeight;
		camera0.updateProjectionMatrix();
	}, false);
}

let createStartingMesh = function(){
	if( rotatingCamera ){
		cameraRotator = new THREE.Group();
		cameraRotator.add( camera0 );
		cameraRotator.position.set( 0 , 2 , 0 );
		camera0.position.set( 0 , 2 , 10 );
		camera0.lookAt( new THREE.Vector3(0 , 0 , 0) );
		scene0.add( cameraRotator );
	}
	
	let floor = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 30 , 400 ),
		new THREE.MeshPhongMaterial({
			color: 0x105020,
			shininess: 0,
		})
	);
	floor.rotation.x -= 90 * Math.PI/180;
	scene0.add( floor );
	if(shadows) floor.receiveShadow = true;
	
	let cube = new THREE.Mesh( 
		new THREE.BoxGeometry( 2 , 2 , 2 ) , 
		new THREE.MeshPhongMaterial({color: 0x404040 })
	);
	if(shadows) {
		cube.castShadow = true;
		cube.receiveShadow = true;
	}
	cube.position.set( 0 , 1 , 0 );
	scene0.add( cube );
	
	let wall1 = new THREE.Mesh( 
		new THREE.BoxGeometry( 20 , 7 , 1 ) , 
		new THREE.MeshPhongMaterial({color: 0x404040 })
	);
	wall1.position.set( 0 , 3.5 , -150 );
	let wall2 = new THREE.Mesh( 
		new THREE.BoxGeometry( 300 , 7 , 1 ) , 
		new THREE.MeshPhongMaterial({color: 0x404040 })
	);
	wall2.position.set( -10 , 3.5 , 0 );
	wall2.rotation.y += 90 * Math.PI/180;
	scene0.add( wall1 , wall2 );
	let wall3 = new THREE.Mesh( 
		new THREE.BoxGeometry( 300 , 7 , 1 ) , 
		new THREE.MeshPhongMaterial({color: 0x404040 })
	);
	wall3.position.set( 10 , 3.5 , 0 );
	wall3.rotation.y += 90 * Math.PI/180;
	if( shadows ){
		wall1.castShadow = true;
		wall2.castShadow = true;
		wall3.castShadow = true;
	}
	
	scene0.add( wall1 , wall2 , wall3 );
}

let initParticles = function(){
	// texture, #horiz, #vert, #total, duration.
	// smokeAnimator = new TextureAnimator( Textures.fog, 2, 2, 4, 100 );
	smokeAnimator = new TextureAnimator( Textures.smoke, 6, 5, 30, 80 );
	
	// SMOKE
	let smokeGeo = new THREE.BufferGeometry();
	
	let numOfParticles = 20; // 20
	let spreadX = 18, spreadY = 4, spreadZ = 18; // 20 4 20
	let origin = new THREE.Vector3( 0 , 1 , 0 ); // 0 1 0
	
	let posArr = [];
	for( let i = 0; i < numOfParticles; i++ ){
		let x = Math.random() * spreadX - spreadX/2.0 + origin.x;
		let y = Math.random() * spreadY - spreadY/2.0 + origin.y;
		// let y = 0;
		let z = Math.random() * spreadZ - spreadZ/2.0 + origin.z;
		
		posArr.push( x , y , z );
		// posArr.push( -4 , 0 , 3 );
	}
	
	smokeGeo.addAttribute( 'position' , new THREE.Float32BufferAttribute( posArr , 3 ) );
	
	let newPointsMat = new THREE.ShaderMaterial( softParticlesShader );
	newPointsMat.uniforms = {
		// clippingPlanes: { value: null, needsUpdate: false },
		diffuse: { value: new THREE.Color( 0.5 , 1.0 , 0.5 ) },
		fogColor: { value: new THREE.Color( 0 , 0 , 0 ) },
		fogDensity: { value: 0.00025 },
		// fogFar: { value: scene0.fog.far },
		// fogNear: { value: scene0.fog.near },
		map: { value: Textures.smokeBig },
		opacity: { value: 0.15 },
		scale: { value: 329 },
		size: { value: 25 }, // 30
		uvTransform: { value: Textures.smokeBig.matrix },
		// uvOffset: { value: Textures.smoke.offset },
		fCamNear: { value: camera0.near },
		fCamFar: { value: camera0.far },
		sceneDepthTexture: { value: null },
		screenSize: { value: new THREE.Vector2( canvas.width, canvas.height ) },
	};
	newPointsMat.sizeAttenuation = true;
	newPointsMat.fog = true;
	newPointsMat.transparent = true;
	newPointsMat.map = Textures.smoke;
	
	newPointsMat.depthWrite = false;
	newPointsMat.depthTest = false;
	newPointsMat.blending = THREE.AdditiveBlending;
	
	smokeParticles = new THREE.Points( smokeGeo , newPointsMat );
	scene0.add( smokeParticles );
	
	
	// POINTS
	let pointsGeo = new THREE.BufferGeometry();
	numOfParticles = 70;
	posArr = [];
	for( let i = 0; i < numOfParticles; i++ ){
		let x = Math.random() * spreadX - spreadX/2.0 + origin.x;
		let y = Math.random() * spreadY - spreadY/2.0 + origin.y + 2;
		let z = Math.random() * spreadZ - spreadZ/2.0 + origin.z;
		
		posArr.push( x , y , z );
		
	}
	
	pointsGeo.addAttribute( 'position' , new THREE.Float32BufferAttribute( posArr , 3 ) );
	
	let pointsMat = new THREE.PointsMaterial({
		color: 0x88ff88,
		size: 3,
		// map: Textures.point,
		transparent: true,
		opacity: 0.6,
		blending: THREE.AdditiveBlending,
		alphaTest: 0.2,
		sizeAttenuation: false,
		// depthTest: false,
		// depthWrite: false,
	});
	pointsParticles = new THREE.Points( pointsGeo , pointsMat );
	scene0.add( pointsParticles );
}

let initControls = function(){
	controls = new THREE.OrbitControls( camera0 );
}

let initTextures = function(){
	Textures.fog = textureLoader.load('fogs.png');
	Textures.smoke = textureLoader.load('smoke.png');
	Textures.smokeBig = textureLoader.load('smokeBig-64.png');
	Textures.point = textureLoader.load('particle2.png');
}

let initPostProcessing = function(){
	composer = new THREE.EffectComposer( renderer );
	
	depthRendTexture = new THREE.DepthTexture();
	depthRendTexture.type = THREE.UnsignedShortType;
	depthRendTexture.minFilter = THREE.NearestFilter;
	depthRendTexture.maxFilter = THREE.NearestFilter;
	
	depthTarget = new THREE.WebGLRenderTarget( canvas.width, canvas.height, {
		format: THREE.RGBAFormat,
		depthTexture: depthRendTexture,
		depthBuffer: true,
	});
	
	smokeParticles.material.uniforms.sceneDepthTexture.value = depthRendTexture;
	
	// Passes
	let renderPass = new THREE.RenderPass( scene0, camera0 );
	// myPass = new THREE.ShaderPass( reverseGrayscaleShader );
	let fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	
	// myPass.uniforms.tDepth.value = depthRendTexture;
	
	composer.addPass( renderPass );
	// composer.addPass( myPass );
	composer.addPass( fxaaPass );
	
	fxaaPass.renderToScreen = true;
}

let initLights = function(){
	Lights[0] = new THREE.AmbientLight( 0xffffff , 0.3 );
	Lights[1] = new THREE.DirectionalLight( 0xffffff , 0.8 );
	Lights[1].position.set( 12 , 50 , 15 );
	if(shadows){
		Lights[1].castShadow = true;
		Lights[1].shadow.mapSize.width = 1024 * 4;
		Lights[1].shadow.mapSize.height = 1024 * 4;
		Lights[1].shadow.camera.near = 0.1;
		Lights[1].shadow.camera.far = 200;
		if( Lights[1] instanceof THREE.DirectionalLight ){
			Lights[1].shadow.camera.left = -200;
			Lights[1].shadow.camera.bottom = -200;
			Lights[1].shadow.camera.top = 200;
			Lights[1].shadow.camera.right = 200;
		}
		Lights[1].shadow.bias = 0.0005;
	}
	let helper = new THREE.CameraHelper( Lights[1].shadow.camera );
	scene0.add( helper );
	
	for(let i = 0; i < Lights.length; i++){
		scene0.add( Lights[i] );
	}
}

function animate() {
	stats.begin();
	let delta = clock.getDelta();
	
	if( rotatingCamera ) cameraRotator.rotation.y += 0.0025;
	
	// scene0.overrideMaterial = depthMaterial; // no need with DepthTexture()
	renderer.render( scene0 , camera0 , depthTarget, true );
	// scene0.overrideMaterial = null;
	
	// smokeAnimator.update( 1000*delta );
	smokeParticles.rotation.y += 0.0002; 
	
	requestAnimationFrame( animate );
	composer.render( scene0, camera0 );
	
	stats.end();
}

init();
requestAnimationFrame( animate );

/* 
	clippingPlanes:{ value: null, needsUpdate: false }
	diffuse: { value: Color }
	fogColor: { value: Color }
	fogDensity: { value: 0.00025 }
	fogFar: { value: 40 }
	fogNear: { value: 20 }
	map: { value: null }
	opacity: { value: 1 }
	scale: { value: 329 }
	size: { value: 10 }
	uvTransform: { value: Matrix3 }
 */


/* 
	uniform float size;
	uniform float scale;
	#include <common>
	#include <color_pars_vertex>
	#include <fog_pars_vertex>
	#include <morphtarget_pars_vertex>
	#include <logdepthbuf_pars_vertex>
	#include <clipping_planes_pars_vertex>
	void main() {
		#include <color_vertex>
		#include <begin_vertex>
		#include <morphtarget_vertex>
		#include <project_vertex>
		gl_PointSize = size;
		#ifdef USE_SIZEATTENUATION
			bool isPerspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 );
			if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
		#endif
		#include <logdepthbuf_vertex>
		#include <clipping_planes_vertex>
		#include <worldpos_vertex>
		#include <fog_vertex>
	}
 */

/* 
	uniform vec3 diffuse;
	uniform float opacity;
	#include <common>
	#include <color_pars_fragment>
	#include <map_particle_pars_fragment>
	#include <fog_pars_fragment>
	#include <logdepthbuf_pars_fragment>
	#include <clipping_planes_pars_fragment>
	void main() {
		#include <clipping_planes_fragment>
		vec3 outgoingLight = vec3( 0.0 );
		vec4 diffuseColor = vec4( diffuse, opacity );
		#include <logdepthbuf_fragment>
		#include <map_particle_fragment>
		#include <color_fragment>
		#include <alphatest_fragment>
		outgoingLight = diffuseColor.rgb;
		gl_FragColor = vec4( outgoingLight, diffuseColor.a );
		#include <premultiplied_alpha_fragment>
		#include <tonemapping_fragment>
		#include <encodings_fragment>
		#include <fog_fragment>
	}
 */


