/* =========================
   v0.4.0 GEÇER NALBUR
   KDV, satır/sepet iskontosu, parçalı ödeme, iade, fiş yazdırma, teklif, bekleyen sepet,
   toplu fiyat, etiket, çok kalemli alış, sipariş önerisi, çek/senet, cari ekstre,
   gün sonu (Z), raporlar, PIN şifreleme ve Android APK köprüsü.
   app.js'ten sonra yüklenir ve onun fonksiyonlarını genişletir.
   ========================= */
const APP_VERSION='0.4.0';
const round2=n=>Math.round((num(n)+Number.EPSILON)*100)/100;
const qtyFmt=n=>Number(num(n).toFixed(2)).toLocaleString('tr-TR');
function localDateKey(d=new Date()){d=new Date(d);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateOnly(v){return v?new Date(v).toLocaleDateString('tr-TR'):'-'}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function daysBetween(a,b){const x=new Date(a),y=new Date(b);x.setHours(0,0,0,0);y.setHours(0,0,0,0);return Math.round((y-x)/86400000)}
const $=id=>document.getElementById(id);
function closeDialog(id){const d=$(id);if(d?.open)d.close()}

const EXPENSE_CATEGORIES=['Kira','Elektrik / Su / Doğalgaz','Personel','Yakıt / Nakliye','Vergi / SGK','Banka / POS Komisyonu','Yemek / Mutfak','Bakım / Onarım','Kırtasiye / Ofis','Diğer Gider'];
const INCOME_CATEGORIES=['Diğer Gelir','Sermaye Girişi','Kasa Sayım Farkı'];
// Kâr/zarar hesabında gider sayılmayan kasa çıkışları
const NON_EXPENSE_CATEGORIES=['Mal Alışı','Satış İadesi','Tedarikçi Ödemesi','Çek/Senet Ödemesi','Kasa Sayım Farkı'];
const CARI_SIGN={'Açılış':1,'Borç':1,'Karşılıksız':1,'Tahsilat':-1,'İade':-1,'Çek/Senet':-1};
const DEFAULT_SETTINGS={companyName:'Geçer Nalbur',companyPhone:'',companyAddress:'',companyTaxOffice:'',companyTaxNo:'',receiptFooter:'Bizi tercih ettiğiniz için teşekkür ederiz.',receiptWidth:'80',defaultVat:20,groupUsta:10,groupToptan:18,defaultDueDays:30,deadStockDays:60,quoteDays:7,backupReminderDays:7,lastBackupAt:''};
const V40_PERMS={discount:false,returns:false,quotes:true,cheques:false,reports:false,dayClose:false};

Object.assign(titles,{quotes:'Teklifler',cheques:'Çek & Senet',reports:'Raporlar',cash:'Kasa & Gün Sonu'});
Object.assign(VIEW_PERMISSION,{quotes:'quotes',cheques:'cheques',reports:'reports'});
for(const k of Object.keys(V40_PERMS)) if(!ALL_PERMISSIONS.includes(k)) ALL_PERMISSIONS.push(k);
Object.assign(SELLER_DEFAULTS,V40_PERMS);
Object.keys(V40_PERMS).forEach(k=>ADMIN_PERMISSIONS[k]=true);

/* ---------- PIN şifreleme (SHA-256, cihaz içi) ---------- */
const SHA_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256Hex(message){
  const ror=(x,n)=>(x>>>n)|(x<<(32-n));
  const bytes=new TextEncoder().encode(String(message)),len=bytes.length,padded=((len+9+63)>>6)<<6,buf=new Uint8Array(padded);
  buf.set(bytes);buf[len]=0x80;const dv=new DataView(buf.buffer);dv.setUint32(padded-4,(len*8)>>>0);dv.setUint32(padded-8,Math.floor(len/0x20000000));
  let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const w=new Uint32Array(64);
  for(let off=0;off<padded;off+=64){
    for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
    for(let i=16;i<64;i++){const s0=ror(w[i-15],7)^ror(w[i-15],18)^(w[i-15]>>>3),s1=ror(w[i-2],17)^ror(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0}
    let [a,b,c,d,e,f,g,k]=h;
    for(let i=0;i<64;i++){const t1=(k+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+SHA_K[i]+w[i])>>>0,t2=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))>>>0;k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}
    h=[h[0]+a,h[1]+b,h[2]+c,h[3]+d,h[4]+e,h[5]+f,h[6]+g,h[7]+k].map(x=>x>>>0);
  }
  return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function randomSalt(){const a=new Uint8Array(12);(window.crypto||{}).getRandomValues?.(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')||String(Math.random()).slice(2)}
function setUserPin(u,pin){u.pinSalt=randomSalt();u.pinHash=sha256Hex(`${u.pinSalt}:${pin}`);delete u.pin}
function checkUserPin(u,pin){return u.pinHash?sha256Hex(`${u.pinSalt}:${pin}`)===u.pinHash:String(u.pin)===String(pin)}

/* ---------- Veri yükseltme ---------- */
function upgradeV40(){
  if(!Array.isArray(state.staff)||!Array.isArray(state.payrollMoves)||!Array.isArray(state.leaveRecords))upgradePersonnelState();
  state.settings={...DEFAULT_SETTINGS,...(state.settings||{})};
  for(const k of ['returns','quotes','parked','cheques','dayClosings','priceLog']) if(!Array.isArray(state[k])) state[k]=[];
  state.products.forEach(p=>{p.vat=p.vat===undefined||p.vat===''||p.vat===null?num(state.settings.defaultVat):num(p.vat);p.priceUsta=num(p.priceUsta);p.priceToptan=num(p.priceToptan);p.brand=p.brand||'';p.supplierId=p.supplierId?Number(p.supplierId):null});
  state.caris.forEach(c=>{c.dueDays=c.dueDays===undefined||c.dueDays===''||c.dueDays===null?null:num(c.dueDays);c.creditLimit=num(c.creditLimit);c.address=c.address||''});
  state.sales.forEach(s=>{if(!Array.isArray(s.payments))s.payments=[{method:s.payment,amount:num(s.total)}];s.returnedTotal=num(s.returnedTotal);(s.items||[]).forEach(i=>{if(i.vat===undefined)i.vat=state.products.find(p=>p.id===i.id)?.vat??20;i.returned=num(i.returned)})});
  state.cashMoves.forEach(m=>{if(!m.category&&m.type==='Gider'&&String(m.description||'').startsWith('Mal alış'))m.category='Mal Alışı'});
  state.staff.forEach(u=>{
    u.permissions=u.role==='admin'?{...ADMIN_PERMISSIONS}:{...V40_PERMS,...(u.permissions||{})};
    if(u.pinHash)delete u.pin;else if(u.pin)setUserPin(u,u.pin);
  });
  state.version=40;save();
}
upgradeV40();
const baseRenderAllV40=renderAll;
renderAll=function(){if(state.version!==40||!state.settings||!Array.isArray(state.staff))upgradeV40();baseRenderAllV40();renderQuotes();renderCheques();renderReports();renderSettingsInfo()};

/* ---------- Giriş: şifreli PIN ---------- */
function defaultPinInUse(){const u=state.staff.find(x=>x.username==='ufuk'&&x.active);return !!u&&checkUserPin(u,'1234')}
function updateLoginHint(){const h=$('loginHint');if(h)h.style.display=defaultPinInUse()?'':'none'}
loginForm.onsubmit=e=>{
  e.preventDefault();
  const username=$('loginUsername').value.trim().toLowerCase(),pin=$('loginPin').value.trim();
  const user=state.staff.find(u=>u.active&&String(u.username).toLowerCase()===username&&checkUserPin(u,pin));
  if(!user){$('loginError').textContent='Kullanıcı adı veya PIN hatalı.';return}
  $('loginError').textContent='';$('loginPin').value='';setCurrentUser(user);go(can('sale')?'dashboard':'staff');renderAll();
  if(defaultPinInUse()&&isAdmin())setTimeout(()=>toast('Güvenlik: varsayılan PIN 1234 hâlâ kullanılıyor, lütfen değiştir'),800);
};
const baseSaveStaffV40=saveStaffBtn.onclick;
saveStaffBtn.onclick=e=>{
  const f=$('staffForm'),typed=String(f.elements.pin.value||'').trim(),username=String(f.elements.username.value||'').trim().toLowerCase();
  baseSaveStaffV40(e);if(e.defaultPrevented)return;
  const u=state.staff.find(x=>String(x.username).toLowerCase()===username);
  if(!u)return;
  if(typed)setUserPin(u,typed);else if(u.pinHash)delete u.pin;else if(u.pin)setUserPin(u,u.pin);
  if(currentUser&&currentUser.id===u.id)currentUser=u;
  save();updateLoginHint();
};

/* ---------- Android köprüsü, indirme, paylaşım, yazdırma ---------- */
function toBase64(content){const bytes=typeof content==='string'?new TextEncoder().encode(content):new Uint8Array(content);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin)}
const baseDownloadFileV40=downloadFile;
downloadFile=function(name,content,type){
  if(window.GecerAndroid){const where=GecerAndroid.saveFile(name,toBase64(content),type);toast(where?`Kaydedildi: ${where}`:'Dosya kaydedilemedi');return}
  baseDownloadFileV40(name,content,type);
};
async function shareFile(name,content,type,text=''){
  if(window.GecerAndroid){if(!GecerAndroid.shareFile(name,toBase64(content),type,text))toast('Paylaşım açılamadı');return}
  try{const file=new File([content],name,{type});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],text});return}}catch(err){if(err?.name==='AbortError')return}
  downloadFile(name,content,type);
}
function openExternal(url){if(window.GecerAndroid)GecerAndroid.openUrl(url);else window.open(url,'_blank','noopener')}
function normalizePhone(phone){let d=String(phone||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('0'))d='9'+d;else if(d.length===10&&d.startsWith('5'))d='90'+d;return d.length>=11?d:''}
async function shareText(text,phone=''){
  const p=normalizePhone(phone);
  if(p){openExternal(`https://wa.me/${p}?text=${encodeURIComponent(text)}`);return}
  if(window.GecerAndroid){GecerAndroid.shareText(text);return}
  if(navigator.share){try{await navigator.share({text});return}catch(err){if(err?.name==='AbortError')return}}
  openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
}
function printDoc(html,{width=state.settings.receiptWidth,title='Geçer Nalbur'}={}){
  const area=$('printArea');area.className=`print-area print-${width==='A4'?'a4':width==='58'?'58':'80'}`;area.innerHTML=html;
  let style=$('printPageStyle');if(!style){style=document.createElement('style');style.id='printPageStyle';document.head.appendChild(style)}
  style.textContent=width==='A4'?'@page{size:A4;margin:12mm}':'@page{margin:3mm}';
  setTimeout(()=>{if(window.GecerAndroid)GecerAndroid.print(title);else window.print()},60);
}
window.gecerBack=function(){
  const open=[...document.querySelectorAll('dialog[open]')];if(open.length){open[open.length-1].close();return true}
  if($('sidebar').classList.contains('open')){$('sidebar').classList.remove('open');return true}
  if(currentUser&&document.querySelector('.view.active')?.id!=='dashboard'){go('dashboard');return true}
  return false;
};

/* ---------- Basit seçim penceresi ---------- */
function pickOption(title,options,{note=''}={}){
  return new Promise(resolve=>{
    const d=document.createElement('dialog');
    d.innerHTML=`<div class="modal-form"><div class="modal-head"><h2>${escapeHtml(title)}</h2><button type="button" data-pick-cancel>✕</button></div>${note?`<p class="modal-note">${escapeHtml(note)}</p>`:''}<div class="pick-list">${options.map((o,i)=>`<button type="button" class="ghost-btn" data-pick="${i}">${escapeHtml(o.label)}</button>`).join('')||'<p class="muted">Seçenek yok.</p>'}</div></div>`;
    document.body.appendChild(d);let value=null;
    d.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{value=options[Number(b.dataset.pick)].value;d.close()});
    d.querySelector('[data-pick-cancel]').onclick=()=>d.close();
    d.addEventListener('close',()=>{d.remove();resolve(value)});d.showModal();
  });
}

/* ---------- Fiyat grupları ve sepet hesapları ---------- */
customerMultiplier=function(group){const s=state.settings||DEFAULT_SETTINGS;return group==='Usta'?1-num(s.groupUsta)/100:group==='Toptan'?1-num(s.groupToptan)/100:1};
function listUnitPrice(p,group){if(group==='Usta'&&num(p.priceUsta)>0)return num(p.priceUsta);if(group==='Toptan'&&num(p.priceToptan)>0)return num(p.priceToptan);return round2(p.sell*customerMultiplier(group))}
productPrice=function(p){return listUnitPrice(p,currentCustomer()?.priceGroup||'Perakende')};
let cartDiscount=null;let pendingQuoteId=null;
function cartTotals(customer=currentCustomer()){
  const group=customer?.priceGroup||'Perakende';let gross=0,net=0;const lines=[];
  for(const l of cart){const p=state.products.find(x=>x.id===l.id);if(!p)continue;const base=listUnitPrice(p,group),unit=l.price!=null?num(l.price):base,total=round2(unit*l.qty*(1-num(l.disc)/100));gross+=p.sell*l.qty;net+=total;lines.push({line:l,p,base,unit,total})}
  net=round2(net);let cartDisc=0;
  if(cartDiscount&&net>0){const v=num(cartDiscount.value);cartDisc=cartDiscount.type==='pct'?net*v/100:cartDiscount.type==='amt'?v:net-v;cartDisc=round2(Math.min(Math.max(cartDisc,0),net))}
  const total=round2(net-cartDisc),ratio=net>0?total/net:1;let vat=0,allocated=0;
  lines.forEach((x,i)=>{x.final=i===lines.length-1?round2(total-allocated):round2(x.total*ratio);allocated=round2(allocated+x.final);x.finalUnit=x.line.qty?x.final/x.line.qty:0;x.vatAmount=x.final-x.final/(1+num(x.p.vat)/100);vat+=x.vatAmount});
  return {lines,gross:round2(gross),groupDisc:round2(gross-net),cartDisc,total,vat:round2(vat),belowCost:lines.filter(x=>x.finalUnit<x.p.buy)};
}
renderCart=function(){
  const c=currentCustomer(),t=cartTotals(c);
  $('cartItems').innerHTML=t.lines.map(({line,p,base,unit,total})=>{
    const changed=line.price!=null&&Math.abs(unit-base)>0.004,disc=num(line.disc);
    return `<div class="cart-item"><div><b>${escapeHtml(p.name)}</b><small>${changed?`<s>${fmt(base)}</s> `:''}${fmt(unit)} / ${escapeHtml(p.unit)}${disc?` <span class="disc-badge">−%${disc}</span>`:''} • KDV %${p.vat}</small><button class="link-btn line-edit" data-line-edit="${p.id}" type="button">✎ Düzenle</button></div><div><div class="qty"><button data-dec="${p.id}" type="button">−</button><input data-qty="${p.id}" value="${line.qty}" type="number" min="0.01" max="${p.stock}" step="0.01" inputmode="decimal"><button data-inc="${p.id}" type="button">＋</button></div><b>${fmt(total)}</b></div></div>`;
  }).join('')||'<p class="empty-cart">Sepet boş</p>';
  $('subtotal').textContent=fmt(t.gross);$('discountTotal').textContent=(t.groupDisc>=0?'− ':'+ ')+fmt(Math.abs(t.groupDisc));
  $('cartDiscountRow').classList.toggle('hidden-row',!t.cartDisc);$('cartDiscountTotal').textContent='− '+fmt(t.cartDisc);
  $('vatTotal').textContent=fmt(t.vat);$('grandTotal').textContent=fmt(t.total);$('cartCount').textContent=`${cart.length} kalem${pendingQuoteId?' • tekliften':''}`;
  const badge=$('mobileCartBadge');if(badge)badge.textContent=cart.length;$('parkedCount').textContent=state.parked.length;
  document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===+b.dataset.inc),p=state.products.find(x=>x.id===l.id);if(l.qty+1>p.stock)return toast('Stok miktarı aşılamaz');l.qty=round2(l.qty+1);renderCart()});
  document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{const l=cart.find(x=>x.id===+b.dataset.dec);l.qty=round2(l.qty-1);if(l.qty<=0)cart=cart.filter(x=>x.id!==l.id);renderCart()});
  document.querySelectorAll('[data-qty]').forEach(i=>i.onchange=()=>{const l=cart.find(x=>x.id===+i.dataset.qty),p=state.products.find(x=>x.id===l.id);const v=num(String(i.value).replace(',','.'));if(v>p.stock)toast('Stok miktarı aşılamaz');l.qty=round2(Math.max(.01,Math.min(p.stock,v||1)));renderCart()});
  document.querySelectorAll('[data-line-edit]').forEach(b=>b.onclick=()=>openLineEdit(Number(b.dataset.lineEdit)));
  return t.total;
};
updateCreditSaleSummary=function(){
  const c=state.caris.find(x=>x.id===Number($('creditCariSelect').value)),box=$('creditSaleSummary');
  if(!c){box.innerHTML='<p class="muted">Cari seç.</p>';return}
  const total=cartTotals(c).total,next=c.balance+total,over=c.creditLimit>0&&next>c.creditLimit;
  box.innerHTML=`<div><span>Seçilen cari</span><b>${escapeHtml(c.name)}</b></div><div><span>Mevcut bakiye</span><b>${fmt(c.balance)}</b></div><div><span>Bu satış (${escapeHtml(c.priceGroup)} fiyatı)</span><b>${fmt(total)}</b></div><div><span>Risk limiti</span><b>${c.creditLimit?fmt(c.creditLimit):'Limitsiz'}</b></div><div class="credit-new-balance ${over?'over-limit':''}"><span>Yeni bakiye${over?' • LİMİT AŞILIYOR':''}</span><strong>${fmt(next)}</strong></div>`;
};

