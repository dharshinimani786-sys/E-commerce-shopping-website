const API = "/api";
let products = [], selectedCategory = "All", currentUser = null;
let cart = JSON.parse(localStorage.getItem("shopnest-cart") || "[]");
const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n).toLocaleString("en-IN");
async function api(url, options={}) {
  const response = await fetch(API + url, {
    ...options, headers: { "Content-Type":"application/json", ...(options.headers||{}) },
    credentials: "same-origin"
  });
  const data = await response.json().catch(()=>({message:"Unexpected server response."}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function toast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"), 2300);
}
function saveCart(){ localStorage.setItem("shopnest-cart", JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){ $("cartCount").textContent=cart.reduce((s,i)=>s+i.quantity,0); }
async function loadProducts(){
  try { products=await api("/products"); renderCategories(); renderProducts(); }
  catch(e){ $("productGrid").innerHTML=`<p class="empty">${e.message}</p>`; }
}
function renderCategories(){
  const cats=["All",...new Set(products.map(p=>p.category))];
  $("categories").innerHTML=cats.map(c=>`<button class="category-btn ${c===selectedCategory?"active":""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
}
function renderProducts(){
  const term=$("searchInput").value.toLowerCase();
  const filtered=products.filter(p=>(selectedCategory==="All"||p.category===selectedCategory) && (p.name.toLowerCase().includes(term)||p.description.toLowerCase().includes(term)));
  $("resultCount").textContent=`${filtered.length} products`;
  $("productGrid").innerHTML=filtered.length?filtered.map(p=>`
    <article class="product-card">
      <div class="product-image"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/600x600/f4efff/7357e8?text=ShopNest'"><span class="product-category">${escapeHTML(p.category)}</span></div>
      <div class="product-info"><h3>${escapeHTML(p.name)}</h3><div class="product-desc">${escapeHTML(p.description||"A lovely find for your everyday.")}</div>
      <div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.id}">＋ Add to bag</button></div></div>
    </article>`).join(""):`<div class="empty">No products found. Try another search.</div>`;
}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openDrawer(){ $("overlay").classList.add("show"); $("cartDrawer").classList.add("open"); renderCart(); }
function closeAll(){ $("overlay").classList.remove("show"); $("cartDrawer").classList.remove("open"); document.querySelectorAll(".modal").forEach(m=>m.classList.remove("show")); }
function renderCart(){
  $("drawerCount").textContent=`(${cart.reduce((s,i)=>s+i.quantity,0)} items)`;
  const rows=cart.map(item=>{const p=products.find(x=>x.id===item.productId);if(!p)return "";return `<div class="cart-row"><img src="${escapeHTML(p.image)}" alt=""><div class="cart-row-info"><b>${escapeHTML(p.name)}</b><p>${money(p.price)}</p><div class="qty-controls"><button data-qty="${p.id}" data-change="-1">−</button>${item.quantity}<button data-qty="${p.id}" data-change="1">+</button><button class="remove-btn" data-remove="${p.id}">Remove</button></div></div></div>`;}).join("");
  $("cartItems").innerHTML=rows||`<div class="empty">Your bag is waiting for something lovely ♡</div>`;
  const total=cart.reduce((s,i)=>{const p=products.find(x=>x.id===i.productId);return s+(p?p.price*i.quantity:0)},0);
  $("cartTotal").textContent=money(total); $("checkoutBtn").disabled=!cart.length; $("checkoutBtn").style.opacity=cart.length?1:.5;
}
function showModal(id){closeAll();$(id).classList.add("show");$("overlay").classList.add("show");}
function accountModal(mode="login"){
  const isLogin=mode==="login";
  $("accountContent").innerHTML=`<span class="eyebrow">WELCOME TO SHOPNEST</span><h2>${isLogin?"Good to see you!":"Create your account"}</h2><p>${isLogin?"Log in to see your orders and checkout.":"Join us and keep all your shopping in one place."}</p>
  <form id="accountForm">${isLogin?"":`<div class="form-group"><label>YOUR NAME</label><input name="name" required placeholder="Enter your name"></div>`}
  <div class="form-group"><label>EMAIL ADDRESS</label><input name="email" type="email" required placeholder="you@example.com"></div>
  <div class="form-group"><label>PASSWORD</label><input name="password" type="password" minlength="6" required placeholder="At least 6 characters"></div>
  <button class="primary-btn form-submit">${isLogin?"Log in →":"Create account →"}</button></form>
  <p class="switch-text">${isLogin?"New to ShopNest?":"Already have an account?"} <button class="text-link" id="switchAccount">${isLogin?"Create account":"Log in"}</button></p>
  ${isLogin?`<p class="tiny-note">Demo admin: admin@shopnest.com / Admin@123</p>`:""}`;
  showModal("accountModal");
  $("switchAccount").onclick=()=>accountModal(isLogin?"register":"login");
  $("accountForm").onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{const result=await api(isLogin?"/login":"/register",{method:"POST",body:JSON.stringify(body)});currentUser=result.user;updateAccountLabel();closeAll();toast(result.message);if(currentUser.role==="admin")showAdmin();}catch(err){toast(err.message);}};
}
function updateAccountLabel(){$("accountLabel").textContent=currentUser?currentUser.name.split(" ")[0]:"Login";}
async function loadOrders(){
  if(!currentUser){accountModal();toast("Please log in to view orders.");return;}
  try{const orders=await api("/orders");$("ordersContent").innerHTML=`<span class="eyebrow">YOUR SHOPPING HISTORY</span><h2>${currentUser.role==="admin"?"All customer orders":"My orders"}</h2>${orders.length?orders.map(o=>`<div class="order-card"><div class="order-top"><b>Order #${o.id} · ${new Date(o.createdAt).toLocaleDateString()}</b><span class="status">${escapeHTML(o.status)}</span></div><p>${o.items.map(i=>`${escapeHTML(i.name)} × ${i.quantity}`).join(", ")}</p><div class="order-top"><span>${currentUser.role==="admin"?escapeHTML(o.customer)+" · ":""}${escapeHTML(o.phone)}</span><b>${money(o.total)}</b></div>${currentUser.role==="admin"?`<div class="form-group"><select data-status="${o.id}">${["Placed","Processing","Shipped","Delivered","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div>`:""}</div>`).join(""):`<div class="empty">No orders yet. Your next favourite is waiting!</div>`}
  ${currentUser.role==="admin"?`<button class="primary-btn" id="adminProductsBtn">Manage products →</button>`:""}`;
  showModal("ordersModal");
  if(currentUser.role==="admin"){$("adminProductsBtn").onclick=showAdmin;document.querySelectorAll("[data-status]").forEach(sel=>sel.onchange=async()=>{try{await api(`/admin/orders/${sel.dataset.status}`,{method:"PATCH",body:JSON.stringify({status:sel.value})});toast("Order status updated.");}catch(e){toast(e.message);}});}
  }catch(e){toast(e.message);}
}
function checkout(){
  if(!currentUser){closeAll();accountModal();toast("Please log in before checkout.");return;}
  $("checkoutContent").innerHTML=`<span class="eyebrow">ALMOST YOURS</span><h2>Delivery details</h2><p>Confirm where we should send your order.</p><form id="checkoutForm"><div class="form-group"><label>PHONE NUMBER</label><input name="phone" required pattern="[0-9+ -]{10,15}" placeholder="Your phone number"></div><div class="form-group"><label>DELIVERY ADDRESS</label><textarea name="address" required rows="3" placeholder="Door no, street, city, pincode"></textarea></div><div class="total-line"><span>Order total</span><b>${$("cartTotal").textContent}</b></div><button class="primary-btn form-submit">Place order →</button></form>`;
  showModal("checkoutModal");
  $("checkoutForm").onsubmit=async e=>{e.preventDefault();const details=Object.fromEntries(new FormData(e.target));try{const order=await api("/orders",{method:"POST",body:JSON.stringify({...details,items:cart.map(i=>({productId:i.productId,quantity:i.quantity}))})});cart=[];saveCart();closeAll();toast(order.message);loadOrders();}catch(err){toast(err.message);}};
}
function showAdmin(){
  if(!currentUser||currentUser.role!=="admin"){toast("Admin login required.");return;}
  $("ordersContent").innerHTML=`<span class="eyebrow">SHOPNEST CONTROL ROOM</span><h2>Manage products</h2><p>Add new items or update your collection.</p>
  <form id="productForm"><input type="hidden" name="id"><div class="form-group"><label>PRODUCT NAME</label><input name="name" required placeholder="Product name"></div><div class="form-group"><label>CATEGORY</label><input name="category" required placeholder="Fashion, Electronics..."></div><div class="form-group"><label>PRICE (₹)</label><input name="price" type="number" min="1" required placeholder="999"></div><div class="form-group"><label>IMAGE URL</label><input name="image" type="url" required placeholder="https://..."></div><div class="form-group"><label>DESCRIPTION</label><input name="description" placeholder="Short product description"></div><button class="primary-btn form-submit">Save product →</button><button type="button" class="text-link" id="clearProduct">Clear form</button></form><h3>Current products</h3><div id="adminProductList"></div><button class="text-link" id="viewOrdersBtn">View customer orders →</button>`;
  showModal("ordersModal");renderAdminList();
  $("productForm").onsubmit=async e=>{e.preventDefault();const obj=Object.fromEntries(new FormData(e.target));const id=obj.id;delete obj.id;obj.price=Number(obj.price);try{await api(id?`/admin/products/${id}`:"/admin/products",{method:id?"PUT":"POST",body:JSON.stringify(obj)});toast("Product saved.");e.target.reset();e.target.id.value="";await loadProducts();renderAdminList();}catch(err){toast(err.message);}};
  $("clearProduct").onclick=()=>$("productForm").reset();
  $("viewOrdersBtn").onclick=loadOrders;
}
function renderAdminList(){
  $("adminProductList").innerHTML=products.map(p=>`<div class="order-card"><div class="order-top"><b>${escapeHTML(p.name)} · ${money(p.price)}</b><span><button class="text-link" data-edit="${p.id}">Edit</button> <button class="text-link" data-delete="${p.id}">Delete</button></span></div></div>`).join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===Number(b.dataset.edit));const f=$("productForm");Object.keys(p).forEach(k=>{if(f.elements[k])f.elements[k].value=p[k];});f.elements.id.value=p.id;window.scrollTo({top:0,behavior:"smooth"});});
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this product?"))return;try{await api(`/admin/products/${b.dataset.delete}`,{method:"DELETE"});await loadProducts();renderAdminList();toast("Product deleted.");}catch(e){toast(e.message);}});
}
document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]");if(add){const id=Number(add.dataset.add);const found=cart.find(i=>i.productId===id);if(found)found.quantity++;else cart.push({productId:id,quantity:1});saveCart();toast("Added to your bag ♡");}
  const qty=e.target.closest("[data-qty]");if(qty){const item=cart.find(i=>i.productId===Number(qty.dataset.qty));if(item){item.quantity+=Number(qty.dataset.change);if(item.quantity<=0)cart=cart.filter(i=>i!==item);saveCart();renderCart();}}
  const remove=e.target.closest("[data-remove]");if(remove){cart=cart.filter(i=>i.productId!==Number(remove.dataset.remove));saveCart();renderCart();}
  const category=e.target.closest("[data-category]");if(category){selectedCategory=category.dataset.category;renderCategories();renderProducts();}
  if(e.target.matches("[data-close]"))closeAll();
});
$("searchInput").addEventListener("input",renderProducts);
$("cartBtn").onclick=openDrawer;$("overlay").onclick=closeAll;
$("checkoutBtn").onclick=checkout;
$("accountBtn").onclick=()=>currentUser?accountModal("login"):accountModal();
$("ordersBtn").onclick=loadOrders;
(async()=>{try{const result=await api("/me");currentUser=result.user;updateAccountLabel();}catch{}await loadProducts();updateCartCount();})();
