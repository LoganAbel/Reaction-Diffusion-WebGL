const vs = `
varying vec2 fuv;

void main()
{
    fuv = uv;
    gl_Position = vec4(position, 1);
}
`

const init = `
varying vec2 fuv;

uniform vec2 res;

void main() {
  gl_FragColor = vec4(1,length(fuv - .5)<.01,0,0);
}
`;

const update = `
varying vec2 fuv;

uniform vec2 res;
uniform sampler2D tex;
uniform vec2 mpos;
uniform bool mrdown;
uniform bool mldown;

vec2 dif = vec2(1,.5);
uniform float feed;
uniform float kill;

void main() {
  vec2 v = texture2D(tex, fuv).xy;
  gl_FragColor = vec4(
    v + dif * (- v
      + 0.20 * texture2D(tex, fuv + vec2(0,1)  / res).xy
      + 0.20 * texture2D(tex, fuv + vec2(0,-1) / res).xy
      + 0.20 * texture2D(tex, fuv + vec2(1,0)  / res).xy
      + 0.20 * texture2D(tex, fuv + vec2(-1,0) / res).xy
      + 0.05 * texture2D(tex, fuv + vec2(1,1)  / res).xy
      + 0.05 * texture2D(tex, fuv + vec2(-1,-1)/ res).xy
      + 0.05 * texture2D(tex, fuv + vec2(-1,1) / res).xy
      + 0.05 * texture2D(tex, fuv + vec2(1,-1) / res).xy
    ) + v.x * v.y * v.y * vec2(-1,1)
      + vec2(feed, feed + kill) * (vec2(1,0) - v)
  ,0,0);

  if(mrdown && distance(fuv, mpos) < 1. / res.y)
      gl_FragColor.y = .5;
  if(mldown && distance(fuv, mpos) < 20. / res.y)
      gl_FragColor.y = 0.;
}
`;

const draw = `
varying vec2 fuv;

uniform sampler2D tex;
uniform vec2 res;

float v(vec2 uv) {
	vec2 ab = texture2D(tex, uv).xy;
	return clamp(1. + ab.y - ab.x, 0., 1.);
}

vec3 bg = vec3(57, 43, 53)/255.;
vec3 fg = vec3(209, 191, 176)/255.;

void main() {
  float a = v(fuv);
  float b = v(fuv+vec2(0,1)/res);
  gl_FragColor = vec4(mix(bg, fg, float(max(a,b) > .5)) + vec3(a-b), 1);
}
`;

const RES = 256;

const newRT =()=> new THREE.WebGLRenderTarget( 
  RES, RES, 
  { 
    type: THREE.FloatType, 
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping
  }
);

const ShaderScene =(fragmentShader, uniforms)=> {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2, 2),
    new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader: vs,
      uniforms
    })
  ));
  return scene
}

//========================================================

const canvas = document.querySelector("#canvas");
const kill_slider = document.querySelector("#kill");
const feed_slider = document.querySelector("#feed");
const kill_text = document.querySelector("#kill-text");
const feed_text = document.querySelector("#feed-text");
const renderer = new THREE.WebGLRenderer({canvas});

const camera = new THREE.OrthographicCamera(-1,1,1,-1,-1,1);

let renderTarget1 = newRT();
let renderTarget2 = newRT();

const res = { value: new THREE.Vector2(RES, RES) } 
let mpos = { value: new THREE.Vector2() }
let mldown = { value: false }
let mrdown = { value: false }
let feed = { value: .055 }
let kill = { value: .062 }
let update1tex = { value: renderTarget1.texture };

const initScene = ShaderScene(init, { res })
const updateScene = ShaderScene(update, { res, mpos, mldown, mrdown, feed, kill, tex: update1tex })
const scene = ShaderScene(draw, { res, tex: { value: renderTarget1.texture }})

canvas.addEventListener('contextmenu', e=> e.preventDefault())
canvas.onmousedown = e => {
  mldown.value = e.button == 0
  mrdown.value = e.button == 2
}
canvas.onmouseup = e => {
  mldown.value = false
  mrdown.value = false
}
canvas.onmousemove = e => {
  const rect = canvas.getBoundingClientRect();
  const style = window.getComputedStyle(document.querySelector("#canvas"))
  mpos.value = new THREE.Vector2(
    (e.clientX - rect.left) / +style.width.slice(0,-2),
    (rect.height - (e.clientY - rect.top) - 1) / +style.height.slice(0,-2)
  )
}

//========================================================

renderer.setRenderTarget(renderTarget1);
renderer.render(initScene, camera);

const render =()=> {
  feed.value=feed_slider.value/1000
  kill.value=kill_slider.value/1000
  feed_text.innerText = "feed " + feed.value
  kill_text.innerText = "kill " + kill.value

  for(let i = 0; i < 50; i ++) {
  	update1tex.value = renderTarget1.texture
    renderer.setRenderTarget(renderTarget2);
    renderer.render(updateScene, camera);

    update1tex.value = renderTarget2.texture
    renderer.setRenderTarget(renderTarget1);
    renderer.render(updateScene, camera);
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);