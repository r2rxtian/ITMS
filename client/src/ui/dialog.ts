let activeDialog: HTMLElement | null = null;

export function showError(message: string, title = 'Something went wrong'): void {
  activeDialog?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'app-dialog-overlay';
  overlay.innerHTML = `<section class="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMessage">
    <div class="app-dialog-icon" aria-hidden="true">!</div>
    <div class="app-dialog-copy"><h2 id="appDialogTitle"></h2><p id="appDialogMessage"></p></div>
    <button class="app-dialog-close" type="button" aria-label="Close error">×</button>
    <button class="app-dialog-action" type="button">Okay</button>
  </section>`;
  overlay.querySelector<HTMLElement>('#appDialogTitle')!.textContent = title;
  overlay.querySelector<HTMLElement>('#appDialogMessage')!.textContent = message;
  document.body.append(overlay);
  activeDialog = overlay;
  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => { overlay.remove(); if (activeDialog === overlay) activeDialog = null; }, 160);
    window.removeEventListener('keydown', onKeydown);
  };
  const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
  overlay.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.addEventListener('click', close));
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  window.addEventListener('keydown', onKeydown);
  requestAnimationFrame(() => { overlay.classList.add('show'); overlay.querySelector<HTMLButtonElement>('.app-dialog-action')!.focus(); });
}

export function isDialogOpen(): boolean { return activeDialog !== null; }

export type FormDialogField = {
  name: string; label: string; value?: string | number | null;
  type?: 'text' | 'number' | 'textarea' | 'select'; required?: boolean;
  min?: number; step?: number; options?: Array<{label:string;value:string}>;
};

export function showFormDialog(title: string, fields: FormDialogField[], submitLabel = 'Save'): Promise<Record<string,string> | null> {
  activeDialog?.remove();
  return new Promise(resolve => {
    const overlay=document.createElement('div');overlay.className='app-dialog-overlay';
    const dialog=document.createElement('section');dialog.className='app-dialog form-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const heading=document.createElement('h2');heading.textContent=title;
    const closeButton=document.createElement('button');closeButton.className='app-dialog-close';closeButton.type='button';closeButton.setAttribute('aria-label','Close');closeButton.textContent='×';
    const form=document.createElement('form');form.className='admin-dialog-form';
    fields.forEach(field=>{const label=document.createElement('label');label.textContent=field.label;let control:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
      if(field.type==='textarea'){control=document.createElement('textarea');}
      else if(field.type==='select'){const select=document.createElement('select');field.options?.forEach(option=>{const node=document.createElement('option');node.value=option.value;node.textContent=option.label;select.append(node);});control=select;}
      else{const input=document.createElement('input');input.type=field.type??'text';if(field.min!==undefined)input.min=String(field.min);if(field.step!==undefined)input.step=String(field.step);control=input;}
      control.name=field.name;control.required=field.required??false;control.value=String(field.value??'');label.append(control);form.append(label);
    });
    const actions=document.createElement('div');actions.className='admin-dialog-actions';actions.innerHTML=`<button type="button" class="cancel">Cancel</button><button type="submit" class="save"></button>`;actions.querySelector<HTMLButtonElement>('.save')!.textContent=submitLabel;form.append(actions);dialog.append(heading,closeButton,form);overlay.append(dialog);document.body.append(overlay);activeDialog=overlay;
    const finish=(value:Record<string,string>|null)=>{window.removeEventListener('keydown',onKey);overlay.remove();if(activeDialog===overlay)activeDialog=null;resolve(value);};
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')finish(null);};window.addEventListener('keydown',onKey);
    closeButton.onclick=()=>finish(null);actions.querySelector<HTMLButtonElement>('.cancel')!.onclick=()=>finish(null);overlay.onclick=event=>{if(event.target===overlay)finish(null);};
    form.onsubmit=event=>{event.preventDefault();const values:Record<string,string>={};new FormData(form).forEach((value,key)=>values[key]=String(value));finish(values);};
    requestAnimationFrame(()=>{overlay.classList.add('show');form.querySelector<HTMLElement>('input,textarea,select')?.focus();});
  });
}

export function confirmAction(message: string, title = 'Confirm action', confirmLabel = 'Delete'): Promise<boolean> {
  return new Promise(resolve=>{
    activeDialog?.remove();const overlay=document.createElement('div');overlay.className='app-dialog-overlay';overlay.innerHTML=`<section class="app-dialog confirm-dialog" role="alertdialog" aria-modal="true"><div class="app-dialog-icon" aria-hidden="true">!</div><div class="app-dialog-copy"><h2></h2><p></p></div><div class="admin-dialog-actions"><button type="button" class="cancel">Cancel</button><button type="button" class="danger"></button></div></section>`;
    overlay.querySelector('h2')!.textContent=title;overlay.querySelector('p')!.textContent=message;overlay.querySelector<HTMLButtonElement>('.danger')!.textContent=confirmLabel;document.body.append(overlay);activeDialog=overlay;
    const finish=(value:boolean)=>{window.removeEventListener('keydown',onKey);overlay.remove();if(activeDialog===overlay)activeDialog=null;resolve(value);};const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')finish(false);};window.addEventListener('keydown',onKey);
    overlay.querySelector<HTMLButtonElement>('.cancel')!.onclick=()=>finish(false);overlay.querySelector<HTMLButtonElement>('.danger')!.onclick=()=>finish(true);overlay.onclick=event=>{if(event.target===overlay)finish(false);};requestAnimationFrame(()=>overlay.classList.add('show'));
  });
}
