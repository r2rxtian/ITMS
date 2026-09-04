import { apiRequest, ApiError } from '../services/api';
import { confirmAction, showError, showFormDialog } from '../ui/dialog';
import { buildLocationHierarchy, setupCascadingLocationChain } from '../ui/cascading-location';

type PageName='Inventory'|'Stock Tracking'|'Categories'|'Locations'|'Plans'|'Reports'|'Settings';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const formatPeso=(value:number|string)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
const empty=(message:string)=>`<div class="module-empty"><strong>No records found</strong><span>${message}</span></div>`;
const shell=(_title:string,_description:string,actions='',body='')=>`<section class="module-view">${actions?`<div class="module-heading"><div class="module-actions">${actions}</div></div>`:''}<div class="module-body">${body||'<div class="module-loading">Loading data…</div>'}</div></section>`;
const button=(id:string,label:string,primary=false)=>`<button id="${id}" class="module-button ${primary?'primary':''}">${label}</button>`;

type TableState={page:number;limit:number;total:number;search:string};
const perPageOptions=(selected:number)=>[10,15,20].map(value=>`<option value="${value}" ${value===selected?'selected':''}>${value}</option>`).join('');
const pagination=(state:TableState)=>{const start=state.total?(state.page-1)*state.limit+1:0;const end=Math.min(state.page*state.limit,state.total);const pages=Math.max(1,Math.ceil(state.total/state.limit));return`<div class="table-pagination"><span>Showing <b>${start}–${end}</b> of <b>${state.total}</b></span><label>Rows per page <select class="per-page">${perPageOptions(state.limit)}</select></label><div><button class="page-prev" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="page-next" ${state.page>=pages?'disabled':''}>Next</button></div></div>`;};
const bindPagination=(body:HTMLElement,state:TableState,load:()=>Promise<void>)=>{body.querySelector<HTMLSelectElement>('.per-page')?.addEventListener('change',event=>{state.limit=Number((event.target as HTMLSelectElement).value);state.page=1;void load();});body.querySelector<HTMLButtonElement>('.page-prev')?.addEventListener('click',()=>{if(state.page>1){state.page--;void load();}});body.querySelector<HTMLButtonElement>('.page-next')?.addEventListener('click',()=>{if(state.page*state.limit<state.total){state.page++;void load();}});};
const bindSearch=(input:HTMLInputElement|undefined,onChange:(value:string)=>void)=>{if(!input)return;let timer=0;input.addEventListener('input',()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>onChange(input.value.trim()),250);});};

let rowMenuCleanup: (() => void) | null = null;
const bindRowMenus=(body:HTMLElement)=>{
  rowMenuCleanup?.();
  const close=()=>{
    body.querySelectorAll<HTMLElement>('.row-menu-popover.show').forEach(menu=>{
      menu.classList.remove('show');
      menu.style.removeProperty('left');
      menu.style.removeProperty('top');
      menu.previousElementSibling?.setAttribute('aria-expanded','false');
    });
  };
  body.querySelectorAll<HTMLButtonElement>('.kebab-button').forEach(button=>button.addEventListener('click',event=>{
    event.stopPropagation();
    const menu=button.nextElementSibling as HTMLElement|null;
    if(!menu)return;
    const opening=!menu.classList.contains('show');
    close();
    if(!opening)return;
    menu.classList.add('show');
    button.setAttribute('aria-expanded','true');
    if(window.innerWidth>650){
      const rect=button.getBoundingClientRect();
      const width=menu.offsetWidth||160;
      const height=menu.offsetHeight||140;
      let left=rect.right-width;
      left=Math.max(12,Math.min(window.innerWidth-width-12,left));
      const spaceBelow=window.innerHeight-rect.bottom;
      let top:number;
      if(spaceBelow<height+10&&rect.top>height+10){
        top=rect.top-height-6;
      }else{
        top=rect.bottom+6;
      }
      top=Math.max(12,Math.min(window.innerHeight-height-12,top));
      menu.style.left=`${Math.round(left)}px`;
      menu.style.top=`${Math.round(top)}px`;
    }
  }));
  body.querySelectorAll<HTMLButtonElement>('.row-menu-popover button').forEach(btn=>{
    btn.addEventListener('click',()=>close());
  });
  const onDocClick=(e:MouseEvent)=>{if(!(e.target as HTMLElement|null)?.closest('.row-menu'))close();};
  const onDocKey=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
  document.addEventListener('click',onDocClick);
  window.addEventListener('scroll',close,{passive:true,capture:true});
  window.addEventListener('resize',close,{passive:true});
  window.addEventListener('keydown',onDocKey);
  rowMenuCleanup=()=>{
    document.removeEventListener('click',onDocClick);
    window.removeEventListener('scroll',close,{capture:true});
    window.removeEventListener('resize',close);
    window.removeEventListener('keydown',onDocKey);
  };
};

export async function ensureSession():Promise<boolean>{try{await apiRequest('/auth/me');return true;}catch{return false;}}
export function showLogin(onSuccess:()=>void){
  const overlay=document.createElement('div');
  const rememberedEmail=localStorage.getItem('stockhub.rememberedEmail')??'';
  overlay.className='login-overlay';
  overlay.innerHTML=`<main class="login-shell">
    <section class="login-visual" aria-label="Inventory Management System">
      <div class="login-visual-shade"></div>
      <div class="login-identity">
        <svg viewBox="0 0 96 78" aria-hidden="true"><path d="M12 69V29L48 8l36 21v40H67V40H29v29Z"/><path d="M35 45h26v24H35zM48 45v24M35 55h26"/></svg>
        <strong>INVENTORY</strong><span>MANAGEMENT SYSTEM</span><i></i>
        <p>Track. Manage. Optimize.<br>All your inventory in one place.</p>
      </div>
      <div class="login-features" aria-label="System features">
        <div><span>▣</span><b>Real-time<br>Tracking</b></div>
        <div><span>▥</span><b>Stock<br>Analytics</b></div>
        <div><span>♧</span><b>Low Stock<br>Alerts</b></div>
        <div><span>⌖</span><b>Location<br>Management</b></div>
      </div>
    </section>
    <section class="login-form-side">
      <form class="login-card">
        <div class="login-shield" aria-hidden="true"><svg viewBox="0 0 48 54"><path d="M24 3c7 6 13 7 20 8v13c0 13-8 22-20 28C12 46 4 37 4 24V11c7-1 13-2 20-8Z"/><rect x="17" y="24" width="14" height="12" rx="2"/><path d="M20 24v-4a4 4 0 0 1 8 0v4M24 29v3"/></svg></div>
        <h2>Welcome Back!</h2><p>Sign in to continue to your account</p>
        <label>Username
          <span class="login-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><input name="email" type="email" required autocomplete="username" placeholder="Enter your email" value="${esc(rememberedEmail)}"></span>
        </label>
        <label>Password
          <span class="login-input"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg><input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"><button class="password-toggle" type="button" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></span>
        </label>
        <div class="login-options"><label class="remember-option"><input name="remember" type="checkbox" ${rememberedEmail?'checked':''}><span>Remember me</span></label><button class="forgot-password" type="button">Forgot password?</button></div>
        <div class="login-error" role="alert" aria-live="polite"></div>
        <button class="login-submit" type="submit"><span aria-hidden="true">⇥</span><span>Sign In</span></button>
      </form>
      <footer>© ${new Date().getFullYear()} StockHub Inventory Management System. All rights reserved.</footer>
    </section>
  </main>`;
  document.body.append(overlay);
  const form=overlay.querySelector<HTMLFormElement>('form')!;
  const password=form.elements.namedItem('password') as HTMLInputElement;
  const toggle=overlay.querySelector<HTMLButtonElement>('.password-toggle')!;
  toggle.onclick=()=>{const visible=password.type==='text';password.type=visible?'password':'text';toggle.setAttribute('aria-pressed',String(!visible));toggle.setAttribute('aria-label',visible?'Show password':'Hide password');};
  overlay.querySelector<HTMLButtonElement>('.forgot-password')!.onclick=()=>{overlay.querySelector<HTMLElement>('.login-error')!.textContent='Ask an administrator to reset your StockHub password.';};
  form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);const error=overlay.querySelector<HTMLElement>('.login-error')!;const submit=overlay.querySelector<HTMLButtonElement>('.login-submit')!;error.textContent='';submit.disabled=true;submit.lastElementChild!.textContent='Signing In…';try{await apiRequest('/auth/login',{method:'POST',body:JSON.stringify({email:data.get('email'),password:data.get('password')})});if(data.get('remember'))localStorage.setItem('stockhub.rememberedEmail',String(data.get('email')));else localStorage.removeItem('stockhub.rememberedEmail');overlay.remove();onSuccess();}catch(reason){error.textContent=reason instanceof Error?reason.message:'Sign in failed.';submit.disabled=false;submit.lastElementChild!.textContent='Sign In';}});
}

const warehouseTag=(name?:string,code?:string)=>{const norm=String(name||'').toLowerCase();const isEast=norm.includes('east')||String(code||'').toUpperCase().includes('EAST');const label=esc(name||'Main Warehouse');const codeTag=code?`<small class="wh-code">${esc(code)}</small>`:'';return`<span class="warehouse-badge ${isEast?'east-hub':'main-wh'}" title="Warehouse: ${label} (${esc(code||'')})"><span class="wh-icon">${isEast?'🏭':'🏢'}</span><b>${label}</b>${codeTag}</span>`;};

function openAddItemModal(categories:any[],locations:any[],onSuccess:()=>Promise<void>){
  const overlay=document.createElement('div');
  overlay.className='app-dialog-overlay';
  overlay.innerHTML=`
    <section class="app-dialog add-item-dialog" role="dialog" aria-modal="true" aria-labelledby="addItemModalTitle">
      <h2 id="addItemModalTitle"><span>📦</span> Add New Inventory Item</h2>
      <button class="app-dialog-close" type="button" aria-label="Close">×</button>
      <form class="add-item-form">
        <div class="form-section-title"><span>1</span> Item Identification</div>
        <div class="form-grid-2">
          <label>Item Name
            <input name="name" required placeholder="e.g. Cordless screwdriver">
          </label>
          <label>SKU (Stock Keeping Unit)
            <input name="sku" required placeholder="e.g. TL-001010" style="text-transform:uppercase">
          </label>
        </div>
        <div class="form-grid-2">
          <label>Category
            <select name="categoryId" required>
              <option value="">Select Category…</option>
              ${categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
            </select>
          </label>
          <label>Unit of Measure
            <input name="unit" value="unit" required placeholder="unit, pcs, box, etc.">
          </label>
        </div>

        <div class="form-section-title"><span>2</span> Stock Levels & Pricing</div>
        <div class="form-grid-3">
          <label>Initial Quantity
            <input name="initialQuantity" type="number" min="0" value="0" required>
          </label>
          <label>Unit Cost (PHP ₱)
            <input name="unitCost" type="number" min="0" step=".01" value="0.00" required>
          </label>
          <label>Reorder Level
            <input name="reorderLevel" type="number" min="0" value="10" required>
          </label>
        </div>
        <div class="form-grid-2">
          <label>Maximum Stock Limit (Optional)
            <input name="maximumStock" type="number" min="0" placeholder="Optional max cap">
          </label>
          <label>Initial Stock Reason
            <input name="initialStockReason" value="Initial stock entered during item creation." required>
          </label>
        </div>

        <div class="form-section-title"><span>3</span> Location Hierarchy & Assignment</div>
        <div class="stepped-location-card">
          <h4><span>📍</span> Storage Hierarchy Chain</h4>
          <div class="stepped-field tier-warehouse-step">
            <div class="stepped-field-header">
              <span class="stepped-field-title">1. Facility / Warehouse</span>
              <span class="tier-pill-badge tier-badge-warehouse">Facility</span>
            </div>
            <select name="warehouseId" id="addItemWarehouse" required>
              <option value="">Select Facility / Warehouse…</option>
            </select>
          </div>
          <div class="stepped-field tier-zone-step">
            <div class="stepped-field-header">
              <span class="stepped-field-title">2. Zone / Aisle / Shelf</span>
              <span class="tier-pill-badge tier-badge-zone">Zone</span>
            </div>
            <select name="sectionId" id="addItemZone" required disabled>
              <option value="">Select Warehouse first…</option>
            </select>
          </div>
          <div class="stepped-field tier-slot-step">
            <div class="stepped-field-header">
              <span class="stepped-field-title">3. Target Storage Location (Bin / Shelf / Slot)</span>
              <span class="tier-pill-badge tier-badge-slot">Pick Point</span>
            </div>
            <select name="locationId" id="addItemLocation" required disabled>
              <option value="">Select Zone first…</option>
            </select>
          </div>
          <div id="addItemBreadcrumb"></div>
          <div id="addItemCapacityPill" hidden></div>
        </div>

        <label>Description / Technical Notes
          <textarea name="description" placeholder="Optional item details, manufacturer notes, or handling instructions..."></textarea>
        </label>

        <div class="admin-dialog-actions">
          <button type="button" class="cancel">Cancel</button>
          <button type="submit" class="save" id="addItemSubmitBtn">Create Item</button>
        </div>
      </form>
    </section>
  `;

  document.body.append(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));

  const form=overlay.querySelector<HTMLFormElement>('.add-item-form')!;
  const closeBtn=overlay.querySelector<HTMLButtonElement>('.app-dialog-close')!;
  const cancelBtn=overlay.querySelector<HTMLButtonElement>('.cancel')!;
  const submitBtn=overlay.querySelector<HTMLButtonElement>('#addItemSubmitBtn')!;

  const close=()=>{
    overlay.classList.remove('show');
    setTimeout(()=>overlay.remove(),160);
    window.removeEventListener('keydown',onKey);
  };
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
  window.addEventListener('keydown',onKey);

  closeBtn.onclick=close;
  cancelBtn.onclick=close;
  overlay.onclick=(e)=>{if(e.target===overlay)close();};

  const hierarchy=buildLocationHierarchy(locations);
  setupCascadingLocationChain({
    hierarchy,
    warehouseSelect:form.querySelector<HTMLSelectElement>('#addItemWarehouse')!,
    zoneSelect:form.querySelector<HTMLSelectElement>('#addItemZone')!,
    locationSelect:form.querySelector<HTMLSelectElement>('#addItemLocation')!,
    breadcrumbContainer:form.querySelector<HTMLElement>('#addItemBreadcrumb'),
    pillContainer:form.querySelector<HTMLElement>('#addItemCapacityPill'),
    quantityInput:form.querySelector<HTMLInputElement>('[name="initialQuantity"]'),
    submitButton:submitBtn
  });

  form.onsubmit=async(e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    const bodyPayload={
      name:String(fd.get('name')||'').trim(),
      sku:String(fd.get('sku')||'').trim().toUpperCase(),
      description:fd.get('description')||null,
      categoryId:Number(fd.get('categoryId')),
      warehouseId:Number(fd.get('warehouseId')),
      locationId:Number(fd.get('locationId')),
      unit:String(fd.get('unit')||'unit').trim(),
      unitCost:Number(fd.get('unitCost')),
      reorderLevel:Number(fd.get('reorderLevel')),
      maximumStock:fd.get('maximumStock')?Number(fd.get('maximumStock')):null,
      initialQuantity:Number(fd.get('initialQuantity')||0),
      initialStockReason:String(fd.get('initialStockReason')||'Initial stock entered during item creation.').trim()
    };

    submitBtn.disabled=true;
    submitBtn.textContent='Creating…';

    try{
      await apiRequest('/items',{method:'POST',body:JSON.stringify(bodyPayload)});
      close();
      window.dispatchEvent(new CustomEvent('stockhub:mutation'));
      const toast=document.querySelector<HTMLElement>('#toast');
      const toastText=document.querySelector<HTMLElement>('#toastText');
      if(toast&&toastText){
        toastText.textContent=`Item "${bodyPayload.name}" added successfully`;
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'),3500);
      }
      await onSuccess();
    }catch(err){
      submitBtn.disabled=false;
      submitBtn.textContent='Create Item';
      showError(err instanceof Error?err.message:'Item could not be created.','Item creation failed');
    }
  };
}

