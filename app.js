const fmt = n => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(n||0));
const num = n => Number(n||0);
const nowIso = () => new Date().toISOString();
const dateTime = value => new Date(value).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'});
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today = new Intl.DateTimeFormat('tr-TR',{dateStyle:'full'}).format(new Date());
document.getElementById('todayLabel').textContent = today;

// e-Belge sağlayıcı yapılandırması. Gizli bilgiler frontend'e ASLA yazılmaz.
const E_BELGE_PROVIDER = Object.freeze({
  id: 'KODLA',
  name: 'Kodla',
  mode: 'TEST',
  apiConnected: false,
  backendBaseUrl: '' // Canlıda Cloudflare Worker / güvenli backend adresi
});

async function kodlaApi(path, options={}){
  if(!E_BELGE_PROVIDER.apiConnected || !E_BELGE_PROVIDER.backendBaseUrl){
    throw new Error('Kodla API bağlantısı henüz yapılandırılmadı');
  }
  const res = await fetch(`${E_BELGE_PROVIDER.backendBaseUrl}${path}`, {
    ...options,
    headers:{'Content-Type':'application/json', ...(options.headers||{})}
  });
  if(!res.ok) throw new Error(`Kodla API hatası (${res.status})`);
  return res.json();
}

const seed = {
  version:31,
  products:[
    {id:1,name:'Fischer Dübel 8 mm',category:'Hırdavat',barcode:'869000000101',unit:'Adet',stock:3450,minStock:500,buy:1.8,sell:3,shelf:'A-03-02'},
    {id:2,name:'Silikon Şeffaf 280 ml',category:'Yapıştırıcı',barcode:'869000000102',unit:'Adet',stock:28,minStock:20,buy:62,sell:89,shelf:'B-01-04'},
    {id:3,name:'NYA Kablo 2.5 mm',category:'Elektrik',barcode:'869000000103',unit:'Metre',stock:86,minStock:100,buy:13.5,sell:19.5,shelf:'E-02-01'},
    {id:4,name:'Bosch Matkap Ucu 8 mm',category:'El Aletleri',barcode:'869000000104',unit:'Adet',stock:14,minStock:12,buy:72,sell:105,shelf:'C-04-03'},
    {id:5,name:'Kale Asma Kilit 40 mm',category:'Hırdavat',barcode:'869000000105',unit:'Adet',stock:9,minStock:15,buy:115,sell:165,shelf:'A-05-01'},
    {id:6,name:'Saten Alçı 25 Kg',category:'İnşaat',barcode:'869000000106',unit:'Torba',stock:42,minStock:20,buy:148,sell:185,shelf:'D-01-01'},
    {id:7,name:'Rulo Fırça 20 cm',category:'Boya',barcode:'869000000107',unit:'Adet',stock:35,minStock:10,buy:48,sell:75,shelf:'F-01-02'},
    {id:8,name:'PVC Elektrik Bandı Siyah',category:'Elektrik',barcode:'869000000108',unit:'Adet',stock:63,minStock:20,buy:19,sell:30,shelf:'E-01-06'},
    {id:9,name:'Akıllı Vida 4.8x50',category:'Vida',barcode:'869000000109',unit:'Kutu',stock:11,minStock:8,buy:165,sell:235,shelf:'A-02-03'}
  ],
  caris:[
    {id:1,name:'Peşin Müşteri',phone:'',priceGroup:'Perakende',balance:0,last:'Bugün'},
    {id:2,name:'Ali Usta',phone:'05xx xxx xx xx',priceGroup:'Usta',balance:4280,last:'Dün'},
    {id:3,name:'Yıldız İnşaat',phone:'05xx xxx xx xx',priceGroup:'Toptan',balance:12850,last:'2 gün önce'}
  ],
  suppliers:[
    {id:101,name:'Marmara Hırdavat Toptan',phone:'0212 000 00 00',contact:'Mehmet',balance:0},
    {id:102,name:'Düzce Yapı Malzemeleri',phone:'0380 000 00 00',contact:'Ahmet',balance:0}
  ],
  sales:[], purchases:[], cashMoves:[], stockMoves:[], cariMoves:[], invoices:[]
};

function clone(obj){return JSON.parse(JSON.stringify(obj));}
function migrate(raw){
  const s = raw && typeof raw==='object' ? raw : clone(seed);
  s.version=31;
  for(const key of ['products','caris','sales','cashMoves','suppliers','purchases','stockMoves','cariMoves','invoices']) if(!Array.isArray(s[key])) s[key]=clone(seed[key]||[]);
  if(!s.suppliers.length) s.suppliers=clone(seed.suppliers);
  s.products.forEach(p=>{p.stock=num(p.stock);p.minStock=num(p.minStock);p.buy=num(p.buy);p.sell=num(p.sell);p.unit=p.unit||'Adet';p.category=p.category||'Genel';});
  s.caris.forEach(c=>{c.balance=num(c.balance);c.priceGroup=c.priceGroup||'Perakende';c.taxNo=c.taxNo||'';c.taxOffice=c.taxOffice||'';c.email=c.email||'';c.eInvoiceUser=c.eInvoiceUser||'unknown';});
  return s;
}
let state;
try{ state=migrate(JSON.parse(localStorage.getItem('nalburProData')||'null')); }catch{ state=clone(seed); }
let cart=[]; let activeCategory='Tümü'; let scannerStream=null; let scannerTimer=null;
function save(){localStorage.setItem('nalburProData',JSON.stringify(state));}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)}
function nextId(){return Date.now()+Math.floor(Math.random()*1000)}
function receiptNo(sale){return `S-${String(sale.id).slice(-8)}`}

