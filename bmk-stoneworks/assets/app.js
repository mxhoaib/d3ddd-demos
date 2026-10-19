(function(){
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var s=[].slice.call(document.querySelectorAll('.slide')),d=[].slice.call(document.querySelectorAll('.dots button')),h=[].slice.call(document.querySelectorAll('.hd')),i=0,t;
function go(n){[s,d,h].forEach(function(a){a[i].classList.remove('on')});i=(n+s.length)%s.length;[s,d,h].forEach(function(a){a[i].classList.add('on')})}
d.forEach(function(b,n){b.addEventListener('click',function(){go(n);auto()})});
function auto(){clearInterval(t);if(!rm&&s.length>1)t=setInterval(function(){go(i+1)},5500)}auto();
var pv=document.querySelector('.arr.prev'),nx=document.querySelector('.arr.next');if(pv)pv.addEventListener('click',function(){go(i-1);auto()});if(nx)nx.addEventListener('click',function(){go(i+1);auto()});
var hx=document.querySelector('.hero'),sx=null;if(hx){hx.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});hx.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40){go(i+(dx<0?1:-1));auto()}sx=null},{passive:true})}
var r=document.querySelectorAll('.reveal');
if(rm||!('IntersectionObserver' in window)){r.forEach(function(e){e.classList.add('in')})}else{
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});r.forEach(function(e){io.observe(e)})}
if(!rm&&window.matchMedia('(hover: hover)').matches){document.querySelectorAll('.tilt').forEach(function(c){
c.addEventListener('mousemove',function(e){var b=c.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;c.style.transform='rotateY('+(x*10)+'deg) rotateX('+(-y*10)+'deg) translateZ(0)'});
c.addEventListener('mouseleave',function(){c.style.transform=''})})}
})();