// Barkod okuyucu (USB/Bluetooth) ile hızlı ekleme: barkod yazılıp Enter'a basılınca sepete atar
$('saleSearch').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;const code=e.target.value.trim();if(!code)return;
  const p=state.products.find(x=>String(x.barcode||'')===code)||(()=>{const m=state.products.filter(x=>x.name.toLowerCase().includes(code.toLowerCase()));return m.length===1?m[0]:null})();
  if(p){e.preventDefault();addCart(p.id);e.target.value='';renderSaleProducts();toast(`${p.name} sepete eklendi`)}
});

/* ---------- Satır düzenleme ve sepet iskontosu ---------- */
function openLineEdit(id){
  const l=cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!l||!p)return;
  const f=$('lineEditForm'),base=listUnitPrice(p,currentCustomer()?.priceGroup||'Perakende'),allowed=can('discount');
  f.elements.productId.value=id;f.elements.qty.value=l.qty;f.elements.qty.max=p.stock;f.elements.price.value=round2(l.price!=null?l.price:base);f.elements.disc.value=num(l.disc);
  f.elements.price.disabled=!allowed;f.elements.disc.disabled=!allowed;$('lineEditTitle').textContent=p.name;
  $('lineEditNote').textContent=`Liste fiyatı ${fmt(base)} • Stok ${qtyFmt(p.stock)} ${p.unit}${can('editProducts')?` • Alış ${fmt(p.buy)}`:''}${allowed?'':' • Fiyat/iskonto değiştirme yetkin yok'}`;
  updateLineTotal();$('lineEditDialog').showModal();
}
function updateLineTotal(){const f=$('lineEditForm');f.elements.lineTotal.value=fmt(num(f.elements.qty.value)*num(f.elements.price.value)*(1-num(f.elements.disc.value)/100))}
['qty','price','disc'].forEach(n=>$('lineEditForm').elements[n].addEventListener('input',updateLineTotal));
$('saveLineEdit').onclick=e=>{
  const f=$('lineEditForm');if(!f.reportValidity()){e.preventDefault();return}
  const id=Number(f.elements.productId.value),l=cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!l||!p)return;
  const qty=num(f.elements.qty.value);if(qty>p.stock){e.preventDefault();return toast('Stok miktarı aşılamaz')}
  l.qty=round2(qty);
  if(can('discount')){const base=listUnitPrice(p,currentCustomer()?.priceGroup||'Perakende'),price=num(f.elements.price.value);l.price=Math.abs(price-base)>0.004?price:null;l.disc=Math.min(100,Math.max(0,num(f.elements.disc.value)))}
  renderCart();
};
$('removeLineBtn').onclick=()=>{const id=Number($('lineEditForm').elements.productId.value);cart=cart.filter(x=>x.id!==id);closeDialog('lineEditDialog');renderCart()};
$('cartDiscountBtn').onclick=()=>{
  if(!can('discount'))return toast('İskonto yetkin yok');if(!cart.length)return toast('Sepet boş');
  const f=$('cartDiscountForm');f.reset();if(cartDiscount){f.elements.type.value=cartDiscount.type;f.elements.value.value=cartDiscount.value}$('cartDiscountDialog').showModal();
};
$('saveCartDiscount').onclick=e=>{const f=$('cartDiscountForm');if(!f.reportValidity()){e.preventDefault();return}const type=f.elements.type.value,value=num(f.elements.value.value);if(type==='pct'&&value>100){e.preventDefault();return toast('Yüzde 100\'den büyük olamaz')}cartDiscount=value>0||type==='round'?{type,value}:null;renderCart()};
$('clearCartDiscount').onclick=()=>{cartDiscount=null;closeDialog('cartDiscountDialog');renderCart()};
$('clearCart').onclick=()=>{cart=[];cartDiscount=null;pendingQuoteId=null;renderCart()};

/* ---------- Satış onayı, parçalı ödeme ve kayıt ---------- */
let pendingSaleV40=null;
function paymentsLabel(payments){return payments.length>1?'Parçalı':payments[0]?.method||'-'}
completeSale=function(payment,forcedCustomerId=null){
  if(!cart.length)return toast('Sepet boş');
  const customer=forcedCustomerId?state.caris.find(c=>c.id===Number(forcedCustomerId)):currentCustomer();if(!customer)return toast('Müşteri bulunamadı');
  if(payment==='Veresiye'&&customer.id===1)return openCreditSale();
  requestSaleV40([{method:payment,amount:cartTotals(customer).total}],customer.id);
};
function requestSaleV40(payments,customerId){
  if(!can('sale'))return toast('Satış yetkin yok');if(!cart.length)return toast('Sepet boş');
  const customer=state.caris.find(c=>c.id===customerId);if(!customer)return toast('Müşteri bulunamadı');
  const t=cartTotals(customer),credit=payments.filter(p=>p.method==='Veresiye').reduce((s,p)=>s+num(p.amount),0);
  if(credit>0&&!can('creditSale'))return toast('Veresiye satış yetkin yok');
  if(credit>0&&customer.id===1)return toast('Veresiye için gerçek bir cari seç');
  for(const x of t.lines)if(x.line.qty>x.p.stock)return toast(`${x.p.name} için stok yetersiz`);
  const over=credit>0&&customer.creditLimit>0&&customer.balance+credit>customer.creditLimit;
  if(over&&!isAdmin())return toast(`Risk limiti aşılıyor (${fmt(customer.creditLimit)}). Yönetici onayı gerekir.`);
  pendingSaleV40={customerId,payments};
  const warn=[];if(over)warn.push(`⚠ ${customer.name} risk limiti (${fmt(customer.creditLimit)}) aşılıyor. Yeni bakiye ${fmt(customer.balance+credit)}.`);
  if(can('editProducts')&&t.belowCost.length)warn.push(`⚠ Maliyetin altında satış: ${t.belowCost.map(x=>x.p.name).join(', ')}`);
  const lines=t.lines.map(x=>`<div class="sale-confirm-item"><div><b>${escapeHtml(x.p.name)}</b><small>${qtyFmt(x.line.qty)} ${escapeHtml(x.p.unit)} × ${fmt(x.unit)}${num(x.line.disc)?` −%${num(x.line.disc)}`:''}</small></div><b class="line-total">${fmt(x.total)}</b></div>`).join('');
  $('saleConfirmContent').innerHTML=`<div class="sale-confirm-grid"><div><span>Müşteri / Cari</span><b>${escapeHtml(customer.name)}</b></div><div><span>Ödeme</span><b>${escapeHtml(paymentsLabel(payments))}</b></div><div><span>Satış Danışmanı</span><b>${escapeHtml(currentUser?.name||'-')}</b></div><div><span>Kalem</span><b>${cart.length}</b></div></div><div class="sale-confirm-items">${lines}</div><div class="confirm-breakdown"><div><span>Liste toplamı</span><b>${fmt(t.gross)}</b></div><div><span>Grup / satır indirimi</span><b>${fmt(t.groupDisc)}</b></div>${t.cartDisc?`<div><span>Sepet iskontosu</span><b>− ${fmt(t.cartDisc)}</b></div>`:''}<div><span>KDV (dahil)</span><b>${fmt(t.vat)}</b></div>${payments.length>1?payments.map(p=>`<div><span>${escapeHtml(p.method)}</span><b>${fmt(p.amount)}</b></div>`).join(''):''}</div><div class="sale-confirm-total"><span>Satış Toplamı</span><strong>${fmt(t.total)}</strong></div>${warn.map(w=>`<div class="confirm-warn">${escapeHtml(w)}</div>`).join('')}`;
  closeDialog('creditSaleDialog');closeDialog('splitPayDialog');$('saleConfirmDialog').showModal();
}
function finalizeSaleV40(){
  const info=pendingSaleV40;pendingSaleV40=null;if(!info)return;
  const customer=state.caris.find(c=>c.id===info.customerId);if(!customer)return toast('Müşteri bulunamadı');
  const t=cartTotals(customer);if(!t.lines.length)return toast('Sepet boş');
  for(const x of t.lines)if(x.line.qty>x.p.stock)return toast(`${x.p.name} için stok yetersiz`);
  let payments=info.payments.map(p=>({method:p.method,amount:round2(p.amount)})).filter(p=>p.amount>0);
  if(payments.length===1||!payments.length)payments=[{method:(payments[0]||info.payments[0]).method,amount:t.total}];
  const paid=round2(payments.reduce((s,p)=>s+p.amount,0));if(Math.abs(paid-t.total)>0.01)return toast(`Ödeme toplamı (${fmt(paid)}) satış tutarıyla (${fmt(t.total)}) eşleşmiyor`);
  const saleId=nextId(),date=nowIso(),items=[],seller=currentUser;
  for(const x of t.lines){
    const p=x.p,before=p.stock;p.stock=round2(p.stock-x.line.qty);
    items.push({id:p.id,name:p.name,qty:x.line.qty,unit:p.unit,unitPrice:x.finalUnit,listPrice:x.base,price:x.unit,disc:num(x.line.disc),vat:num(p.vat),cost:p.buy,returned:0});
    state.stockMoves.unshift({id:nextId(),saleId,date,productId:p.id,product:p.name,type:'Satış',qty:-x.line.qty,before,after:p.stock,note:`${customer.name} • ${paymentsLabel(payments)}`});
  }
  const sale={id:saleId,date,customerId:customer.id,customer:customer.name,payment:paymentsLabel(payments),payments,total:t.total,subtotal:t.gross,discount:round2(t.groupDisc+t.cartDisc),cartDiscount:t.cartDisc,vatTotal:t.vat,items,returnedTotal:0,staffId:seller?.id,staffName:seller?.name,quoteId:pendingQuoteId||undefined};
  state.sales.unshift(sale);
  for(const p of payments){
    if(p.method==='Veresiye'){customer.balance=round2(customer.balance+p.amount);customer.last='Bugün';state.cariMoves.unshift({id:nextId(),saleId,date,cariId:customer.id,cari:customer.name,type:'Borç',description:`${receiptNo(sale)} veresiye satış`,amount:p.amount,staffId:seller?.id,staffName:seller?.name})}
    else state.cashMoves.unshift({id:nextId(),saleId,date,type:'Satış',description:`${receiptNo(sale)} • ${customer.name}`,payment:p.method,amount:p.amount,staffId:seller?.id,staffName:seller?.name});
  }
  if(pendingQuoteId){const q=state.quotes.find(x=>x.id===pendingQuoteId);if(q){q.status='Satışa Döndü';q.saleId=saleId}}
  cart=[];cartDiscount=null;pendingQuoteId=null;save();closeDialog('saleConfirmDialog');
  if(window.innerWidth<=760)setSalePane('products');renderAll();showSaleDone(sale);
}
$('confirmFinalSale').onclick=finalizeSaleV40;
['closeSaleConfirm','cancelFinalSale'].forEach(id=>$(id).onclick=()=>{pendingSaleV40=null;closeDialog('saleConfirmDialog')});

