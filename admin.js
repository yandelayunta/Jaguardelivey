(() => {
  'use strict';
  const $ = id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let config=JSON.parse(JSON.stringify(window.DELIVERY_CONFIG||{}));
  if(!Array.isArray(config.businesses))config.businesses=[];
  let toastTimer;
  const MAX_MENU_PAGES=40;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5500)}
  for(const key of ['appName','tagline','city','whatsapp','accent']) {$(key).value=config[key]|| (key==='accent'?'#F8C200':'');$(key).addEventListener('input',()=>{config[key]=$(key).value;});}
  // La portada se guarda en datos.js, de modo que puede cambiarse por temporada sin tocar el CSS.
  const DEFAULT_HERO = 'assets/juliaca-motorizado.webp';
  if (!config.heroImage) config.heroImage = DEFAULT_HERO;
  const heroPreview = $('heroPreview');
  function updateHeroPreview(){ heroPreview.src = config.heroImage || DEFAULT_HERO; }
  updateHeroPreview();
  $('heroFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Selecciona una imagen JPG, PNG o WEBP.');return;}
    if(file.size>15*1024*1024){toast('La portada supera 15 MB. Elige otra imagen.');return;}
    try{
      config.heroImage = await compressedDataUrl(file, 1920, .84);
      updateHeroPreview();
      toast('Portada actualizada en el editor. Descarga datos.js para guardar el cambio.');
    }catch(err){toast('No se pudo procesar la portada. Comprueba el archivo.');}
  });
  $('resetHero').addEventListener('click',()=>{
    config.heroImage=DEFAULT_HERO; updateHeroPreview();
    toast('Portada original restaurada. Descarga datos.js para guardar el cambio.');
  });
  function render(){const root=$('businessEditors');root.innerHTML='';config.businesses.forEach((item,index)=>{
   const wrapper=document.createElement('section');wrapper.className='editor-card';wrapper.dataset.index=String(index);
   wrapper.innerHTML=`<div class="editor-card-head"><span class="editor-card-title">Empresa ${index+1}</span><button class="btn danger delete" type="button">✕ Eliminar</button></div><div class="editor-fields"><div class="field"><label>Nombre de la empresa</label><input class="biz-name" maxlength="90" value="${esc(item.name)}" placeholder="Ej.: Pollería San José"></div><div class="field"><label>Categoría</label><input class="biz-category" maxlength="60" value="${esc(item.category)}" list="categoryList" placeholder="Ej.: Pollerías"></div><div class="field full"><label>Descripción corta</label><input class="biz-desc" maxlength="180" value="${esc(item.description)}" placeholder="Ej.: Revisa nuestra carta"></div><div class="field full"><label class="checkline"><input class="biz-active" type="checkbox" ${item.active!==false?'checked':''}> Mostrar esta empresa a los clientes</label></div></div><div style="margin-top:12px"><strong style="font-size:13px">📸 Fotos de la carta</strong><p class="tiny" style="margin:6px 0 10px">Sube imágenes JPG, PNG o WEBP. Puedes poner varias fotos por empresa. Hasta 40 páginas por empresa. Se mostrarán de una en una con flechas.</p><label class="file-label">📷 Subir fotos <input class="photo-input" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><div class="editor-photo-row"></div><div class="field" style="margin:12px 0 0"><label>O pega la URL pública de una imagen</label><div style="display:flex;gap:7px"><input class="photo-url" type="url" placeholder="https://.../menu.jpg"><button class="btn ghost add-url" type="button">Añadir</button></div></div></div>`;
   wrapper.querySelector('.delete').addEventListener('click',()=>{if(confirm(`¿Eliminar ${item.name||'esta empresa'} del catálogo?`)){config.businesses.splice(index,1);render()}});
   [['.biz-name','name'],['.biz-category','category'],['.biz-desc','description']].forEach(([sel,key])=>{wrapper.querySelector(sel).addEventListener('input',e=>item[key]=e.target.value)});
   wrapper.querySelector('.biz-active').addEventListener('change',e=>item.active=e.target.checked);
   const photoInput=wrapper.querySelector('.photo-input');photoInput.addEventListener('change',async e=>{
     const files=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));photoInput.value=''; if((item.menuImages||[]).length+files.length>MAX_MENU_PAGES){toast(`Puedes subir hasta ${MAX_MENU_PAGES} páginas por empresa. Actualmente tienes ${(item.menuImages||[]).length}.`);return}
     let processed=0; for(const file of files){if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Solo se permiten imágenes JPG, PNG o WEBP.');continue}if(file.size>15*1024*1024){toast('La foto es muy grande (máximo 15 MB antes de comprimir).');continue}
       try{const url=await compressedDataUrl(file, 1450, .80);(item.menuImages ||= []).push(url);processed++; if(files.length>2)toast(`Procesando páginas: ${processed} de ${files.length}...`)}catch(err){toast('No se pudo procesar una foto. Revisa el formato.')}}updatePhotos(wrapper,item);toast(`Listo: ${processed} página(s) agregada(s). Descarga datos.js para guardar.`)
   });
   wrapper.querySelector('.add-url').addEventListener('click',()=>{const input=wrapper.querySelector('.photo-url'),url=input.value.trim();if(!/^https:\/\//i.test(url)){toast('La URL debe empezar con https://');return}if((item.menuImages||[]).length>=MAX_MENU_PAGES){toast(`Máximo ${MAX_MENU_PAGES} páginas por empresa.`);return}(item.menuImages ||= []).push(url);input.value='';updatePhotos(wrapper,item)});
   updatePhotos(wrapper,item);root.append(wrapper);
  })}
  function updatePhotos(wrapper,item){
    const area=wrapper.querySelector('.editor-photo-row');area.innerHTML='';
    const photos=item.menuImages||[];
    const summary=document.createElement('div');summary.className='photo-total';
    summary.textContent=`${photos.length} de ${MAX_MENU_PAGES} páginas. Usa las flechas pequeñas para ordenar.`;
    area.append(summary);
    if(!photos.length){const t=document.createElement('small');t.className='tiny';t.textContent='Aún no hay fotos. El cliente verá una imagen de aviso.';area.append(t)}
    for(let i=0;i<photos.length;i++){
      const holder=document.createElement('div');holder.className='editor-photo';
      const img=document.createElement('img');img.src=photos[i];img.alt=`Página ${i+1}`;img.loading='lazy';
      const number=document.createElement('span');number.className='photo-order';number.textContent=`${i+1}`;
      const remove=document.createElement('button');remove.type='button';remove.className='remove-photo';remove.textContent='×';remove.title=`Quitar página ${i+1}`;remove.setAttribute('aria-label',remove.title);
      remove.addEventListener('click',()=>{photos.splice(i,1);updatePhotos(wrapper,item)});
      const actions=document.createElement('div');actions.className='photo-actions';
      for(const [direction,sign,label] of [[-1,'←','Mover antes'],[1,'→','Mover después']]){
        const move=document.createElement('button');move.type='button';move.textContent=sign;
        move.disabled=i+direction<0||i+direction>=photos.length;
        move.title=`${label} la página ${i+1}`;move.setAttribute('aria-label',move.title);
        move.addEventListener('click',()=>{[photos[i],photos[i+direction]]=[photos[i+direction],photos[i]];updatePhotos(wrapper,item)});
        actions.append(move);
      }
      holder.append(img,number,remove,actions);area.append(holder);
    }
  }
  function compressedDataUrl(file, maxDimension=1300, quality=.77){return new Promise((resolve,reject)=>{const image=new Image();const u=URL.createObjectURL(file);image.onload=()=>{try{let w=image.naturalWidth,h=image.naturalHeight;if(!w||!h)throw Error('Imagen vacía');const scale=Math.min(1,maxDimension/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);URL.revokeObjectURL(u);resolve(canvas.toDataURL('image/jpeg',quality))}catch(err){URL.revokeObjectURL(u);reject(err)}};image.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Archivo inválido'))};image.src=u})}
  $('addBusiness').addEventListener('click',()=>{config.businesses.push({id:'negocio-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:'Nueva empresa',category:'Otros',description:'Revisa la carta y haz tu pedido.',menuImages:[],active:true});render();window.scrollTo({top:document.body.scrollHeight/3,behavior:'smooth'});toast('Empresa agregada. Puedes editar su nombre y subir su carta.')});
  $('download').addEventListener('click',()=>{
    const phone=String(config.whatsapp||'').replace(/\D/g,'');if(phone && !((phone.length===9&&phone.startsWith('9'))||(phone.startsWith('51')&&phone.length===11))){alert('Revisa el número de WhatsApp: usa 9 dígitos de Perú o 51 seguido de los 9 dígitos.');$('whatsapp').focus();return}
    if(!phone && !confirm('Aún no configuraste WhatsApp. Los clientes no podrán enviar pedidos. ¿Descargar de todas formas?'))return;
    const content='window.DELIVERY_CONFIG = '+JSON.stringify(config,null,2).replace(/</g,'\\u003c')+';\n';const blob=new Blob([content],{type:'text/javascript;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='datos.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),3000);toast('Archivo datos.js descargado. Reemplázalo en la carpeta del sitio.')
  });
  render();
})();