async function inventory(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';
  root.innerHTML=shell('Inventory','Manage items, stock levels, and warehouse assignments.',button('refreshItems','Refresh')+(isAdmin?button('addInventory','+ Add Item',true):''));root.querySelector('.module-view')?.classList.add('inventory-view');
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const data:any=await apiRequest('/items?page=1&limit=100');body.innerHTML=data.items.length?`<div class="module-table-wrap"><table class="module-table"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Warehouse</th><th>Location</th><th>Quantity</th><th>Unit Cost</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.items.map((item:any)=>`<tr><td>${esc(item.sku)}</td><td class="full-name-cell"><b>${esc(item.name)}</b><small>${esc(item.description||'')}</small></td><td>${esc(item.category)}</td><td>${warehouseTag(item.warehouseName,item.warehouseCode)}</td><td>${esc(item.locationCode)}</td><td>${esc(item.quantity)}</td><td>${formatPeso(item.unitCost)}</td><td><span class="pill ${item.stockStatus==='In Stock'?'green':'orange'}">${esc(item.stockStatus)}</span></td><td class="row-menu-cell"><div class="row-menu"><button class="kebab-button" type="button" aria-label="Actions for ${esc(item.name)}" aria-expanded="false">⋮</button><div class="row-menu-popover"><button class="stock-in" data-id="${item.id}">Stock In</button><button class="stock-out" data-id="${item.id}">Stock Out</button>${isAdmin?`<button class="edit-item" data-id="${item.id}">Edit</button><button class="danger archive-item" data-id="${item.id}">Delete</button>`:''}</div></div></td></tr>`).join('')}</tbody></table></div>`:empty('Add your first inventory item.');
    body.querySelectorAll<HTMLButtonElement>('.kebab-button').forEach(button=>button.onclick=event=>{event.stopPropagation();const menu=button.nextElementSibling as HTMLElement;body.querySelectorAll<HTMLElement>('.row-menu-popover.show').forEach(open=>{if(open!==menu)open.classList.remove('show');});menu.classList.toggle('show');button.setAttribute('aria-expanded',String(menu.classList.contains('show')));});
    body.onclick=()=>body.querySelectorAll<HTMLElement>('.row-menu-popover.show').forEach(open=>open.classList.remove('show'));
    body.querySelectorAll<HTMLButtonElement>('.stock-in,.stock-out').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));const direction=control.classList.contains('stock-in')?'in':'out';const values=await showFormDialog(`${direction==='in'?'Stock In':'Stock Out'} — ${item.name}`,[{name:'quantity',label:'Quantity',type:'number',min:.01,step:.01,required:true},{name:'reason',label:'Reason or reference',type:'textarea',required:true}],direction==='in'?'Add Stock':'Remove Stock');if(!values)return;const quantity=Number(values.quantity);if(!Number.isFinite(quantity)||quantity<=0){showError('Enter a quantity greater than zero.','Invalid quantity');return;}try{await apiRequest(`/stock/${direction}`,{method:'POST',body:JSON.stringify({itemId:item.id,quantity,reason:values.reason})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Operation failed.','Stock operation failed');}});
    body.querySelectorAll<HTMLButtonElement>('.edit-item').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));try{const categories:any[]=await apiRequest('/categories');const values=await showFormDialog(`Edit ${item.name}`,[{name:'name',label:'Item name',value:item.name,required:true},{name:'description',label:'Description',value:item.description,type:'textarea'},{name:'categoryId',label:'Category',value:item.categoryId,type:'select',options:categories.map((entry:any)=>({label:entry.name,value:String(entry.id)}))},{name:'unitCost',label:'Unit cost (PHP ₱)',value:item.unitCost,type:'number',min:0,step:.01,required:true},{name:'reorderLevel',label:'Reorder level',value:item.reorderLevel,type:'number',min:0,required:true},{name:'maximumStock',label:'Maximum stock',value:item.maximumStock,type:'number',min:0}]);if(!values)return;await apiRequest(`/items/${item.id}`,{method:'PUT',body:JSON.stringify({name:values.name,description:values.description,categoryId:Number(values.categoryId),unitCost:Number(values.unitCost),reorderLevel:Number(values.reorderLevel),maximumStock:values.maximumStock?Number(values.maximumStock):null})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Item could not be updated.');}});
    body.querySelectorAll<HTMLButtonElement>('.archive-item').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));if(!await confirmAction(`Delete ${item.name}? Its transaction history will be preserved.`,'Delete inventory item'))return;try{await apiRequest(`/items/${item.id}`,{method:'DELETE'});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Item could not be deleted.');}});
  }catch(error){body.innerHTML=empty(error instanceof ApiError&&error.status===401?'Please sign in to view inventory.':'Inventory could not be loaded.');}};
  root.querySelector<HTMLButtonElement>('#refreshItems')!.onclick=load;root.querySelector<HTMLButtonElement>('#addInventory')?.addEventListener('click',async()=>{try{const [cats,locs]:any[]=await Promise.all([apiRequest('/categories'),apiRequest('/locations')]);openAddItemModal(cats,locs,load);}catch(e){showError(e instanceof Error?e.message:'Could not load form options.');}});await load();
}

async function transactions(root:HTMLElement){root.innerHTML=shell('Stock Tracking','Complete audit trail of inventory quantity changes.',button('refreshTransactions','Refresh'));const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const data:any=await apiRequest('/transactions?limit=100');body.innerHTML=data.transactions.length?`<div class="module-table-wrap"><table class="module-table"><thead><tr><th>Date</th><th>SKU</th><th>Item</th><th>Type</th><th>Change</th><th>Previous → New</th><th>User</th><th>Reason</th></tr></thead><tbody>${data.transactions.map((t:any)=>`<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${esc(t.sku)}</td><td>${esc(t.item)}</td><td>${esc(t.transactionType)}</td><td>${Number(t.quantityChange)>0?'+':''}${esc(t.quantityChange)}</td><td>${esc(t.previousQuantity)} → ${esc(t.newQuantity)}</td><td>${esc(t.performedBy)}</td><td>${esc(t.remarks)}</td></tr>`).join('')}</tbody></table></div>`:empty('Stock transactions will appear here.');}catch{body.innerHTML=empty('Transaction history could not be loaded.');}};root.querySelector<HTMLButtonElement>('#refreshTransactions')!.onclick=load;await load();}

