(function(){
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// stagger reveal delays
document.querySelectorAll('.rv').forEach(function(el){var p=el.parentElement,i=Array.prototype.indexOf.call(p.children,el);if(!rm&&i>0)el.style.transitionDelay=Math.min(i,6)*80+'ms'});
document.querySelectorAll('.rv').forEach(function(el){el.addEventListener('transitionend',function(){el.style.transitionDelay=''},{once:true})});
if(rm)document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
// carousel
var c=document.querySelector('.d3-car');
if(c){var tr=c.querySelector('.d3-track'),sl=c.querySelectorAll('.d3-slide'),n=sl.length,i=0,t=null,dots=c.parentElement.querySelectorAll('.d3-dots button'),paused=false;
function go(k){i=(k+n)%n;tr.style.transform='translateX('+(-100*i)+'%)';sl.forEach(function(s,j){s.classList.toggle('on',j===i);s.setAttribute('aria-hidden',j===i?'false':'true');var a=s.querySelectorAll('a');a.forEach(function(x){x.tabIndex=j===i?0:-1})});dots.forEach(function(d,j){d.setAttribute('aria-current',j===i?'true':'false')})}
function play(){stop();if(!rm&&!paused)t=setInterval(function(){go(i+1)},6000)}
function stop(){if(t)clearInterval(t);t=null}
var h=c.parentElement;
h.querySelector('.d3-prev').onclick=function(){go(i-1);play()};
h.querySelector('.d3-next').onclick=function(){go(i+1);play()};
dots.forEach(function(d,j){d.onclick=function(){go(j);play()}});
h.addEventListener('mouseenter',function(){paused=true;stop()});h.addEventListener('mouseleave',function(){paused=false;play()});
h.addEventListener('focusin',function(){paused=true;stop()});h.addEventListener('focusout',function(){paused=false;play()});
h.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){go(i-1)}else if(e.key==='ArrowRight'){go(i+1)}});
var x0=null;c.addEventListener('dragstart',function(e){e.preventDefault()});c.addEventListener('pointerdown',function(e){x0=e.clientX;if(e.pointerType==='mouse')e.preventDefault()});c.addEventListener('pointercancel',function(){x0=null});
c.addEventListener('pointerup',function(e){if(x0===null)return;var dx=e.clientX-x0;x0=null;if(Math.abs(dx)>40){go(i+(dx<0?1:-1));play()}});
c.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
c.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){go(i+(dx<0?1:-1));play()}},{passive:true});
document.addEventListener('visibilitychange',function(){document.hidden?stop():play()});
go(0);play();}
// 3D tilt (fine pointers only)
if(!rm&&window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
document.querySelectorAll('.svc,.strip .it,.step,.masonry figure').forEach(function(el){el.classList.add('d3-tilt');
el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;el.style.transform='rotateX('+(-py*8).toFixed(2)+'deg) rotateY('+(px*10).toFixed(2)+'deg) translateZ(0)'});
el.addEventListener('mouseleave',function(){el.style.transform=''})})}
})();