const titles={dashboard:'Ana Sayfa',sale:'Hızlı Satış',sales:'Satış Geçmişi',invoices:'e-Belge',products:'Ürün & Stok',stock:'Stok Hareketleri',caris:'Cariler',purchases:'Alış & Tedarikçi',cash:'Kasa',data:'Veri & Ayarlar'};
function go(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.querySelectorAll('.mobile-nav-btn[data-mobile-view]').forEach(b=>b.classList.toggle('active',b.dataset.mobileView===view));
  document.getElementById('pageTitle').textContent=titles[view]||'Nalbur Pro';
  document.getElementById('sidebar').classList.remove('open');
  if(view==='sale' && window.innerWidth<=760) setSalePane('products');
  window.scrollTo({top:0,left:0,behavior:'instant'});
  renderAll();
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));
document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
function setSalePane(pane){
  const layout=document.querySelector('.sale-layout'); if(!layout)return;
  layout.dataset.mobilePane=pane;
  document.querySelectorAll('[data-sale-pane]').forEach(b=>b.classList.toggle('active',b.dataset.salePane===pane));
}
document.querySelectorAll('[data-sale-pane]').forEach(b=>b.onclick=()=>setSalePane(b.dataset.salePane));
document.querySelectorAll('.mobile-nav-btn[data-mobile-view]').forEach(b=>b.onclick=()=>go(b.dataset.mobileView));
document.getElementById('mobileMoreBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
window.addEventListener('resize',()=>{if(window.innerWidth>760){const layout=document.querySelector('.sale-layout');if(layout)layout.dataset.mobilePane='products';}});
document.getElementById('themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('nalburTheme',document.body.classList.contains('dark')?'dark':'light')};
if(localStorage.getItem('nalburTheme')==='dark') document.body.classList.add('dark');

function customerMultiplier(group){return group==='Usta'?.90:group==='Toptan'?.82:1}
function currentCustomer(){return state.caris.find(c=>c.id===Number(document.getElementById('customerSelect').value))||state.caris[0]}
function productPrice(p){return p.sell*customerMultiplier(currentCustomer()?.priceGroup||'Perakende')}

function renderCategories(){
  const cats=['Tümü',...new Set(state.products.map(p=>p.category).filter(Boolean))];
  if(!cats.includes(activeCategory)) activeCategory='Tümü';
  document.getElementById('categoryRow').innerHTML=cats.map(c=>`<button class="cat-btn ${c===activeCategory?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderCategories();renderSaleProducts()});
}
function renderSaleProducts(){
  const q=(document.getElementById('saleSearch').value||'').trim().toLowerCase();
  const list=state.products.filter(p=>(activeCategory==='Tümü'||p.category===activeCategory)&&(!q||p.name.toLowerCase().includes(q)||String(p.barcode||'').toLowerCase().includes(q)));
  document.getElementById('saleProductGrid').innerHTML=list.map(p=>`<button class="product-card" data-add="${p.id}"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category)} • ${escapeHtml(p.unit)}</small><div class="price"><strong>${fmt(productPrice(p))}</strong><small class="${p.stock<=p.minStock?'stock-low':''}">Stok: ${p.stock}</small></div></button>`).join('')||'<div class="empty-state">Ürün bulunamadı.</div>';
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addCart(Number(b.dataset.add)));
}
function renderCustomers(){
  const s=document.getElementById('customerSelect'); const prev=s.value;
  s.innerHTML=state.caris.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} • ${escapeHtml(c.priceGroup)}</option>`).join('');
  if(prev && state.caris.some(c=>String(c.id)===prev)) s.value=prev;
  s.onchange=()=>{renderSaleProducts();renderCart()};
}
function addCart(id){
  const p=state.products.find(x=>x.id===id); if(!p||p.stock<=0)return toast('Bu üründe stok yok');
  const line=cart.find(x=>x.id===id); const nextQty=(line?.qty||0)+1; if(nextQty>p.stock)return toast('Stok miktarı aşılamaz');
  if(line) line.qty=nextQty; else cart.push({id,qty:1}); renderCart();
}
function renderCart(){
  const c=currentCustomer(); let subtotal=0,discount=0;
  document.getElementById('cartItems').innerHTML=cart.map(line=>{
    const p=state.products.find(x=>x.id===line.id); if(!p)return '';
    const normal=p.sell*line.qty, unit=p.sell*customerMultiplier(c?.priceGroup||'Perakende'), total=unit*line.qty; subtotal+=normal;discount+=normal-total;
    return `<div class="cart-item"><div><b>${escapeHtml(p.name)}</b><small>${fmt(unit)} / ${escapeHtml(p.unit)}</small></div><div><div class="qty"><button data-dec="${p.id}">−</button><input data-qty="${p.id}" value="${line.qty}" type="number" min="0.01" max="${p.stock}" step="0.01"><button data-inc="${p.id}">＋</button></div><b>${fmt(total)}</b></div></div>`;
  }).join('')||'<p class="empty-cart">Sepet boş</p>';
  const total=subtotal-discount; document.getElementById('subtotal').textContent=fmt(subtotal);document.getElementById('discountTotal').textContent='− '+fmt(discount);document.getElementById('grandTotal').textContent=fmt(total);document.getElementById('cartCount').textContent=`${cart.length} kalem`; const mobileBadge=document.getElementById('mobileCartBadge'); if(mobileBadge) mobileBadge.textContent=cart.length;
  document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===+b.dataset.inc),p=state.products.find(x=>x.id===l.id);if(l.qty+1>p.stock)return toast('Stok miktarı aşılamaz');l.qty++;renderCart()});
  document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===+b.dataset.dec);l.qty--;if(l.qty<=0)cart=cart.filter(x=>x.id!==l.id);renderCart()});
  document.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>{const l=cart.find(x=>x.id===+i.dataset.qty),p=state.products.find(x=>x.id===l.id);l.qty=Math.max(.01,Math.min(p.stock,+i.value||1));renderCart()});
  return total;
}
document.getElementById('saleSearch').oninput=renderSaleProducts;
document.getElementById('clearCart').onclick=()=>{cart=[];renderCart()};
document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>completeSale(b.dataset.pay));
function completeSale(payment){
  if(!cart.length)return toast('Sepet boş'); const customer=currentCustomer(); const total=renderCart();
  if(payment==='Veresiye'&&customer.id===1)return toast('Veresiye satış için cari seç');
  for(const l of cart){const p=state.products.find(x=>x.id===l.id);if(!p||l.qty>p.stock)return toast(`${p?.name||'Ürün'} için stok yetersiz`)}
  const saleId=nextId(); const items=[];
  for(const l of cart){const p=state.products.find(x=>x.id===l.id),before=p.stock,unitPrice=p.sell*customerMultiplier(customer.priceGroup);p.stock-=l.qty;items.push({id:p.id,name:p.name,qty:l.qty,unit:p.unit,unitPrice,cost:p.buy});state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:'Satış',qty:-l.qty,before,after:p.stock,note:`${customer.name} • ${payment}`})}
  const sale={id:saleId,date:nowIso(),customerId:customer.id,customer:customer.name,payment,total,items}; state.sales.unshift(sale);
  if(payment==='Veresiye'){customer.balance+=total;customer.last='Bugün';state.cariMoves.unshift({id:nextId(),date:nowIso(),cariId:customer.id,cari:customer.name,type:'Borç',description:`${receiptNo(sale)} veresiye satış`,amount:total})}
  else state.cashMoves.unshift({id:nextId(),date:nowIso(),type:'Satış',description:`${receiptNo(sale)} • ${customer.name}`,payment,amount:total});
  save();cart=[];renderAll();toast(`${payment} satış tamamlandı • ${fmt(total)}`);
}

