/* Sample the supplied wordmark itself, retaining its rounded letterforms. */
(() => {
  'use strict';
  const canvas = document.getElementById('pixel-logo');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hero = canvas.closest('.hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const maskWidth=390;
  let points=[], width=0, height=0, frame=0, last=0, visible=true, ready=false, clock=0;
  const silhouette=new Set((window.BILICLIP_PIXEL_POINTS||[]).map(([x,y])=>x+','+y));
  const pointer={x:-10000,y:-10000};
  const erosion=Array.from({length:5},()=>({life:0}));
  function updateErosion(dt){
    for(const zone of erosion){
      zone.life-=dt*16.667;
      if(zone.life<=0){
        const center=points[Math.floor(Math.random()*points.length)];
        zone.x=center.x;zone.y=center.y;
        zone.radius=18+Math.random()*25;
        zone.duration=4500+Math.random()*4500;
        zone.life=zone.duration;zone.drift=3+Math.random()*5;
      }
      zone.y+=zone.drift*dt/60;
      const age=1-zone.life/zone.duration;
      zone.weight=Math.pow(Math.sin(Math.PI*age),.8);
    }
  }
  function erosionAt(x,y){
    let amount=0;
    for(const zone of erosion){
      const distance=Math.hypot(x-zone.x,(y-zone.y)*.8);
      if(distance<zone.radius)amount=Math.max(amount,zone.weight*Math.pow(1-distance/zone.radius,.65));
    }
    return amount;
  }

  function flowStep(dt){
    const scale=width*.99/maskWidth,left=width*.005,top=width<760?12:8;
    updateErosion(dt);
    for(const p of points){
      p.travel=(p.travel+p.speed*dt)%134;
      const x=left+p.x*scale+p.dx,y=top+((p.y+p.travel)%134)*scale+p.dy;
      const rx=x-pointer.x,ry=y-pointer.y,distance=Math.hypot(rx,ry);
      const target=erosionAt(p.x,(p.y+p.travel)%134);
      const mouseDamage=Math.max(0,1-distance/75);
      p.damage+=(Math.max(target,mouseDamage)-p.damage)*Math.min(1,dt*.09);
      p.baseDamage+=(erosionAt(p.x,p.y)-p.baseDamage)*Math.min(1,dt*.07);
      if(distance<75){
        const force=Math.pow(1-distance/75,1.6)*4.8;
        // Cursor displacement is temporary; the underlying stream remains vertical.
        const angle=distance>.1?Math.atan2(ry,rx):p.angle;
        p.vx+=Math.cos(angle)*force*dt;p.vy+=Math.sin(angle)*force*dt;
      }
      p.vx-=p.dx*.012*dt;p.vy-=p.dy*.012*dt;
      const damping=Math.pow(.86,dt);p.vx*=damping;p.vy*=damping;
      p.dx+=p.vx*dt;p.dy+=p.vy*dt;
    }
  }
  function resize(){
    const rect=hero.getBoundingClientRect();width=rect.width;height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw(clock);
  }
  function draw(time){
    ctx.clearRect(0,0,width,height);
    if(!ready)return;
    const wordWidth=width*.99,scale=wordWidth/maskWidth;
    const left=(width-wordWidth)/2,top=width<760?12:8;
    const size=Math.max(2,scale*1.62);
    const moving=!reduced.matches;
    for(const p of points){
      const baseX=left+p.x*scale,baseY=top+p.y*scale;
      ctx.fillStyle=p.color;
      // A quiet stationary silhouette holds the supplied wordmark shape.
      const intact=Math.min(1,Math.hypot(baseX-pointer.x,baseY-pointer.y)/60);
      ctx.globalAlpha=.12*intact*(1-p.baseDamage);ctx.fillRect(baseX+p.dx,baseY+p.dy,size,size);
      const localY=moving?(p.y+p.travel)%134:p.y;
      const inLetter=silhouette.has(p.x+','+(Math.round(localY/2)*2));
      const dissolve=moving?p.damage:0;
      const fragmentX=baseX+p.dx+Math.sin(p.angle)*dissolve*scale*8;
      const fragmentY=top+localY*scale+p.dy+dissolve*scale*(18+p.fragment*24);
      const alpha=1-dissolve*.9;
      // Each column only moves downward. Trails extend upward, never sideways.
      ctx.globalAlpha=(inLetter?.58:.035)*alpha;
      ctx.fillRect(fragmentX,fragmentY,size*(1-dissolve*.35),size);
      if(moving)for(let tail=1;tail<=3;tail++){
        const tailY=localY-tail*2.5;
        if(tailY<0)continue;
        const tailInLetter=silhouette.has(p.x+','+(Math.round(tailY/2)*2));
        ctx.globalAlpha=(tailInLetter?.26:.018)*(1-tail/4)*alpha;
        ctx.fillRect(fragmentX,fragmentY-tail*2.5*scale,size,size*.75);
      }
    }
    ctx.globalAlpha=1;
  }
  function tick(t){
    frame=0;if(!visible||document.hidden||reduced.matches||!ready)return;
    if(t-last>32){const elapsed=Math.min(t-last,50);clock+=elapsed;last=t;flowStep(elapsed/16.667,clock);draw(clock);}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=performance.now();
    if(ready&&visible&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
    else draw(clock);
  }
  points=(window.BILICLIP_PIXEL_POINTS||[]).map(([x,y])=>{
    return {x,y,travel:Math.random()*134,speed:.075+((x*73)%101)/101*.13,dx:0,dy:0,vx:0,vy:0,damage:0,baseDamage:0,fragment:Math.random(),angle:Math.random()*Math.PI*2,color:x<178?'#00a8dc':'#f04489'};
  });
  ready=points.length>0;
  if(ready){hero.classList.add('pixels-ready');resize();sync();}
  hero.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    const rect=hero.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-10000;});
  new ResizeObserver(resize).observe(hero);
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(hero);
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
})();