async function inventoryPaged(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';const canStock=isAdmin||session.user.role==='STAFF';
  const state:TableState={page:1,limit:10,total:0,search:''};let categoryId=sessionStorage.getItem('stockhub.inventoryCategory')??'';sessionStorage.removeItem('stockhub.inventoryCategory');let warehouseFilter='';let status='all';
  const [categories,locations]:any[]=await Promise.all([apiRequest('/categories'),apiRequest('/locations')]);
  const warehouses=(locations||[]).filter((l:any)=>l.locationType==='WAREHOUSE');
  root.innerHTML=shell('Inventory','Manage items, stock levels, and warehouse assignments.',button('refreshItems','Refresh')+(isAdmin?button('addInventory','+ Add Item',true):''));
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{
    const params=new URLSearchParams({page:String(state.page),limit:String(state.limit),search:state.search,status});
    if(categoryId)params.set('categoryId',categoryId);
    if(warehouseFilter)params.set('warehouseId',warehouseFilter);
    const results:any[]=await Promise.all([apiRequest(`/items?${params}`),apiRequest('/reports/inventory-summary')]);const data=results[0];const summary=results[1];state.total=data.total;if(!data.items.length&&state.page>1){state.page--;return load();}
    const stats=`<section class="inventory-stats"><article class="blue"><span><svg viewBox="0 0 24 24"><path d="m5 7 7-4 7 4-7 4Z"/><path d="M5 7v10l7 4 7-4V7M12 11v10"/></svg></span><div><small>Total Items</small><b>${Number(summary.totalItems||0).toLocaleString()}</b><p>All inventory items</p></div></article><article class="orange"><span><svg viewBox="0 0 24 24"><path d="M4 19 9 13l4 3 7-9"/><path d="M16 7h4v4"/></svg></span><div><small>Low Stock Items</small><b>${Number(summary.lowStockItems||0).toLocaleString()}</b><p>Need attention</p></div></article><article class="red"><span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v9M8 12l4 4 4-4"/></svg></span><div><small>Out of Stock Items</small><b>${Number(summary.outOfStockItems||0).toLocaleString()}</b><p>Out of stock</p></div></article><article class="green"><span><svg viewBox="0 0 24 24"><path d="M12 3v18M16 7.5c0-2-1.8-3.5-4-3.5S8 5.2 8 7s1.4 2.7 4 3.2 4 1.5 4 3.7-1.8 4.1-4 4.1-4-1.5-4-3.5"/></svg></span><div><small>Total Inventory Value</small><b>${formatPeso(summary.inventoryValue)}</b><p>Across all items</p></div></article></section>`;
    const toolbar=`<div class="table-filterbar"><label class="table-search-wrap"><span>Search</span><input class="table-search" value="${esc(state.search)}" placeholder="Item name, SKU, warehouse, category or location"></label><label><span>Warehouse</span><select class="warehouse-filter"><option value="">All warehouses</option>${warehouses.map((w:any)=>`<option value="${w.id}" ${warehouseFilter===String(w.id)?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label><label><span>Category</span><select class="category-filter"><option value="">All categories</option>${categories.map((category:any)=>`<option value="${category.id}" ${String(category.id)===categoryId?'selected':''}>${esc(category.name)}</option>`).join('')}</select></label><label><span>Status</span><select class="status-filter"><option value="all" ${status==='all'?'selected':''}>All statuses</option><option value="in-stock" ${status==='in-stock'?'selected':''}>In Stock</option><option value="low-stock" ${status==='low-stock'?'selected':''}>Low Stock</option><option value="out-of-stock" ${status==='out-of-stock'?'selected':''}>Out of Stock</option></select></label></div>`;
    const table=data.items.length?`<div class="module-table-wrap"><table class="module-table"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Warehouse</th><th>Location</th><th>Quantity</th><th>Unit Cost</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.items.map((item:any)=>`<tr><td>${esc(item.sku)}</td><td class="full-name-cell"><b>${esc(item.name)}</b><small>${esc(item.description||'')}</small></td><td>${esc(item.category)}</td><td>${warehouseTag(item.warehouseName,item.warehouseCode)}</td><td>${esc(item.locationCode)}</td><td>${esc(item.quantity)}</td><td>${formatPeso(item.unitCost)}</td><td><span class="pill ${item.stockStatus==='In Stock'?'green':item.stockStatus==='Out of Stock'?'red':'orange'}">${esc(item.stockStatus)}</span></td><td class="row-menu-cell">${canStock||isAdmin?`<div class="row-menu"><button class="kebab-button" type="button" aria-label="Actions for ${esc(item.name)}" aria-expanded="false">⋮</button><div class="row-menu-popover"><button type="button" class="stock-in" data-id="${item.id}">Stock In</button><button type="button" class="stock-out" data-id="${item.id}">Stock Out</button>${isAdmin?`<button type="button" class="edit-item" data-id="${item.id}">Edit</button>`:''}<button type="button" class="danger archive-item" data-id="${item.id}">Delete</button></div></div>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:empty('No inventory items match the selected filters.');
    body.innerHTML=stats+toolbar+table+pagination(state);bindPagination(body,state,load);bindSearch(body.querySelector<HTMLInputElement>('.table-search')??undefined,value=>{state.search=value;state.page=1;void load();});body.querySelector<HTMLSelectElement>('.warehouse-filter')!.onchange=event=>{warehouseFilter=(event.target as HTMLSelectElement).value;state.page=1;void load();};body.querySelector<HTMLSelectElement>('.category-filter')!.onchange=event=>{categoryId=(event.target as HTMLSelectElement).value;state.page=1;void load();};body.querySelector<HTMLSelectElement>('.status-filter')!.onchange=event=>{status=(event.target as HTMLSelectElement).value;state.page=1;void load();};bindRowMenus(body);
    body.querySelectorAll<HTMLButtonElement>('.stock-in,.stock-out').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));const direction=control.classList.contains('stock-in')?'in':'out';const values=await showFormDialog(`${direction==='in'?'Stock In':'Stock Out'} — ${item.name}`,[{name:'quantity',label:'Quantity',type:'number',min:.01,step:.01,required:true},{name:'reason',label:'Reason or reference',type:'textarea',required:true}],direction==='in'?'Add Stock':'Remove Stock');if(!values)return;const quantity=Number(values.quantity);if(!Number.isFinite(quantity)||quantity<=0){showError('Enter a quantity greater than zero.','Invalid quantity');return;}try{await apiRequest(`/stock/${direction}`,{method:'POST',body:JSON.stringify({itemId:item.id,quantity,reason:values.reason})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Operation failed.','Stock operation failed');}});
    body.querySelectorAll<HTMLButtonElement>('.edit-item').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));const values=await showFormDialog(`Edit ${item.name}`,[{name:'name',label:'Item name',value:item.name,required:true},{name:'description',label:'Description',value:item.description,type:'textarea'},{name:'categoryId',label:'Category',value:item.categoryId,type:'select',options:categories.map((entry:any)=>({label:entry.name,value:String(entry.id)}))},{name:'unitCost',label:'Unit cost (PHP ₱)',value:item.unitCost,type:'number',min:0,step:.01,required:true},{name:'reorderLevel',label:'Reorder level',value:item.reorderLevel,type:'number',min:0,required:true},{name:'maximumStock',label:'Maximum stock',value:item.maximumStock,type:'number',min:0}]);if(!values)return;try{await apiRequest(`/items/${item.id}`,{method:'PUT',body:JSON.stringify({name:values.name,description:values.description,categoryId:Number(values.categoryId),unitCost:Number(values.unitCost),reorderLevel:Number(values.reorderLevel),maximumStock:values.maximumStock?Number(values.maximumStock):null})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Item could not be updated.');}});
    body.querySelectorAll<HTMLButtonElement>('.archive-item').forEach(control=>control.onclick=async()=>{const item=data.items.find((entry:any)=>entry.id===Number(control.dataset.id));if(!item)return;if(!await confirmAction(`Delete ${item.name}? Its transaction history will be preserved.`,'Delete inventory item'))return;try{await apiRequest(`/items/${item.id}`,{method:'DELETE'});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));const toast=document.querySelector<HTMLElement>('#toast');const toastText=document.querySelector<HTMLElement>('#toastText');if(toast&&toastText){toastText.textContent=`Item "${item.name}" deleted`;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500);}}catch(error){showError(error instanceof Error?error.message:'Item could not be deleted.','Delete item failed');}});
  }catch(error){body.innerHTML=empty(error instanceof ApiError&&error.status===401?'Please sign in to view inventory.':'Inventory could not be loaded.');}};
  root.querySelector<HTMLButtonElement>('#refreshItems')!.onclick=load;root.querySelector<HTMLButtonElement>('#addInventory')?.addEventListener('click',()=>openAddItemModal(categories,locations,load));await load();
}

async function transactionsPaged(root:HTMLElement){
  const state:TableState={page:1,limit:10,total:0,search:''};let type='all';root.innerHTML=shell('Stock Tracking','Complete audit trail of inventory quantity changes.',button('refreshTransactions','Refresh'));
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const params=new URLSearchParams({page:String(state.page),limit:String(state.limit),search:state.search,type});const data:any=await apiRequest(`/transactions?${params}`);state.total=data.total;if(!data.transactions.length&&state.page>1){state.page--;return load();}const toolbar=`<div class="table-filterbar"><label class="table-search-wrap"><span>Search</span><input class="table-search" value="${esc(state.search)}" placeholder="Item, SKU, user, location or reason"></label><label><span>Type</span><select class="type-filter"><option value="all">All transaction types</option>${['INITIAL_STOCK','STOCK_IN','STOCK_OUT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT'].map(value=>`<option value="${value}" ${type===value?'selected':''}>${value.replaceAll('_',' ')}</option>`).join('')}</select></label></div>`;const table=data.transactions.length?`<div class="module-table-wrap"><table class="module-table"><thead><tr><th>Date</th><th>SKU</th><th>Item</th><th>Type</th><th>Change</th><th>Previous → New</th><th>User</th><th>Reason</th></tr></thead><tbody>${data.transactions.map((t:any)=>`<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${esc(t.sku)}</td><td>${esc(t.item)}</td><td>${esc(t.transactionType)}</td><td>${Number(t.quantityChange)>0?'+':''}${esc(t.quantityChange)}</td><td>${esc(t.previousQuantity)} → ${esc(t.newQuantity)}</td><td>${esc(t.performedBy)}</td><td>${esc(t.remarks)}</td></tr>`).join('')}</tbody></table></div>`:empty('No transactions match the selected filters.');body.innerHTML=toolbar+table+pagination(state);bindPagination(body,state,load);bindSearch(body.querySelector<HTMLInputElement>('.table-search')??undefined,value=>{state.search=value;state.page=1;void load();});body.querySelector<HTMLSelectElement>('.type-filter')!.onchange=event=>{type=(event.target as HTMLSelectElement).value;state.page=1;void load();};}catch{body.innerHTML=empty('Transaction history could not be loaded.');}};root.querySelector<HTMLButtonElement>('#refreshTransactions')!.onclick=load;await load();
}

