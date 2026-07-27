const ICONS={success:'✓',error:'!',warning:'⚠',info:'i'};

export function createFeedbackCenter({documentRef=document}={}){
  const doc=documentRef;
  const toastRegion=doc.createElement('div');
  toastRegion.className='toast-region';
  toastRegion.setAttribute('aria-live','polite');
  toastRegion.setAttribute('aria-atomic','false');
  const dialogLayer=doc.createElement('div');
  dialogLayer.className='dialog-layer';
  dialogLayer.hidden=true;
  doc.body.append(toastRegion,dialogLayer);

  function notify(message,{type='info',title='',duration=3200}={}){
    const toast=doc.createElement('div');
    toast.className=`toast toast-${type}`;
    toast.setAttribute('role',type==='error'?'alert':'status');
    toast.innerHTML=`<span class="toast-icon" aria-hidden="true">${ICONS[type]||ICONS.info}</span><div><strong>${escapeHtml(title||defaultTitle(type))}</strong><p>${escapeHtml(message)}</p></div><button type="button" class="toast-close" aria-label="Cerrar notificación">×</button>`;
    const close=()=>{toast.classList.add('toast-out');setTimeout(()=>toast.remove(),180);};
    toast.querySelector('.toast-close').addEventListener('click',close);
    toastRegion.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('toast-in'));
    if(duration>0)setTimeout(close,duration);
    return close;
  }

  function confirm({title='Confirmar acción',message,confirmText='Confirmar',cancelText='Cancelar',danger=false}={}){
    return new Promise(resolve=>{
      const previousFocus=doc.activeElement;
      dialogLayer.hidden=false;
      dialogLayer.innerHTML=`<div class="dialog-backdrop" data-dialog-cancel></div><section class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMessage"><span class="dialog-kicker">NBA GLORY</span><h2 id="appDialogTitle">${escapeHtml(title)}</h2><p id="appDialogMessage">${escapeHtml(message||'¿Quieres continuar?')}</p><div class="dialog-actions"><button type="button" class="btn secondary" data-dialog-cancel>${escapeHtml(cancelText)}</button><button type="button" class="btn ${danger?'danger':''}" data-dialog-confirm>${escapeHtml(confirmText)}</button></div></section>`;
      const confirmButton=dialogLayer.querySelector('[data-dialog-confirm]');
      const close=value=>{dialogLayer.hidden=true;dialogLayer.innerHTML='';doc.removeEventListener('keydown',onKey);previousFocus?.focus?.();resolve(value);};
      const onKey=e=>{if(e.key==='Escape')close(false);if(e.key==='Tab')trapFocus(e,dialogLayer);};
      dialogLayer.querySelectorAll('[data-dialog-cancel]').forEach(el=>el.addEventListener('click',()=>close(false)));
      confirmButton.addEventListener('click',()=>close(true));
      doc.addEventListener('keydown',onKey);
      requestAnimationFrame(()=>confirmButton.focus());
    });
  }

  return {notify,confirm,success:(m,o={})=>notify(m,{...o,type:'success'}),error:(m,o={})=>notify(m,{...o,type:'error'}),warning:(m,o={})=>notify(m,{...o,type:'warning'}),info:(m,o={})=>notify(m,{...o,type:'info'})};
}

function defaultTitle(type){return type==='success'?'Completado':type==='error'?'Ha ocurrido un error':type==='warning'?'Atención':'Información';}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function trapFocus(event,root){const items=[...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled);if(items.length<2)return;const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
