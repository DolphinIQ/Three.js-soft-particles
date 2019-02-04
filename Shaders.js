let depthShader = {
	uniforms: {
		tDepth: { type: "t", value: null },
	},
	vertexShader: `
		varying vec2 vUv;
		
		void main(){
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,
	fragmentShader: `
		uniform sampler2D tDepth;
		
		varying vec2 vUv;
		
		void main(){
			vec4 col = texture2D( tDepth , vUv );
			
			gl_FragColor = col;
		}
	`,
}

let reverseGrayscaleShader = {
	uniforms: {
		tDiffuse: { type: "t", value: null },
		tDepth: { type: "t", value: null },
		particlesLayer: { type: "t", value: null },
		fCamNear: { type: "f", value: null },
		fCamFar: { type: "f", value: null },
	},
	vertexShader: `
		varying vec2 vUv;
		
		void main(){
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;
		uniform sampler2D particlesLayer;
		
		uniform float fCamNear;
		uniform float fCamFar;
		
		varying vec2 vUv;
		
		
		float readDepth( float z ) {
			float cameraFarPlusNear  = fCamFar + fCamNear;
			float cameraFarMinusNear = fCamFar - fCamNear;
			float cameraCoef         = 2.0 * fCamNear;

			return cameraCoef / ( cameraFarPlusNear - z * cameraFarMinusNear );
		}
		
		
		#include <packing>
		
		float camfar = 500.0;
		float camnear = 2.0;

		float getLinearDepth( float fragCoordZ ) {

			float viewZ = perspectiveDepthToViewZ( fragCoordZ, camnear, camfar );
			return viewZToOrthographicDepth( viewZ, camnear, camfar );
		}
		
		void main(){
			vec4 col = texture2D( tDepth , vUv );
			// col *= 2.0;
			// col = 1.0 - col;
			// vec4 col = texture2D( particlesLayer , vUv );
			// vec4 col = texture2D( tDiffuse , vUv );
			// col.r = readDepth( gl_FragCoord.z );
			// col.r = getLinearDepth( col.r );
			 
			gl_FragColor = col;
		}
	`,
}

let softParticlesShader = {
	/* uniforms: {
		clippingPlanes: { value: null, needsUpdate: false },
		diffuse: { value: new THREE.Color( 1 , 1 , 1 ) },
		fogColor: { value: new THREE.Color( 0 , 0 , 0 ) },
		fogDensity: { value: 0.00025 },
		fogFar: { value: 40 },
		fogNear: { value: 20 },
		map: { value: null },
		opacity: { value: 1 },
		scale: { value: 329 },
		size: { value: 10 },
		// uvTransform: { value: Matrix3 },
	}, */
	uniforms: {
		clippingPlanes: { value: null, needsUpdate: false },
		diffuse: { type: "vec3", value: new THREE.Color( 1 , 1 , 1 ) },
		fogColor: { type: "vec3", value: new THREE.Color( 0 , 0 , 0 ) },
		fogDensity: { type: "f", value: 0.00025 },
		fogFar: { type: "f", value: null },
		fogNear: { type: "f", value: null },
		map: { type: "t", value: null },
		opacity: { type: "f", value: 1 }, 
		scale: { type: "f", value: 1 }, // with size 10 is 329 for some reason
		size: { type: "f", value: 1 },
		// uvTransform: { type: "m3", value: null },
	}, 
	vertexShader: `
		uniform float size;
		uniform float scale;
		
		varying vec2 vUv;
		
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
			
			vUv = uv;
			
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
	`,
	fragmentShader: `
		uniform vec3 diffuse;
		uniform float opacity;
		#include <common>
		#include <color_pars_fragment>
		#include <map_particle_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>
		
		uniform sampler2D sceneDepthTexture;
		uniform vec2 screenSize;
		uniform float fCamNear;
		uniform float fCamFar;
		varying vec2 vUv;
		
		float fadeEdge( float particleDepth, float sceneDepth ){
			// margin makes it blend through the wall a little bit more
			float extraMargin = 0.015; 
			float a = ( sceneDepth+extraMargin - particleDepth ) * 120.0;
			if( a <= 0.0 ) return 0.0;
			if( a >= 1.0 ) return 1.0;
			
			if( a < 0.5 ) a = 2.0 * a * a;
			else a = -2.0 * pow( a - 1.0 , 2.0 ) + 1.0;
			
			return a;
		}
		
		#include <packing>

		float getLinearDepth( float fragCoordZ ) {

			float viewZ = perspectiveDepthToViewZ( fragCoordZ, fCamNear, fCamFar );
			return viewZToOrthographicDepth( viewZ, fCamNear, fCamFar );
		}
		
		void main() {
			#include <clipping_planes_fragment>
			vec3 outgoingLight = vec3( 0.0 );
			vec4 diffuseColor = vec4( diffuse, opacity );
			#include <logdepthbuf_fragment>
			#include <map_particle_fragment>
			#include <color_fragment>
			#include <alphatest_fragment>
			outgoingLight = diffuseColor.rgb;
			
			vec2 screenCoords = gl_FragCoord.xy / screenSize;
			float thisDepth = getLinearDepth( gl_FragCoord.z );
			float solidsDepth = texture2D( sceneDepthTexture , screenCoords ).r;
			solidsDepth = getLinearDepth( solidsDepth );
			float alphaScale = fadeEdge( thisDepth, solidsDepth );
			diffuseColor.a *= alphaScale;
			
			gl_FragColor = vec4( outgoingLight, diffuseColor.a );
			
			#include <premultiplied_alpha_fragment>
			#include <tonemapping_fragment>
			#include <encodings_fragment>
			#include <fog_fragment>
			
		}
	`,
}



/* THREE.ShaderChunk['soft_pars_fragment'] = [
	'varying vec3 fmvPosition;',
            
    'uniform sampler2D tDepth;',
    
    'uniform float fCamNear;',
    'uniform float fCamFar;',
    
    'uniform mat4 fPjMatrix;',
    'uniform mat4 fMvMatrix;',
    
    'uniform float fDistance;',
    'uniform float fContrast;',
    
    // Transform a worldspace coordinate to a clipspace coordinate
    // Note that `mvpMatrix` is: `projectionMatrix * modelViewMatrix`
    'vec4 worldToClip( vec3 v, mat4 mvpMatrix ) {',
        'return ( mvpMatrix * vec4( v, 1.0 ) );',
    '}',

    // Transform a clipspace coordinate to a screenspace one.
    'vec3 clipToScreen( vec4 v ) {',
        'return ( vec3( v.xyz ) / ( v.w * 2.0 ) );',
    '}',

    // Transform a screenspace coordinate to a 2d vector for
    // use as a texture UV lookup.
    'vec2 screenToUV( vec2 v ) {',
        'return 0.5 - vec2( v.xy ) * -1.0;',
    '}',
    
    //I really do not know how this function works
    'float readDepth( float z ) {',
		'float cameraFarPlusNear  = fCamFar + fCamNear;',
		'float cameraFarMinusNear = fCamFar - fCamNear;',
		'float cameraCoef         = 2.0 * fCamNear;',

		'return cameraCoef / ( cameraFarPlusNear - z * cameraFarMinusNear );',
	'}',
    
    //Function for calculating fade
    'float calculateFade(vec2 pixelPosition, float particleDepth){',
        'float zFade = 1.0;',
        
        'float sceneDepth = readDepth( unpackRGBAToDepth( texture2D( tDepth, pixelPosition ) ) );', 
        
        'float inputDepth = ((sceneDepth - particleDepth) * fDistance);',
          
        'if ((inputDepth < 1.0) && (inputDepth > 0.0)){',
            // Make it fade smoothly from 0 and 1 - I think I grabbed this curve from some nVidia paper
            'zFade = 0.5 * pow(saturate(2.0*((inputDepth > 0.5) ? (1.0 - inputDepth) : inputDepth)), fContrast);',
            'zFade = (inputDepth > 0.5) ? (1.0 - zFade) : zFade;',
        '}',
        'else{',
            'zFade = saturate(inputDepth);',
        '}',
            
        'return zFade;',
    '}',
].join("\n\n");

THREE.ShaderChunk['soft_fragment'] = [
	'vec4 csp = worldToClip( fmvPosition, fPjMatrix * fMvMatrix );',
    'vec3 scp = clipToScreen( csp );',
    
    'gl_FragColor.a *= calculateFade( screenToUV( scp.xy ), readDepth( gl_FragCoord.z ) );',
].join("\n\n");

THREE.ShaderChunk['soft_pars_vertex'] = 'varying vec3 fmvPosition;';
THREE.ShaderChunk['soft_vertex'] = 'fmvPosition = mvPosition.xyz;';

THREE.UniformsLib['soft'] = {
    tDepth: { type: "t", value: null },
    
    fCamNear: { type: "f", value: 1 },
    fCamFar: { type: "f", value: 1000 },
    
    fPjMatrix: { type: 'm4', value: null },
    fMvMatrix: { type: 'm4', value: null},
    
    fContrast: { type: 'f', value: 1.0 },
    fDistance: { type: 'f', value: 50.0 },
}

// ===========================================================

var shaderSoft = {
    uniforms: { },
    vertexShader: [
        'varying vec2 vUv;',
        
        '#include <soft_pars_vertex>',

        'void main(){',
            'vUv = uv;',
            
            'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );',
            
            '#include <soft_vertex>',
            
            'gl_Position = projectionMatrix * mvPosition;',
        '}',
    ].join("\n"),
    fragmentShader: [
        '#include <packing>',
        '#include <soft_pars_fragment>',
		
		'uniform sampler2D tDiffuse;',
		'uniform float opacity;',
        'varying vec2 vUv;',
        'void main(){',
            'vec4 col = texture2D( tDiffuse , vUv.xy );',
            
            'col.a *= opacity;',
            
            'gl_FragColor = col;',
            
            '#include <soft_fragment>',
	    '}'
    ].join("\n")
}


var shaderSoftUniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib['soft'],
    {
        opacity: {type: 'f', value: 1.0},
        tDiffuse: {type: 't', value: null}
    }
]); */



