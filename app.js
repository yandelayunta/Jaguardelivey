(() => {
  'use strict';
  const cfg = window.DELIVERY_CONFIG || {appName:'Jaguar Delivery',tagline:'Haz tus pedidos',whatsapp:'',city:'Juliaca',accent:'#F8C200',businesses:[]};
  document.documentElement.style.setProperty('--accent', /^#[0-9a-fA-F]{6}$/.test(cfg.accent) ? cfg.accent : '#F8C200');
  const $ = (id) => document.getElementById(id);
  const text = (element,value) => {element.textContent = String(value ?? '');};
  const names = (cfg.businesses || []).filter(b=>b.active !== false);
  let category='Todos', selected=null, toastTimer=null, lastFocused=null, pages=[], currentPage=0;
  // Banner editable desde admin.html. Compatible con configuraciones anteriores.
  const DEFAULT_HERO = 'assets/juliaca-motorizado.webp';
  const banner = typeof cfg.heroImage === 'string' ? cfg.heroImage : '';
  const safeBanner = (/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(banner) || /^assets\/[a-zA-Z0-9._/-]+$/.test(banner)) ? banner : DEFAULT_HERO;
  document.querySelector('.hero').style.backgroundImage = `url(${JSON.stringify(safeBanner)})`;
  text($('brand'),cfg.appName || 'Jaguar Delivery'); text($('footerName'),`${cfg.appName || 'Jaguar Delivery'} · Catálogo de pedidos`);
  text($('tagline'), cfg.tagline || 'Revisa la carta, escribe tu pedido y envíalo por WhatsApp.');
  text($('location'), `${cfg.city || 'Tu ciudad'}, Perú`); document.title = `${cfg.appName || 'Jaguar Delivery'} | Pedidos`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function categories(){const available=['Todos',...new Set(names.map(b=>b.category||'Otros'))];$('categories').innerHTML='';for (const name of available){const b=document.createElement('button');b.className='chip'+(name===category?' active':'');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(name===category));b.addEventListener('click',()=>{category=name;categories();render()});$('categories').append(b)}}
  function render(){ const search=$('search').value.trim().toLocaleLowerCase('es'); const matching=names.filter(b=>(category==='Todos'||(b.category||'Otros')===category)&&`${b.name} ${b.category} ${b.description}`.toLocaleLowerCase('es').includes(search));text($('count'),`${matching.length} negocio${matching.length===1?'':'s'}`);$('cards').innerHTML='';if(!matching.length){$('cards').innerHTML='<div class="empty">No encontramos negocios con esa búsqueda.</div>';return}
   for(const b of matching){const card=document.createElement('article');card.className='business-card';const img=(b.menuImages||[])[0]||'assets/sin-carta.svg';const pageTotal=(b.menuImages||[]).length;card.innerHTML=`<div class="card-image"><img loading="lazy" alt="Carta de ${esc(b.name)}" src="${esc(img)}"><span class="card-tag">${esc(b.category||'Otros')}</span>${pageTotal>1?`<span class="card-page-badge">${pageTotal} páginas</span>`:''}</div><div class="card-body"><h3>${esc(b.name)}</h3><p>${esc(b.description||'Mira la carta y realiza tu pedido.')}</p><button class="open-btn" type="button" aria-label="Ver carta y pedir en ${esc(b.name)}"><span>Ver carta y pedir</span><span aria-hidden="true">→</span></button></div>`;card.querySelector('button').addEventListener('click',()=>openBusiness(b));$('cards').append(card)}
  }
  // Carrusel: una página visible, flechas, contador y gesto de deslizamiento.
  const pageImage = $('menuImage'), zoomImage=$('zoomImage');
  const countLabel = i => `Página ${i+1} de ${pages.length}`;
  function renderPage(){
    if (!pages.length) return;
    pageImage.src=pages[currentPage];
    pageImage.alt=`${countLabel(currentPage)} de ${selected?.name||'la carta'}`;
    zoomImage.src=pages[currentPage];
    zoomImage.alt=`${countLabel(currentPage)} ampliada de ${selected?.name||'la carta'}`;
    text($('menuPageCounter'),countLabel(currentPage));
    text($('zoomPageCounter'),countLabel(currentPage));
    const disabledPrev=currentPage===0,disabledNext=currentPage===pages.length-1;
    $('menuPrev').disabled=disabledPrev;$('zoomPrev').disabled=disabledPrev;
    $('menuNext').disabled=disabledNext;$('zoomNext').disabled=disabledNext;
    $('menuCarousel').classList.toggle('single-page', pages.length<=1);
    $('lightbox').classList.toggle('single-page', pages.length<=1);
  }
  function changePage(step){
    const target=Math.max(0,Math.min(currentPage+step,pages.length-1));
    if(target!==currentPage){currentPage=target;renderPage()}
  }
  function openZoom(){
    if(!selected)return;
    renderPage();$('lightbox').classList.add('show');$('zoomClose').focus();
  }
  function closeZoom(){
    $('lightbox').classList.remove('show');$('menuPhoto').focus();
  }
  function openBusiness(b){
    selected=b;lastFocused=document.activeElement;
    pages=Array.isArray(b.menuImages)&&b.menuImages.length ? b.menuImages : ['assets/sin-carta.svg'];
    currentPage=0;
    text($('businessCategory'),b.category||'Negocio');
    text($('businessTitle'),b.name);
    renderPage();
    $('orderForm').reset();text($('subtotal'),'S/ 0.00');
    $('overlay').classList.add('open');document.body.style.overflow='hidden';$('close').focus();
  }
  function closeBusiness(){
    if($('lightbox').classList.contains('show')){closeZoom();return}
    $('overlay').classList.remove('open');document.body.style.overflow='';selected=null;pages=[];lastFocused?.focus?.();
  }
  $('menuPrev').addEventListener('click',()=>changePage(-1));
  $('menuNext').addEventListener('click',()=>changePage(1));
  $('zoomPrev').addEventListener('click',()=>changePage(-1));
  $('zoomNext').addEventListener('click',()=>changePage(1));
  $('menuPhoto').addEventListener('click',openZoom);
  $('zoomClose').addEventListener('click',closeZoom);
  $('close').addEventListener('click',closeBusiness);
  $('overlay').addEventListener('mousedown',e=>{if(e.target===$('overlay'))closeBusiness()});
  $('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox'))closeZoom()});
  // Swipe horizontal, sin impedir que el usuario haga scroll vertical.
  function addSwipe(element){
    let startX=0,startY=0;
    element.addEventListener('touchstart',e=>{
      if(e.touches.length!==1)return;
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;
    },{passive:true});
    element.addEventListener('touchend',e=>{
      if(!selected||e.changedTouches.length!==1)return;
      const dx=e.changedTouches[0].clientX-startX;
      const dy=e.changedTouches[0].clientY-startY;
      if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.25)changePage(dx<0?1:-1);
    },{passive:true});
  }
  addSwipe($('menuSlide'));addSwipe($('zoomView'));
  document.addEventListener('keydown',e=>{
    if(!$('overlay').classList.contains('open'))return;
    const zoomed=$('lightbox').classList.contains('show');
    if(e.key==='Escape'){e.preventDefault();zoomed?closeZoom():closeBusiness();return}
    if((e.key==='ArrowLeft'||e.key==='ArrowRight') && (zoomed || document.activeElement.closest?.('.menu-col'))){
      e.preventDefault();changePage(e.key==='ArrowLeft'?-1:1);return;
    }
    if(e.key==='Tab'){
      const root=zoomed?$('lightbox'):$('overlay');
      const focusables=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  $('amount').addEventListener('input',()=>{const amount=Number($('amount').value);text($('subtotal'),Number.isFinite(amount)&&amount>0?`S/ ${amount.toFixed(2)}`:'S/ 0.00')});$('search').addEventListener('input',render);
  function toast(message){text($('toast'),message);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5500)}
  function whatsappNumber(value){let n=String(value??'').replace(/\D/g,'');if(n.length===9&&n.startsWith('9'))n='51'+n;return /^\d{10,15}$/.test(n)?n:null}
  $('orderForm').addEventListener('submit',e=>{
   e.preventDefault();if(!selected||!e.currentTarget.reportValidity())return;const amount=Number($('amount').value);if(!Number.isFinite(amount)||amount<=0){toast('Escribe un monto válido.');$('amount').focus();return}
   const phone=whatsappNumber(cfg.whatsapp);if(!phone){toast('El administrador debe configurar el WhatsApp del delivery antes de recibir pedidos.');return}
   const customer=$('customer').value.trim(),caller=$('phone').value.trim(),address=$('address').value.trim(),order=$('order').value.trim();if(!customer||!caller||!address||!order){toast('Completa los campos obligatorios.');return}
   // Mensaje solo con texto: sin emojis ni simbolos decorativos.
   // Asi se evitan caracteres no compatibles al abrir el pedido en WhatsApp.
   const msg=[
     `*NUEVO PEDIDO - ${cfg.appName||'Delivery'}*`,
     '',
     `*Empresa:* ${selected.name}`,
     `*Pedido:*\n${order}`,
     `*Monto indicado:* S/ ${amount.toFixed(2)}`,
     `*Pago:* ${$('payment').value}`,
     '',
     `*Cliente:* ${customer}`,
     `*Teléfono:* ${caller}`,
     `*Dirección:* ${address}`,
     $('reference').value.trim()?`*Referencia:* ${$('reference').value.trim()}`:'',
     '',
     `*Precio, disponibilidad y costo de envío sujetos a confirmación.*`
   ].filter(Boolean).join('\n');
   const url=`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
   window.location.href=url;
  });
  categories();render();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
})();