$('splitPayBtn').onclick=()=>{
  if(!cart.length)return toast('Sepet boş');
  const f=$('splitPayForm');f.reset();const sel=$('splitCari'),cur=currentCustomer();
  sel.innerHTML=state.caris.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} • ${escapeHtml(c.priceGroup)}${c.id!==1?` • Bakiye ${fmt(c.balance)}`:''}</option>`).join('');sel.value=String(cur?.id||1);
  updateSplit();$('splitPayDialog').showModal();
};
function updateSplit(){
  const f=$('splitPayForm'),c=state.caris.find(x=>x.id===Number(f.elements.cariId.value)),total=cartTotals(c).total,paid=['Nakit','Kart','Banka','Veresiye'].reduce((s,k)=>s+num(f.elements[k].value),0);
  $('splitTotal').textContent=fmt(total);const rem=round2(total-paid);$('splitRemaining').textContent=fmt(rem);$('splitRemaining').className=Math.abs(rem)<0.01?'positive':'negative';return {total,rem,c};
}
$('splitPayForm').addEventListener('input',updateSplit);
$('splitCari').onchange=()=>{$('customerSelect').value=$('splitCari').value;renderSaleProducts();renderCart();updateSplit()};
$('splitFillCash').onclick=()=>{const f=$('splitPayForm'),{rem}=updateSplit();f.elements.Nakit.value=round2(Math.max(0,num(f.elements.Nakit.value)+rem));updateSplit()};
$('saveSplitPay').onclick=e=>{
  e.preventDefault();const f=$('splitPayForm'),{rem,c}=updateSplit();
  if(Math.abs(rem)>0.01)return toast(`Ödemeler toplamla eşleşmeli. Kalan: ${fmt(rem)}`);
  const payments=['Nakit','Kart','Banka','Veresiye'].map(k=>({method:k,amount:num(f.elements[k].value)})).filter(p=>p.amount>0);
  if(!payments.length)return toast('En az bir ödeme gir');
  requestSaleV40(payments,c.id);
};

/* ---------- Satış sonrası: fiş ---------- */
let lastSaleId=null;
function showSaleDone(sale){
  lastSaleId=sale.id;const credit=sale.payments.find(p=>p.method==='Veresiye'),c=state.caris.find(x=>x.id===sale.customerId);
  $('saleDoneText').innerHTML=`${receiptNo(sale)} • ${escapeHtml(sale.customer)} • <b>${fmt(sale.total)}</b><br><small>${escapeHtml(sale.payments.map(p=>`${p.method} ${fmt(p.amount)}`).join(' + '))}${credit&&c?` • Yeni cari bakiye ${fmt(c.balance)}`:''}</small>`;
  $('saleDoneDialog').showModal();
}
$('saleDonePrint').onclick=()=>{const s=state.sales.find(x=>x.id===lastSaleId);if(s)printReceipt(s)};
$('saleDoneShare').onclick=()=>{const s=state.sales.find(x=>x.id===lastSaleId);if(s)shareReceipt(s)};
$('saleDoneClose').onclick=()=>closeDialog('saleDoneDialog');
function companyHeader(){const s=state.settings;return `<div class="doc-company"><b>${escapeHtml(s.companyName||'Geçer Nalbur')}</b>${s.companyAddress?`<span>${escapeHtml(s.companyAddress)}</span>`:''}${s.companyPhone?`<span>Tel: ${escapeHtml(s.companyPhone)}</span>`:''}${s.companyTaxOffice||s.companyTaxNo?`<span>${escapeHtml(s.companyTaxOffice)} V.D. ${escapeHtml(s.companyTaxNo)}</span>`:''}</div>`}
function vatBreakdown(items){const m={};items.forEach(i=>{const net=num(i.unitPrice)*(num(i.qty)-num(i.returned)),r=num(i.vat);m[r]=(m[r]||0)+net-net/(1+r/100)});return Object.entries(m).filter(([,v])=>v>0.004).sort((a,b)=>a[0]-b[0])}
function receiptHtml(sale){
  const c=state.caris.find(x=>x.id===sale.customerId),credit=sale.payments?.some(p=>p.method==='Veresiye');
  const rows=(sale.items||[]).map(i=>`<div class="r-item"><div class="r-name">${escapeHtml(i.name)}</div><div class="r-line"><span>${qtyFmt(i.qty)} ${escapeHtml(i.unit||'')} × ${fmt(i.unitPrice)}</span><b>${fmt(i.unitPrice*i.qty)}</b></div>${num(i.returned)?`<div class="r-line r-muted"><span>İade: ${qtyFmt(i.returned)}</span><span>−${fmt(i.unitPrice*i.returned)}</span></div>`:''}</div>`).join('');
  return `<div class="receipt">${companyHeader()}<div class="r-sep"></div><div class="r-line"><span>Fiş No</span><b>${receiptNo(sale)}</b></div><div class="r-line"><span>Tarih</span><span>${dateTime(sale.date)}</span></div><div class="r-line"><span>Müşteri</span><span>${escapeHtml(sale.customer)}</span></div>${sale.staffName?`<div class="r-line"><span>Danışman</span><span>${escapeHtml(sale.staffName)}</span></div>`:''}<div class="r-sep"></div>${rows}<div class="r-sep"></div>${num(sale.subtotal)>num(sale.total)?`<div class="r-line"><span>Liste Toplamı</span><span>${fmt(sale.subtotal)}</span></div><div class="r-line"><span>İndirim</span><span>−${fmt(num(sale.subtotal)-num(sale.total))}</span></div>`:''}${vatBreakdown(sale.items||[]).map(([r,v])=>`<div class="r-line r-muted"><span>KDV %${r}</span><span>${fmt(v)}</span></div>`).join('')}<div class="r-line r-total"><span>TOPLAM</span><b>${fmt(sale.total)}</b></div>${num(sale.returnedTotal)?`<div class="r-line"><span>İade</span><span>−${fmt(sale.returnedTotal)}</span></div><div class="r-line r-total"><span>NET</span><b>${fmt(sale.total-sale.returnedTotal)}</b></div>`:''}${(sale.payments||[]).map(p=>`<div class="r-line"><span>${escapeHtml(p.method)}</span><span>${fmt(p.amount)}</span></div>`).join('')}${credit&&c?`<div class="r-line"><span>Güncel Cari Bakiye</span><b>${fmt(c.balance)}</b></div>`:''}<div class="r-sep"></div><p class="r-foot">${escapeHtml(state.settings.receiptFooter||'')}</p><p class="r-foot r-muted">Bilgi fişidir, mali değeri yoktur.</p></div>`;
}
function receiptText(sale){
  const s=state.settings,lines=[`*${s.companyName||'Geçer Nalbur'}*`,`Fiş: ${receiptNo(sale)} • ${dateTime(sale.date)}`,`Müşteri: ${sale.customer}`,'------------------------'];
  (sale.items||[]).forEach(i=>lines.push(`${i.name}\n  ${qtyFmt(i.qty)} ${i.unit||''} x ${fmt(i.unitPrice)} = ${fmt(i.unitPrice*i.qty)}`));
  lines.push('------------------------',`*TOPLAM: ${fmt(sale.total)}*`);if(num(sale.returnedTotal))lines.push(`İade: -${fmt(sale.returnedTotal)}`);
  (sale.payments||[]).forEach(p=>lines.push(`${p.method}: ${fmt(p.amount)}`));
  const c=state.caris.find(x=>x.id===sale.customerId);if(sale.payments?.some(p=>p.method==='Veresiye')&&c)lines.push(`Güncel bakiye: ${fmt(c.balance)}`);
  if(s.receiptFooter)lines.push('',s.receiptFooter);return lines.join('\n');
}
function printReceipt(sale){printDoc(receiptHtml(sale),{title:receiptNo(sale)})}
function shareReceipt(sale){const c=state.caris.find(x=>x.id===sale.customerId);shareText(receiptText(sale),c?.id!==1?c?.phone:'')}

/* ---------- Satış detayı, iade ve silme ---------- */
const baseOpenSaleDetailV40=openSaleDetail;
openSaleDetail=function(id){
  baseOpenSaleDetailV40(id);const s=state.sales.find(x=>x.id===id);if(!s||!$('saleDetailDialog').open)return;
  const extra=document.createElement('div');extra.className='detail-extra';
  const rets=state.returns.filter(r=>r.saleId===id);
  extra.innerHTML=`<div class="confirm-breakdown">${(s.payments||[]).map(p=>`<div><span>${escapeHtml(p.method)}</span><b>${fmt(p.amount)}</b></div>`).join('')}${num(s.discount)?`<div><span>Toplam indirim</span><b>${fmt(s.discount)}</b></div>`:''}${vatBreakdown(s.items||[]).map(([r,v])=>`<div><span>KDV %${r}</span><b>${fmt(v)}</b></div>`).join('')}</div>${rets.length?`<div class="confirm-warn">↩ İadeler: ${rets.map(r=>`${dateOnly(r.date)} ${fmt(r.total)} (${escapeHtml(r.method)})`).join(' • ')}</div>`:''}`;
  $('saleDetailContent').appendChild(extra);
  $('returnSaleBtn').classList.toggle('hidden-by-permission',!can('returns'));
};
$('printSaleReceipt').onclick=()=>{const s=state.sales.find(x=>x.id===activeSaleDetailId);if(s)printReceipt(s)};
$('shareSaleReceipt').onclick=()=>{const s=state.sales.find(x=>x.id===activeSaleDetailId);if(s)shareReceipt(s)};
$('returnSaleBtn').onclick=()=>{if(activeSaleDetailId)openReturn(activeSaleDetailId)};
let returnSaleId=null;
function openReturn(saleId){
  if(!can('returns'))return toast('İade yetkin yok');
  const s=state.sales.find(x=>x.id===saleId);if(!s)return;
  const open=(s.items||[]).filter(i=>num(i.qty)-num(i.returned)>0);if(!open.length)return toast('Bu satışta iade edilebilir ürün kalmadı');
  returnSaleId=saleId;$('returnSaleInfo').textContent=`${receiptNo(s)} • ${s.customer} • ${dateTime(s.date)}`;
  $('returnLines').innerHTML=(s.items||[]).map((i,idx)=>{const rem=round2(num(i.qty)-num(i.returned));return `<label class="return-line ${rem<=0?'disabled':''}"><span><b>${escapeHtml(i.name)}</b><small>Satılan ${qtyFmt(i.qty)} • İade edilen ${qtyFmt(i.returned)} • ${fmt(i.unitPrice)}</small></span><input type="number" min="0" max="${rem}" step="0.01" value="0" data-return-idx="${idx}" ${rem<=0?'disabled':''} inputmode="decimal" /></label>`}).join('');
  const sel=$('returnMethod'),hasCredit=s.payments?.some(p=>p.method==='Veresiye');
  sel.querySelector('option[value="Cari"]').disabled=s.customerId===1;
  sel.value=hasCredit&&s.customerId!==1?'Cari':(s.payments?.find(p=>p.method!=='Veresiye')?.method||'Nakit');
  $('returnForm').elements.note.value='';updateReturnTotal();closeDialog('saleDetailDialog');$('returnDialog').showModal();
}
function updateReturnTotal(){const s=state.sales.find(x=>x.id===returnSaleId);if(!s)return 0;let t=0;document.querySelectorAll('[data-return-idx]').forEach(i=>{const it=s.items[Number(i.dataset.returnIdx)];t+=Math.min(num(i.value),num(it.qty)-num(it.returned))*num(it.unitPrice)});t=round2(t);$('returnTotal').textContent=fmt(t);return t}
$('returnLines').addEventListener('input',updateReturnTotal);
$('saveReturn').onclick=e=>{
  if(!$('returnForm').reportValidity()){e.preventDefault();return}
  const s=state.sales.find(x=>x.id===returnSaleId);if(!s)return;const total=updateReturnTotal();if(total<=0){e.preventDefault();return toast('İade miktarı gir')}
  const method=$('returnMethod').value,note=$('returnForm').elements.note.value,date=nowIso(),retId=nextId(),items=[];
  document.querySelectorAll('[data-return-idx]').forEach(i=>{
    const it=s.items[Number(i.dataset.returnIdx)],q=round2(Math.min(num(i.value),num(it.qty)-num(it.returned)));if(q<=0)return;
    it.returned=round2(num(it.returned)+q);items.push({id:it.id,name:it.name,qty:q,unitPrice:it.unitPrice});
    const p=state.products.find(x=>x.id===it.id);if(p){const before=p.stock;p.stock=round2(p.stock+q);state.stockMoves.unshift({id:nextId(),saleId:s.id,returnId:retId,date,productId:p.id,product:p.name,type:'İade',qty:q,before,after:p.stock,note:`${receiptNo(s)} iade${note?' • '+note:''}`})}
  });
  state.returns.unshift({id:retId,date,saleId:s.id,receipt:receiptNo(s),customerId:s.customerId,customer:s.customer,items,total,method,note,staffId:currentUser?.id,staffName:currentUser?.name});
  s.returnedTotal=round2(num(s.returnedTotal)+total);
  if(method==='Cari'){const c=state.caris.find(x=>x.id===s.customerId);if(c){c.balance=round2(c.balance-total);c.last='Bugün';state.cariMoves.unshift({id:nextId(),saleId:s.id,returnId:retId,date,cariId:c.id,cari:c.name,type:'İade',description:`${receiptNo(s)} satış iadesi`,amount:total})}}
  else state.cashMoves.unshift({id:nextId(),saleId:s.id,returnId:retId,date,type:'Gider',category:'Satış İadesi',description:`${receiptNo(s)} iade • ${s.customer}`,payment:method,amount:total,staffId:currentUser?.id,staffName:currentUser?.name});
  save();renderAll();toast(`İade kaydedildi • ${fmt(total)} • stok geri alındı`);
};
deleteSale=function(id){
  if(!can('deleteSales'))return toast('Satış silme yetkin yok');
  const sale=state.sales.find(s=>s.id===id);if(!sale)return;
  const inv=state.invoices.find(i=>i.saleId===id);if(inv&&!['TASLAK','TEST_GONDERILDI'].includes(inv.status))return toast('Gönderilmiş/resmileşmiş e-belge bağlı satış silinemez');
  if(state.returns.some(r=>r.saleId===id))return toast('İadesi yapılmış satış silinemez');
  if(!confirm(`${receiptNo(sale)} satışını silip geri almak istiyor musun? Stok, kasa ve cari etkisi geri alınacak.${inv?' Bağlı e-belge taslağı da silinecek.':''}`))return;
  const ref=receiptNo(sale);
  for(const item of sale.items||[]){const p=state.products.find(x=>x.id===item.id);if(!p)continue;const before=p.stock;p.stock=round2(p.stock+num(item.qty));state.stockMoves.unshift({id:nextId(),saleId:id,date:nowIso(),productId:p.id,product:p.name,type:'Satış iptal',qty:num(item.qty),before,after:p.stock,note:`${ref} silindi / stok geri alındı`})}
  const c=state.caris.find(x=>x.id===sale.customerId);
  state.cariMoves.filter(m=>m.saleId===id||(sale.payment==='Veresiye'&&String(m.description||'').startsWith(ref))).forEach(m=>{if(c&&m.type==='Borç'){c.balance=round2(c.balance-num(m.amount));c.last='Bugün'}});
  state.cariMoves=state.cariMoves.filter(m=>!(m.saleId===id||(sale.payment==='Veresiye'&&String(m.description||'').startsWith(ref))));
  state.cashMoves=state.cashMoves.filter(m=>!(m.saleId===id||(m.type==='Satış'&&String(m.description||'').startsWith(ref))));
  state.invoices=state.invoices.filter(i=>i.saleId!==id);state.sales=state.sales.filter(s=>s.id!==id);
  const q=state.quotes.find(x=>x.saleId===id);if(q){q.status='Açık';delete q.saleId}
  save();closeDialog('saleDetailDialog');renderAll();toast(`${ref} silindi • stok ve hesaplar geri alındı`);
};

/* ---------- Bekleyen sepetler ---------- */
$('parkCartBtn').onclick=()=>{
  if(!cart.length)return toast('Sepet boş');const note=prompt('Bekleyen sepet notu (opsiyonel):','')??null;if(note===null)return;
  const c=currentCustomer();state.parked.unshift({id:nextId(),date:nowIso(),customerId:c?.id||1,customer:c?.name||'',cart:clone(cart),cartDiscount,quoteId:pendingQuoteId,note,staffName:currentUser?.name||'',total:cartTotals(c).total});
  cart=[];cartDiscount=null;pendingQuoteId=null;save();renderCart();toast('Sepet bekletildi');
};
function renderParked(){
  $('parkedList').innerHTML=state.parked.map(p=>`<div class="parked-item"><div><b>${escapeHtml(p.customer||'Müşteri')} • ${fmt(p.total)}</b><small>${dateTime(p.date)} • ${p.cart.length} kalem • ${escapeHtml(p.staffName||'')}${p.note?` • ${escapeHtml(p.note)}`:''}</small></div><div class="row-actions"><button class="table-btn" data-unpark="${p.id}" type="button">Geri Al</button><button class="table-btn danger-text" data-drop-park="${p.id}" type="button">Sil</button></div></div>`).join('')||'<p class="muted">Bekleyen sepet yok.</p>';
  document.querySelectorAll('[data-unpark]').forEach(b=>b.onclick=()=>{
    const p=state.parked.find(x=>x.id===Number(b.dataset.unpark));if(!p)return;if(cart.length&&!confirm('Mevcut sepet silinip bekleyen sepet geri alınsın mı?'))return;
    cart=p.cart.filter(l=>state.products.some(x=>x.id===l.id));cartDiscount=p.cartDiscount||null;pendingQuoteId=p.quoteId||null;
    if(state.caris.some(c=>c.id===p.customerId))$('customerSelect').value=String(p.customerId);
    state.parked=state.parked.filter(x=>x.id!==p.id);save();closeDialog('parkedDialog');renderSaleProducts();renderCart();toast('Sepet geri alındı');if(window.innerWidth<=760)setSalePane('cart');
  });
  document.querySelectorAll('[data-drop-park]').forEach(b=>b.onclick=()=>{if(!confirm('Bekleyen sepet silinsin mi?'))return;state.parked=state.parked.filter(x=>x.id!==Number(b.dataset.dropPark));save();renderParked();renderCart()});
}
$('parkedListBtn').onclick=()=>{renderParked();$('parkedDialog').showModal()};
$('closeParked').onclick=()=>closeDialog('parkedDialog');

/* ---------- Teklifler ---------- */
function quoteNo(q){return `T-${String(q.id).slice(-6)}`}
function quoteStatus(q){return q.status==='Açık'&&q.validUntil&&q.validUntil<localDateKey()?'Süresi Doldu':q.status}
$('saveQuoteBtn').onclick=()=>{
  if(!can('quotes'))return toast('Teklif yetkin yok');if(!cart.length)return toast('Sepet boş');
  const c=currentCustomer(),t=cartTotals(c),note=prompt('Teklif notu (opsiyonel):','');if(note===null)return;
  const q={id:nextId(),date:nowIso(),customerId:c.id,customer:c.name,items:t.lines.map(x=>({id:x.p.id,name:x.p.name,qty:x.line.qty,unit:x.p.unit,unitPrice:x.finalUnit,listPrice:x.base,vat:num(x.p.vat)})),subtotal:t.gross,discount:round2(t.groupDisc+t.cartDisc),vatTotal:t.vat,total:t.total,validUntil:localDateKey(addDays(new Date(),num(state.settings.quoteDays)||7)),status:'Açık',note,staffName:currentUser?.name||''};
  state.quotes.unshift(q);save();renderQuotes();
  if(confirm(`${quoteNo(q)} kaydedildi (${fmt(q.total)}). Sepet temizlensin mi?`)){cart=[];cartDiscount=null;pendingQuoteId=null;renderCart()}
  toast('Teklif kaydedildi • Teklifler ekranından yazdırabilir/gönderebilirsin');
};
function quoteHtml(q){
  return `<div class="doc">${companyHeader()}<h2 class="doc-title">TEKLİF / PROFORMA</h2><div class="doc-meta"><div><span>Teklif No</span><b>${quoteNo(q)}</b></div><div><span>Tarih</span><b>${dateOnly(q.date)}</b></div><div><span>Geçerlilik</span><b>${dateOnly(q.validUntil)}</b></div><div><span>Sayın</span><b>${escapeHtml(q.customer)}</b></div></div><table class="doc-table"><thead><tr><th>#</th><th>Ürün</th><th>Miktar</th><th>Birim Fiyat</th><th>KDV</th><th>Tutar</th></tr></thead><tbody>${q.items.map((i,n)=>`<tr><td>${n+1}</td><td>${escapeHtml(i.name)}</td><td>${qtyFmt(i.qty)} ${escapeHtml(i.unit||'')}</td><td>${fmt(i.unitPrice)}</td><td>%${i.vat}</td><td>${fmt(i.unitPrice*i.qty)}</td></tr>`).join('')}</tbody></table><div class="doc-totals">${num(q.discount)>0?`<div><span>Liste Toplamı</span><b>${fmt(q.subtotal)}</b></div><div><span>İndirim</span><b>−${fmt(q.discount)}</b></div>`:''}${vatBreakdown(q.items).map(([r,v])=>`<div><span>KDV %${r} (dahil)</span><b>${fmt(v)}</b></div>`).join('')}<div class="grand"><span>GENEL TOPLAM (KDV dahil)</span><b>${fmt(q.total)}</b></div></div>${q.note?`<p class="doc-note">${escapeHtml(q.note)}</p>`:''}<p class="doc-note">Fiyatlarımız KDV dahildir. Teklif ${dateOnly(q.validUntil)} tarihine kadar geçerlidir. Stok durumuna göre değişiklik olabilir.</p><div class="doc-sign"><div>Hazırlayan<br><b>${escapeHtml(q.staffName||'')}</b></div><div>Onay<br>&nbsp;</div></div></div>`;
}
function quoteText(q){return [`*${state.settings.companyName}* — Teklif ${quoteNo(q)}`,`Sayın ${q.customer},`,'',...q.items.map(i=>`• ${i.name}: ${qtyFmt(i.qty)} ${i.unit||''} x ${fmt(i.unitPrice)} = ${fmt(i.unitPrice*i.qty)}`),'',`*Toplam (KDV dahil): ${fmt(q.total)}*`,`Geçerlilik: ${dateOnly(q.validUntil)}`,q.note||''].join('\n').trim()}
function renderQuotes(){
  const body=$('quoteTableBody');if(!body)return;const list=state.quotes,open=list.filter(q=>quoteStatus(q)==='Açık'),won=list.filter(q=>q.status==='Satışa Döndü');
  $('quoteOpenCount').textContent=open.length;$('quoteOpenTotal').textContent=fmt(open.reduce((s,q)=>s+q.total,0));$('quoteWonCount').textContent=won.length;$('quoteRate').textContent=`%${list.length?Math.round(won.length/list.length*100):0}`;
  body.innerHTML=list.map(q=>{const st=quoteStatus(q);return `<tr><td><b>${quoteNo(q)}</b></td><td>${dateOnly(q.date)}</td><td>${escapeHtml(q.customer)}</td><td>${q.items.length}</td><td class="amount">${fmt(q.total)}</td><td>${dateOnly(q.validUntil)}</td><td><span class="status ${st==='Satışa Döndü'?'':st==='Açık'?'neutral':'low'}">${escapeHtml(st)}</span></td><td class="row-actions"><button class="table-btn" data-quote-print="${q.id}" type="button">Yazdır</button><button class="table-btn" data-quote-share="${q.id}" type="button">Gönder</button>${q.status!=='Satışa Döndü'?`<button class="table-btn" data-quote-cart="${q.id}" type="button">Satışa Çevir</button>`:''}<button class="table-btn danger-text" data-quote-del="${q.id}" type="button">Sil</button></td></tr>`}).join('')||'<tr><td colspan="8">Henüz teklif yok. Hızlı Satış ekranında sepeti doldurup “📝 Teklif” düğmesine bas.</td></tr>';
  document.querySelectorAll('[data-quote-print]').forEach(b=>b.onclick=()=>{const q=state.quotes.find(x=>x.id===Number(b.dataset.quotePrint));if(q)printDoc(quoteHtml(q),{width:'A4',title:quoteNo(q)})});
  document.querySelectorAll('[data-quote-share]').forEach(b=>b.onclick=()=>{const q=state.quotes.find(x=>x.id===Number(b.dataset.quoteShare));if(q)shareText(quoteText(q),state.caris.find(c=>c.id===q.customerId)?.phone)});
  document.querySelectorAll('[data-quote-cart]').forEach(b=>b.onclick=()=>{
    const q=state.quotes.find(x=>x.id===Number(b.dataset.quoteCart));if(!q)return;if(cart.length&&!confirm('Mevcut sepet silinip teklif sepete aktarılsın mı?'))return;
    const missing=[];cart=[];cartDiscount=null;
    q.items.forEach(i=>{const p=state.products.find(x=>x.id===i.id);if(!p||p.stock<=0){missing.push(i.name);return}cart.push({id:p.id,qty:Math.min(i.qty,p.stock),price:round2(i.unitPrice),disc:0});if(i.qty>p.stock)missing.push(`${i.name} (stok ${qtyFmt(p.stock)})`)});
    if(state.caris.some(c=>c.id===q.customerId))$('customerSelect').value=String(q.customerId);pendingQuoteId=q.id;go('sale');if(window.innerWidth<=760)setSalePane('cart');
    toast(missing.length?`Eksik/yetersiz stok: ${missing.join(', ')}`:'Teklif sepete aktarıldı');
  });
  document.querySelectorAll('[data-quote-del]').forEach(b=>b.onclick=()=>{if(!confirm('Teklif silinsin mi?'))return;state.quotes=state.quotes.filter(x=>x.id!==Number(b.dataset.quoteDel));save();renderQuotes()});
}