function renderSales(){
  const q=(document.getElementById('salesSearch').value||'').toLowerCase();
  const rows=state.sales.filter(s=>`${s.customer} ${s.payment} ${receiptNo(s)}`.toLowerCase().includes(q));
  document.getElementById('salesTableBody').innerHTML=rows.map(s=>{const inv=state.invoices.find(i=>i.saleId===s.id);return `<tr><td><b>${receiptNo(s)}</b></td><td>${dateTime(s.date)}</td><td>${escapeHtml(s.customer)}</td><td><span class="status neutral">${escapeHtml(s.payment)}</span></td><td>${s.items?.length||0}</td><td class="amount">${fmt(s.total)}</td><td class="row-actions"><button class="table-btn" data-sale-detail="${s.id}">Detay</button>${inv?`<button class="table-btn" data-goto-invoice="${inv.id}">${escapeHtml(inv.type==='EFATURA'?'e-Fatura':'e-Arşiv')}</button>`:`<button class="table-btn" data-invoice-sale="${s.id}">Faturala</button>`}</td></tr>`}).join('')||'<tr><td colspan="7">Kayıt yok.</td></tr>';
  document.querySelectorAll('[data-sale-detail]').forEach(b=>b.onclick=()=>openSaleDetail(Number(b.dataset.saleDetail)));
  document.querySelectorAll('[data-invoice-sale]').forEach(b=>b.onclick=()=>openInvoiceDialog(Number(b.dataset.invoiceSale)));
  document.querySelectorAll('[data-goto-invoice]').forEach(b=>b.onclick=()=>go('invoices'));
}
document.getElementById('salesSearch').oninput=renderSales;
function openSaleDetail(id){
  const s=state.sales.find(x=>x.id===id);if(!s)return;
  document.getElementById('saleDetailContent').innerHTML=`<div class="detail-grid"><div><span>Fiş No</span><b>${receiptNo(s)}</b></div><div><span>Tarih</span><b>${dateTime(s.date)}</b></div><div><span>Müşteri</span><b>${escapeHtml(s.customer)}</b></div><div><span>Ödeme</span><b>${escapeHtml(s.payment)}</b></div></div><div class="table-wrap"><table><thead><tr><th>Ürün</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>Toplam</th></tr></thead><tbody>${(s.items||[]).map(i=>`<tr><td>${escapeHtml(i.name||state.products.find(p=>p.id===i.id)?.name||'Ürün')}</td><td>${i.qty}</td><td>${escapeHtml(i.unit||'')}</td><td>${fmt(i.unitPrice||0)}</td><td>${fmt((i.unitPrice||0)*i.qty)}</td></tr>`).join('')}</tbody></table></div><div class="sale-detail-total">Toplam <strong>${fmt(s.total)}</strong></div>`;
  document.getElementById('saleDetailDialog').showModal();
}
document.getElementById('closeSaleDetail').onclick=()=>document.getElementById('saleDetailDialog').close();

