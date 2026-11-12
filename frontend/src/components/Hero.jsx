import { useEffect, useRef } from 'react'
import './hero.css'

// Media (unchanged from the Driftlab source)
const SKY='https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_045255_3cb4b3c2-3cb5-4af9-93b4-bd88f2f883c3.png&w=1920&q=80'
const STILL='https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_045249_4f7fe287-c84b-479f-a953-04990fe1a3ac.png&w=1080&q=85'
const VIDEO='https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261102_045327_a6584765-3154-43e6-b1c9-4e574f83a811.mp4'

// Tailored: the five words that travel behind the jellyfish
const WORDS=['INKLENS','HANDWRITING','BECOMES','DIGITAL TEXT','PERFECTED']


export default function Hero() {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const cache = {}
    const $ = id => (cache[id] ??= root.querySelector('#' + id))
    let dead = false
    let raf = 0
    const STEP=.14,GAP=3.4,RADIUS=9,CAM=11,FOCAL=8.14
    const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x))
    const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x)},ease=x=>x*x*x*(x*(6*x-15)+10)
    const cv=$('gl'),gl=cv.getContext('webgl2',{alpha:false,antialias:true,premultipliedAlpha:true})
    if(!gl){ return }
    const calm=matchMedia('(prefers-reduced-motion:reduce)').matches
    function program(vs,fs,names){
      const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,'#version 300 es\nprecision highp float;\n'+s);gl.compileShader(o)
        if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o}
      const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p)
      const u={};names.forEach(n=>u[n]=gl.getUniformLocation(p,n));return{p,u}
    }
    const QUAD=`out vec2 v;void main(){vec2 c=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v=c;gl_Position=vec4(c*2.-1.,0,1);}`
    const skyP=program(QUAD,`in vec2 v;uniform sampler2D T;uniform vec3 C;out vec4 O;
      void main(){vec2 uv=vec2(.5)+(v-.5)*C.xy;uv.y=1.-uv.y;uv.x+=C.z;O=textureLod(T,uv,1.6);}`,['T','C'])
    const wordP=program(`layout(location=0) in vec2 a;uniform vec4 W;uniform vec4 B;uniform float A;uniform vec3 L;out vec2 v;
      void main(){
        float t=(a.x-.5)*W.x+W.y;
        float th=clamp(t/${RADIUS.toFixed(1)},-1.45,1.45);
        float x=${RADIUS.toFixed(1)}*sin(th),z=${RADIUS.toFixed(1)}*(1.-cos(th))*.82;
        float y=(a.y-.5)*L.x+L.y-L.z-3.6*pow(smoothstep(.8,8.,t),1.25)-.012*t*t;
        v=vec2(mix(B.x,B.z,a.x),mix(B.w,B.y,a.y));
        gl_Position=vec4(x*${FOCAL.toFixed(2)}/A,y*${FOCAL.toFixed(2)},0.,${CAM.toFixed(1)}-z);
      }`,`in vec2 v;uniform sampler2D T;out vec4 O;void main(){float a=texture(T,v).a;O=vec4(vec3(.043,.043,.063)*a,a);}`,['W','B','A','L','T'])
    const dotP=program(`layout(location=0) in vec4 a;uniform float S,H,P;out float k;out float r;
      void main(){k=a.w;float y=fract(a.y+S*.012*(.4+a.z))*2.3-1.15;float x=fract(a.x+H*(a.w>.5?.035:.004))*2.4-1.2+.03*sin(S*.2+a.z*9.);
        gl_Position=vec4(x,y,0,1);gl_PointSize=(a.w>.5?5.+a.z*15.:5.+a.z*24.)*P;r=S*.6+a.z*7.+H;}`,
      `in float k;in float r;out vec4 O;void main(){vec2 p=gl_PointCoord-.5;
        if(k>.5){float c=cos(r),s=sin(r);p=mat2(c,-s,s,c)*p;float a=step(max(abs(p.x),abs(p.y)),.3);O=vec4(vec3(.04)*a,a);}
        else{float a=smoothstep(.5,.1,length(p))*.62;O=vec4(vec3(1.)*a,a);}}`,['S','H','P'])
    const jellyP=program(`uniform mat3 M;out vec2 v;void main(){vec2 c=vec2((gl_VertexID<<1)&2,gl_VertexID&2);if(gl_VertexID==3)c=vec2(2,2);c*=.5;v=vec2(c.x,1.-c.y);gl_Position=vec4((M*vec3(c-.5,1.)).xy,0,1);}`,
      `in vec2 v;uniform sampler2D T;out vec4 O;void main(){
        vec3 c=texture(T,v).rgb;
        float d=c.g-max(c.r,c.b);
        float a=1.-smoothstep(.10,.38,d);
        c.g=min(c.g,max(c.r,c.b)*.96);
        O=vec4(c*a,a);}`,['M','T'])

    // word atlas: one row per word, cut to its measured width
    const ROW=512,EM=440,atlas=document.createElement('canvas');atlas.width=4096;atlas.height=ROW*WORDS.length
    let layout=[]
    function drawAtlas(){
      const x=atlas.getContext('2d');x.clearRect(0,0,atlas.width,atlas.height);x.font=`${EM}px Anton`;x.textBaseline='alphabetic';x.fillStyle='#000';x.textAlign='left'
      x.letterSpacing='8px';let c=0;layout=[]
      WORDS.forEach((w,i)=>{
        const m=x.measureText(w).width+16;x.fillText(w,8,i*ROW+EM*.92+6)
        const uW=m/EM*.86;layout.push({len:uW,c:c+uW/2,u:m/atlas.width,top:i/WORDS.length,bot:(i+1)/WORDS.length});c+=uW+GAP
      })
    }
    const tex=(unit,filter)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t}
    const tSky=tex(0,gl.LINEAR_MIPMAP_LINEAR),tWords=tex(1,gl.LINEAR_MIPMAP_LINEAR),tJelly=tex(2,gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,255,0,255]))
    const aniso=gl.getExtension('EXT_texture_filter_anisotropic')
    function load(url){return new Promise(r=>{const i=new Image;i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=url})}

    const cols=56,ribbon=new Float32Array((cols+1)*4)
    for(let i=0;i<=cols;i++){ribbon.set([i/cols,0,i/cols,1],i*4)}
    const vaoW=gl.createVertexArray();gl.bindVertexArray(vaoW);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,ribbon,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0)
    const dots=[];let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647
    for(let i=0;i<40;i++)dots.push(rnd(),rnd(),rnd(),i%4?0:1)
    const vaoD=gl.createVertexArray();gl.bindVertexArray(vaoD);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dots),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0)
    const vaoE=gl.createVertexArray()

    const video=document.createElement('video');video.crossOrigin='anonymous';video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.src=VIDEO
    let W=1,H=1,dpr=1,asp=1,haveVid=false,lastT=-1
    function size(){dpr=Math.min(devicePixelRatio||1,2);W=Math.round(cv.clientWidth*dpr);H=Math.round(cv.clientHeight*dpr);cv.width=W;cv.height=H;asp=W/H;gl.viewport(0,0,W,H)}

    function pushVideo(){
      if(video.readyState<2||video.currentTime===lastT)return
      lastT=video.currentTime;haveVid=true;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tJelly);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video)
    }
    let target=0,now=0,mx=0,my=0,tmx=0,tmy=0
    function draw(s,sec){
      pushVideo()
      const n=WORDS.length,span=STEP*(n-1),k=clamp(s/span)*(n-1),i=Math.min(n-2,Math.floor(k)),f=k-i
      const c0=layout[i].c,c1=layout[i+1].c,head=c0+(c1-c0)*ease(f)
      const sink=ease(smooth(span+.015,span+.105,s))*6
      const grow=ease(smooth(span+.08,span+.22,s)),side=smooth(.76,.82,s)-2*smooth(.88,.94,s)
      // sky
      gl.disable(gl.BLEND);gl.useProgram(skyP.p);gl.bindVertexArray(vaoE)
      gl.uniform1i(skyP.u.T,0);const ca=asp/(16/9),fx=ca>1?1:ca,fy=ca>1?1/ca:1;gl.uniform3f(skyP.u.C,fx*.92,fy*.92,s*.05+sec*.0022);gl.drawArrays(gl.TRIANGLES,0,3)
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA)
      // points
      gl.useProgram(dotP.p);gl.bindVertexArray(vaoD);gl.uniform1f(dotP.u.S,sec);gl.uniform1f(dotP.u.H,head*.1+s*4);gl.uniform1f(dotP.u.P,dpr*H/dpr/900);gl.drawArrays(gl.POINTS,0,40)
      // words
      gl.useProgram(wordP.p);gl.bindVertexArray(vaoW);gl.uniform1i(wordP.u.T,1);gl.uniform1f(wordP.u.A,asp)
      const hs=clamp(asp*.58,.26,1);gl.uniform3f(wordP.u.L,hs,.19+.1*(1-hs),sink)
      layout.forEach(w=>{const t=w.c-head;if(Math.abs(t)>24)return
        gl.uniform4f(wordP.u.W,w.len*hs,t*hs,0,0);gl.uniform4f(wordP.u.B,0,w.top,w.u,w.bot);gl.drawArrays(gl.TRIANGLE_STRIP,0,(cols+1)*2)})
      // jellyfish
      gl.useProgram(jellyP.p);gl.bindVertexArray(vaoE);gl.uniform1i(jellyP.u.T,2)
      const h=(.98+grow*.42)*clamp(.62+asp*.4,.6,1),w=h*(1080/1920)/asp*(.93+.07*Math.cos(s*14))
      const roll=(.1*Math.sin(s*13+.4)+.03*Math.sin(sec*.5))*(1+grow*.5),co=Math.cos(roll),si=Math.sin(roll)
      const ox=(mx*.018+side*.34*Math.min(1,asp)),oy=.03+.018*Math.sin(sec*.8)+my*.018-grow*.1
      gl.uniformMatrix3fv(jellyP.u.M,false,[w*2*co,w*2*si*asp,0,-h*2*si/asp,h*2*co,0,ox,oy,1])
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4)
      ui(s,k)
    }
    let lastIdx=0;const marks=[...$('index').querySelectorAll('b')]
    function ui(s,k){
      const op=(a,b,c,d)=>smooth(a,b,s)*(1-smooth(c,d,s))
      const c1=1-smooth(.04,.08,s),c2=op(.08,.12,.56,.62);$('c1').style.opacity=c1;$('c2').style.opacity=c2;$('goggle').style.opacity=Math.max(c1,c2)
      const a=op(.72,.77,.84,.88),b=op(.9,.95,1.1,1.2)
      $('p1').style.opacity=a;$('p1').style.transform=`translateY(calc(-50% + ${(1-a)*18}px))`
      $('p2').style.opacity=b;$('p2').style.transform=`translateY(calc(-50% + ${(1-b)*18}px))`
      const idx=Math.round(k);if(idx!==lastIdx){marks[lastIdx].classList.remove('on');marks[idx].classList.add('on');lastIdx=idx}
      $('thumb').style.transform=`translateY(${(s*1011).toFixed(1)}%)`
    }
    const read=()=>{const r=$('track').getBoundingClientRect(),m=r.height-innerHeight;target=clamp(-r.top/m)}
    const onMove=e=>{tmx=e.clientX/innerWidth*2-1;tmy=1-e.clientY/innerHeight*2}
    function loop(t){
      if(dead)return
      now+=(target-now)*(calm?1:.1);mx+=(tmx-mx)*.05;my+=(tmy-my)*.05;draw(now,t/1000)
      raf=requestAnimationFrame(loop)
    }
    addEventListener('resize',size);addEventListener('scroll',read,{passive:true});addEventListener('pointermove',onMove)
    $('up').onclick=()=>scrollTo({top:0,behavior:calm?'auto':'smooth'})

    let ctx,gain
    $('sound').onclick=()=>{
      const b=$('sound'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);$('st').textContent=on?'ON':'OFF'
      if(!ctx){
        ctx=new AudioContext;gain=ctx.createGain();gain.gain.value=0
        const n=ctx.createBuffer(2,ctx.sampleRate*4,ctx.sampleRate)
        for(let c=0;c<2;c++){const d=n.getChannelData(c);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}}
        const src=ctx.createBufferSource();src.buffer=n;src.loop=true
        const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=520
        const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.09;lg.gain.value=240;lfo.connect(lg).connect(lp.frequency)
        src.connect(lp).connect(gain).connect(ctx.destination);src.start();lfo.start()
      }
      ctx.resume();gain.gain.setTargetAtTime(on?.34:0,ctx.currentTime,.4)
    }

    Promise.all([load(SKY),load(STILL),document.fonts.load(`${EM}px Anton`,'INKLENS')]).then(([sky,still])=>{
      if(dead)return
      drawAtlas()
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tSky);if(sky){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sky);gl.generateMipmap(gl.TEXTURE_2D)}
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tWords);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D)
      if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,8)
      if(still){gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tJelly);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,still)}
      if(!calm)video.play().catch(()=>{})
      size();read();now=target;raf=requestAnimationFrame(loop)
    })

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      removeEventListener('resize', size)
      removeEventListener('scroll', read)
      removeEventListener('pointermove', onMove)
      video.pause(); video.removeAttribute('src'); video.load()
      if (ctx) ctx.close()
    }
  }, [])

  return (
    <div className="dl" ref={rootRef}>
      <div className="track" id="track">
        <div className="view">
          <canvas id="gl" aria-label="A pink jellyfish drifting in a lilac sky with giant words wrapping around it"></canvas>
          <div className="ui">
            
            
            <div className="index" id="index" aria-hidden="true">
              <i></i><b className="on">01</b><i></i><i></i><i></i><b>02</b><i></i><i></i><i></i><b>03</b><i></i><i></i><i></i><b>04</b><i></i><i></i><i></i><b>05</b><i></i>
            </div>
            <div className="bar" aria-hidden="true"><i id="thumb"></i></div>
            <div className="cap">
              <svg id="goggle" viewBox="0 0 30 20" aria-hidden="true"><path fillRule="evenodd" d="M7 2h16a6 6 0 0 1 6 6v5a5 5 0 0 1-9 3l-2-3h-6l-2 3a5 5 0 0 1-9-3V8a6 6 0 0 1 6-6Zm1 5a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7Zm14 0a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7Z"/></svg>
              <p id="c1">Upload handwritten letters, words and essays <br />and watch a CNN and CRNN read every stroke</p>
              <p id="c2" style={{ opacity: 0 }}>Trained on EMNIST and IAM, read with TrOCR <br />and polished by AI essay correction</p>
            </div>
            <p className="panel p1" id="p1">Recognise every letter from A to Z and a to z with a CNN trained on EMNIST</p>
            <p className="panel p2" id="p2">Upload a handwritten essay and get a corrected version with grammar, spelling and style feedback.</p>
            <button className="sound" id="sound" aria-pressed="false" aria-label="Ambient sound">
              <span aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
              <em style={{ fontStyle: 'normal' }} id="st">OFF</em>
            </button>
            <button className="up" id="up" aria-label="Back to top">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V2M3 7l5-5 5 5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