/* ---------- Ürün kartı: KDV, grup fiyatları, tedarikçi ---------- */
function fillSupplierSelect(el,selected,emptyLabel='— Seçilmedi —'){el.innerHTML=`<option value="">${emptyLabel}</option>`+state.suppliers.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');el.value=selected?String(selected):''}
const baseOpenProductV40=openProduct;
openProduct=function(id){
  baseOpenProductV40(id);const f=$('productForm'),p=id?state.products.find(x=>x.id===id):null;
  fillSupplierSelect($('productSupplier'),p?.supplierId);
  f.elements.vat.value=String(p?p.vat:state.settings.defaultVat);f.elements.priceUsta.value=p?.priceUsta||'';f.elements.priceToptan.value=p?.priceToptan||'';f.elements.brand.value=p?.brand||'';
};
const baseSaveProductV40=$('saveProduct').onclick;
$('saveProduct').onclick=e=>{
  const f=$('productForm'),editId=Number(f.elements.id.value)||null,before=state.products.length,old=editId?state.products.find(x=>x.id===editId):null,oldSell=old?.sell;
  const extra={vat:num(f.elements.vat.value),priceUsta:num(f.elements.priceUsta.value),priceToptan:num(f.elements.priceToptan.value),brand:f.elements.brand.value.trim(),supplierId:Number(f.elements.supplierId.value)||null};
  baseSaveProductV40(e);if(e.defaultPrevented)return;
  const p=editId?state.products.find(x=>x.id===editId):state.products.length>before?state.products[state.products.length-1]:null;if(!p)return;
  Object.assign(p,extra);if(!old||oldSell!==p.sell)p.priceChangedAt=nowIso();save();renderAll();
};
renderProducts=function(){
  const q=($('productSearch').value||'').toLowerCase(),cost=can('editProducts');
  const rows=state.products.filter(p=>`${p.name} ${p.barcode||''} ${p.category} ${p.shelf||''} ${p.brand||''}`.toLowerCase().includes(q));
  $('productTableBody').innerHTML=rows.map(p=>{const margin=p.sell?((p.sell-p.buy)/p.sell*100):0,crit=p.stock<=p.minStock;return `<tr><td><b>${escapeHtml(p.name)}</b>${p.brand?`<small class="table-sub">${escapeHtml(p.brand)}</small>`:''}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(p.barcode||'-')}</td><td>${escapeHtml(p.unit)}</td><td>${qtyFmt(p.stock)}</td><td>${fmt(p.buy)}</td><td>${fmt(p.sell)}${p.priceUsta||p.priceToptan?`<small class="table-sub">U ${p.priceUsta?fmt(p.priceUsta):'—'} • T ${p.priceToptan?fmt(p.priceToptan):'—'}</small>`:''}</td><td>%${margin.toFixed(1)}</td><td>${escapeHtml(p.shelf||'-')}</td><td>%${p.vat}</td><td><span class="status ${crit?'low':''}">${crit?'Kritik':'Normal'}</span></td><td class="row-actions"><button class="table-btn" data-edit-product="${p.id}">Düzenle</button><button class="table-btn" data-label-product="${p.id}">Etiket</button><button class="table-btn danger-text" data-delete-product="${p.id}">Sil</button></td></tr>`}).join('')||'<tr><td colspan="12">Ürün bulunamadı.</td></tr>';
  const table=$('productTableBody').closest('table');[5,7].forEach(i=>table.querySelectorAll(`tr > *:nth-child(${i+1})`).forEach(el=>el.classList.toggle('hidden-by-permission',!cost)));
  document.querySelectorAll('[data-edit-product]').forEach(b=>{b.onclick=()=>openProduct(Number(b.dataset.editProduct));b.classList.toggle('hidden-by-permission',!cost)});
  document.querySelectorAll('[data-delete-product]').forEach(b=>{b.onclick=()=>deleteProduct(Number(b.dataset.deleteProduct));b.classList.toggle('hidden-by-permission',!cost)});
  document.querySelectorAll('[data-label-product]').forEach(b=>b.onclick=()=>openLabels([Number(b.dataset.labelProduct)]));
};
$('exportProductsCsv').onclick=()=>{const head=['Ürün','Kategori','Barkod','Birim','Stok','Min Stok','Alış','Satış','Raf','KDV','Usta Fiyatı','Toptan Fiyatı','Marka'],rows=state.products.map(p=>[p.name,p.category,p.barcode,p.unit,p.stock,p.minStock,p.buy,p.sell,p.shelf,p.vat,p.priceUsta||'',p.priceToptan||'',p.brand]);downloadFile('gecer-nalbur-urunler.csv','﻿'+[head,...rows].map(r=>r.map(csvEscape).join(';')).join('\n'),'text/csv;charset=utf-8')};

/* ---------- CSV ile ürün içe aktarma ---------- */
function parseCsv(text){
  text=text.replace(/^﻿/,'');const first=text.split(/\r?\n/)[0]||'';const delim=[';','\t',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else quoted=false}else cell+=ch}else if(ch==='"')quoted=true;else if(ch===delim){row.push(cell);cell=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[]}else cell+=ch}
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function trNumber(v){let s=String(v??'').trim().replace(/[₺\s%]/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
function headerKey(h){const s=String(h).toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();if(/^(ürün|urun|ürün adı|ad|adı|name|stok adı)/.test(s))return 'name';if(s.startsWith('kategori')||s.startsWith('grup'))return 'category';if(s.startsWith('barkod')||s==='barcode')return 'barcode';if(s.startsWith('birim'))return 'unit';if(s.startsWith('min'))return 'minStock';if(s.startsWith('stok')||s==='miktar')return 'stock';if(s.startsWith('alış')||s.startsWith('alis')||s.startsWith('maliyet'))return 'buy';if(s.startsWith('usta'))return 'priceUsta';if(s.startsWith('toptan'))return 'priceToptan';if(s.startsWith('satış')||s.startsWith('satis')||s==='fiyat')return 'sell';if(s.startsWith('raf'))return 'shelf';if(s.startsWith('kdv'))return 'vat';if(s.startsWith('marka'))return 'brand';return null}
$('importProductsCsv').onchange=e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;if(!can('editProducts'))return toast('Ürün düzenleme yetkin yok');
  const r=new FileReader();r.onload=()=>{
    const rows=parseCsv(String(r.result));if(rows.length<2)return toast('CSV boş veya başlık satırı yok');
    const keys=rows[0].map(headerKey);if(!keys.includes('name'))return toast('CSV’de “Ürün” sütunu bulunamadı');
    const plan=rows.slice(1).map(cols=>{const o={};keys.forEach((k,i)=>{if(k)o[k]=cols[i]});return o}).filter(o=>String(o.name||'').trim());
    let created=0,updated=0;const ops=plan.map(o=>{const barcode=String(o.barcode||'').trim(),name=String(o.name).trim(),ex=(barcode&&state.products.find(p=>String(p.barcode)===barcode))||state.products.find(p=>p.name.toLocaleLowerCase('tr-TR')===name.toLocaleLowerCase('tr-TR'));ex?updated++:created++;return {o,ex,barcode,name}});
    if(!confirm(`${plan.length} satır okundu: ${created} yeni ürün eklenecek, ${updated} ürün güncellenecek. Devam edilsin mi?`))return;
    for(const {o,ex,barcode,name} of ops){
      const nums={};['stock','minStock','buy','sell','vat','priceUsta','priceToptan'].forEach(k=>{const v=trNumber(o[k]);if(v!==null)nums[k]=v});
      const text={};['category','unit','shelf','brand'].forEach(k=>{if(String(o[k]??'').trim())text[k]=String(o[k]).trim()});
      if(ex){const before=ex.stock;const oldSell=ex.sell;Object.assign(ex,text,nums,{name});if(barcode)ex.barcode=barcode;if(nums.sell!==undefined&&oldSell!==ex.sell)ex.priceChangedAt=nowIso();if(nums.stock!==undefined&&before!==ex.stock)state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:ex.id,product:ex.name,type:'CSV içe aktarma',qty:round2(ex.stock-before),before,after:ex.stock,note:file.name})}
      else{const p={id:nextId(),name,category:text.category||'Genel',barcode,unit:text.unit||'Adet',stock:nums.stock||0,minStock:nums.minStock||0,buy:nums.buy||0,sell:nums.sell||0,shelf:text.shelf||'',vat:nums.vat??num(state.settings.defaultVat),priceUsta:nums.priceUsta||0,priceToptan:nums.priceToptan||0,brand:text.brand||'',supplierId:null,priceChangedAt:nowIso()};state.products.push(p);if(p.stock)state.stockMoves.unshift({id:nextId(),date:nowIso(),productId:p.id,product:p.name,type:'Açılış',qty:p.stock,before:0,after:p.stock,note:`CSV: ${file.name}`})}
    }
    save();renderAll();toast(`İçe aktarıldı • ${created} yeni, ${updated} güncel`);
  };r.readAsText(file,'utf-8');
};