function renderProducts(){
  const q=(document.getElementById('productSearch').value||'').toLowerCase();
  const rows=state.products.filter(p=>`${p.name} ${p.barcode||''} ${p.category} ${p.shelf||''}`.toLowerCase().includes(q));
  document.getElementById('productTableBody').innerHTML=rows.map(p=>{const margin=p.sell?((p.sell-p.buy)/p.sell*100):0;return `<tr><td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(p.barcode||'-')}</td><td>${escapeHtml(p.unit)}</td><td>${p.stock}</td><td>${fmt(p.buy)}</td><td>${fmt(p.sell)}</td><td>%${margin.toFixed(1)}</td><td>${escapeHtml(p.shelf||'-')}</td><td><span class="status ${p.stock<=p.minStock?'low':''}">${p.stock<=p.minStock?'Kritik':'Normal'}</span></td><td class="row-actions"><button class="table-btn" data-edit-product="${p.id}">Düzenle</button><button class="table-btn danger-text" data-delete-product="${p.id}">Sil</button></td></tr>`}).join('')||'<tr><td colspan="11">Ürün bulunamadı.</td></tr>';
  document.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>openProduct(Number(b.dataset.editProduct)));
  document.querySelectorAll('[data-delete-product]').forEach(b=>b.onclick=()=>deleteProduct(Number(b.dataset.deleteProduct)));
}
document.getElementById('productSearch').oninput=renderProducts;
const productDialog=document.getElementById('productDialog');
document.getElementById('addProductBtn').onclick=()=>openProduct();
function openProduct(id){
  const f=document.getElementById('productForm');f.reset();f.elements.id.value='';document.getElementById('productDialogTitle').textContent=id?'Ürün Düzenle':'Yeni Ürün';
  if(id){const p=state.products.find(x=>x.id===id);if(!p)return;for(const k of ['id','name','category','barcode','unit','stock','minStock','buy','sell','shelf']) if(f.elements[k])f.elements[k].value=p[k]??'';}
  productDialog.showModal();
}
document.getElementById('saveProduct').onclick=e=>{
  const f=document.getElementById('productForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f));
  const duplicate=state.products.find(p=>d.barcode&&p.barcode===d.barcode&&String(p.id)!==String(d.id));if(duplicate){e.preventDefault();return toast('Bu barkod başka üründe kayıtlı')}
  if(d.id){const p=state.products.find(x=>x.id===+d.id),before=p.stock;Object.assign(p,{name:d.name,category:d.category,barcode:d.barcode,unit:d.unit,stock:+d.stock,minStock:+d.minStock,buy:+d.buy,sell:+d.sell,shelf:d.shelf});if(before!==p.stock)state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:'Ürün düzenleme',qty:p.stock-before,before,after:p.stock,note:'Ürün kartından stok değişti'});toast('Ürün güncellendi');}
  else {const p={id:nextId(),name:d.name,category:d.category,barcode:d.barcode,unit:d.unit,stock:+d.stock,minStock:+d.minStock,buy:+d.buy,sell:+d.sell,shelf:d.shelf};state.products.push(p);if(p.stock)state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:'Açılış',qty:p.stock,before:0,after:p.stock,note:'Yeni ürün açılış stoku'});toast('Ürün eklendi')}
  save();renderAll();
};
function deleteProduct(id){
  const p=state.products.find(x=>x.id===id);if(!p)return;if(!confirm(`${p.name} tamamen silinsin mi? Geçmiş satış kayıtları korunur.`))return;state.products=state.products.filter(x=>x.id!==id);cart=cart.filter(x=>x.id!==id);save();renderAll();toast('Ürün silindi');
}