async function categories(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';root.innerHTML=shell('Categories','Organize inventory using reusable categories.',isAdmin?button('addCategory','+ Add Category',true):'');
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const data:any[]=await apiRequest('/categories');body.innerHTML=data.length?`<div class="module-grid">${data.map(category=>`<article class="record-card"><span>Category</span><h3>${esc(category.name)}</h3><p>${esc(category.description||'No description')}</p>${isAdmin?`<div class="record-actions"><button class="mini-action edit-category" data-id="${category.id}">Rename / Edit</button><button class="mini-action danger delete-category" data-id="${category.id}">Delete</button></div>`:''}</article>`).join('')}</div>`:empty('Create a category to organize items.');
    body.querySelectorAll<HTMLButtonElement>('.edit-category').forEach(control=>control.onclick=async()=>{const category=data.find(entry=>entry.id===Number(control.dataset.id));const values=await showFormDialog('Edit category',[{name:'name',label:'Category name',value:category.name,required:true},{name:'description',label:'Description',value:category.description,type:'textarea'}]);if(!values)return;try{await apiRequest(`/categories/${category.id}`,{method:'PUT',body:JSON.stringify(values)});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be updated.');}});
    body.querySelectorAll<HTMLButtonElement>('.delete-category').forEach(control=>control.onclick=async()=>{const category=data.find(entry=>entry.id===Number(control.dataset.id));if(!await confirmAction(`Delete the “${category.name}” category? Existing item records will remain intact.`,'Delete category'))return;try{await apiRequest(`/categories/${category.id}`,{method:'DELETE'});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be deleted.');}});
  }catch{body.innerHTML=empty('Categories could not be loaded.');}};
  root.querySelector<HTMLButtonElement>('#addCategory')?.addEventListener('click',async()=>{const values=await showFormDialog('Create category',[{name:'name',label:'Category name',required:true},{name:'description',label:'Description',type:'textarea'}],'Create');if(!values)return;try{await apiRequest('/categories',{method:'POST',body:JSON.stringify(values)});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be created.');}});await load();
}

async function categoriesStyled(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';let all:any[]=[];let search='';let status='all';let sort='name-asc';let view:'grid'|'list'='grid';
  const categoryIcon=(index:number)=>{const symbols=[`<path d="M5 8.5 12 4l7 4.5v8L12 21l-7-4.5Z"/><path d="m5 8.5 7 4.5 7-4.5M12 13v8"/>`,`<path d="M4 7h16v13H4zM7 4h10v3M8 11h8M8 15h5"/>`,`<path d="m13 2-8 11h6l-1 9 9-12h-6Z"/>`,`<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M19 9h3M2 15h3M19 15h3"/>`,`<path d="M7 4h10v9a5 5 0 0 1-10 0ZM5 21l4-4M19 21l-4-4"/>`,`<path d="M4 6h16v14H4zM8 3h8v3M8 10h8M8 14h5"/>`];return`<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[index%symbols.length]}</svg>`;};
  root.innerHTML=shell('Categories','Organize your inventory using reusable categories.');root.querySelector('.module-view')?.classList.add('categories-view');
  const render=()=>{const body=root.querySelector<HTMLElement>('.module-body')!;const active=all.filter(category=>Boolean(category.isActive)).length;const archived=all.length-active;const totalItems=all.reduce((sum,category)=>sum+Number(category.itemCount||0),0);let visible=all.filter(category=>(status==='all'||(status==='active')===Boolean(category.isActive))&&(category.name.toLowerCase().includes(search.toLowerCase())||String(category.description||'').toLowerCase().includes(search.toLowerCase())));visible=[...visible].sort((a,b)=>sort==='name-desc'?b.name.localeCompare(a.name):sort==='items-desc'?Number(b.itemCount)-Number(a.itemCount):sort==='items-asc'?Number(a.itemCount)-Number(b.itemCount):a.name.localeCompare(b.name));
    const toolbar=`<section class="category-toolbar"><label class="category-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="table-search" value="${esc(search)}" placeholder="Search categories..."></label><label><span>Status</span><select class="category-status"><option value="all" ${status==='all'?'selected':''}>All Statuses</option><option value="active" ${status==='active'?'selected':''}>Active</option><option value="archived" ${status==='archived'?'selected':''}>Archived</option></select></label><label><span>Sort by</span><select class="category-sort"><option value="name-asc" ${sort==='name-asc'?'selected':''}>Name: A–Z</option><option value="name-desc" ${sort==='name-desc'?'selected':''}>Name: Z–A</option><option value="items-desc" ${sort==='items-desc'?'selected':''}>Most items</option><option value="items-asc" ${sort==='items-asc'?'selected':''}>Fewest items</option></select></label><div class="category-toolbar-actions"><div class="category-view-toggle"><button class="grid-view ${view==='grid'?'active':''}" aria-label="Grid view">▦</button><button class="list-view ${view==='list'?'active':''}" aria-label="List view">☷</button></div><button class="category-export">⇩ Export</button>${isAdmin?`<button class="add-category-btn primary-action">+ Add Category</button>`:''}</div></section>`;
    const stats=`<section class="category-stats"><article class="blue"><span>${categoryIcon(0)}</span><div><small>Total Categories</small><b>${all.length}</b><p>${active} active categories</p></div></article><article class="green"><span>${categoryIcon(1)}</span><div><small>Active Categories</small><b>${active}</b><p>Currently in use</p></div></article><article class="orange"><span>${categoryIcon(5)}</span><div><small>Archived Categories</small><b>${archived}</b><p>${archived?'Kept for historical records':'No archived categories'}</p></div></article><article class="purple"><span>${categoryIcon(3)}</span><div><small>Total Items</small><b>${totalItems.toLocaleString()}</b><p>Across all categories</p></div></article></section>`;
    const grid=visible.length?`<section class="category-card-grid ${view==='list'?'list-mode':''}">${visible.map((category,index)=>`<article class="category-card"><div class="category-card-main"><span class="category-card-icon tone-${index%6}">${categoryIcon(index)}</span><div><div class="category-card-title"><h3>${esc(category.name)}</h3><span class="category-state ${category.isActive?'active':'archived'}">${category.isActive?'Active':'Archived'}</span></div><b>${Number(category.itemCount||0).toLocaleString()} items</b><p>${esc(category.description||'No description provided.')}</p></div></div><footer><button class="btn-action view-category-items" data-id="${category.id}">View Items</button>${isAdmin&&category.isActive?`<button class="btn-action edit-category" data-id="${category.id}">✎ Edit</button><button class="btn-action danger delete-category" data-id="${category.id}" aria-label="Delete ${esc(category.name)}">⌫ Delete</button>`:''}</footer></article>`).join('')}</section>`:empty('No categories match the selected filters.');
    body.innerHTML=toolbar+stats+grid;
    const input=body.querySelector<HTMLInputElement>('.category-search input')!;bindSearch(input,value=>{search=value;render();});body.querySelector<HTMLSelectElement>('.category-status')!.onchange=event=>{status=(event.target as HTMLSelectElement).value;render();};body.querySelector<HTMLSelectElement>('.category-sort')!.onchange=event=>{sort=(event.target as HTMLSelectElement).value;render();};body.querySelector<HTMLButtonElement>('.grid-view')!.onclick=()=>{view='grid';render();};body.querySelector<HTMLButtonElement>('.list-view')!.onclick=()=>{view='list';render();};
    body.querySelector<HTMLButtonElement>('.category-export')!.onclick=()=>{const csv=['Category,Status,Items,Description',...visible.map(category=>[category.name,category.isActive?'Active':'Archived',category.itemCount||0,category.description||''].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='stockhub-categories.csv';link.click();URL.revokeObjectURL(url);};
    body.querySelector<HTMLButtonElement>('.add-category-btn')?.addEventListener('click',async()=>{const values=await showFormDialog('Create category',[{name:'name',label:'Category name',required:true},{name:'description',label:'Description',type:'textarea'}],'Create');if(!values)return;try{await apiRequest('/categories',{method:'POST',body:JSON.stringify(values)});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be created.');}});
    body.querySelectorAll<HTMLButtonElement>('.view-category-items').forEach(control=>control.onclick=()=>{sessionStorage.setItem('stockhub.inventoryCategory',String(control.dataset.id));const globalSearch=document.querySelector<HTMLInputElement>('#globalSearch');if(globalSearch)globalSearch.value='';document.querySelector<HTMLButtonElement>('.nav-item[data-label="Inventory"]')?.click();});
    body.querySelectorAll<HTMLButtonElement>('.edit-category').forEach(control=>control.onclick=async()=>{const category=all.find(entry=>entry.id===Number(control.dataset.id));const values=await showFormDialog('Edit category',[{name:'name',label:'Category name',value:category.name,required:true},{name:'description',label:'Description',value:category.description,type:'textarea'}]);if(!values)return;try{await apiRequest(`/categories/${category.id}`,{method:'PUT',body:JSON.stringify(values)});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be updated.');}});
    body.querySelectorAll<HTMLButtonElement>('.delete-category').forEach(control=>control.onclick=async()=>{const category=all.find(entry=>entry.id===Number(control.dataset.id));if(!await confirmAction(`Delete the “${category.name}” category? It will be archived and its item history will remain available.`,'Delete category'))return;try{await apiRequest(`/categories/${category.id}`,{method:'DELETE'});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Category could not be deleted.');}});
  };
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{all=await apiRequest('/categories?includeArchived=true');render();}catch{body.innerHTML=empty('Categories could not be loaded.');}};
  await load();
}

async function locations(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';root.innerHTML=shell('Warehouse Locations','Review capacity and utilization across physical storage locations.',button('refreshLocations','Refresh')+(isAdmin?button('addLocation','+ Add Location',true):''));let current:any[]=[];
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{current=await apiRequest('/locations');body.innerHTML=current.length?`<div class="module-grid">${current.map(location=>{const pct=location.maximumCapacity?Math.round(Number(location.currentUsage)/Number(location.maximumCapacity)*100):0;return`<article class="record-card"><span>${esc(location.locationType)}</span><h3>${esc(location.name)} <small>${esc(location.code)}</small></h3><div class="record-progress"><i style="width:${Math.min(100,pct)}%"></i></div><p>${pct}% used · ${esc(location.currentUsage)} / ${esc(location.maximumCapacity)} units</p>${isAdmin?`<div class="record-actions"><button class="mini-action edit-location" data-id="${location.id}">Rename / Edit</button><button class="mini-action danger delete-location" data-id="${location.id}">Delete</button></div>`:''}</article>`}).join('')}</div>`:empty('No warehouse locations exist.');
    body.querySelectorAll<HTMLButtonElement>('.edit-location').forEach(control=>control.onclick=async()=>{const location=current.find(entry=>entry.id===Number(control.dataset.id));const values=await showFormDialog('Edit location',[{name:'name',label:'Location name',value:location.name,required:true},{name:'maximumCapacity',label:'Maximum capacity',value:location.maximumCapacity,type:'number',min:0,required:true},{name:'description',label:'Description',value:location.description,type:'textarea'}]);if(!values)return;try{await apiRequest(`/locations/${location.id}`,{method:'PUT',body:JSON.stringify({name:values.name,maximumCapacity:Number(values.maximumCapacity),description:values.description})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Location could not be updated.');}});
    body.querySelectorAll<HTMLButtonElement>('.delete-location').forEach(control=>control.onclick=async()=>{const location=current.find(entry=>entry.id===Number(control.dataset.id));if(!await confirmAction(`Delete ${location.name}? Empty sublocations will also be removed from active use.`,'Delete location'))return;try{await apiRequest(`/locations/${location.id}`,{method:'DELETE'});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Location could not be deleted.');}});
  }catch{body.innerHTML=empty('Locations could not be loaded.');}};
  root.querySelector<HTMLButtonElement>('#refreshLocations')!.onclick=load;root.querySelector<HTMLButtonElement>('#addLocation')?.addEventListener('click',async()=>{const values=await showFormDialog('Create location',[{name:'code',label:'Location code',required:true},{name:'name',label:'Location name',required:true},{name:'locationType',label:'Location type',type:'select',options:['WAREHOUSE','SECTION','SLOT','STORAGE'].map(value=>({label:value,value}))},{name:'parentLocationId',label:'Parent location',type:'select',options:[{label:'None',value:''},...current.map(location=>({label:`${location.name} (${location.code})`,value:String(location.id)}))]},{name:'maximumCapacity',label:'Maximum capacity',type:'number',min:0,required:true},{name:'description',label:'Description',type:'textarea'}],'Create');if(!values)return;try{await apiRequest('/locations',{method:'POST',body:JSON.stringify({code:values.code,name:values.name,locationType:values.locationType,parentLocationId:values.parentLocationId?Number(values.parentLocationId):null,maximumCapacity:Number(values.maximumCapacity),description:values.description})});await load();window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));}catch(error){showError(error instanceof Error?error.message:'Location could not be created.');}});await load();
}

async function locationsStyled(root:HTMLElement){
  const session:any=await apiRequest('/auth/me');const isAdmin=session.user.role==='ADMIN';let all:any[]=[];let search='';let type='all';let status='all';let sort='util-desc';
  const percent=(location:any)=>Number(location.maximumCapacity)>0?Math.round(Number(location.currentUsage)/Number(location.maximumCapacity)*100):0;
  const tone=(value:number)=>value>=95?'critical':value>=85?'high':value>=50?'moderate':'available';
  const toneLabel=(value:number)=>value>=95?'Critical':value>=85?'High Utilization':value>=50?'Moderate':'Available';
  const locationIcon=(kind:string)=>kind==='near'?'<path d="M12 4v9M12 17h.01"/><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/>':kind==='average'?'<path d="M4 19 9 13l4 3 7-9"/><path d="M16 7h4v4"/>':kind==='occupied'?'<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>':'<path d="m5 7 7-4 7 4-7 4Z"/><path d="M5 7v10l7 4 7-4V7M8 12h8M8 16h8"/>';

  root.innerHTML=shell('Warehouse Locations','Monitor capacity and utilization across all physical storage locations.');
  root.querySelector('.module-view')?.classList.add('locations-view');

  const render=()=>{
    const body=root.querySelector<HTMLElement>('.module-body')!;
    const warehouses=all.filter(l=>l.locationType==='WAREHOUSE');
    const warehouseIds=new Set(warehouses.map(w=>w.id));
    const sections=all.filter(l=>l.locationType==='SECTION'||(l.locationType!=='WAREHOUSE'&&(l.parentLocationId===null||warehouseIds.has(l.parentLocationId)||Number(l.childCount)>0)));
    const sectionIds=new Set(sections.map(s=>s.id));
    const slots=all.filter(l=>l.locationType==='SLOT'||l.locationType==='STORAGE'||(!warehouseIds.has(l.id)&&!sectionIds.has(l.id)));

    const occupied=all.filter(l=>Number(l.currentUsage)>0).length;
    const average=all.length?Math.round(all.reduce((sum,l)=>sum+percent(l),0)/all.length):0;
    const near=all.filter(l=>percent(l)>=85).length;

    const toolbar=`<section class="location-toolbar">
      <label class="location-search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input class="table-search" value="${esc(search)}" placeholder="Search locations, warehouses...">
      </label>
      <label>
        <span>Type</span>
        <select class="location-type">
          <option value="all" ${type==='all'?'selected':''}>All Types</option>
          <option value="WAREHOUSE" ${type==='WAREHOUSE'?'selected':''}>Warehouses</option>
          <option value="SECTION" ${type==='SECTION'?'selected':''}>Sections</option>
          <option value="SLOT" ${type==='SLOT'?'selected':''}>Slots</option>
          <option value="STORAGE" ${type==='STORAGE'?'selected':''}>Storage</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select class="location-status">
          <option value="all" ${status==='all'?'selected':''}>All Statuses</option>
          <option value="available" ${status==='available'?'selected':''}>Available</option>
          <option value="moderate" ${status==='moderate'?'selected':''}>Moderate</option>
          <option value="high" ${status==='high'?'selected':''}>High Utilization</option>
          <option value="critical" ${status==='critical'?'selected':''}>Critical</option>
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select class="location-sort">
          <option value="util-desc" ${sort==='util-desc'?'selected':''}>Utilization: High to Low</option>
          <option value="name-asc" ${sort==='name-asc'?'selected':''}>Name: A–Z</option>
          <option value="name-desc" ${sort==='name-desc'?'selected':''}>Name: Z–A</option>
          <option value="capacity-desc" ${sort==='capacity-desc'?'selected':''}>Capacity: High to Low</option>
        </select>
      </label>
      <div class="location-toolbar-buttons">
        <button class="refresh-locations">↻ Refresh</button>
        ${isAdmin?`
          <button class="add-warehouse-btn">🏢 + Add Warehouse</button>
          <button class="add-location">+ Add Location</button>
        `:''}
      </div>
    </section>`;

    const stats=`<section class="location-stats">
      <article class="blue">
        <span><svg viewBox="0 0 24 24">${locationIcon('total')}</svg></span>
        <div>
          <small>Total Facilities & Locations</small>
          <b>${all.length}</b>
          <p>${warehouses.length} Warehouse${warehouses.length===1?'':'s'} · ${sections.length} Section${sections.length===1?'':'s'} · ${slots.length} Slot${slots.length===1?'':'s'}</p>
        </div>
      </article>
      <article class="green">
        <span><svg viewBox="0 0 24 24">${locationIcon('occupied')}</svg></span>
        <div>
          <small>Occupied Facilities</small>
          <b>${occupied}</b>
          <p>${all.length?Math.round(occupied/all.length*100):0}% of all facilities</p>
        </div>
      </article>
      <article class="orange">
        <span><svg viewBox="0 0 24 24">${locationIcon('average')}</svg></span>
        <div>
          <small>Average Utilization</small>
          <b>${average}%</b>
          <p>Across all facilities</p>
        </div>
      </article>
      <article class="red">
        <span><svg viewBox="0 0 24 24">${locationIcon('near')}</svg></span>
        <div>
          <small>Near Capacity</small>
          <b>${near}</b>
          <p>Requiring attention</p>
        </div>
      </article>
    </section>`;

    const warehouseSectionsMap=new Map<number,any[]>();
    warehouses.forEach(w=>warehouseSectionsMap.set(w.id,[]));
    const sectionSlotsMap=new Map<number,any[]>();
    sections.forEach(s=>sectionSlotsMap.set(s.id,[]));
    const standaloneSections:any[]=[];

    sections.forEach(sec=>{
      if(sec.parentLocationId&&warehouseSectionsMap.has(sec.parentLocationId)){
        warehouseSectionsMap.get(sec.parentLocationId)!.push(sec);
      }else{
        standaloneSections.push(sec);
      }
    });

    slots.forEach(slot=>{
      if(slot.parentLocationId&&sectionSlotsMap.has(slot.parentLocationId)){
        sectionSlotsMap.get(slot.parentLocationId)!.push(slot);
      }else if(slot.parentLocationId&&warehouseSectionsMap.has(slot.parentLocationId)){
        warehouseSectionsMap.get(slot.parentLocationId)!.push(slot);
      }
    });

    const query=search.trim().toLowerCase();
    const matchesFilter=(loc:any)=>{
      const pct=percent(loc);
      const lvl=tone(pct);
      const matchesSearch=!query||loc.name.toLowerCase().includes(query)||loc.code.toLowerCase().includes(query)||String(loc.parentName||'').toLowerCase().includes(query)||String(loc.description||'').toLowerCase().includes(query);
      const matchesType=type==='all'||loc.locationType===type;
      const matchesStatus=status==='all'||lvl===status;
      return matchesSearch&&matchesType&&matchesStatus;
    };

    const sortFn=(a:any,b:any)=>{
      if(sort==='name-asc')return a.name.localeCompare(b.name);
      if(sort==='name-desc')return b.name.localeCompare(a.name);
      if(sort==='capacity-desc')return Number(b.maximumCapacity)-Number(a.maximumCapacity);
      return percent(b)-percent(a);
    };

    const renderSection=(section:any)=>{
      const secSlots=sectionSlotsMap.get(section.id)??[];
      const secUsed=percent(section);
      const secLevel=tone(secUsed);
      const matchingSlots=(query||status!=='all'||(type!=='all'&&type!=='SECTION'))?secSlots.filter(s=>matchesFilter(s)):secSlots;

      return `
      <div class="location-group ${secLevel}" data-group-id="${section.id}" style="margin-bottom:12px;">
        <div class="location-parent-card">
          <div class="location-parent-main">
            <div class="location-parent-identity">
              <span class="tier-pill-badge tier-badge-zone">📂 ZONE / AISLE</span>
              <div class="location-title-wrap">
                <h3>${esc(section.name)}</h3>
                <span class="location-code-tag">${esc(section.code)}</span>
              </div>
              ${section.description?`<p class="location-desc">${esc(section.description)}</p>`:''}
            </div>

            <div class="location-parent-stats">
              <div class="location-metric-pill">
                <small>Occupancy</small>
                <b class="${secLevel}">${secUsed}%</b>
              </div>
              <div class="location-progress-wrap">
                <div class="location-progress-bar">
                  <i class="${secLevel}" style="width:${Math.min(100,secUsed)}%"></i>
                </div>
                <div class="location-units-info">
                  <span><b>${Number(section.currentUsage).toLocaleString()}</b> / ${Number(section.maximumCapacity).toLocaleString()} units</span>
                  <span class="location-state-chip ${secLevel}"><i></i>${toneLabel(secUsed)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="location-parent-actions">
            <div class="location-meta-tags">
              <span class="meta-tag">▦ ${secSlots.length} Slots</span>
              <span class="meta-tag">◇ ${Number(section.skuCount).toLocaleString()} SKUs</span>
            </div>
            <div class="parent-btn-group">
              <button class="btn-action view-location" data-id="${section.id}" title="View section details">◉ View</button>
              ${isAdmin?`
                <button class="btn-action edit-location-card" data-id="${section.id}" title="Edit section">✎ Edit</button>
                <button class="btn-action add-sub-location" data-parent-id="${section.id}" data-parent-name="${esc(section.name)}" title="Add slot under ${esc(section.name)}">+ Add Slot</button>
                <button class="btn-action danger delete-location-card" data-id="${section.id}" title="Delete section">⌫ Delete</button>
              `:''}
              <button class="btn-action toggle-group" data-target="${section.id}" title="Toggle slots">▼</button>
            </div>
          </div>
        </div>

        <div class="location-children-wrap" id="children-${section.id}">
          <div class="location-tree-stem">
            <div class="tree-line"></div>
            <div class="tree-content">
              ${matchingSlots.length?`
                <div class="location-children-grid">
                  ${matchingSlots.map(child=>{
                    const childPct=percent(child);
                    const childTone=tone(childPct);
                    return `
                    <article class="location-child-card tier-slot-card ${childTone}">
                      <div class="child-card-header">
                        <div class="child-branch-indicator">
                          <span class="branch-icon">↳</span>
                          <span class="tier-pill-badge tier-badge-slot">📍 PICK POINT</span>
                        </div>
                        <span class="child-state-dot ${childTone}" title="${toneLabel(childPct)}"></span>
                      </div>

                      <div class="child-card-body">
                        <h4>${esc(child.name)}</h4>
                        <code class="child-code">${esc(child.code)}</code>
                        ${child.description?`<p class="child-desc">${esc(child.description)}</p>`:''}

                        <div class="child-capacity-meter">
                          <div class="child-meter-row">
                            <strong>${childPct}%</strong>
                            <span>${Number(child.currentUsage).toLocaleString()} / ${Number(child.maximumCapacity).toLocaleString()} units</span>
                          </div>
                          <div class="child-progress"><i class="${childTone}" style="width:${Math.min(100,childPct)}%"></i></div>
                        </div>

                        <div class="child-card-meta">
                          <span>◇ ${Number(child.skuCount).toLocaleString()} SKUs</span>
                        </div>
                      </div>

                      <div class="child-card-footer">
                        <button class="btn-sub-action view-location" data-id="${child.id}">View</button>
                        ${isAdmin?`
                          <button class="btn-sub-action edit-location-card" data-id="${child.id}">Edit</button>
                          <button class="btn-sub-action danger delete-location-card" data-id="${child.id}">Delete</button>
                        `:''}
                      </div>
                    </article>
                    `;
                  }).join('')}
                </div>
              `:`
                <div class="empty-sublocations">
                  <span class="empty-sub-icon">↳</span>
                  <span>No sub-locations configured in this section.</span>
                  ${isAdmin?`<button class="add-sub-location text-btn" data-parent-id="${section.id}" data-parent-name="${esc(section.name)}">+ Add first slot</button>`:''}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
      `;
    };

    const visibleWarehouseCards:string[]=[];
    const sortedWarehouses=[...warehouses].sort(sortFn);

    sortedWarehouses.forEach(wh=>{
      const whSections=(warehouseSectionsMap.get(wh.id)??[]).sort(sortFn);
      const whMatches=matchesFilter(wh);
      const matchingSections=whSections.filter(sec=>{
        const secMatches=matchesFilter(sec);
        const secSlots=sectionSlotsMap.get(sec.id)??[];
        const anySlotMatches=secSlots.some(s=>matchesFilter(s));
        return secMatches||anySlotMatches;
      });

      if(type==='WAREHOUSE'){
        if(whMatches){
          const whUsed=percent(wh);
          const whLevel=tone(whUsed);
          visibleWarehouseCards.push(`
          <div class="location-group facility-warehouse ${whLevel}" data-group-id="${wh.id}">
            <div class="location-parent-card facility-header">
              <div class="location-parent-main">
                <div class="location-parent-identity">
                  <span class="tier-pill-badge tier-badge-warehouse">🏢 FACILITY</span>
                  <div class="location-title-wrap">
                    <h3>${esc(wh.name)}</h3>
                    <span class="location-code-tag">${esc(wh.code)}</span>
                  </div>
                  ${wh.description?`<p class="location-desc">${esc(wh.description)}</p>`:''}
                </div>

                <div class="location-parent-stats">
                  <div class="location-metric-pill">
                    <small>Occupancy</small>
                    <b class="${whLevel}">${whUsed}%</b>
                  </div>
                  <div class="location-progress-wrap">
                    <div class="location-progress-bar">
                      <i class="${whLevel}" style="width:${Math.min(100,whUsed)}%"></i>
                    </div>
                    <div class="location-units-info">
                      <span><b>${Number(wh.currentUsage).toLocaleString()}</b> / ${Number(wh.maximumCapacity).toLocaleString()} units</span>
                      <span class="location-state-chip ${whLevel}"><i></i>${toneLabel(whUsed)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="location-parent-actions">
                <div class="location-meta-tags">
                  <span class="meta-tag">🏢 ${whSections.length} Sections</span>
                  <span class="meta-tag">◇ ${Number(wh.skuCount).toLocaleString()} SKUs</span>
                </div>
                <div class="parent-btn-group">
                  <button class="btn-action view-location" data-id="${wh.id}" title="View warehouse details">◉ View</button>
                  ${isAdmin?`
                    <button class="btn-action edit-location-card" data-id="${wh.id}" title="Edit warehouse">✎ Edit</button>
                    <button class="btn-action add-section-btn" data-warehouse-id="${wh.id}" data-warehouse-name="${esc(wh.name)}" title="Add section under ${esc(wh.name)}">+ Add Section</button>
                    <button class="btn-action danger delete-location-card" data-id="${wh.id}" title="Delete warehouse">⌫ Delete</button>
                  `:''}
                </div>
              </div>
            </div>
          </div>
          `);
        }
        return;
      }

      if(whMatches||matchingSections.length>0){
        const sectionsToRender=(query||status!=='all'||type!=='all')?matchingSections:whSections;
        const whUsed=percent(wh);
        const whLevel=tone(whUsed);

        visibleWarehouseCards.push(`
        <div class="location-group facility-warehouse ${whLevel}" data-group-id="${wh.id}">
          <div class="location-parent-card facility-header">
            <div class="location-parent-main">
              <div class="location-parent-identity">
                <span class="tier-pill-badge tier-badge-warehouse">🏢 FACILITY</span>
                <div class="location-title-wrap">
                  <h3>${esc(wh.name)}</h3>
                  <span class="location-code-tag">${esc(wh.code)}</span>
                </div>
                ${wh.description?`<p class="location-desc">${esc(wh.description)}</p>`:''}
              </div>

              <div class="location-parent-stats">
                <div class="location-metric-pill">
                  <small>Occupancy</small>
                  <b class="${whLevel}">${whUsed}%</b>
                </div>
                <div class="location-progress-wrap">
                  <div class="location-progress-bar">
                    <i class="${whLevel}" style="width:${Math.min(100,whUsed)}%"></i>
                  </div>
                  <div class="location-units-info">
                    <span><b>${Number(wh.currentUsage).toLocaleString()}</b> / ${Number(wh.maximumCapacity).toLocaleString()} units</span>
                    <span class="location-state-chip ${whLevel}"><i></i>${toneLabel(whUsed)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="location-parent-actions">
              <div class="location-meta-tags">
                <span class="meta-tag">🏢 ${whSections.length} Sections</span>
                <span class="meta-tag">◇ ${Number(wh.skuCount).toLocaleString()} SKUs</span>
              </div>
              <div class="parent-btn-group">
                <button class="btn-action view-location" data-id="${wh.id}" title="View warehouse details">◉ View</button>
                ${isAdmin?`
                  <button class="btn-action edit-location-card" data-id="${wh.id}" title="Edit warehouse">✎ Edit</button>
                  <button class="btn-action add-section-btn" data-warehouse-id="${wh.id}" data-warehouse-name="${esc(wh.name)}" title="Add section under ${esc(wh.name)}">+ Add Section</button>
                  <button class="btn-action danger delete-location-card" data-id="${wh.id}" title="Delete warehouse">⌫ Delete</button>
                `:''}
                <button class="btn-action toggle-group" data-target="${wh.id}" title="Toggle warehouse sections">▼</button>
              </div>
            </div>
          </div>

          <div class="location-children-wrap facility-sections" id="children-${wh.id}">
            <div class="location-tree-stem">
              <div class="tree-line"></div>
              <div class="tree-content">
                ${sectionsToRender.length?`
                  <div class="warehouse-sections-list" style="display:flex; flex-direction:column; gap:12px;">
                    ${sectionsToRender.map(renderSection).join('')}
                  </div>
                `:`
                  <div class="empty-sublocations">
                    <span class="empty-sub-icon">🏢</span>
                    <span>No storage sections configured in this warehouse facility.</span>
                    ${isAdmin?`<button class="add-section-btn text-btn" data-warehouse-id="${wh.id}" data-warehouse-name="${esc(wh.name)}">+ Add first section</button>`:''}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
        `);
      }
    });

    if(standaloneSections.length>0&&type!=='WAREHOUSE'){
      const matchingStandalone=standaloneSections.filter(sec=>{
        const secMatches=matchesFilter(sec);
        const secSlots=sectionSlotsMap.get(sec.id)??[];
        const anySlotMatches=secSlots.some(s=>matchesFilter(s));
        return secMatches||anySlotMatches;
      }).sort(sortFn);

      if(matchingStandalone.length>0){
        visibleWarehouseCards.push(`
        <div class="location-group" data-group-id="-1">
          <div class="location-parent-card">
            <div class="location-parent-main">
              <div class="location-parent-identity">
                <span class="parent-type-badge">STANDALONE SECTIONS</span>
                <div class="location-title-wrap">
                  <h3>Unassigned Sections & Storage</h3>
                  <span class="location-code-tag">GENERAL</span>
                </div>
                <p class="location-desc">Storage sections operating independently without parent warehouse assignment</p>
              </div>
            </div>
            <div class="location-parent-actions">
              <div class="location-meta-tags">
                <span class="meta-tag">▦ ${matchingStandalone.length} Sections</span>
              </div>
              <button class="btn-action toggle-group" data-target="-1" title="Toggle sections">▼</button>
            </div>
          </div>

          <div class="location-children-wrap" id="children--1">
            <div class="location-tree-stem">
              <div class="tree-line"></div>
              <div class="tree-content">
                <div class="warehouse-sections-list" style="display:flex; flex-direction:column; gap:12px;">
                  ${matchingStandalone.map(renderSection).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
        `);
      }
    }

    const cards=visibleWarehouseCards.length
      ?`<section class="location-hierarchy">${visibleWarehouseCards.join('')}</section>`
      :empty('No locations or warehouse facilities match the selected filters.');

    body.innerHTML=toolbar+stats+cards;

    const input=body.querySelector<HTMLInputElement>('.location-search input')!;
    bindSearch(input,value=>{search=value;render();});
    body.querySelector<HTMLSelectElement>('.location-type')!.onchange=event=>{type=(event.target as HTMLSelectElement).value;render();};
    body.querySelector<HTMLSelectElement>('.location-status')!.onchange=event=>{status=(event.target as HTMLSelectElement).value;render();};
    body.querySelector<HTMLSelectElement>('.location-sort')!.onchange=event=>{sort=(event.target as HTMLSelectElement).value;render();};
    body.querySelector<HTMLButtonElement>('.refresh-locations')!.onclick=load;

    body.querySelectorAll<HTMLButtonElement>('.toggle-group').forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        const group=btn.closest('.location-group');
        group?.classList.toggle('collapsed');
      };
    });

    const openCreateWarehouseDialog=async()=>{
      const values=await showFormDialog('Provision Warehouse Facility',[
        {name:'code',label:'Warehouse Code',placeholder:'e.g. WH-NORTH',required:true},
        {name:'name',label:'Warehouse Name',placeholder:'e.g. North Logistics Center',required:true},
        {name:'maximumCapacity',label:'Total Facility Capacity (Units)',type:'number',min:0,required:true},
        {name:'description',label:'Facility Address / Description',type:'textarea',placeholder:'Physical building address, bay specifications, or notes'}
      ],'Provision Warehouse');
      if(!values)return;
      try{
        await apiRequest('/locations',{
          method:'POST',
          body:JSON.stringify({
            code:values.code,
            name:values.name,
            locationType:'WAREHOUSE',
            parentLocationId:null,
            maximumCapacity:Number(values.maximumCapacity),
            description:values.description
          })
        });
        await load();
        window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));
      }catch(error){
        showError(error instanceof Error?error.message:'Warehouse facility could not be created.');
      }
    };

    const openCreateLocationDialog=async(defaultParentId?:string,defaultType:string='SECTION')=>{
      const parentOptions:Array<{label:string;value:string}>=[{label:'None (Root Section)',value:''}];
      warehouses.forEach(w=>{
        parentOptions.push({label:`🏢 Warehouse: ${w.name} (${w.code})`,value:String(w.id)});
      });
      sections.forEach(s=>{
        parentOptions.push({label:`  ↳ Section: ${s.name} (${s.code})`,value:String(s.id)});
      });

      const values=await showFormDialog('Create Storage Location',[
        {name:'code',label:'Location Code',placeholder:'e.g. SEC-B or SLOT-B1',required:true},
        {name:'name',label:'Location Name',placeholder:'e.g. Receiving Bay or Shelf Rack 1',required:true},
        {
          name:'locationType',
          label:'Location Type',
          type:'select',
          value:defaultType,
          options:[
            {label:'Section / Zone',value:'SECTION'},
            {label:'Slot / Bin',value:'SLOT'},
            {label:'Storage Area',value:'STORAGE'}
          ]
        },
        {
          name:'parentLocationId',
          label:'Parent Facility / Section',
          type:'select',
          value:defaultParentId??'',
          options:parentOptions
        },
        {name:'maximumCapacity',label:'Maximum Capacity (Units)',type:'number',min:0,required:true},
        {name:'description',label:'Description',type:'textarea'}
      ],'Create Location');
      if(!values)return;
      try{
        await apiRequest('/locations',{
          method:'POST',
          body:JSON.stringify({
            code:values.code,
            name:values.name,
            locationType:values.locationType,
            parentLocationId:values.parentLocationId?Number(values.parentLocationId):null,
            maximumCapacity:Number(values.maximumCapacity),
            description:values.description
          })
        });
        await load();
        window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));
      }catch(error){
        showError(error instanceof Error?error.message:'Location could not be created.');
      }
    };

    body.querySelector<HTMLButtonElement>('.add-warehouse-btn')?.addEventListener('click',()=>openCreateWarehouseDialog());
    body.querySelector<HTMLButtonElement>('.add-location')?.addEventListener('click',()=>openCreateLocationDialog());
    body.querySelectorAll<HTMLButtonElement>('.add-section-btn').forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        openCreateLocationDialog(btn.dataset.warehouseId,'SECTION');
      };
    });
    body.querySelectorAll<HTMLButtonElement>('.add-sub-location').forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        openCreateLocationDialog(btn.dataset.parentId,'SLOT');
      };
    });
    body.querySelectorAll<HTMLButtonElement>('.view-location').forEach(control=>control.onclick=()=>window.dispatchEvent(new CustomEvent('stockhub:view-location',{detail:{id:Number(control.dataset.id)}})));
    body.querySelectorAll<HTMLButtonElement>('.edit-location-card').forEach(control=>control.onclick=async()=>{
      const location=all.find(entry=>entry.id===Number(control.dataset.id));
      if(!location)return;
      const isWh=location.locationType==='WAREHOUSE';
      const values=await showFormDialog(isWh?'Edit Warehouse Facility':'Edit Location',[
        {name:'name',label:isWh?'Warehouse Name':'Location Name',value:location.name,required:true},
        {name:'maximumCapacity',label:'Maximum Capacity (Units)',value:location.maximumCapacity,type:'number',min:0,required:true},
        {name:'description',label:isWh?'Facility Address / Description':'Description',value:location.description,type:'textarea'}
      ]);
      if(!values)return;
      try{
        await apiRequest(`/locations/${location.id}`,{method:'PUT',body:JSON.stringify({name:values.name,maximumCapacity:Number(values.maximumCapacity),description:values.description})});
        await load();
        window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));
      }catch(error){
        showError(error instanceof Error?error.message:'Location could not be updated.');
      }
    });
    body.querySelectorAll<HTMLButtonElement>('.delete-location-card').forEach(control=>control.onclick=async()=>{
      const location=all.find(entry=>entry.id===Number(control.dataset.id));
      if(!location)return;
      const isWh=location.locationType==='WAREHOUSE';
      const message=isWh
        ?`Delete warehouse ${location.name}? All empty child sections and slots will also be removed. Active items will prevent deletion.`
        :`Delete ${location.name}? Empty sublocations will also be removed from active use.`;
      if(!await confirmAction(message,isWh?'Delete Warehouse':'Delete Location'))return;
      try{
        await apiRequest(`/locations/${location.id}`,{method:'DELETE'});
        await load();
        window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent:false}}));
      }catch(error){
        showError(error instanceof Error?error.message:'Location could not be deleted.');
      }
    });
  };

  const load=async()=>{
    const body=root.querySelector<HTMLElement>('.module-body')!;
    try{
      all=await apiRequest('/locations');
      render();
    }catch{
      body.innerHTML=empty('Locations could not be loaded.');
    }
  };
  await load();
}


async function reports(root:HTMLElement){root.innerHTML=shell('Reports','Live inventory valuation and category breakdown.',button('refreshReports','Refresh'));const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const [summary,categories]:any[]=await Promise.all([apiRequest('/reports/inventory-summary'),apiRequest('/reports/category-breakdown')]);body.innerHTML=`<div class="report-stats"><article><span>Total Items</span><b>${esc(summary.totalItems)}</b></article><article><span>Total Units</span><b>${esc(summary.totalUnits)}</b></article><article><span>Inventory Value</span><b>${formatPeso(summary.inventoryValue)}</b></article><article><span>Low / Out</span><b>${esc(summary.lowStockItems)} / ${esc(summary.outOfStockItems)}</b></article></div><div class="module-table-wrap"><table class="module-table"><thead><tr><th>Category</th><th>SKUs</th><th>Units</th><th>Value (PHP)</th></tr></thead><tbody>${categories.map((c:any)=>`<tr><td>${esc(c.category)}</td><td>${esc(c.skuCount)}</td><td>${esc(c.totalUnits)}</td><td>${formatPeso(c.inventoryValue)}</td></tr>`).join('')}</tbody></table></div>`;}catch{body.innerHTML=empty('Reports could not be loaded.');}};root.querySelector<HTMLButtonElement>('#refreshReports')!.onclick=load;await load();}

async function settings(root: HTMLElement) {
  root.innerHTML = shell('Settings', 'Account, session, and system security configuration.', '', '<div class="module-loading">Loading account…</div>');
  const body = root.querySelector<HTMLElement>('.module-body')!;
  try {
    const data: any = await apiRequest('/auth/me');
    const user = data.user;
    const roleClass = user.role === 'ADMIN' ? 'green' : user.role === 'STAFF' ? 'orange' : 'blue';
    const eyeSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeOffSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

    body.innerHTML = `
      <div class="settings-shell">
        <article class="settings-card">
          <div class="avatar">${esc(user.name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase())}</div>
          <div class="settings-user-info">
            <h3>${esc(user.name)}</h3>
            <p>${esc(user.email)}</p>
            <span class="pill ${roleClass}">${esc(user.role)}</span>
          </div>
          <button id="logoutUser" class="module-button" type="button">Sign out</button>
        </article>

        <section class="settings-panel">
          <header class="settings-panel-head">
            <div class="settings-panel-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h3>Security &amp; Password</h3>
              <p>Change your account password. Must be at least 8 characters long.</p>
            </div>
          </header>

          <div class="settings-panel-body">
            <form id="changePasswordForm" class="settings-form" novalidate>
              <div class="settings-form-group">
                <label for="currentPassword">Current Password</label>
                <div class="settings-input-wrap">
                  <input id="currentPassword" name="currentPassword" type="password" required autocomplete="current-password" placeholder="Enter current password">
                  <button type="button" class="settings-toggle-pass" aria-label="Show password" data-for="currentPassword">${eyeSvg}</button>
                </div>
              </div>

              <div class="settings-form-group">
                <label for="newPassword">
                  New Password
                  <small>Min. 8 characters</small>
                </label>
                <div class="settings-input-wrap">
                  <input id="newPassword" name="newPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Enter new password">
                  <button type="button" class="settings-toggle-pass" aria-label="Show password" data-for="newPassword">${eyeSvg}</button>
                </div>
              </div>

              <div class="settings-form-group">
                <label for="confirmPassword">Confirm New Password</label>
                <div class="settings-input-wrap">
                  <input id="confirmPassword" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Re-enter new password">
                  <button type="button" class="settings-toggle-pass" aria-label="Show password" data-for="confirmPassword">${eyeSvg}</button>
                </div>
              </div>

              <div id="passwordMessage" class="settings-form-message" role="alert" aria-live="polite"></div>

              <div class="settings-actions">
                <button type="submit" id="savePasswordBtn" class="module-button primary">Update Password</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    `;

    body.querySelector<HTMLButtonElement>('#logoutUser')!.onclick = async () => {
      await apiRequest('/auth/logout', { method: 'POST' });
      location.reload();
    };

    body.querySelectorAll<HTMLButtonElement>('.settings-toggle-pass').forEach(toggleBtn => {
      toggleBtn.onclick = () => {
        const targetId = toggleBtn.dataset.for!;
        const input = body.querySelector<HTMLInputElement>(`#${targetId}`)!;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? eyeOffSvg : eyeSvg;
        toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      };
    });

    const form = body.querySelector<HTMLFormElement>('#changePasswordForm')!;
    const messageEl = body.querySelector<HTMLElement>('#passwordMessage')!;
    const submitBtn = body.querySelector<HTMLButtonElement>('#savePasswordBtn')!;

    const showMessage = (text: string, type: 'error' | 'success') => {
      messageEl.textContent = text;
      messageEl.className = `settings-form-message show ${type}`;
    };

    const hideMessage = () => {
      messageEl.textContent = '';
      messageEl.className = 'settings-form-message';
    };

    form.onsubmit = async event => {
      event.preventDefault();
      hideMessage();

      const currentPassword = (form.elements.namedItem('currentPassword') as HTMLInputElement).value;
      const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
      const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

      if (!currentPassword) {
        showMessage('Please enter your current password.', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showMessage('New password must be at least 8 characters long.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showMessage('New password and confirmation do not match.', 'error');
        return;
      }
      if (currentPassword === newPassword) {
        showMessage('New password must be different from your current password.', 'error');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Updating Password…';

      try {
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        form.reset();
        body.querySelectorAll<HTMLButtonElement>('.settings-toggle-pass').forEach(btn => {
          const targetId = btn.dataset.for!;
          const input = body.querySelector<HTMLInputElement>(`#${targetId}`)!;
          input.type = 'password';
          btn.innerHTML = eyeSvg;
          btn.setAttribute('aria-label', 'Show password');
        });

        showMessage('Password changed successfully!', 'success');

        const toast = document.querySelector<HTMLElement>('#toast');
        const toastText = document.querySelector<HTMLElement>('#toastText');
        if (toast && toastText) {
          toastText.textContent = 'Password updated successfully';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3500);
        }
      } catch (err: any) {
        showMessage(err instanceof Error ? err.message : 'Could not change password.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    };
  } catch {
    body.innerHTML = empty('Account details could not be loaded.');
  }
}

async function reportsPaged(root:HTMLElement){
  const state:TableState={page:1,limit:10,total:0,search:''};let summary:any;let categories:any[]=[];root.innerHTML=shell('Reports','Live inventory valuation and category breakdown.');root.querySelector('.module-view')?.classList.add('reports-view');
  const render=()=>{const body=root.querySelector<HTMLElement>('.module-body')!;const filtered=categories.filter(category=>category.category.toLowerCase().includes(state.search.toLowerCase()));state.total=filtered.length;const pages=Math.max(1,Math.ceil(state.total/state.limit));if(state.page>pages)state.page=pages;const rows=filtered.slice((state.page-1)*state.limit,state.page*state.limit);body.innerHTML=`<div class="report-stats"><article class="blue"><span class="report-stat-icon"><svg viewBox="0 0 24 24"><path d="m5 7 7-4 7 4-7 4Z"/><path d="M5 7v10l7 4 7-4V7M12 11v10"/></svg></span><div><small>Total Items</small><b>${esc(summary.totalItems)}</b><p>Inventory records</p></div></article><article class="purple"><span class="report-stat-icon"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg></span><div><small>Total Units</small><b>${esc(summary.totalUnits)}</b><p>Units on hand</p></div></article><article class="green"><span class="report-stat-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M16 7.5c0-2-1.8-3.5-4-3.5S8 5.2 8 7s1.4 2.7 4 3.2 4 1.5 4 3.7-1.8 4.1-4 4.1-4-1.5-4-3.5"/><path d="m17 18 2 2 3-4"/></svg></span><div><small>Inventory Value</small><b>${formatPeso(summary.inventoryValue)}</b><p>Total asset value</p></div></article><article class="orange"><span class="report-stat-icon"><svg viewBox="0 0 24 24"><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg></span><div><small>Low / Out</small><b>${esc(summary.lowStockItems)} / ${esc(summary.outOfStockItems)}</b><p>Items requiring attention</p></div></article></div><div class="table-filterbar"><label class="table-search-wrap"><span>Search</span><input class="table-search" value="${esc(state.search)}" placeholder="Search category"></label><button class="report-refresh">↻ Refresh</button></div>${rows.length?`<div class="module-table-wrap"><table class="module-table"><thead><tr><th>Category</th><th>SKUs</th><th>Units</th><th>Value (PHP)</th></tr></thead><tbody>${rows.map((category:any)=>`<tr><td>${esc(category.category)}</td><td>${esc(category.skuCount)}</td><td>${esc(category.totalUnits)}</td><td>${formatPeso(category.inventoryValue)}</td></tr>`).join('')}</tbody></table></div>`:empty('No category reports match your search.')}${pagination(state)}`;bindPagination(body,state,async()=>render());bindSearch(body.querySelector<HTMLInputElement>('.table-search')??undefined,value=>{state.search=value;state.page=1;render();});body.querySelector<HTMLButtonElement>('.report-refresh')!.onclick=load;};
  const load=async()=>{const body=root.querySelector<HTMLElement>('.module-body')!;try{const results:any[]=await Promise.all([apiRequest('/reports/inventory-summary'),apiRequest('/reports/category-breakdown')]);summary=results[0];categories=results[1];render();}catch{body.innerHTML=empty('Reports could not be loaded.');}};await load();
}

async function plansPaged(root: HTMLElement) {
  let activeWarehouseId = Number(localStorage.getItem('stockhub.plans.warehouseId')) || Number(localStorage.getItem('stockhub.activeWarehouseId')) || 1;
  let currentDate = new Date();
  let objectiveFilter = 'ALL';
  let logFilter = 'ALL';
  let summary: any = null;
  let objectives: any[] = [];
  let floorLogs: any[] = [];
  let warehouses: any[] = [];
  let storageLocations: any[] = [];

  function getWeekDetails(targetDate: Date) {
    const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = d.getUTCFullYear();

    const monday = new Date(targetDate);
    const currentDay = monday.getDay() || 7;
    monday.setDate(monday.getDate() - currentDay + 1);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      year,
      weekNumber,
      monday,
      sunday,
      rangeLabel: `${fmt(monday)} – ${fmt(sunday)}, ${year}`
    };
  }

  function getActiveWarehouseName(): string {
    const found = warehouses.find(w => w.id === activeWarehouseId);
    return found ? found.name : 'Active Warehouse';
  }

  const render = () => {
    const weekInfo = getWeekDetails(currentDate);
    const whName = getActiveWarehouseName();

    const filteredObjectives = objectives.filter(o => {
      if (objectiveFilter === 'ALL') return true;
      return o.status === objectiveFilter;
    });

    const filteredLogs = floorLogs.filter(l => {
      if (logFilter === 'ALL') return true;
      return l.logType === logFilter;
    });

    const pendingCount = objectives.filter(o => o.status === 'PENDING').length;
    const inProgCount = objectives.filter(o => o.status === 'IN_PROGRESS').length;
    const compCount = objectives.filter(o => o.status === 'COMPLETED').length;

    root.innerHTML = `
      <section class="module-view plans-view">
        <div class="plans-topbar">
          <div class="plans-scope-badge">
            <div class="plans-wh-switcher" title="Select which warehouse to manage weekly plans for">
              <label for="plansWarehouseSelect" class="plans-wh-label">
                <span class="wh-icon">🏢</span>
                <span class="wh-text">Warehouse:</span>
              </label>
              <select id="plansWarehouseSelect" class="plans-wh-select" aria-label="Select warehouse for weekly plans">
                ${warehouses.map(w => `<option value="${w.id}" ${w.id === activeWarehouseId ? 'selected' : ''}>${esc(w.name)} (${esc(w.code)})</option>`).join('')}
              </select>
            </div>

            <div class="plans-week-nav">
              <button class="week-nav-btn prev" title="Previous Week">‹ Prev Week</button>
              <span class="week-label">Week ${weekInfo.weekNumber} · <b>${weekInfo.rangeLabel}</b></span>
              <button class="week-nav-btn next" title="Next Week">Next Week ›</button>
              <button class="week-nav-btn current" title="Reset to Current Week">Current Week</button>
            </div>
          </div>
          <div class="plans-actions">
            <button class="module-button primary btn-add-objective">+ New Objective</button>
            <button class="module-button btn-add-log">+ Log Floor Note</button>
            <button class="module-button btn-refresh-plans">↻ Refresh</button>
          </div>
        </div>

        <div class="plan-stats-grid">
          <article class="plan-stat-tile blue">
            <div class="stat-content">
              <span class="stat-category">Weekly Objectives</span>
              <b class="stat-number">${summary?.totalObjectives ?? 0} Targets</b>
              <p class="stat-desc">${summary?.completedObjectives ?? 0} accomplished · ${summary?.pendingObjectives ?? 0} pending</p>
            </div>
            <div class="stat-accent-icon">🎯</div>
          </article>

          <article class="plan-stat-tile green">
            <div class="stat-content">
              <span class="stat-category">Completion Rate</span>
              <b class="stat-number">${summary?.completionRate ?? 0}%</b>
              <p class="stat-desc">${summary?.completedObjectives ?? 0} Completed · ${summary?.inProgressObjectives ?? 0} In Progress</p>
            </div>
            <div class="stat-accent-icon">✓</div>
          </article>

          <article class="plan-stat-tile orange">
            <div class="stat-content">
              <span class="stat-category">Floor Activity Logs</span>
              <b class="stat-number">${summary?.totalFloorLogs ?? 0} Entries</b>
              <p class="stat-desc">Shift handovers & floor inspection notes</p>
            </div>
            <div class="stat-accent-icon">📋</div>
          </article>

          <article class="plan-stat-tile purple">
            <div class="stat-content">
              <span class="stat-category">Active Priority Focus</span>
              <b class="stat-number">${summary?.highPriorityCount ? `${summary.highPriorityCount} Active` : 'All Clear'}</b>
              <p class="stat-desc" title="${esc(summary?.topPriorityTitle ?? 'No critical bottlenecks pending')}">${esc(summary?.topPriorityTitle ?? 'No critical bottlenecks pending')}</p>
            </div>
            <div class="stat-accent-icon">⚡</div>
          </article>
        </div>

        <div class="plan-panels-grid">
          <section class="plan-panel objectives-panel">
            <div class="panel-header">
              <div class="panel-title-area">
                <h3>Admin Objectives & Milestones</h3>
                <p>Strategic targets, compliance checks, and operational milestones</p>
              </div>
              <button class="btn-panel-action btn-add-objective">+ Add</button>
            </div>

            <div class="panel-filter-tabs objective-tabs">
              <button class="tab-btn ${objectiveFilter === 'ALL' ? 'active' : ''}" data-tab="ALL">All (${objectives.length})</button>
              <button class="tab-btn ${objectiveFilter === 'PENDING' ? 'active' : ''}" data-tab="PENDING">Pending (${pendingCount})</button>
              <button class="tab-btn ${objectiveFilter === 'IN_PROGRESS' ? 'active' : ''}" data-tab="IN_PROGRESS">In Progress (${inProgCount})</button>
              <button class="tab-btn ${objectiveFilter === 'COMPLETED' ? 'active' : ''}" data-tab="COMPLETED">Completed (${compCount})</button>
            </div>

            <div class="objectives-list">
              ${filteredObjectives.length ? filteredObjectives.map(obj => {
                const isDone = obj.status === 'COMPLETED';
                const isInProg = obj.status === 'IN_PROGRESS';
                const prioTone = obj.priority === 'CRITICAL' ? 'critical' : obj.priority === 'HIGH' ? 'high' : obj.priority === 'LOW' ? 'low' : 'normal';
                const statusLabel = isDone ? 'Completed' : isInProg ? 'In Progress' : 'Pending';
                const statusClass = isDone ? 'done' : isInProg ? 'prog' : 'pend';
                return `
                  <article class="objective-card ${isDone ? 'is-completed' : ''}" data-id="${obj.id}">
                    <button class="obj-check-btn ${statusClass}" data-id="${obj.id}" data-current="${obj.status}" title="Click to cycle status (Pending → In Progress → Completed)">
                      ${isDone ? '✓' : isInProg ? '◐' : '○'}
                    </button>
                    <div class="obj-details">
                      <div class="obj-headline">
                        <h4 class="obj-title ${isDone ? 'struck' : ''}">${esc(obj.title)}</h4>
                        <span class="badge-priority ${prioTone}">${esc(obj.priority)}</span>
                        <span class="badge-category">${esc(obj.category)}</span>
                      </div>
                      ${obj.description ? `<p class="obj-desc">${esc(obj.description)}</p>` : ''}
                      <div class="obj-meta">
                        ${obj.targetDate ? `<span class="meta-date">📅 Target: <b>${esc(obj.targetDate)}</b></span>` : ''}
                        <span class="meta-author">By ${esc(obj.creatorName)}</span>
                        <button class="status-pill-toggle ${statusClass}" data-id="${obj.id}" data-current="${obj.status}">● ${statusLabel}</button>
                      </div>
                    </div>
                    <div class="obj-actions">
                      <button class="btn-obj-action edit" data-id="${obj.id}" title="Edit objective">✎</button>
                      <button class="btn-obj-action delete" data-id="${obj.id}" title="Delete objective">🗑</button>
                    </div>
                  </article>
                `;
              }).join('') : `
                <div class="panel-empty">
                  <div class="empty-icon">🎯</div>
                  <h4>No Objectives in this View</h4>
                  <p>Create tactical milestones for this week to track team execution.</p>
                  <button class="module-button primary btn-add-objective" style="margin-top:12px;">+ Add Objective</button>
                </div>
              `}
            </div>
          </section>

          <section class="plan-panel logs-panel">
            <div class="panel-header">
              <div class="panel-title-area">
                <h3>Floor User Logs & Shift Notes</h3>
                <p>Shift handovers, equipment notes, and dock observations</p>
              </div>
              <button class="btn-panel-action btn-add-log">+ Log Note</button>
            </div>

            <div class="panel-filter-tabs log-tabs">
              <button class="tab-btn ${logFilter === 'ALL' ? 'active' : ''}" data-tab="ALL">All (${floorLogs.length})</button>
              <button class="tab-btn ${logFilter === 'HANDOVER' ? 'active' : ''}" data-tab="HANDOVER">Handovers</button>
              <button class="tab-btn ${logFilter === 'RECEIVING' ? 'active' : ''}" data-tab="RECEIVING">Receiving</button>
              <button class="tab-btn ${logFilter === 'DISCREPANCY' ? 'active' : ''}" data-tab="DISCREPANCY">Discrepancies</button>
              <button class="tab-btn ${logFilter === 'NOTE' ? 'active' : ''}" data-tab="NOTE">Notes</button>
            </div>

            <div class="floor-logs-feed">
              ${filteredLogs.length ? filteredLogs.map(log => {
                const initials = (log.authorName || 'User').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const sevTone = log.severity === 'CRITICAL' ? 'critical' : log.severity === 'WARNING' ? 'warning' : log.severity === 'RESOLVED' ? 'resolved' : 'info';
                const createdDate = new Date(log.createdAt);
                const timeStr = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `
                  <article class="floor-log-card" data-id="${log.id}">
                    <div class="log-avatar">${esc(initials)}</div>
                    <div class="log-main">
                      <div class="log-header-row">
                        <div class="log-author-info">
                          <b>${esc(log.authorName)}</b>
                          <span class="badge-role">${esc(log.authorRole || 'Staff')}</span>
                          <span class="log-time">${dateStr} at ${timeStr}</span>
                        </div>
                        <div class="log-badges">
                          <span class="badge-severity ${sevTone}">● ${esc(log.severity)}</span>
                          <span class="badge-logtype">${esc(log.logType)}</span>
                          <button class="btn-delete-log" data-id="${log.id}" title="Delete entry">×</button>
                        </div>
                      </div>
                      ${log.locationName ? `<div class="log-location-chip">📍 <b>${esc(log.locationName)}</b> (${esc(log.locationCode)})</div>` : ''}
                      <div class="log-content-text">${esc(log.content)}</div>
                    </div>
                  </article>
                `;
              }).join('') : `
                <div class="panel-empty">
                  <div class="empty-icon">📝</div>
                  <h4>No Shift Logs Recorded</h4>
                  <p>Floor operators can record shift handover notes and dock alerts here.</p>
                  <button class="module-button primary btn-add-log" style="margin-top:12px;">+ Log Floor Note</button>
                </div>
              `}
            </div>
          </section>
        </div>
      </section>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    root.querySelector<HTMLButtonElement>('.week-nav-btn.prev')?.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 7);
      void load();
    });
    root.querySelector<HTMLButtonElement>('.week-nav-btn.next')?.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() + 7);
      void load();
    });
    root.querySelector<HTMLButtonElement>('.week-nav-btn.current')?.addEventListener('click', () => {
      currentDate = new Date();
      void load();
    });
    root.querySelector<HTMLButtonElement>('.btn-refresh-plans')?.addEventListener('click', () => void load());

    root.querySelectorAll<HTMLButtonElement>('.objective-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        objectiveFilter = btn.dataset.tab!;
        render();
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.log-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        logFilter = btn.dataset.tab!;
        render();
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.obj-check-btn, .status-pill-toggle').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const current = btn.dataset.current;
        const nextStatus = current === 'PENDING' ? 'IN_PROGRESS' : current === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';
        try {
          await apiRequest(`/plans/objectives/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
          });
          void load();
        } catch (err) {
          showError(err instanceof Error ? err.message : 'Could not update objective status.');
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.btn-add-objective').forEach(btn => {
      btn.onclick = async () => {
        const weekInfo = getWeekDetails(currentDate);
        const defaultDate = weekInfo.monday.toISOString().slice(0, 10);
        const res = await showFormDialog('Create Operational Objective', [
          { name: 'title', label: 'Objective Title', required: true, placeholder: 'e.g. Inbound shipment pallet scan & audit' },
          {
            name: 'category', label: 'Category', type: 'select', options: [
              { label: 'General Operations', value: 'GENERAL' },
              { label: 'Audit / Cycle Count', value: 'AUDIT' },
              { label: 'Inbound Receiving', value: 'RECEIVING' },
              { label: 'Outbound Dispatch', value: 'DISPATCH' },
              { label: 'Restocking & Replenishment', value: 'RESTOCKING' },
              { label: 'Facility & Safety Maintenance', value: 'MAINTENANCE' },
              { label: 'Safety & Compliance Sweep', value: 'SAFETY' }
            ]
          },
          {
            name: 'priority', label: 'Priority Level', type: 'select', options: [
              { label: 'Normal Priority', value: 'NORMAL' },
              { label: 'High Priority', value: 'HIGH' },
              { label: 'Critical / Urgent', value: 'CRITICAL' },
              { label: 'Low / Routine', value: 'LOW' }
            ]
          },
          { name: 'targetDate', label: 'Target Completion Date', type: 'date', value: defaultDate },
          { name: 'description', label: 'Details / Instructions', type: 'textarea', placeholder: 'Specify instructions, responsible team, or validation checklist...' }
        ], 'Create Objective');

        if (res) {
          try {
            await apiRequest('/plans/objectives', {
              method: 'POST',
              body: JSON.stringify({
                warehouseId: activeWarehouseId,
                year: weekInfo.year,
                weekNumber: weekInfo.weekNumber,
                title: res.title,
                category: res.category,
                priority: res.priority,
                targetDate: res.targetDate || undefined,
                description: res.description || undefined
              })
            });
            void load();
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not create objective.');
          }
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.btn-obj-action.edit').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const obj = objectives.find(o => o.id === id);
        if (!obj) return;
        const res = await showFormDialog('Edit Operational Objective', [
          { name: 'title', label: 'Objective Title', value: obj.title, required: true },
          {
            name: 'category', label: 'Category', type: 'select', value: obj.category, options: [
              { label: 'General Operations', value: 'GENERAL' },
              { label: 'Audit / Cycle Count', value: 'AUDIT' },
              { label: 'Inbound Receiving', value: 'RECEIVING' },
              { label: 'Outbound Dispatch', value: 'DISPATCH' },
              { label: 'Restocking & Replenishment', value: 'RESTOCKING' },
              { label: 'Facility & Safety Maintenance', value: 'MAINTENANCE' },
              { label: 'Safety & Compliance Sweep', value: 'SAFETY' }
            ]
          },
          {
            name: 'priority', label: 'Priority Level', type: 'select', value: obj.priority, options: [
              { label: 'Normal Priority', value: 'NORMAL' },
              { label: 'High Priority', value: 'HIGH' },
              { label: 'Critical / Urgent', value: 'CRITICAL' },
              { label: 'Low / Routine', value: 'LOW' }
            ]
          },
          {
            name: 'status', label: 'Status', type: 'select', value: obj.status, options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Completed', value: 'COMPLETED' }
            ]
          },
          { name: 'targetDate', label: 'Target Completion Date', type: 'date', value: obj.targetDate ?? '' },
          { name: 'description', label: 'Details / Instructions', type: 'textarea', value: obj.description ?? '' }
        ], 'Save Changes');

        if (res) {
          try {
            await apiRequest(`/plans/objectives/${id}`, {
              method: 'PUT',
              body: JSON.stringify(res)
            });
            void load();
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not update objective.');
          }
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.btn-obj-action.delete').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const confirmed = await confirmAction('Delete Objective', 'Are you sure you want to permanently delete this operational objective?');
        if (confirmed) {
          try {
            await apiRequest(`/plans/objectives/${id}`, { method: 'DELETE' });
            void load();
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not delete objective.');
          }
        }
      };
    });

    const whSelect = root.querySelector<HTMLSelectElement>('#plansWarehouseSelect');
    if (whSelect) {
      whSelect.onchange = (e) => {
        const nextId = Number((e.target as HTMLSelectElement).value);
        activeWarehouseId = nextId;
        localStorage.setItem('stockhub.plans.warehouseId', String(nextId));
        void load();
      };
    }

    root.querySelectorAll<HTMLButtonElement>('.btn-add-log').forEach(btn => {
      btn.onclick = async () => {
        const whLocationIds = new Set<number>([activeWarehouseId]);
        storageLocations.filter(loc => loc.parentLocationId === activeWarehouseId).forEach(loc => whLocationIds.add(loc.id));
        storageLocations.filter(loc => whLocationIds.has(loc.parentLocationId)).forEach(loc => whLocationIds.add(loc.id));
        const whSlots = storageLocations.filter(loc => whLocationIds.has(loc.id) && loc.id !== activeWarehouseId);

        const locOptions = [
          { label: '— Warehouse General (No Specific Location) —', value: '' },
          ...whSlots.map(l => ({ label: `${l.name} (${l.code})`, value: String(l.id) }))
        ];

        const res = await showFormDialog('Log Shift & Floor Note', [
          {
            name: 'logType', label: 'Entry Type', type: 'select', options: [
              { label: 'Shift Handover & Transition', value: 'HANDOVER' },
              { label: 'Inbound Receiving & Unloading', value: 'RECEIVING' },
              { label: 'Discrepancy / Damage Alert', value: 'DISCREPANCY' },
              { label: 'Bin & Rack Inspection', value: 'INSPECTION' },
              { label: 'General Note', value: 'NOTE' }
            ]
          },
          {
            name: 'severity', label: 'Severity / Urgency', type: 'select', options: [
              { label: 'Informational (Routine)', value: 'INFO' },
              { label: 'Warning (Requires Attention)', value: 'WARNING' },
              { label: 'Critical Alert (Immediate Action)', value: 'CRITICAL' },
              { label: 'Resolved / Verified', value: 'RESOLVED' }
            ]
          },
          { name: 'locationId', label: 'Tagged Storage Location (Optional)', type: 'select', options: locOptions },
          { name: 'content', label: 'Log Content / Observations', type: 'textarea', required: true, placeholder: 'Record shift notes, equipment status, stock discrepancy, or dock observations...' }
        ], 'Record Floor Note');

        if (res) {
          try {
            await apiRequest('/plans/logs', {
              method: 'POST',
              body: JSON.stringify({
                warehouseId: activeWarehouseId,
                locationId: res.locationId ? Number(res.locationId) : undefined,
                logType: res.logType,
                severity: res.severity,
                content: res.content
              })
            });
            void load();
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not save floor note.');
          }
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('.btn-delete-log').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const confirmed = await confirmAction('Delete Floor Note', 'Are you sure you want to remove this floor log entry?');
        if (confirmed) {
          try {
            await apiRequest(`/plans/logs/${id}`, { method: 'DELETE' });
            void load();
          } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not delete floor note.');
          }
        }
      };
    });
  };

  const load = async () => {
    const stored = localStorage.getItem('stockhub.plans.warehouseId');
    if (stored) {
      activeWarehouseId = Number(stored);
    }
    const weekInfo = getWeekDetails(currentDate);
    try {
      const [sumRes, objRes, logRes, allLocs]: any[] = await Promise.all([
        apiRequest(`/plans/summary?warehouseId=${activeWarehouseId}&year=${weekInfo.year}&weekNumber=${weekInfo.weekNumber}`),
        apiRequest(`/plans/objectives?warehouseId=${activeWarehouseId}&year=${weekInfo.year}&weekNumber=${weekInfo.weekNumber}`),
        apiRequest(`/plans/logs?warehouseId=${activeWarehouseId}&limit=50`),
        apiRequest('/locations')
      ]);
      storageLocations = Array.isArray(allLocs) ? allLocs : [];
      warehouses = storageLocations.filter((l: any) => l.locationType === 'WAREHOUSE');
      if (warehouses.length > 0 && !warehouses.some(w => w.id === activeWarehouseId)) {
        activeWarehouseId = warehouses[0].id;
        localStorage.setItem('stockhub.plans.warehouseId', String(activeWarehouseId));
      }
      summary = sumRes;
      objectives = Array.isArray(objRes) ? objRes : [];
      floorLogs = Array.isArray(logRes) ? logRes : [];
      render();
    } catch (err) {
      root.innerHTML = `<div class="module-view plans-view"><div class="module-empty"><strong>Could not load Plans & Weekly Notes</strong><span>${esc(err instanceof Error ? err.message : 'Please check your connection and retry.')}</span><button class="module-button primary btn-retry" style="margin-top:12px;">Retry</button></div></div>`;
      root.querySelector<HTMLButtonElement>('.btn-retry')?.addEventListener('click', () => void load());
    }
  };

  await load();
}

export async function renderModule(name:PageName,root:HTMLElement){if(name==='Inventory')return inventoryPaged(root);if(name==='Stock Tracking')return transactionsPaged(root);if(name==='Categories')return categoriesStyled(root);if(name==='Locations')return locationsStyled(root);if(name==='Plans')return plansPaged(root);if(name==='Reports')return reportsPaged(root);return settings(root);}
