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
			col *= 2.0;
			col = 1.0 - col;
			
			gl_FragColor = col;
		}
	`,
}