function renderStock(){
  document.getElementById('stockProductCount').textContent=state.products.length;
  document.getElementById('stockCost').textContent=fmt(state.products.reduce((s,p)=>s+p.stock*p.buy,0));
  document.getElementById('stockSellValue').textContent=fmt(state.products.reduce((s,p)=>s+p.stock*p.sell,0));
  document.getElementById('stockCriticalCount').textContent=state.products.filter(p=>p.stock<=p.minStock).length;
  document.getElementById('stockMoveBody').innerHTML=state.stockMoves.slice(0,250).map(m=>`<tr><td>${dateTime(m.date)}</td><td><b>${escapeHtml(m.product)}</b></td><td>${escapeHtml(m.type)}</td><td class="${m.qty<0?'negative':'positive'}">${m.qty>0?'+':''}${m.qty}</td><td>${m.before}</td><td>${m.after}</td><td>${escapeHtml(m.note||'-')}</td></tr>`).join('')||'<tr><td colspan="7">Henüz stok hareketi yok.</td></tr>';
  fillProductSelect(document.getElementById('adjustProduct'));
}
function fillProductSelect(el){const prev=el.value;el.innerHTML=state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} • stok ${p.stock}</option>`).join('');if(prev&&state.products.some(p=>String(p.id)===prev))el.value=prev;}
document.getElementById('adjustStockBtn').onclick=()=>{fillProductSelect(document.getElementById('adjustProduct'));document.getElementById('stockDialog').showModal()};
document.getElementById('saveStockAdjust').onclick=e=>{
  const f=document.getElementById('stockForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f)),p=state.products.find(x=>x.id===+d.productId);if(!p)return;const before=p.stock,qty=+d.qty;
  if(d.mode==='in')p.stock+=qty;else if(d.mode==='out')p.stock=Math.max(0,p.stock-qty);else p.stock=qty;
  state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:d.mode==='in'?'Manuel giriş':d.mode==='out'?'Manuel çıkış':'Sayım sabitleme',qty:p.stock-before,before,after:p.stock,note:d.note});save();f.reset();renderAll();toast('Stok güncellendi');
};

function renderCaris(){
  const totalReceivable=state.caris.reduce((s,c)=>s+Math.max(0,c.balance),0),debtors=state.caris.filter(c=>c.id!==1&&c.balance>0).length;
  document.getElementById('cariCards').innerHTML=`<div class="cari-card"><span>Toplam Alacak</span><strong>${fmt(totalReceivable)}</strong></div><div class="cari-card"><span>Borçlu Cari</span><strong>${debtors}</strong></div><div class="cari-card"><span>Toplam Cari</span><strong>${state.caris.length-1}</strong></div>`;
  document.getElementById('cariTableBody').innerHTML=state.caris.map(c=>`<tr><td><b>${escapeHtml(c.name)}</b></td><td>${escapeHtml(c.phone||'-')}</td><td>${escapeHtml(c.priceGroup)}</td><td class="${c.balance>0?'negative':'positive'}">${fmt(c.balance)}</td><td>${escapeHtml(c.last||'-')}</td><td class="row-actions"><button class="table-btn" data-edit-cari="${c.id}">Düzenle</button>${c.id!==1?`<button class="table-btn" data-collect-cari="${c.id}">Tahsilat</button>`:''}</td></tr>`).join('');
  document.getElementById('cariMoveBody').innerHTML=state.cariMoves.slice(0,150).map(m=>`<tr><td>${dateTime(m.date)}</td><td>${escapeHtml(m.cari)}</td><td>${escapeHtml(m.type)}</td><td>${escapeHtml(m.description)}</td><td class="amount">${fmt(m.amount)}</td></tr>`).join('')||'<tr><td colspan="5">Henüz cari hareket yok.</td></tr>';
  document.querySelectorAll('[data-edit-cari]').forEach(b=>b.onclick=()=>openCari(Number(b.dataset.editCari)));
  document.querySelectorAll('[data-collect-cari]').forEach(b=>b.onclick=()=>openCollection(Number(b.dataset.collectCari)));
  fillCariSelect();
}
const cariDialog=document.getElementById('cariDialog');document.getElementById('addCariBtn').onclick=()=>openCari();
function openCari(id){
  const f=document.getElementById('cariForm');f.reset();f.elements.id.value='';document.getElementById('cariDialogTitle').textContent=id?'Cari Düzenle':'Yeni Cari';
  if(id){const c=state.caris.find(x=>x.id===id);if(!c)return;for(const k of ['id','name','phone','priceGroup','balance','taxNo','taxOffice','email','eInvoiceUser'])if(f.elements[k])f.elements[k].value=c[k]??'';f.elements.balance.disabled=id===1?true:false;}else f.elements.balance.disabled=false;
  cariDialog.showModal();
}
document.getElementById('saveCari').onclick=e=>{
  const f=document.getElementById('cariForm');if(!f.reportValidity()){e.preventDefault();return}f.elements.balance.disabled=false;const d=Object.fromEntries(new FormData(f));
  if(d.id){const c=state.caris.find(x=>x.id===+d.id);Object.assign(c,{name:d.name,phone:d.phone,priceGroup:d.priceGroup,balance:+d.balance,taxNo:d.taxNo||'',taxOffice:d.taxOffice||'',email:d.email||'',eInvoiceUser:d.eInvoiceUser||'unknown',last:'Bugün'});toast('Cari güncellendi')}else{const c={id:nextId(),name:d.name,phone:d.phone,priceGroup:d.priceGroup,balance:+d.balance,taxNo:d.taxNo||'',taxOffice:d.taxOffice||'',email:d.email||'',eInvoiceUser:d.eInvoiceUser||'unknown',last:'Yeni'};state.caris.push(c);if(c.balance)state.cariMoves.unshift({id:nextId(),date:nowIso(),cariId:c.id,cari:c.name,type:'Açılış',description:'Açılış bakiyesi',amount:c.balance});toast('Cari eklendi')}
  save();renderAll();
};
function fillCariSelect(){const el=document.getElementById('collectCari'),prev=el.value;el.innerHTML=state.caris.filter(c=>c.id!==1).map(c=>`<option value="${c.id}">${escapeHtml(c.name)} • ${fmt(c.balance)}</option>`).join('');if(prev&&state.caris.some(c=>String(c.id)===prev))el.value=prev;}
document.getElementById('collectBtn').onclick=()=>openCollection();
function openCollection(id){fillCariSelect();if(id)document.getElementById('collectCari').value=String(id);document.getElementById('collectDialog').showModal();}
document.getElementById('saveCollection').onclick=e=>{
  const f=document.getElementById('collectForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f)),c=state.caris.find(x=>x.id===+d.cariId),amount=+d.amount;if(!c)return;if(amount>c.balance&&c.balance>0){e.preventDefault();return toast('Tahsilat açık bakiyeden büyük olamaz')}
  c.balance=Math.max(0,c.balance-amount);c.last='Bugün';state.cariMoves.unshift({id:nextId(),date:nowIso(),cariId:c.id,cari:c.name,type:'Tahsilat',description:d.note||'Cari tahsilat',amount});state.cashMoves.unshift({id:nextId(),date:nowIso(),type:'Tahsilat',description:`${c.name} • ${d.note||'Cari tahsilat'}`,payment:d.payment,amount});save();f.reset();renderAll();toast(`Tahsilat kaydedildi • ${fmt(amount)}`);
};

function renderPurchases(){
  const debt=state.suppliers.reduce((s,x)=>s+Math.max(0,x.balance),0),month=new Date().getMonth(),year=new Date().getFullYear(),monthly=state.purchases.filter(p=>{const d=new Date(p.date);return d.getMonth()===month&&d.getFullYear()===year}).reduce((s,p)=>s+p.total,0);
  document.getElementById('supplierDebt').textContent=fmt(debt);document.getElementById('supplierCount').textContent=state.suppliers.length;document.getElementById('monthlyPurchases').textContent=fmt(monthly);document.getElementById('purchaseCount').textContent=state.purchases.length;
  const ss=document.getElementById('purchaseSupplier'),ps=document.getElementById('purchaseProduct'),oldS=ss.value,oldP=ps.value;ss.innerHTML=state.suppliers.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');ps.innerHTML=state.products.map(p=>`<option value="${p.id}" data-buy="${p.buy}">${escapeHtml(p.name)} • ${escapeHtml(p.unit)}</option>`).join('');if(oldS)ss.value=oldS;if(oldP)ps.value=oldP;
  document.getElementById('supplierTableBody').innerHTML=state.suppliers.map(s=>`<tr><td><b>${escapeHtml(s.name)}</b><small class="table-sub">${escapeHtml(s.contact||'')}</small></td><td>${escapeHtml(s.phone||'-')}</td><td class="${s.balance>0?'negative':'positive'}">${fmt(s.balance)}</td><td><button class="table-btn" data-supplier-pay="${s.id}">Ödeme</button></td></tr>`).join('')||'<tr><td colspan="4">Tedarikçi yok.</td></tr>';
  document.getElementById('purchaseTableBody').innerHTML=state.purchases.slice(0,150).map(p=>`<tr><td>${dateTime(p.date)}</td><td>${escapeHtml(p.supplier)}</td><td>${escapeHtml(p.product)}</td><td>${p.qty} ${escapeHtml(p.unit)}</td><td>${fmt(p.unitCost)}</td><td class="amount">${fmt(p.total)}</td><td>${escapeHtml(p.payment)}</td><td>${escapeHtml(p.documentNo||'-')}</td></tr>`).join('')||'<tr><td colspan="8">Henüz alış yok.</td></tr>';
  document.querySelectorAll('[data-supplier-pay]').forEach(b=>b.onclick=()=>openSupplierPayment(Number(b.dataset.supplierPay)));
}
document.getElementById('purchaseProduct').onchange=()=>{const o=document.getElementById('purchaseProduct').selectedOptions[0];document.getElementById('purchaseForm').elements.unitCost.value=o?.dataset.buy||''};
document.getElementById('purchaseForm').onsubmit=e=>{
  e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const d=Object.fromEntries(new FormData(f)),supplier=state.suppliers.find(x=>x.id===+d.supplierId),p=state.products.find(x=>x.id===+d.productId),qty=+d.qty,unitCost=+d.unitCost,total=qty*unitCost;if(!supplier||!p)return;
  const before=p.stock;p.stock+=qty;p.buy=unitCost;state.purchases.unshift({id:nextId(),date:nowIso(),supplierId:supplier.id,supplier:supplier.name,productId:p.id,product:p.name,unit:p.unit,qty,unitCost,total,payment:d.payment,documentNo:d.documentNo,note:d.note});state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:'Mal alış',qty,before,after:p.stock,note:`${supplier.name}${d.documentNo?' • '+d.documentNo:''}`});
  if(d.payment==='Veresiye')supplier.balance+=total;else state.cashMoves.unshift({id:nextId(),date:nowIso(),type:'Gider',description:`Mal alış • ${supplier.name} • ${p.name}`,payment:d.payment,amount:total});save();f.reset();renderAll();toast(`Mal alış kaydedildi • ${fmt(total)}`);
};
const supplierDialog=document.getElementById('supplierDialog');document.getElementById('addSupplierBtn').onclick=()=>supplierDialog.showModal();
document.getElementById('saveSupplier').onclick=e=>{const f=document.getElementById('supplierForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f));state.suppliers.push({id:nextId(),name:d.name,phone:d.phone,contact:d.contact,balance:+d.balance});save();f.reset();renderAll();toast('Tedarikçi eklendi')};
function openSupplierPayment(id){const s=state.suppliers.find(x=>x.id===id);if(!s)return;const f=document.getElementById('supplierPaymentForm');f.reset();f.elements.supplierId.value=s.id;document.getElementById('supplierPaymentName').textContent=`${s.name} • Mevcut borç ${fmt(s.balance)}`;document.getElementById('supplierPaymentDialog').showModal();}
document.getElementById('saveSupplierPayment').onclick=e=>{const f=document.getElementById('supplierPaymentForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f)),s=state.suppliers.find(x=>x.id===+d.supplierId),amount=+d.amount;if(!s)return;if(amount>s.balance&&s.balance>0){e.preventDefault();return toast('Ödeme mevcut borçtan büyük olamaz')}s.balance=Math.max(0,s.balance-amount);state.cashMoves.unshift({id:nextId(),date:nowIso(),type:'Gider',description:`${s.name} • ${d.note||'Tedarikçi ödemesi'}`,payment:d.payment,amount});save();renderAll();toast(`Tedarikçi ödemesi • ${fmt(amount)}`)};

function invoiceNo(inv){return inv.number||`TASLAK-${String(inv.id).slice(-8)}`}
function invoiceTypeLabel(type){return type==='EFATURA'?'e-Fatura':'e-Arşiv'}
function invoiceStatusClass(status){return status==='TEST_GONDERILDI'?'':'neutral'}
function renderInvoices(){
  const list=state.invoices||[];
  document.getElementById('invoiceCount').textContent=list.length;
  document.getElementById('eInvoiceCount').textContent=list.filter(i=>i.type==='EFATURA').length;
  document.getElementById('eArchiveCount').textContent=list.filter(i=>i.type==='EARSIV').length;
  document.getElementById('invoicePendingCount').textContent=list.filter(i=>i.status==='TASLAK').length;
  document.getElementById('invoiceTableBody').innerHTML=list.map(i=>`<tr><td><b>${escapeHtml(invoiceNo(i))}</b></td><td>${dateTime(i.date)}</td><td>${escapeHtml(i.customer)}</td><td><span class="status neutral">${escapeHtml(invoiceTypeLabel(i.type))}</span></td><td>${escapeHtml(i.taxNo||'-')}</td><td class="amount">${fmt(i.total)}</td><td><span class="status ${invoiceStatusClass(i.status)}">${escapeHtml(i.status==='TASLAK'?'Taslak':'TEST Gönderildi')}</span></td><td>${escapeHtml(i.receiptNo)}</td><td class="row-actions"><button class="table-btn" data-invoice-test="${i.id}" ${i.status!=='TASLAK'?'disabled':''}>TEST Gönder</button><button class="table-btn danger-text" data-invoice-delete="${i.id}">Sil</button></td></tr>`).join('')||'<tr><td colspan="9">Henüz e-belge taslağı yok. Satış geçmişinden veya “Satıştan Fatura” düğmesinden oluşturabilirsin.</td></tr>';
  document.querySelectorAll('[data-invoice-test]').forEach(b=>b.onclick=()=>testSendInvoice(Number(b.dataset.invoiceTest)));
  document.querySelectorAll('[data-invoice-delete]').forEach(b=>b.onclick=()=>deleteInvoice(Number(b.dataset.invoiceDelete)));
  fillInvoiceSales();
}
function fillInvoiceSales(){
  const el=document.getElementById('invoiceSale'); if(!el)return; const prev=el.value;
  const used=new Set(state.invoices.map(i=>i.saleId));
  const available=state.sales.filter(s=>!used.has(s.id));
  el.innerHTML=available.map(s=>`<option value="${s.id}">${receiptNo(s)} • ${escapeHtml(s.customer)} • ${fmt(s.total)}</option>`).join('')||'<option value="">Faturalanacak satış yok</option>';
  if(prev&&available.some(s=>String(s.id)===prev))el.value=prev;
}
function openInvoiceDialog(saleId){
  fillInvoiceSales(); const f=document.getElementById('invoiceForm'); f.reset(); if(saleId)f.elements.saleId.value=String(saleId);
  if(!f.elements.saleId.value)return toast('Faturalanacak satış yok');
  document.getElementById('invoiceDialog').showModal();
}
document.getElementById('newInvoiceBtn').onclick=()=>openInvoiceDialog();
document.getElementById('saveInvoiceDraft').onclick=e=>{
  const f=document.getElementById('invoiceForm'); if(!f.reportValidity()){e.preventDefault();return} const d=Object.fromEntries(new FormData(f));
  const sale=state.sales.find(s=>s.id===+d.saleId); if(!sale){e.preventDefault();return toast('Satış bulunamadı')}
  if(state.invoices.some(i=>i.saleId===sale.id)){e.preventDefault();return toast('Bu satış için e-belge zaten oluşturulmuş')}
  const customer=state.caris.find(c=>c.id===sale.customerId)||{};
  let type=d.documentType; if(type==='AUTO')type=customer.eInvoiceUser==='yes'?'EFATURA':'EARSIV';
  const inv={id:nextId(),date:nowIso(),saleId:sale.id,receiptNo:receiptNo(sale),customerId:sale.customerId,customer:sale.customer,taxNo:customer.taxNo||'',taxOffice:customer.taxOffice||'',email:customer.email||'',type,scenario:d.scenario,currency:d.currency,total:sale.total,status:'TASLAK',note:d.note||'',provider:'KODLA'};
  state.invoices.unshift(inv); save(); renderAll(); toast(`${invoiceTypeLabel(type)} taslağı oluşturuldu`);
};
function testSendInvoice(id){
  const inv=state.invoices.find(i=>i.id===id); if(!inv)return;
  if(!inv.taxNo&&inv.type==='EFATURA')return toast('e-Fatura için cari kartına VKN/TCKN gir');
  inv.status='TEST_GONDERILDI'; inv.testSentAt=nowIso(); save(); renderInvoices(); toast('Kodla TEST simülasyonu — API henüz bağlı değil, GİB’e belge gitmedi');
}
function deleteInvoice(id){
  const inv=state.invoices.find(i=>i.id===id); if(!inv)return; if(!confirm(`${invoiceNo(inv)} taslağı silinsin mi?`))return; state.invoices=state.invoices.filter(i=>i.id!==id); save(); renderAll(); toast('e-Belge taslağı silindi');
}

function renderCash(){
  const moves=state.cashMoves;const signed=x=>x.type==='Gider'?-x.amount:x.amount;
  const cash=moves.filter(x=>x.payment==='Nakit').reduce((s,x)=>s+signed(x),0),card=moves.filter(x=>x.payment==='Kart'&&x.type!=='Gider').reduce((s,x)=>s+x.amount,0),bank=moves.filter(x=>x.payment==='Banka'&&x.type!=='Gider').reduce((s,x)=>s+x.amount,0),turnover=state.sales.reduce((s,x)=>s+x.total,0);
  document.getElementById('cashBalance').textContent=fmt(cash);document.getElementById('cardTotal').textContent=fmt(card);document.getElementById('bankTotal').textContent=fmt(bank);document.getElementById('turnoverTotal').textContent=fmt(turnover);
  document.getElementById('cashTableBody').innerHTML=moves.slice(0,250).map(x=>`<tr><td>${dateTime(x.date)}</td><td>${escapeHtml(x.type)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.payment)}</td><td class="amount ${x.type==='Gider'?'negative':'positive'}">${x.type==='Gider'?'-':'+'}${fmt(x.amount)}</td></tr>`).join('')||'<tr><td colspan="5">Henüz hareket yok.</td></tr>';
}
const cashDialog=document.getElementById('cashDialog');document.getElementById('addCashMoveBtn').onclick=()=>cashDialog.showModal();document.getElementById('saveCash').onclick=e=>{const f=document.getElementById('cashForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f));state.cashMoves.unshift({id:nextId(),date:nowIso(),type:d.type,description:d.description,payment:d.payment,amount:+d.amount});save();f.reset();renderAll();toast('Kasa hareketi eklendi')};

function renderDashboard(){
  const todayKey=new Date().toDateString(),todaySales=state.sales.filter(s=>new Date(s.date).toDateString()===todayKey),salesTotal=todaySales.reduce((a,s)=>a+s.total,0),collections=state.cashMoves.filter(x=>new Date(x.date).toDateString()===todayKey&&x.type!=='Gider').reduce((s,x)=>s+x.amount,0),cash=state.cashMoves.filter(x=>x.payment==='Nakit').reduce((s,x)=>s+(x.type==='Gider'?-x.amount:x.amount),0),critical=state.products.filter(p=>p.stock<=p.minStock);
  document.getElementById('kpiSales').textContent=fmt(salesTotal);document.getElementById('kpiSalesCount').textContent=`${todaySales.length} işlem`;document.getElementById('kpiCollections').textContent=fmt(collections);document.getElementById('kpiCash').textContent=fmt(cash);document.getElementById('kpiCritical').textContent=critical.length;
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(next.getDate()+1);const total=state.sales.filter(s=>{const x=new Date(s.date);return x>=d&&x<next}).reduce((sum,s)=>sum+s.total,0);days.push({label:i===0?'Bugün':new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(d),total})}const max=Math.max(...days.map(d=>d.total),1);document.getElementById('salesChart').innerHTML=days.map(d=>`<div class="bar-wrap"><div class="bar" title="${fmt(d.total)}" style="height:${Math.max(5,d.total/max*100)}%"></div><small>${escapeHtml(d.label)}</small></div>`).join('');
  const overdue=state.caris.filter(c=>c.id!==1&&c.balance>0).length,supplierDebt=state.suppliers.reduce((s,x)=>s+x.balance,0);document.getElementById('actionsList').innerHTML=`<div class="action danger"><span class="dot"></span><div><b>${critical.length} ürün kritik stokta</b><small>Satın alma kontrolü öneriliyor</small></div></div><div class="action"><span class="dot"></span><div><b>${overdue} caride açık bakiye var</b><small>Toplam alacak ${fmt(state.caris.reduce((s,c)=>s+c.balance,0))}</small></div></div><div class="action ${supplierDebt>0?'':'success'}"><span class="dot"></span><div><b>Tedarikçi borcu ${fmt(supplierDebt)}</b><small>${state.suppliers.length} tedarikçi kayıtlı</small></div></div>`;
  document.getElementById('recentSales').innerHTML=state.sales.slice(0,5).map(s=>`<div class="list-row"><div><b>${escapeHtml(s.customer)}</b><small>${receiptNo(s)} • ${escapeHtml(s.payment)} • ${dateTime(s.date)}</small></div><span class="amount">${fmt(s.total)}</span></div>`).join('')||'<p class="muted">Henüz satış yok.</p>';
  document.getElementById('criticalList').innerHTML=critical.slice(0,6).map(p=>`<div class="list-row"><div><b>${escapeHtml(p.name)}</b><small>Min: ${p.minStock} • Raf ${escapeHtml(p.shelf||'-')}</small></div><span class="amount danger-text">${p.stock} ${escapeHtml(p.unit)}</span></div>`).join('')||'<p class="muted">Kritik ürün yok.</p>';
}

function csvEscape(v){return `"${String(v??'').replace(/"/g,'""')}"`}
function downloadFile(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById('exportBackup').onclick=()=>downloadFile(`nalbur-pro-yedek-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),'application/json');
document.getElementById('importBackup').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);state=migrate(parsed);save();renderAll();toast('Yedek başarıyla yüklendi')}catch{toast('Yedek dosyası okunamadı')}};r.readAsText(file);e.target.value=''};
document.getElementById('resetData').onclick=()=>{if(!confirm('Tüm cihaz verisi silinip örnek veriye dönülsün mü?'))return;state=clone(seed);cart=[];save();renderAll();toast('Veriler sıfırlandı')};
document.getElementById('exportProductsCsv').onclick=()=>{const head=['Ürün','Kategori','Barkod','Birim','Stok','Min Stok','Alış','Satış','Raf'],rows=state.products.map(p=>[p.name,p.category,p.barcode,p.unit,p.stock,p.minStock,p.buy,p.sell,p.shelf]);downloadFile('nalbur-urunler.csv','\ufeff'+[head,...rows].map(r=>r.map(csvEscape).join(';')).join('\n'),'text/csv;charset=utf-8')};
document.getElementById('exportSalesCsv').onclick=()=>{const head=['Fiş No','Tarih','Müşteri','Ödeme','Kalem','Tutar'],rows=state.sales.map(s=>[receiptNo(s),dateTime(s.date),s.customer,s.payment,s.items?.length||0,s.total]);downloadFile('nalbur-satislar.csv','\ufeff'+[head,...rows].map(r=>r.map(csvEscape).join(';')).join('\n'),'text/csv;charset=utf-8')};

async function startScanner(){
  const dialog=document.getElementById('scannerDialog'),status=document.getElementById('scannerStatus'),video=document.getElementById('scannerVideo');dialog.showModal();status.textContent='Kamera hazırlanıyor…';
  if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector' in window)){status.textContent='Bu cihazda otomatik barkod tarama desteklenmiyor. Elle giriş kullanabilirsin.';return}
  try{scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});video.srcObject=scannerStream;const detector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e']});scannerTimer=setInterval(async()=>{try{const codes=await detector.detect(video);if(codes.length){const code=codes[0].rawValue;stopScanner();dialog.close();handleBarcode(code)}}catch{}},450);status.textContent='Barkodu kameranın ortasına getir.'}catch{status.textContent='Kamera açılamadı. İzinleri kontrol et veya barkodu elle gir.'}
}
function stopScanner(){if(scannerTimer){clearInterval(scannerTimer);scannerTimer=null}if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}document.getElementById('scannerVideo').srcObject=null}
function handleBarcode(code){const p=state.products.find(x=>String(x.barcode)===String(code));document.getElementById('saleSearch').value=code;renderSaleProducts();if(p){addCart(p.id);toast(`${p.name} sepete eklendi`)}else toast(`Barkod bulunamadı: ${code}`)}
document.getElementById('quickScan').onclick=startScanner;document.getElementById('closeScanner').onclick=()=>{stopScanner();document.getElementById('scannerDialog').close()};document.getElementById('manualBarcode').onclick=()=>{const code=prompt('Barkodu gir:');if(code){stopScanner();document.getElementById('scannerDialog').close();handleBarcode(code.trim())}};document.getElementById('scannerDialog').addEventListener('close',stopScanner);

function renderAll(){renderCustomers();renderCategories();renderSaleProducts();renderCart();renderSales();renderProducts();renderStock();renderCaris();renderPurchases();renderInvoices();renderCash();renderDashboard()}
renderAll();save();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{})}