/* ---------- Toplu fiyat güncelleme ---------- */
$('bulkPriceBtn').onclick=()=>{
  if(!can('editProducts'))return toast('Ürün düzenleme yetkin yok');
  const f=$('bulkPriceForm');f.reset();const cats=[...new Set(state.products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'tr'));const brands=[...new Set(state.products.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  $('bulkScope').innerHTML=`<option value="all">Tüm ürünler (${state.products.length})</option>${cats.map(c=>`<option value="cat:${escapeHtml(c)}">Kategori: ${escapeHtml(c)}</option>`).join('')}${brands.map(b=>`<option value="brand:${escapeHtml(b)}">Marka: ${escapeHtml(b)}</option>`).join('')}${state.suppliers.map(s=>`<option value="sup:${s.id}">Tedarikçi: ${escapeHtml(s.name)}</option>`).join('')}`;
  updateBulkPreview();$('bulkPriceDialog').showModal();
};
function bulkTargets(scope){return state.products.filter(p=>scope==='all'||(scope.startsWith('cat:')&&p.category===scope.slice(4))||(scope.startsWith('brand:')&&p.brand===scope.slice(6))||(scope.startsWith('sup:')&&p.supplierId===Number(scope.slice(4))))}
// Zamda yukarı, indirimde en yakına yuvarlar
function roundTo(v,step,up=false){return step>0?Math.max(step,(up?Math.ceil(round2(v/step)):Math.round(v/step))*step):round2(v)}
function updateBulkPreview(){const f=$('bulkPriceForm'),list=bulkTargets(f.elements.scope.value||'all'),pct=num(f.elements.pct.value),step=num(f.elements.round.value),p=list[0];$('bulkPreview').textContent=`${list.length} ürün etkilenecek.${p&&pct?` Örnek: ${p.name} satış ${fmt(p.sell)} → ${fmt(roundTo(f.elements.field.value==='margin'?p.buy*(1+pct/100):f.elements.field.value==='buy'?p.sell:p.sell*(1+pct/100),step))}`:''}`}
$('bulkPriceForm').addEventListener('input',updateBulkPreview);
$('saveBulkPrice').onclick=e=>{
  const f=$('bulkPriceForm');if(!f.reportValidity()){e.preventDefault();return}const scope=f.elements.scope.value,field=f.elements.field.value,pct=num(f.elements.pct.value),step=num(f.elements.round.value),list=bulkTargets(scope);
  if(!list.length||!pct){e.preventDefault();return toast('Etkilenecek ürün veya oran yok')}
  if(!confirm(`${list.length} ürünün fiyatı %${pct} güncellenecek. Emin misin?`)){e.preventDefault();return}
  const k=1+pct/100,now=nowIso();
  list.forEach(p=>{
    if(field==='buy'||field==='both')p.buy=round2(p.buy*k);
    if(field==='sell'||field==='both'){p.sell=roundTo(p.sell*k,step,pct>0);if(p.priceUsta)p.priceUsta=roundTo(p.priceUsta*k,step,pct>0);if(p.priceToptan)p.priceToptan=roundTo(p.priceToptan*k,step,pct>0);p.priceChangedAt=now}
    if(field==='margin'){p.sell=roundTo(p.buy*k,step,true);p.priceChangedAt=now}
  });
  state.priceLog.unshift({id:nextId(),date:now,scope,field,pct,count:list.length,staffName:currentUser?.name||''});save();renderAll();toast(`${list.length} ürün güncellendi`);
};

/* ---------- Barkod (EAN-13 / Code128) ve etiket ---------- */
const EAN_L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],EAN_G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],EAN_R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'],EAN_PAR=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const C128=['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
function eanCheckDigit(d12){let s=0;for(let i=0;i<12;i++)s+=Number(d12[i])*(i%2?3:1);return (10-s%10)%10}
function barcodeModules(code){
  code=String(code||'').trim();if(!code)return null;
  // Yalnızca geçerli 13 haneli kodlar EAN-13 basılır; diğerleri okutulduğunda aynı metni veren Code128 olur
  if(/^\d{13}$/.test(code)){const d12=code.slice(0,12),cd=eanCheckDigit(d12);if(Number(code[12])===cd){const d=(d12+cd).split('').map(Number);let bits='101';for(let i=1;i<=6;i++)bits+=(EAN_PAR[d[0]][i-1]==='L'?EAN_L:EAN_G)[d[i]];bits+='01010';for(let i=7;i<=12;i++)bits+=EAN_R[d[i]];bits+='101';return {bits,text:d12+cd}}}
  if(!/^[\x20-\x7e]+$/.test(code))return null;
  const vals=[104,...[...code].map(c=>c.charCodeAt(0)-32)];let sum=104;vals.slice(1).forEach((v,i)=>sum+=v*(i+1));vals.push(sum%103,106);
  let bits='';vals.forEach(v=>{[...C128[v]].forEach((w,i)=>bits+=(i%2?'0':'1').repeat(Number(w)))});bits+='11';return {bits,text:code};
}
function barcodeSvg(code,height=40){
  const m=barcodeModules(code);if(!m)return '';const q=10,w=m.bits.length+q*2;let rects='';
  for(let i=0;i<m.bits.length;){if(m.bits[i]==='1'){let j=i;while(m.bits[j]==='1')j++;rects+=`<rect x="${i+q}" y="0" width="${j-i}" height="${height}"/>`;i=j}else i++}
  return `<svg class="barcode-svg" viewBox="0 0 ${w} ${height+12}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${height+12}" fill="#fff"/><g fill="#000">${rects}</g><text x="${w/2}" y="${height+10}" font-size="9" text-anchor="middle" font-family="monospace">${escapeHtml(m.text)}</text></svg>`;
}
let labelSelection={};
function openLabels(ids=[]){labelSelection={};ids.forEach(id=>labelSelection[id]=1);$('labelSearch').value='';renderLabelList();$('labelDialog').showModal()}
$('labelPrintBtn').onclick=()=>openLabels([]);
function renderLabelList(){
  const q=($('labelSearch').value||'').toLowerCase(),list=state.products.filter(p=>!q||`${p.name} ${p.barcode||''} ${p.category}`.toLowerCase().includes(q)).sort((a,b)=>(labelSelection[b.id]?1:0)-(labelSelection[a.id]?1:0));
  $('labelList').innerHTML=list.slice(0,200).map(p=>`<label class="label-row"><input type="checkbox" data-label-check="${p.id}" ${labelSelection[p.id]?'checked':''} /><span><b>${escapeHtml(p.name)}</b><small>${fmt(p.sell)} • ${escapeHtml(p.barcode||'barkod yok')}${p.priceChangedAt&&(!p.labelPrintedAt||p.labelPrintedAt<p.priceChangedAt)?' • <em>fiyat değişti</em>':''}</small></span><input type="number" min="1" max="100" value="${labelSelection[p.id]||1}" data-label-count="${p.id}" /></label>`).join('')||'<p class="muted">Ürün yok.</p>';
  document.querySelectorAll('[data-label-check]').forEach(c=>c.onchange=()=>{const id=Number(c.dataset.labelCheck);if(c.checked)labelSelection[id]=num(document.querySelector(`[data-label-count="${id}"]`).value)||1;else delete labelSelection[id]});
  document.querySelectorAll('[data-label-count]').forEach(i=>i.onchange=()=>{const id=Number(i.dataset.labelCount);if(labelSelection[id])labelSelection[id]=Math.max(1,num(i.value))});
}
$('labelSearch').oninput=renderLabelList;
$('labelCritical').onclick=()=>{state.products.forEach(p=>{if(p.priceChangedAt&&(!p.labelPrintedAt||p.labelPrintedAt<p.priceChangedAt))labelSelection[p.id]=labelSelection[p.id]||1});renderLabelList();toast(`${Object.keys(labelSelection).length} ürün seçili`)};
$('printLabels').onclick=e=>{
  e.preventDefault();const ids=Object.keys(labelSelection).map(Number);if(!ids.length)return toast('Etiket için ürün seç');
  const size=$('labelSize').value,company=state.settings.companyName||'Geçer Nalbur',now=nowIso();let html='';
  ids.forEach(id=>{const p=state.products.find(x=>x.id===id);if(!p)return;p.labelPrintedAt=now;for(let i=0;i<labelSelection[id];i++)html+=size==='shelf'?`<div class="label shelf"><small>${escapeHtml(company)}</small><b>${escapeHtml(p.name)}</b><div class="label-price">${fmt(p.sell)}<span>/ ${escapeHtml(p.unit)}</span></div>${p.barcode?barcodeSvg(p.barcode,30):''}<small>${escapeHtml(p.shelf||'')} • KDV dahil • ${dateOnly(now)}</small></div>`:`<div class="label small"><b>${escapeHtml(p.name)}</b>${p.barcode?barcodeSvg(p.barcode,26):''}<div class="label-price">${fmt(p.sell)}</div></div>`});
  save();closeDialog('labelDialog');printDoc(`<div class="label-sheet ${size}">${html}</div>`,{width:'A4',title:'Etiketler'});
};

/* ---------- Cari: vade, risk limiti, ekstre ---------- */
const baseOpenCariV40=openCari;
openCari=function(id){baseOpenCariV40(id);const f=$('cariForm'),c=id?state.caris.find(x=>x.id===id):null;f.elements.dueDays.value=c?.dueDays??'';f.elements.creditLimit.value=c?.creditLimit||'';f.elements.address.value=c?.address||''};
const baseSaveCariV40=$('saveCari').onclick;
$('saveCari').onclick=e=>{
  const f=$('cariForm'),editId=Number(f.elements.id.value)||null,before=state.caris.length,extra={dueDays:f.elements.dueDays.value===''?null:num(f.elements.dueDays.value),creditLimit:num(f.elements.creditLimit.value),address:f.elements.address.value.trim()};
  baseSaveCariV40(e);if(e.defaultPrevented)return;const c=editId?state.caris.find(x=>x.id===editId):state.caris.length>before?state.caris[state.caris.length-1]:null;if(c){Object.assign(c,extra);save();renderAll()}
};
function cariDueInfo(c){
  if(c.id===1||c.balance<=0)return null;const due=c.dueDays??num(state.settings.defaultDueDays);
  const moves=state.cariMoves.filter(m=>m.cariId===c.id).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  let remaining=c.balance,oldest=null;for(let i=moves.length-1;i>=0&&remaining>0;i--){const m=moves[i];if((CARI_SIGN[m.type]||0)>0){remaining-=num(m.amount);oldest=m.date}}
  if(!oldest)return null;const late=daysBetween(oldest,new Date())-due;return {oldest,due,late};
}
const baseRenderCarisV40=renderCaris;
renderCaris=function(){
  baseRenderCarisV40();
  document.querySelectorAll('[data-edit-cari]').forEach(b=>{
    const id=Number(b.dataset.editCari),c=state.caris.find(x=>x.id===id);if(!c||id===1)return;
    const st=document.createElement('button');st.className='table-btn';st.type='button';st.textContent='Ekstre';st.onclick=()=>openStatement(id);b.after(st);
    const info=cariDueInfo(c),name=b.closest('tr')?.querySelector('td b');if(info&&info.late>0&&name)name.insertAdjacentHTML('afterend',` <span class="status low">${info.late} gün gecikti</span>`);
    if(c.creditLimit>0&&c.balance>c.creditLimit&&name)name.insertAdjacentHTML('afterend',' <span class="status low">Limit aşıldı</span>');
  });
};
let statementCariId=null;
function statementRows(c){
  const moves=state.cariMoves.filter(m=>m.cariId===c.id).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const signedSum=moves.reduce((s,m)=>s+(CARI_SIGN[m.type]||0)*num(m.amount),0),opening=round2(c.balance-signedSum);let bal=opening;
  const rows=moves.map(m=>{const sign=CARI_SIGN[m.type]||0;bal=round2(bal+sign*num(m.amount));return {date:m.date,type:m.type,desc:m.description,debit:sign>0?num(m.amount):0,credit:sign<0?num(m.amount):0,bal}});
  return {opening,rows};
}
function statementHtml(c){
  const {opening,rows}=statementRows(c),info=cariDueInfo(c);
  return `<div class="doc">${companyHeader()}<h2 class="doc-title">CARİ HESAP EKSTRESİ</h2><div class="doc-meta"><div><span>Cari</span><b>${escapeHtml(c.name)}</b></div><div><span>Telefon</span><b>${escapeHtml(c.phone||'-')}</b></div><div><span>Tarih</span><b>${dateOnly(new Date())}</b></div><div><span>Bakiye</span><b>${fmt(c.balance)}</b></div></div><table class="doc-table"><thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th>Borç</th><th>Alacak</th><th>Bakiye</th></tr></thead><tbody>${Math.abs(opening)>0.004?`<tr><td>-</td><td>Devir</td><td>Önceki / düzeltme bakiyesi</td><td></td><td></td><td>${fmt(opening)}</td></tr>`:''}${rows.map(r=>`<tr><td>${dateOnly(r.date)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.desc||'')}</td><td>${r.debit?fmt(r.debit):''}</td><td>${r.credit?fmt(r.credit):''}</td><td>${fmt(r.bal)}</td></tr>`).join('')||'<tr><td colspan="6">Hareket yok.</td></tr>'}</tbody></table><div class="doc-totals"><div class="grand"><span>GÜNCEL BAKİYE</span><b>${fmt(c.balance)}</b></div>${info?`<div><span>Vade</span><b>${info.due} gün${info.late>0?` • ${info.late} gün gecikmiş`:''}</b></div>`:''}</div></div>`;
}
function openStatement(id){const c=state.caris.find(x=>x.id===id);if(!c)return;statementCariId=id;$('statementTitle').textContent=`${c.name} • Ekstre`;$('statementSub').textContent=`Güncel bakiye ${fmt(c.balance)}${c.creditLimit?` • Limit ${fmt(c.creditLimit)}`:''}`;$('statementContent').innerHTML=statementHtml(c);$('statementDialog').showModal()}
$('closeStatement').onclick=()=>closeDialog('statementDialog');
$('statementPrint').onclick=()=>{const c=state.caris.find(x=>x.id===statementCariId);if(c)printDoc(statementHtml(c),{width:'A4',title:`${c.name} ekstre`})};
$('statementShare').onclick=()=>{const c=state.caris.find(x=>x.id===statementCariId);if(!c)return;const {rows}=statementRows(c);const csv='﻿'+[['Tarih','İşlem','Açıklama','Borç','Alacak','Bakiye'],...rows.map(r=>[dateOnly(r.date),r.type,r.desc,r.debit||'',r.credit||'',r.bal])].map(r=>r.map(csvEscape).join(';')).join('\n');shareFile(`ekstre-${c.name.replace(/\s+/g,'-')}.csv`,csv,'text/csv',`${c.name} cari ekstre • Bakiye ${fmt(c.balance)}`)};
$('statementWhatsapp').onclick=()=>{const c=state.caris.find(x=>x.id===statementCariId);if(!c)return;const info=cariDueInfo(c);shareText(`Merhaba ${c.name},\n${state.settings.companyName} cari hesap bakiyeniz: *${fmt(c.balance)}*${info&&info.late>0?` (vadesi ${info.late} gün geçmiştir)`:''}.\nÖdemeniz için şimdiden teşekkür ederiz.${state.settings.companyPhone?`\nTel: ${state.settings.companyPhone}`:''}`,c.phone)};

/* ---------- Alış: çok kalemli fatura, sipariş önerisi, kategori etiketleri ---------- */
function tagNewCashMove(before,category){if(state.cashMoves.length>before&&!state.cashMoves[0].category){state.cashMoves[0].category=category;save()}}
const basePurchaseSubmitV40=$('purchaseForm').onsubmit;
$('purchaseForm').onsubmit=e=>{const before=state.cashMoves.length;basePurchaseSubmitV40(e);tagNewCashMove(before,'Mal Alışı')};
const baseSupplierPayV40=$('saveSupplierPayment').onclick;
$('saveSupplierPayment').onclick=e=>{const before=state.cashMoves.length;baseSupplierPayV40(e);tagNewCashMove(before,'Tedarikçi Ödemesi')};
let mpLines=[];
function openMultiPurchase(prefill=[],supplierId=null){
  if(!can('purchases'))return toast('Alış yetkin yok');
  const f=$('multiPurchaseForm');f.reset();f.elements.date.value=localDateKey();
  $('mpSupplier').innerHTML=state.suppliers.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');if(supplierId)$('mpSupplier').value=String(supplierId);
  mpLines=prefill.map(x=>({...x}));$('mpSearch').value='';$('mpSearchResults').innerHTML='';renderMpLines();$('multiPurchaseDialog').showModal();
}
$('multiPurchaseBtn').onclick=()=>openMultiPurchase();
function mpAdd(p){const ex=mpLines.find(l=>l.productId===p.id);if(ex)ex.qty=round2(ex.qty+1);else mpLines.push({productId:p.id,qty:1,cost:p.buy,sell:''});$('mpSearch').value='';$('mpSearchResults').innerHTML='';renderMpLines()}
$('mpSearch').oninput=()=>{const q=$('mpSearch').value.trim().toLowerCase();if(!q){$('mpSearchResults').innerHTML='';return}const list=state.products.filter(p=>p.name.toLowerCase().includes(q)||String(p.barcode||'')===q).slice(0,8);$('mpSearchResults').innerHTML=list.map(p=>`<button type="button" data-mp-add="${p.id}">${escapeHtml(p.name)} <small>stok ${qtyFmt(p.stock)} • alış ${fmt(p.buy)}</small></button>`).join('')||'<small class="muted">Ürün bulunamadı — önce Ürün & Stok ekranından ekle.</small>';document.querySelectorAll('[data-mp-add]').forEach(b=>b.onclick=()=>mpAdd(state.products.find(x=>x.id===Number(b.dataset.mpAdd))))};
$('mpSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const q=$('mpSearch').value.trim();const p=state.products.find(x=>String(x.barcode||'')===q)||state.products.filter(x=>x.name.toLowerCase().includes(q.toLowerCase()))[0];if(p)mpAdd(p)});
function renderMpLines(){
  $('mpLines').innerHTML=mpLines.map((l,i)=>{const p=state.products.find(x=>x.id===l.productId);return `<tr><td><b>${escapeHtml(p?.name||'?')}</b><small class="table-sub">Mevcut satış ${fmt(p?.sell)}</small></td><td><input class="mini-input" type="number" min="0.01" step="0.01" value="${l.qty}" data-mp="${i}" data-k="qty" /></td><td><input class="mini-input" type="number" min="0" step="0.01" value="${l.cost}" data-mp="${i}" data-k="cost" /></td><td><input class="mini-input" type="number" min="0" step="0.01" value="${l.sell}" placeholder="aynı" data-mp="${i}" data-k="sell" /></td><td class="amount">${fmt(num(l.qty)*num(l.cost))}</td><td><button class="table-btn danger-text" type="button" data-mp-del="${i}">✕</button></td></tr>`}).join('')||'<tr><td colspan="6">Yukarıdan ürün ara veya barkod okut.</td></tr>';
  $('mpTotal').textContent=fmt(mpLines.reduce((s,l)=>s+num(l.qty)*num(l.cost),0));
  document.querySelectorAll('[data-mp]').forEach(i=>i.onchange=()=>{mpLines[Number(i.dataset.mp)][i.dataset.k]=i.dataset.k==='sell'&&i.value===''?'':num(i.value);renderMpLines()});
  document.querySelectorAll('[data-mp-del]').forEach(b=>b.onclick=()=>{mpLines.splice(Number(b.dataset.mpDel),1);renderMpLines()});
}
$('saveMultiPurchase').onclick=e=>{
  const f=$('multiPurchaseForm');if(!f.reportValidity()){e.preventDefault();return}
  const lines=mpLines.filter(l=>num(l.qty)>0);if(!lines.length){e.preventDefault();return toast('Faturaya en az bir ürün ekle')}
  const supplier=state.suppliers.find(s=>s.id===Number(f.elements.supplierId.value));if(!supplier){e.preventDefault();return toast('Tedarikçi seç')}
  const d=Object.fromEntries(new FormData(f)),date=new Date(`${d.date}T${new Date().toTimeString().slice(0,8)}`).toISOString(),invoiceId=nextId();let total=0;
  for(const l of lines){
    const p=state.products.find(x=>x.id===l.productId);if(!p)continue;const qty=num(l.qty),cost=num(l.cost),before=p.stock;
    p.stock=round2(p.stock+qty);p.buy=cost;if(l.sell!==''&&num(l.sell)>0&&num(l.sell)!==p.sell){p.sell=num(l.sell);p.priceChangedAt=nowIso()}if(!p.supplierId)p.supplierId=supplier.id;total+=qty*cost;
    state.purchases.unshift({id:nextId(),invoiceId,date,supplierId:supplier.id,supplier:supplier.name,productId:p.id,product:p.name,unit:p.unit,qty,unitCost:cost,total:round2(qty*cost),payment:d.payment,documentNo:d.documentNo,note:'Çok kalemli fatura'});
    state.stockMoves.unshift({id:nextId(),date,productId:p.id,product:p.name,type:'Mal alış',qty,before,after:p.stock,note:`${supplier.name}${d.documentNo?' • '+d.documentNo:''}`});
  }
  total=round2(total);
  if(d.payment==='Veresiye')supplier.balance=round2(supplier.balance+total);else state.cashMoves.unshift({id:nextId(),date,type:'Gider',category:'Mal Alışı',description:`Mal alış faturası • ${supplier.name}${d.documentNo?' • '+d.documentNo:''}`,payment:d.payment,amount:total});
  mpLines=[];save();renderAll();toast(`Fatura kaydedildi • ${lines.length} kalem • ${fmt(total)}`);
};
function orderGroups(){
  const groups={};state.products.filter(p=>p.stock<=p.minStock).forEach(p=>{const key=p.supplierId&&state.suppliers.some(s=>s.id===p.supplierId)?p.supplierId:0;(groups[key]=groups[key]||[]).push({p,qty:Math.max(1,Math.ceil(p.minStock*2-p.stock))})});return groups;
}
function orderText(supplier,items){return [`Merhaba${supplier?.contact?` ${supplier.contact}`:''},`,`${state.settings.companyName} sipariş listesi:`,'',...items.map(x=>`• ${x.p.name}${x.p.barcode?` (${x.p.barcode})`:''}: ${qtyFmt(x.qty)} ${x.p.unit}`),'','Teşekkürler.'].join('\n')}
const baseRenderPurchasesV40=renderPurchases;
renderPurchases=function(){
  baseRenderPurchasesV40();const box=$('orderSuggestions');if(!box)return;const groups=orderGroups(),keys=Object.keys(groups);
  box.innerHTML=keys.map(k=>{const s=state.suppliers.find(x=>x.id===Number(k)),items=groups[k];return `<div class="order-card"><div class="order-head"><b>${escapeHtml(s?.name||'Tedarikçi atanmamış')}</b><small>${items.length} ürün</small></div><ul>${items.map(x=>`<li><span>${escapeHtml(x.p.name)}</span><small>stok ${qtyFmt(x.p.stock)} / min ${qtyFmt(x.p.minStock)} → <b>${qtyFmt(x.qty)} ${escapeHtml(x.p.unit)}</b></small></li>`).join('')}</ul><div class="row-actions"><button class="table-btn" type="button" data-order-wa="${k}">💬 WhatsApp</button><button class="table-btn" type="button" data-order-print="${k}">🖨 Yazdır</button>${s?`<button class="table-btn" type="button" data-order-receive="${k}">📥 Faturaya aktar</button>`:''}</div></div>`}).join('')||'<p class="muted">Kritik stokta ürün yok 👍</p>';
  document.querySelectorAll('[data-order-wa]').forEach(b=>b.onclick=()=>{const k=b.dataset.orderWa,s=state.suppliers.find(x=>x.id===Number(k));shareText(orderText(s,orderGroups()[k]||[]),s?.phone)});
  document.querySelectorAll('[data-order-print]').forEach(b=>b.onclick=()=>{const k=b.dataset.orderPrint,s=state.suppliers.find(x=>x.id===Number(k)),items=orderGroups()[k]||[];printDoc(`<div class="doc">${companyHeader()}<h2 class="doc-title">SİPARİŞ FORMU</h2><div class="doc-meta"><div><span>Tedarikçi</span><b>${escapeHtml(s?.name||'-')}</b></div><div><span>Tarih</span><b>${dateOnly(new Date())}</b></div></div><table class="doc-table"><thead><tr><th>#</th><th>Ürün</th><th>Barkod</th><th>Mevcut</th><th>Sipariş</th></tr></thead><tbody>${items.map((x,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(x.p.name)}</td><td>${escapeHtml(x.p.barcode||'')}</td><td>${qtyFmt(x.p.stock)}</td><td><b>${qtyFmt(x.qty)} ${escapeHtml(x.p.unit)}</b></td></tr>`).join('')}</tbody></table></div>`,{width:'A4',title:'Sipariş'})});
  document.querySelectorAll('[data-order-receive]').forEach(b=>b.onclick=()=>{const k=b.dataset.orderReceive;openMultiPurchase((orderGroups()[k]||[]).map(x=>({productId:x.p.id,qty:x.qty,cost:x.p.buy,sell:''})),Number(k))});
};

/* ---------- Kasa: gider kategorileri, personel ödemeleri, gün sonu ---------- */
function fillCashCategories(){const t=$('cashType').value,sel=$('cashCategory');sel.innerHTML=(t==='Gider'?EXPENSE_CATEGORIES:INCOME_CATEGORIES).map(c=>`<option>${escapeHtml(c)}</option>`).join('')}
$('cashType').onchange=fillCashCategories;
$('addCashMoveBtn').onclick=()=>{$('cashForm').reset();fillCashCategories();cashDialog.showModal()};
const baseSaveCashV40=$('saveCash').onclick;
$('saveCash').onclick=e=>{const before=state.cashMoves.length,category=$('cashCategory').value;baseSaveCashV40(e);if(state.cashMoves.length>before){state.cashMoves[0].category=category;state.cashMoves[0].staffName=currentUser?.name;save();renderCash()}};
const baseSavePayrollV40=savePayrollBtn.onclick;
savePayrollBtn.onclick=e=>{
  const f=$('payrollForm'),fromCash=f.elements.fromCash.checked,before=state.payrollMoves.length;baseSavePayrollV40(e);
  const m=state.payrollMoves[0];if(state.payrollMoves.length>before&&fromCash&&['Avans','Maaş Ödemesi'].includes(m.type)&&['Nakit','Banka','Kart'].includes(m.payment)){state.cashMoves.unshift({id:nextId(),payrollId:m.id,date:new Date(`${m.date}T12:00:00`).toISOString(),type:'Gider',category:'Personel',description:`${m.type} • ${m.staffName}${m.note?' • '+m.note:''}`,payment:m.payment,amount:m.amount});save();renderAll()}
};
function cashCategory(m){if(m.category)return m.category;if(m.type==='Satış')return 'Satış';if(m.type==='Tahsilat')return 'Cari Tahsilat';if(m.type==='Gider')return String(m.description||'').startsWith('Mal alış')?'Mal Alışı':'Diğer Gider';return 'Diğer Gelir'}
renderCash=function(){
  const ids=new Set(state.payrollMoves.map(m=>m.id)),lenBefore=state.cashMoves.length;state.cashMoves=state.cashMoves.filter(m=>!m.payrollId||ids.has(m.payrollId));if(state.cashMoves.length!==lenBefore)save();
  const moves=state.cashMoves,signed=x=>x.type==='Gider'?-x.amount:x.amount;
  const cash=moves.filter(x=>x.payment==='Nakit').reduce((s,x)=>s+signed(x),0),card=moves.filter(x=>x.payment==='Kart'&&x.type!=='Gider').reduce((s,x)=>s+x.amount,0),bank=moves.filter(x=>x.payment==='Banka'&&x.type!=='Gider').reduce((s,x)=>s+x.amount,0),turnover=state.sales.reduce((s,x)=>s+x.total-num(x.returnedTotal),0);
  $('cashBalance').textContent=fmt(cash);$('cardTotal').textContent=fmt(card);$('bankTotal').textContent=fmt(bank);$('turnoverTotal').textContent=fmt(turnover);
  $('cashTableBody').innerHTML=moves.slice(0,250).map(x=>`<tr><td>${dateTime(x.date)}</td><td>${escapeHtml(x.type)}<small class="table-sub">${escapeHtml(cashCategory(x))}</small></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.payment)}</td><td class="amount ${x.type==='Gider'?'negative':'positive'}">${x.type==='Gider'?'-':'+'}${fmt(x.amount)}</td></tr>`).join('')||'<tr><td colspan="5">Henüz hareket yok.</td></tr>';
  $('dayCloseBody').innerHTML=state.dayClosings.slice(0,60).map(z=>`<tr><td><b>${dateOnly(z.dayKey+'T12:00:00')}</b><small class="table-sub">${dateTime(z.date)}</small></td><td>${escapeHtml(z.staffName||'-')}</td><td>${fmt(z.salesTotal)}</td><td>${fmt(z.pay.Nakit)}</td><td>${fmt(z.pay.Kart)}</td><td>${fmt(z.pay.Banka)}</td><td>${fmt(z.pay.Veresiye)}</td><td>${fmt(z.expenses)}</td><td>${fmt(z.expectedCash)}</td><td>${fmt(z.counted)}</td><td class="${Math.abs(z.diff)<0.01?'positive':'negative'}">${fmt(z.diff)}</td><td><button class="table-btn" type="button" data-z-print="${z.id}">🖨</button></td></tr>`).join('')||'<tr><td colspan="12">Henüz gün sonu alınmadı.</td></tr>';
  document.querySelectorAll('[data-z-print]').forEach(b=>b.onclick=()=>{const z=state.dayClosings.find(x=>x.id===Number(b.dataset.zPrint));if(z)printDoc(zReportHtml(z),{title:'Z Raporu'})});
};
function dayCloseData(dayKey=localDateKey()){
  const inDay=d=>localDateKey(d)===dayKey,sales=state.sales.filter(s=>inDay(s.date)),pay={Nakit:0,Kart:0,Banka:0,Veresiye:0};
  sales.forEach(s=>(s.payments||[{method:s.payment,amount:s.total}]).forEach(p=>pay[p.method]=(pay[p.method]||0)+num(p.amount)));
  const moves=state.cashMoves.filter(m=>inDay(m.date)),returns=state.returns.filter(r=>inDay(r.date));
  const collections=moves.filter(m=>m.type==='Tahsilat').reduce((s,m)=>s+m.amount,0),expenses=moves.filter(m=>m.type==='Gider'&&cashCategory(m)!=='Satış İadesi').reduce((s,m)=>s+m.amount,0),otherIncome=moves.filter(m=>m.type==='Gelir').reduce((s,m)=>s+m.amount,0);
  const expectedCash=round2(state.cashMoves.filter(x=>x.payment==='Nakit').reduce((s,x)=>s+(x.type==='Gider'?-x.amount:x.amount),0));
  const cats={};moves.filter(m=>m.type==='Gider').forEach(m=>{const c=cashCategory(m);cats[c]=(cats[c]||0)+m.amount});
  return {dayKey,salesTotal:round2(sales.reduce((s,x)=>s+x.total,0)),salesCount:sales.length,pay,returnsTotal:round2(returns.reduce((s,r)=>s+r.total,0)),returnsCount:returns.length,collections:round2(collections),expenses:round2(expenses),otherIncome:round2(otherIncome),expectedCash,cats,vat:round2(sales.reduce((s,x)=>s+num(x.vatTotal),0))};
}
function zReportHtml(z){return `<div class="receipt">${companyHeader()}<div class="r-sep"></div><div class="r-title">GÜN SONU RAPORU (Z)</div><div class="r-line"><span>Gün</span><b>${dateOnly(z.dayKey+'T12:00:00')}</b></div>${z.date?`<div class="r-line"><span>Alındı</span><span>${dateTime(z.date)} • ${escapeHtml(z.staffName||'')}</span></div>`:''}<div class="r-sep"></div><div class="r-line"><span>Satış (${z.salesCount} fiş)</span><b>${fmt(z.salesTotal)}</b></div>${['Nakit','Kart','Banka','Veresiye'].map(k=>`<div class="r-line"><span>  ${k}</span><span>${fmt(z.pay[k]||0)}</span></div>`).join('')}<div class="r-line"><span>KDV (dahil)</span><span>${fmt(z.vat)}</span></div><div class="r-line"><span>İade (${z.returnsCount})</span><span>−${fmt(z.returnsTotal)}</span></div><div class="r-line"><span>Cari tahsilat</span><span>${fmt(z.collections)}</span></div><div class="r-line"><span>Diğer gelir</span><span>${fmt(z.otherIncome)}</span></div><div class="r-line"><span>Giderler</span><span>−${fmt(z.expenses)}</span></div>${Object.entries(z.cats||{}).map(([k,v])=>`<div class="r-line r-muted"><span>  ${escapeHtml(k)}</span><span>${fmt(v)}</span></div>`).join('')}<div class="r-sep"></div><div class="r-line r-total"><span>Beklenen nakit</span><b>${fmt(z.expectedCash)}</b></div>${z.counted!==undefined?`<div class="r-line"><span>Sayılan nakit</span><b>${fmt(z.counted)}</b></div><div class="r-line"><span>Fark</span><b>${fmt(z.diff)}</b></div>`:''}${z.note?`<p class="r-foot">${escapeHtml(z.note)}</p>`:''}<p class="r-foot r-muted">Bilgi amaçlıdır; ÖKC Z raporunun yerine geçmez.</p></div>`}
let dayCloseCurrent=null;
$('dayCloseBtn').onclick=()=>{
  if(!can('dayClose'))return toast('Gün sonu yetkin yok');
  const z=dayCloseData();dayCloseCurrent=z;const done=state.dayClosings.find(x=>x.dayKey===z.dayKey);
  $('dayCloseDate').textContent=`${dateOnly(new Date())}${done?' • Bugün için daha önce gün sonu alındı':''}`;
  $('dayCloseSummary').innerHTML=`<div class="confirm-breakdown"><div><span>Satış (${z.salesCount} fiş)</span><b>${fmt(z.salesTotal)}</b></div>${['Nakit','Kart','Banka','Veresiye'].map(k=>`<div><span>${k}</span><b>${fmt(z.pay[k]||0)}</b></div>`).join('')}<div><span>İade (${z.returnsCount})</span><b>−${fmt(z.returnsTotal)}</b></div><div><span>Cari tahsilat</span><b>${fmt(z.collections)}</b></div><div><span>Giderler</span><b>−${fmt(z.expenses)}</b></div><div class="grand-row"><span>Beklenen nakit (kasa)</span><b>${fmt(z.expectedCash)}</b></div></div>`;
  const f=$('dayCloseForm');f.reset();f.elements.counted.value=z.expectedCash;f.elements.diff.value=fmt(0);$('dayCloseDialog').showModal();
};
$('dayCloseForm').elements.counted.addEventListener('input',()=>{const f=$('dayCloseForm');f.elements.diff.value=fmt(num(f.elements.counted.value)-(dayCloseCurrent?.expectedCash||0))});
$('dayClosePrint').onclick=()=>{if(!dayCloseCurrent)return;const f=$('dayCloseForm');printDoc(zReportHtml({...dayCloseCurrent,counted:num(f.elements.counted.value),diff:round2(num(f.elements.counted.value)-dayCloseCurrent.expectedCash),note:f.elements.note.value}),{title:'Z Raporu'})};
$('saveDayClose').onclick=e=>{
  const f=$('dayCloseForm');if(!f.reportValidity()||!dayCloseCurrent){e.preventDefault();return}
  const counted=num(f.elements.counted.value),diff=round2(counted-dayCloseCurrent.expectedCash),z={...dayCloseCurrent,id:nextId(),date:nowIso(),counted,diff,note:f.elements.note.value,staffName:currentUser?.name||''};
  if(Math.abs(diff)>=0.01){if(!confirm(`Kasa farkı ${fmt(diff)}. Fark kasaya “Kasa Sayım Farkı” olarak işlensin mi?`)){e.preventDefault();return}state.cashMoves.unshift({id:nextId(),date:nowIso(),type:diff>0?'Gelir':'Gider',category:'Kasa Sayım Farkı',description:`Gün sonu sayım farkı • ${dateOnly(new Date())}`,payment:'Nakit',amount:Math.abs(diff),staffName:currentUser?.name})}
  state.dayClosings.unshift(z);save();renderAll();toast('Gün sonu kaydedildi');
};

/* ---------- Çek & Senet ---------- */
let chequeFilter='open';
function chequeOpen(c){return c.status==='Portföyde'||c.status==='Ödenecek'}
function fillChequeParty(){const dir=$('chqDirection').value,sel=$('chqParty');$('chqPartyLabel').firstChild.textContent=dir==='received'?'Cari':'Tedarikçi';sel.innerHTML=(dir==='received'?state.caris.filter(c=>c.id!==1):state.suppliers).map(x=>`<option value="${x.id}">${escapeHtml(x.name)} • ${fmt(x.balance)}</option>`).join('')}
$('chqDirection').onchange=fillChequeParty;
$('addChequeBtn').onclick=()=>{if(!can('cheques'))return toast('Çek/senet yetkin yok');const f=$('chequeForm');f.reset();f.elements.dueDate.value=localDateKey(addDays(new Date(),30));fillChequeParty();$('chequeDialog').showModal()};
$('saveCheque').onclick=e=>{
  const f=$('chequeForm');if(!f.reportValidity()){e.preventDefault();return}const d=Object.fromEntries(new FormData(f)),received=d.direction==='received',amount=num(d.amount);
  const party=received?state.caris.find(c=>c.id===Number(d.partyId)):state.suppliers.find(s=>s.id===Number(d.partyId));if(!party){e.preventDefault();return toast('Cari / tedarikçi seç')}
  const apply=f.elements.affectBalance.checked,chq={id:nextId(),createdAt:nowIso(),direction:d.direction,kind:d.kind,partyId:party.id,partyName:party.name,amount,dueDate:d.dueDate,no:d.no,bank:d.bank,drawer:d.drawer,note:d.note,status:received?'Portföyde':'Ödenecek',balanceApplied:apply,staffName:currentUser?.name||''};
  if(apply){if(received){party.balance=round2(party.balance-amount);party.last='Bugün';state.cariMoves.unshift({id:nextId(),chequeId:chq.id,date:nowIso(),cariId:party.id,cari:party.name,type:'Çek/Senet',description:`${d.kind} alındı${d.no?' #'+d.no:''} • vade ${dateOnly(d.dueDate)}`,amount})}else party.balance=round2(party.balance-amount)}
  state.cheques.unshift(chq);save();renderAll();toast(`${d.kind} kaydedildi`);
};
async function chequeAction(id,action){
  const c=state.cheques.find(x=>x.id===id);if(!c)return;const cari=state.caris.find(x=>x.id===c.partyId),sup=state.suppliers.find(x=>x.id===c.partyId);
  if(action==='collect'){const method=await pickOption(`${c.kind} tahsilatı • ${fmt(c.amount)}`,[{label:'🏦 Bankaya tahsil edildi',value:'Banka'},{label:'💵 Nakit tahsil edildi',value:'Nakit'}]);if(!method)return;state.cashMoves.unshift({id:nextId(),chequeId:c.id,date:nowIso(),type:'Gelir',category:'Çek/Senet Tahsilatı',description:`${c.kind} tahsil • ${c.partyName}${c.no?' #'+c.no:''}`,payment:method,amount:c.amount});if(!c.balanceApplied&&cari){cari.balance=round2(cari.balance-c.amount);state.cariMoves.unshift({id:nextId(),chequeId:c.id,date:nowIso(),cariId:cari.id,cari:cari.name,type:'Tahsilat',description:`${c.kind} tahsil edildi`,amount:c.amount})}c.status='Tahsil Edildi'}
  else if(action==='endorse'){const sid=await pickOption('Hangi tedarikçiye ciro edildi?',state.suppliers.map(s=>({label:`${s.name} • borç ${fmt(s.balance)}`,value:s.id})));if(!sid)return;const s=state.suppliers.find(x=>x.id===sid);s.balance=round2(s.balance-c.amount);if(!c.balanceApplied&&cari){cari.balance=round2(cari.balance-c.amount);state.cariMoves.unshift({id:nextId(),chequeId:c.id,date:nowIso(),cariId:cari.id,cari:cari.name,type:'Tahsilat',description:`${c.kind} ciro edildi`,amount:c.amount})}c.status='Ciro Edildi';c.endorsedTo=s.name}
  else if(action==='bounce'){if(!confirm(`${c.kind} karşılıksız/protestolu olarak işaretlensin mi? Tutar ${c.partyName} hesabına tekrar borç yazılır.`))return;if(c.balanceApplied&&cari){cari.balance=round2(cari.balance+c.amount);state.cariMoves.unshift({id:nextId(),chequeId:c.id,date:nowIso(),cariId:cari.id,cari:cari.name,type:'Karşılıksız',description:`${c.kind} karşılıksız${c.no?' #'+c.no:''}`,amount:c.amount})}c.status='Karşılıksız'}
  else if(action==='pay'){const method=await pickOption(`${c.kind} ödemesi • ${fmt(c.amount)}`,[{label:'🏦 Bankadan ödendi',value:'Banka'},{label:'💵 Nakit ödendi',value:'Nakit'}]);if(!method)return;state.cashMoves.unshift({id:nextId(),chequeId:c.id,date:nowIso(),type:'Gider',category:'Çek/Senet Ödemesi',description:`${c.kind} ödendi • ${c.partyName}${c.no?' #'+c.no:''}`,payment:method,amount:c.amount});if(!c.balanceApplied&&sup)sup.balance=round2(sup.balance-c.amount);c.status='Ödendi'}
  else if(action==='delete'){if(!confirm('Evrak silinsin mi? Açık evrakın bakiye etkisi geri alınır.'))return;if(chequeOpen(c)&&c.balanceApplied){if(c.direction==='received'&&cari){cari.balance=round2(cari.balance+c.amount);state.cariMoves=state.cariMoves.filter(m=>m.chequeId!==c.id)}else if(sup)sup.balance=round2(sup.balance+c.amount)}state.cheques=state.cheques.filter(x=>x.id!==id)}
  c.closedAt=nowIso();save();renderAll();
}
function renderCheques(){
  const body=$('chequeTableBody');if(!body)return;const today=localDateKey(),soon=localDateKey(addDays(new Date(),7));
  const recOpen=state.cheques.filter(c=>c.direction==='received'&&c.status==='Portföyde'),givenOpen=state.cheques.filter(c=>c.direction==='given'&&c.status==='Ödenecek'),due=state.cheques.filter(c=>chequeOpen(c)&&c.dueDate<=soon);
  $('chqPortfolio').textContent=fmt(recOpen.reduce((s,c)=>s+c.amount,0));$('chqPortfolioCount').textContent=`${recOpen.length} evrak`;$('chqDueSoon').textContent=fmt(due.reduce((s,c)=>s+c.amount,0));$('chqDueSoonCount').textContent=`${due.length} evrak`;$('chqGiven').textContent=fmt(givenOpen.reduce((s,c)=>s+c.amount,0));$('chqGivenCount').textContent=`${givenOpen.length} evrak`;$('chqBounced').textContent=fmt(state.cheques.filter(c=>c.status==='Karşılıksız').reduce((s,c)=>s+c.amount,0));
  const list=state.cheques.filter(c=>chequeFilter==='all'||(chequeFilter==='open'&&chequeOpen(c))||(chequeFilter==='received'&&c.direction==='received')||(chequeFilter==='given'&&c.direction==='given')).slice().sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
  body.innerHTML=list.map(c=>{const late=chequeOpen(c)&&c.dueDate<today,acts=c.direction==='received'?(c.status==='Portföyde'?`<button class="table-btn" data-chq="${c.id}" data-act="collect" type="button">Tahsil Et</button><button class="table-btn" data-chq="${c.id}" data-act="endorse" type="button">Ciro Et</button><button class="table-btn danger-text" data-chq="${c.id}" data-act="bounce" type="button">Karşılıksız</button>`:''):(c.status==='Ödenecek'?`<button class="table-btn" data-chq="${c.id}" data-act="pay" type="button">Ödendi</button>`:'');return `<tr><td><b class="${late?'negative':''}">${dateOnly(c.dueDate)}</b>${late?'<small class="table-sub negative">Vadesi geçti</small>':''}</td><td>${c.direction==='received'?'Alınan':'Verilen'}</td><td>${escapeHtml(c.kind)}</td><td>${escapeHtml(c.no||'-')}<small class="table-sub">${escapeHtml(c.bank||'')}</small></td><td>${escapeHtml(c.partyName)}${c.endorsedTo?`<small class="table-sub">→ ${escapeHtml(c.endorsedTo)}</small>`:''}</td><td class="amount">${fmt(c.amount)}</td><td><span class="status ${chequeOpen(c)?'neutral':c.status==='Karşılıksız'?'low':''}">${escapeHtml(c.status)}</span></td><td class="row-actions">${can('cheques')?acts+`<button class="table-btn danger-text" data-chq="${c.id}" data-act="delete" type="button">Sil</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="8">Kayıt yok.</td></tr>';
  document.querySelectorAll('[data-chq]').forEach(b=>b.onclick=()=>chequeAction(Number(b.dataset.chq),b.dataset.act));
}
document.querySelectorAll('[data-chq-filter]').forEach(b=>b.onclick=()=>{chequeFilter=b.dataset.chqFilter;document.querySelectorAll('[data-chq-filter]').forEach(x=>x.classList.toggle('active',x===b));renderCheques()});

/* ---------- Raporlar ---------- */
let reportRange='today';
function rangeDates(){
  const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);let from=start,to=new Date(start);to.setDate(to.getDate()+1);
  if(reportRange==='week')from=addDays(start,-6);else if(reportRange==='month')from=new Date(now.getFullYear(),now.getMonth(),1);else if(reportRange==='lastMonth'){from=new Date(now.getFullYear(),now.getMonth()-1,1);to=new Date(now.getFullYear(),now.getMonth(),1)}else if(reportRange==='year')from=new Date(now.getFullYear(),0,1);else if(reportRange==='custom'){const a=$('reportFrom').value,b=$('reportTo').value;if(a)from=new Date(a+'T00:00:00');if(b)to=addDays(new Date(b+'T00:00:00'),1)}
  return {from,to};
}
function reportData(){
  const {from,to}=rangeDates(),inR=d=>{const x=new Date(d);return x>=from&&x<to};
  const sales=state.sales.filter(s=>inR(s.date)),returns=state.returns.filter(r=>inR(r.date));
  let gross=0,profit=0,vat=0;const prod={},cat={},staff={},pay={},daily={};
  sales.forEach(s=>{gross+=s.total;(s.payments||[{method:s.payment,amount:s.total}]).forEach(p=>pay[p.method]=(pay[p.method]||0)+num(p.amount));
    const st=staff[s.staffName||'-']=staff[s.staffName||'-']||{count:0,total:0};st.count++;st.total+=s.total-num(s.returnedTotal);
    const dk=reportRange==='year'?localDateKey(s.date).slice(0,7):localDateKey(s.date);daily[dk]=(daily[dk]||0)+s.total-num(s.returnedTotal);
    (s.items||[]).forEach(i=>{const q=num(i.qty)-num(i.returned),rev=num(i.unitPrice)*q,pr=(num(i.unitPrice)-num(i.cost))*q;profit+=pr;vat+=rev-rev/(1+num(i.vat??20)/100);const pp=prod[i.id]=prod[i.id]||{name:i.name,qty:0,rev:0,profit:0};pp.qty+=q;pp.rev+=rev;pp.profit+=pr;const c=state.products.find(p=>p.id===i.id)?.category||'Diğer';cat[c]=(cat[c]||0)+rev})});
  const returnsTotal=returns.reduce((s,r)=>s+r.total,0),net=sales.reduce((s,x)=>s+x.total-num(x.returnedTotal),0);
  const exp={};state.cashMoves.filter(m=>m.type==='Gider'&&inR(m.date)&&!NON_EXPENSE_CATEGORIES.includes(cashCategory(m))).forEach(m=>{const c=cashCategory(m);exp[c]=(exp[c]||0)+m.amount});
  const expenses=Object.values(exp).reduce((a,b)=>a+b,0),purchases=state.purchases.filter(p=>inR(p.date)).reduce((s,p)=>s+p.total,0),collections=state.cashMoves.filter(m=>m.type==='Tahsilat'&&inR(m.date)).reduce((s,m)=>s+m.amount,0);
  const lastSale={};state.sales.forEach(s=>(s.items||[]).forEach(i=>{if(!lastSale[i.id]||lastSale[i.id]<s.date)lastSale[i.id]=s.date}));
  const deadDays=num(state.settings.deadStockDays)||60,dead=state.products.filter(p=>p.stock>0&&(!lastSale[p.id]||daysBetween(lastSale[p.id],new Date())>=deadDays)).map(p=>({p,last:lastSale[p.id]})).sort((a,b)=>b.p.stock*b.p.buy-a.p.stock*a.p.buy);
  return {from,to,sales,gross,net,returnsTotal,profit,vat,expenses,purchases,collections,pay,prod,cat,staff,daily,exp,dead,deadDays};
}
function barList(obj,total){const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]);const max=Math.max(...entries.map(e=>e[1]),1);return entries.map(([k,v])=>`<div class="bar-item"><div class="bar-item-head"><span>${escapeHtml(k)}</span><b>${fmt(v)}${total?` <small>%${(v/total*100).toFixed(1)}</small>`:''}</b></div><div class="bar-track"><i style="width:${Math.max(2,v/max*100)}%"></i></div></div>`).join('')||'<p class="muted">Veri yok.</p>'}
function renderReports(){
  if(!$('reportKpis')||!currentUser||!can('reports'))return;const r=reportData(),cost=can('editProducts')||isAdmin(),margin=r.net?r.profit/r.net*100:0;
  const k=(label,value,sub='',cls='')=>`<article class="kpi ${cls}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`;
  $('reportKpis').innerHTML=k('Net Ciro',fmt(r.net),`${r.sales.length} fiş • ort. ${fmt(r.sales.length?r.net/r.sales.length:0)}`)+(cost?k('Brüt Kâr',fmt(r.profit),`Marj %${margin.toFixed(1)}`):'')+k('KDV (satış içinde)',fmt(r.vat),`İade ${fmt(r.returnsTotal)}`)+(cost?k('Net Kâr (tahmini)',fmt(r.profit-r.expenses),`Gider ${fmt(r.expenses)}`,r.profit-r.expenses<0?'danger':''):'')+(cost?k('Mal Alışı',fmt(r.purchases),'Dönem içi alış faturaları'):'')+k('Cari Tahsilat',fmt(r.collections),'Veresiye tahsilatları');
  const days=Object.entries(r.daily).sort((a,b)=>a[0].localeCompare(b[0])),max=Math.max(...days.map(d=>d[1]),1);
  $('reportChart').innerHTML=days.map(([d,v])=>`<div class="bar-wrap"><div class="bar" title="${d}: ${fmt(v)}" style="height:${Math.max(4,v/max*100)}%"></div><small>${reportRange==='year'?d.slice(5):d.slice(8)}</small></div>`).join('')||'<p class="muted">Seçili dönemde satış yok.</p>';
  $('reportPayments').innerHTML=barList(r.pay,r.gross);$('reportCategories').innerHTML=barList(r.cat,Object.values(r.cat).reduce((a,b)=>a+b,0));$('reportExpenses').innerHTML=barList(r.exp,r.expenses);
  $('reportTopProducts').innerHTML=Object.values(r.prod).sort((a,b)=>b.rev-a.rev).slice(0,10).map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${qtyFmt(p.qty)}</td><td>${fmt(p.rev)}</td><td>${fmt(p.profit)}</td></tr>`).join('')||'<tr><td colspan="4">Veri yok.</td></tr>';
  $('reportStaff').innerHTML=Object.entries(r.staff).sort((a,b)=>b[1].total-a[1].total).map(([n,s])=>`<tr><td>${escapeHtml(n)}</td><td>${s.count}</td><td>${fmt(s.total)}</td><td>${fmt(s.count?s.total/s.count:0)}</td></tr>`).join('')||'<tr><td colspan="4">Veri yok.</td></tr>';
  $('deadStockHint').textContent=`${r.deadDays} gündür satılmayan ve stokta bekleyen ürünler (eşik Ayarlar'dan değişir)`;
  $('reportDeadStock').innerHTML=r.dead.slice(0,50).map(({p,last})=>`<tr><td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.category)}</td><td>${qtyFmt(p.stock)} ${escapeHtml(p.unit)}</td><td>${last?`${dateOnly(last)} (${daysBetween(last,new Date())} gün)`:'Hiç satılmadı'}</td><td>${fmt(p.stock*p.buy)}</td></tr>`).join('')||'<tr><td colspan="5">Ölü stok yok 👍</td></tr>';
  document.querySelectorAll('#reports .cost-col').forEach(el=>el.classList.toggle('hidden-by-permission',!cost));
  document.querySelectorAll('#reportTopProducts tr > *:nth-child(4)').forEach(el=>el.classList.toggle('hidden-by-permission',!cost));
  document.querySelectorAll('#reportDeadStock tr > *:nth-child(5)').forEach(el=>el.classList.toggle('hidden-by-permission',!cost));
}
document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{reportRange=b.dataset.range;document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderReports()});
['reportFrom','reportTo'].forEach(id=>$(id).onchange=()=>{reportRange='custom';document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('active',x.dataset.range==='custom'));renderReports()});
$('reportPrintBtn').onclick=()=>{
  const r=reportData(),cost=can('editProducts')||isAdmin();
  printDoc(`<div class="doc">${companyHeader()}<h2 class="doc-title">SATIŞ RAPORU</h2><div class="doc-meta"><div><span>Dönem</span><b>${dateOnly(r.from)} – ${dateOnly(addDays(r.to,-1))}</b></div><div><span>Fiş</span><b>${r.sales.length}</b></div><div><span>Net Ciro</span><b>${fmt(r.net)}</b></div>${cost?`<div><span>Brüt Kâr</span><b>${fmt(r.profit)}</b></div>`:''}</div><table class="doc-table"><thead><tr><th>Ödeme</th><th>Tutar</th></tr></thead><tbody>${Object.entries(r.pay).map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${fmt(v)}</td></tr>`).join('')}</tbody></table><table class="doc-table"><thead><tr><th>Ürün</th><th>Miktar</th><th>Ciro</th>${cost?'<th>Kâr</th>':''}</tr></thead><tbody>${Object.values(r.prod).sort((a,b)=>b.rev-a.rev).slice(0,30).map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${qtyFmt(p.qty)}</td><td>${fmt(p.rev)}</td>${cost?`<td>${fmt(p.profit)}</td>`:''}</tr>`).join('')}</tbody></table><div class="doc-totals"><div><span>KDV (dahil)</span><b>${fmt(r.vat)}</b></div><div><span>İadeler</span><b>${fmt(r.returnsTotal)}</b></div>${cost?`<div><span>Giderler</span><b>${fmt(r.expenses)}</b></div><div class="grand"><span>Tahmini Net Kâr</span><b>${fmt(r.profit-r.expenses)}</b></div>`:''}</div></div>`,{width:'A4',title:'Satış raporu'});
};
$('reportCsvBtn').onclick=()=>{const r=reportData(),rows=[['Fiş No','Tarih','Müşteri','Danışman','Ödeme','Tutar','İade','KDV'],...r.sales.map(s=>[receiptNo(s),dateTime(s.date),s.customer,s.staffName||'',s.payment,s.total,num(s.returnedTotal),num(s.vatTotal)])];downloadFile(`rapor-${localDateKey(r.from)}-${localDateKey(addDays(r.to,-1))}.csv`,'﻿'+rows.map(x=>x.map(csvEscape).join(';')).join('\n'),'text/csv;charset=utf-8')};

/* ---------- Ayarlar, yedek ---------- */
function renderSettingsInfo(){
  const f=$('settingsForm');if(f&&!f.contains(document.activeElement)){const s=state.settings;const map={companyName:s.companyName,companyPhone:s.companyPhone,companyAddress:s.companyAddress,companyTaxOffice:s.companyTaxOffice,companyTaxNo:s.companyTaxNo,receiptFooter:s.receiptFooter,receiptWidth:s.receiptWidth,defaultVat:String(s.defaultVat),groupUsta:s.groupUsta,groupToptan:s.groupToptan,defaultDueDays:s.defaultDueDays,deadStockDays:s.deadStockDays,quoteDays:s.quoteDays,backupReminderDays:s.backupReminderDays};Object.entries(map).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??''})}
  const l=$('lastBackupLabel');if(l)l.textContent=state.settings.lastBackupAt?dateTime(state.settings.lastBackupAt):'Hiç alınmadı';
  updateLoginHint();
}
$('settingsForm').onsubmit=e=>{
  e.preventDefault();if(!can('data'))return toast('Ayar yetkin yok');const d=Object.fromEntries(new FormData(e.currentTarget));
  ['defaultVat','groupUsta','groupToptan','defaultDueDays','deadStockDays','quoteDays','backupReminderDays'].forEach(k=>d[k]=num(d[k]));
  Object.assign(state.settings,d);save();document.activeElement?.blur?.();renderAll();toast('Ayarlar kaydedildi');
};
$('exportBackup').onclick=()=>{state.settings.lastBackupAt=nowIso();save();downloadFile(`gecer-nalbur-yedek-${localDateKey()}.json`,JSON.stringify(state,null,2),'application/json');renderSettingsInfo()};
(()=>{const box=document.querySelector('#data .data-actions');if(!box)return;const b=document.createElement('button');b.className='ghost-btn';b.type='button';b.textContent='📤 Yedeği Paylaş (Drive / WhatsApp / e-posta)';b.onclick=()=>{state.settings.lastBackupAt=nowIso();save();shareFile(`gecer-nalbur-yedek-${localDateKey()}.json`,JSON.stringify(state),'application/json','Geçer Nalbur yedek dosyası');renderSettingsInfo()};box.appendChild(b)})();
$('resetData').onclick=()=>{if(!confirm('Tüm cihaz verisi silinip örnek veriye dönülsün mü? Bu işlem geri alınamaz.'))return;if(prompt('Onay için SIFIRLA yaz:')!=='SIFIRLA')return toast('Sıfırlama iptal edildi');state=clone(seed);cart=[];cartDiscount=null;upgradeV40();currentUser=getSessionUser();if(!currentUser)setCurrentUser(null);renderAll();toast('Veriler sıfırlandı')};

/* ---------- Ana sayfa uyarıları ---------- */
const baseRenderDashboardV40=renderDashboard;
renderDashboard=function(){
  baseRenderDashboardV40();const list=$('actionsList');if(!list||!currentUser)return;const add=(cls,title,sub,view)=>list.insertAdjacentHTML('beforeend',`<div class="action ${cls}" ${view?`data-action-go="${view}"`:''}><span class="dot"></span><div><b>${title}</b><small>${sub}</small></div></div>`);
  if(can('viewCaris')){const late=state.caris.map(c=>({c,i:cariDueInfo(c)})).filter(x=>x.i&&x.i.late>0);if(late.length)add('danger',`${late.length} caride vadesi geçmiş alacak`,`${fmt(late.reduce((s,x)=>s+x.c.balance,0))} • Ekstreden WhatsApp hatırlatması gönderebilirsin`,'caris')}
  if(can('cheques')){const soon=localDateKey(addDays(new Date(),7)),due=state.cheques.filter(c=>chequeOpen(c)&&c.dueDate<=soon);if(due.length)add('danger',`${due.length} çek/senedin vadesi 7 gün içinde`,`${fmt(due.reduce((s,c)=>s+c.amount,0))} • Çek & Senet ekranına git`,'cheques')}
  if(can('quotes')){const open=state.quotes.filter(q=>quoteStatus(q)==='Açık');if(open.length)add('',`${open.length} açık teklif`,`${fmt(open.reduce((s,q)=>s+q.total,0))} • müşteriyi aramayı unutma`,'quotes')}
  if(state.parked.length)add('',`${state.parked.length} bekleyen sepet`,'Hızlı Satış → Bekleyen','sale');
  if(can('data')){const last=state.settings.lastBackupAt,days=last?daysBetween(last,new Date()):null;if(days===null||days>=num(state.settings.backupReminderDays))add('danger',last?`Son yedek ${days} gün önce`:'Henüz yedek alınmadı','Veri & Ayarlar → Yedeği Paylaş ile Drive’a kaydet','data')}
  if(isAdmin()&&defaultPinInUse())add('danger','Varsayılan PIN (1234) kullanılıyor','Personel & Yetkiler → Düzenle ile PIN’i değiştir','staff');
  list.querySelectorAll('[data-action-go]').forEach(a=>a.onclick=()=>go(a.dataset.actionGo));
};

/* ---------- Yetki görünürlüğü ---------- */
const baseApplyAccessUIV40=applyAccessUI;
applyAccessUI=function(){
  baseApplyAccessUIV40();if(!currentUser)return;const t=(id,show)=>$(id)?.classList.toggle('hidden-by-permission',!show);
  t('cartDiscountBtn',can('discount'));t('saveQuoteBtn',can('quotes'));t('splitPayBtn',can('sale'));t('dayCloseBtn',can('dayClose'));t('addChequeBtn',can('cheques'));
  t('bulkPriceBtn',can('editProducts'));t('labelPrintBtn',can('viewProducts'));t('importProductsLabel',can('editProducts'));t('multiPurchaseBtn',can('purchases'));t('settingsForm',can('data'));
  t('returnSaleBtn',can('returns'));t('deleteSaleFromDetail',can('deleteSales'));
};

/* ---------- Barkod tarama: BarcodeDetector yoksa ZXing ---------- */
let zxingReader=null;
function loadZxing(){return window.ZXing?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/zxing.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
const baseStartScannerV40=startScanner,baseStopScannerV40=stopScanner;
startScanner=async function(){
  if('BarcodeDetector' in window)return baseStartScannerV40();
  const dialog=$('scannerDialog'),status=$('scannerStatus'),video=$('scannerVideo');dialog.showModal();status.textContent='Barkod okuyucu yükleniyor…';
  if(!navigator.mediaDevices?.getUserMedia){status.textContent='Bu cihazda kamera erişimi yok. Barkodu elle gir.';return}
  try{await loadZxing();zxingReader=new ZXing.BrowserMultiFormatReader();status.textContent='Barkodu kameranın ortasına getir.';
    await zxingReader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}}},video,(result)=>{if(result&&zxingReader){const code=result.getText();stopScanner();dialog.close();handleBarcode(code)}});
  }catch(err){status.textContent='Kamera açılamadı. İzinleri kontrol et veya barkodu elle gir.'}
};
stopScanner=function(){if(zxingReader){try{zxingReader.reset()}catch{}zxingReader=null}baseStopScannerV40()};
$('scannerDialog').addEventListener('close',()=>{if(zxingReader){try{zxingReader.reset()}catch{}zxingReader=null}});
$('quickScan').onclick=()=>startScanner();
// Okutulan EAN-13, ürün kartında kontrol hanesi olmadan (12 hane) kayıtlıysa da eşleştir
handleBarcode=function(code){code=String(code).trim();const p=state.products.find(x=>String(x.barcode)===code)||(/^\d{13}$/.test(code)?state.products.find(x=>String(x.barcode)===code.slice(0,12)):null);$('saleSearch').value=p?'':code;renderSaleProducts();if(p){addCart(p.id);toast(`${p.name} sepete eklendi`)}else toast(`Barkod bulunamadı: ${code}`)};

// app.js bazı olayları fonksiyonun ilk haline bağlamıştı; güncel sürümlere yeniden bağla
$('productSearch').oninput=()=>renderProducts();
$('salesSearch').oninput=()=>renderSales();
$('creditCariSelect').onchange=()=>updateCreditSaleSummary();

if(window.GecerAndroid)document.body.classList.add('android-app');
renderAll();
