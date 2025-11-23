/* UMURAGE marketing - unified script.js */
/* Hashing function (SHA-256) */
async function hashPassword(password){
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* --- Admin init: ensure default admin exists --- */
let admins = JSON.parse(localStorage.getItem('admins')||'[]');
async function ensureDefaultAdmin(){
  if(!admins || admins.length===0){
    const hashed = await hashPassword('Verdique123');
    admins = [{username:'admin', password: hashed}];
    localStorage.setItem('admins', JSON.stringify(admins));
    console.log('Default admin created: admin / Verdique123');
  }
}
ensureDefaultAdmin();

/* --- Users init --- */
let users = JSON.parse(localStorage.getItem('users')||'[]');
localStorage.setItem('users', JSON.stringify(users));

/* --- Products init --- */
let products = JSON.parse(localStorage.getItem('products')||'[]');
localStorage.setItem('products', JSON.stringify(products));

/* --- Utility: show alert (nice) --- */
function show(msg){ alert(msg); }

/* --- ADMIN LOGIN --- */
const adminLoginForm = document.getElementById('adminLoginForm');
if(adminLoginForm){
  adminLoginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    const hashed = await hashPassword(p);
    const stored = JSON.parse(localStorage.getItem('admins')||'[]');
    const found = stored.find(a=>a.username===u && a.password===hashed);
    if(found){ localStorage.setItem('adminSession', JSON.stringify({username: u})); window.location.href='admin-dashboard.html'; }
    else show('Invalid admin credentials');
  });
}

/* --- USER REGISTER --- */
const regForm = document.getElementById('registerForm');
if(regForm){
  regForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('regPass').value;
    const conf = document.getElementById('regConfirm').value;
    if(pass!==conf){ show('Passwords do not match'); return;}
    const store = JSON.parse(localStorage.getItem('users')||'[]');
    if(store.find(u=>u.email===email)){ show('Email already registered'); return;}
    const hashed = await hashPassword(pass);
    store.push({fullName:name, email:email, password:hashed, created: new Date().toISOString()});
    localStorage.setItem('users', JSON.stringify(store));
    show('Registration successful. You may login now.');
    window.location.href='user-login.html';
  });
}

/* --- USER LOGIN --- */
const userLoginForm = document.getElementById('userLoginForm');
if(userLoginForm){
  userLoginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('userEmail').value.trim();
    const p = document.getElementById('userPass').value;
    const hashed = await hashPassword(p);
    const store = JSON.parse(localStorage.getItem('users')||'[]');
    const u = store.find(x=>x.email===email && x.password===hashed);
    if(u){ localStorage.setItem('userSession', JSON.stringify({fullName:u.fullName, email:u.email})); window.location.href='user-dashboard.html'; }
    else show('Invalid login credentials');
  });
}

/* --- PROTECT ADMIN DASHBOARD --- */
if(location.pathname.endsWith('admin-dashboard.html')){
  const session = JSON.parse(localStorage.getItem('adminSession')||'null');
  if(!session){ alert('You must login as admin'); window.location.href='login.html'; }
}

/* --- ADMIN DASHBOARD FUNCTIONS --- */
if(location.pathname.endsWith('admin-dashboard.html')){
  // load admins
  admins = JSON.parse(localStorage.getItem('admins')||'[]');
  const adminList = document.getElementById('adminList');
  function renderAdmins(){ if(!adminList) return; adminList.innerHTML=''; admins.forEach(a=>{ const li=document.createElement('li'); li.textContent=a.username; adminList.appendChild(li); }); }
  renderAdmins();

  // add admin (hash password)
  const addAdminForm = document.getElementById('addAdminForm');
  addAdminForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const u = document.getElementById('newAdminUser').value.trim();
    const p = document.getElementById('newAdminPass').value;
    if(!u||!p) return show('Fill fields');
    if(admins.find(a=>a.username===u)) return show('Username exists');
    const h = await hashPassword(p);
    admins.push({username:u,password:h});
    localStorage.setItem('admins', JSON.stringify(admins));
    renderAdmins();
    addAdminForm.reset();
    show('Admin added');
  });

  // change password
  const changePasswordForm = document.getElementById('changePasswordForm');
  changePasswordForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const cur = document.getElementById('currentPassword').value;
    const nw = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmNewPassword').value;
    if(nw!==conf) return show('New passwords do not match');
    const sess = JSON.parse(localStorage.getItem('adminSession')||'null');
    if(!sess) return window.location.href='login.html';
    const stored = JSON.parse(localStorage.getItem('admins')||'[]');
    const idx = stored.findIndex(a=>a.username===sess.username);
    const curHashed = await hashPassword(cur);
    if(stored[idx].password !== curHashed) return show('Current password incorrect');
    stored[idx].password = await hashPassword(nw);
    localStorage.setItem('admins', JSON.stringify(stored));
    show('Password updated');
    changePasswordForm.reset();
  });

  // logout
  document.getElementById('adminLogout')?.addEventListener('click', ()=>{
    localStorage.removeItem('adminSession'); window.location.href='login.html';
  });

  // product management
  products = JSON.parse(localStorage.getItem('products')||'[]');
  const addProductForm = document.getElementById('addProductForm');
  const productTableBody = document.querySelector('#productTable tbody');

  function renderProductsAdmin(){
    productTableBody.innerHTML='';
    products.forEach((p,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td><img src="${p.image||'images/placeholder.png'}"></td><td>${p.name}</td><td>$${Number(p.price).toFixed(2)}</td><td>${p.status}</td><td><button onclick="editProduct(${idx})">Edit</button> <button onclick="deleteProduct(${idx})">Delete</button></td>`;
      productTableBody.appendChild(tr);
    });
  }
  renderProductsAdmin();

  addProductForm?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const status = document.getElementById('productStatus').value;
    const file = document.getElementById('productImage').files[0];
    if(!name||!price) return show('Fill name and price');
    if(file){
      const reader = new FileReader();
      reader.onload = function(){ products.push({name,price,status,image:reader.result}); localStorage.setItem('products', JSON.stringify(products)); renderProductsAdmin(); addProductForm.reset(); show('Product added'); renderProductsUser(); };
      reader.readAsDataURL(file);
    } else {
      products.push({name,price,status,image:'images/placeholder.png'}); localStorage.setItem('products', JSON.stringify(products)); renderProductsAdmin(); addProductForm.reset(); show('Product added'); renderProductsUser();
    }
  });

  window.deleteProduct = function(idx){
    if(!confirm('Delete?')) return;
    products.splice(idx,1); localStorage.setItem('products', JSON.stringify(products)); renderProductsAdmin(); renderProductsUser();
  }
  window.editProduct = function(idx){
    const p = products[idx];
    const newName = prompt('Name', p.name);
    const newPrice = prompt('Price', p.price);
    const newStatus = prompt('Status', p.status);
    if(newName && newPrice){ products[idx].name=newName; products[idx].price=Number(newPrice); products[idx].status=newStatus; localStorage.setItem('products', JSON.stringify(products)); renderProductsAdmin(); renderProductsUser(); show('Saved'); }
  }
}

/* --- USER DASHBOARD PROTECTION AND RENDER --- */
if(location.pathname.endsWith('user-dashboard.html')){
  const sess = JSON.parse(localStorage.getItem('userSession')||'null');
  if(!sess){ alert('Please login'); window.location.href='user-login.html'; }
  else {
    document.getElementById('dashName').textContent = sess.fullName;
    document.getElementById('dashEmail').textContent = sess.email;
  }
  document.getElementById('userLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('userSession'); window.location.href='user-login.html'; });
  // cart handling for dashboard
  let cart = JSON.parse(localStorage.getItem('userCart')||'[]');
  function renderUserCart(){
    const cont = document.getElementById('cartItemsContainer'); if(!cont) return;
    cont.innerHTML=''; let total=0;
    cart.forEach((c,idx)=>{ total+=c.price; const d=document.createElement('div'); d.innerHTML=`<p>${c.name} - $${c.price.toFixed(2)} <button onclick="removeFromCart(${idx})">Remove</button></p>`; cont.appendChild(d); });
    document.getElementById('cartTotal').textContent = total.toFixed(2);
  }
  window.removeFromCart = function(i){ cart.splice(i,1); localStorage.setItem('userCart', JSON.stringify(cart)); renderUserCart(); updateCartCount(); }
  document.getElementById('checkoutNow')?.addEventListener('click', ()=>{ if(cart.length===0) return alert('Cart empty'); alert('Order placed!'); cart=[]; localStorage.setItem('userCart', JSON.stringify(cart)); renderUserCart(); updateCartCount(); });
  renderUserCart();
}

/* --- RENDER PRODUCTS FOR USERS (homepage) --- */
function renderProductsUser(){
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  products = JSON.parse(localStorage.getItem('products')||'[]');
  grid.innerHTML = products.map((p,idx)=>`<div class="card"><img src="${p.image||'images/placeholder.png'}"><h3>${p.name}</h3><p>$${Number(p.price).toFixed(2)}</p><p class="small">Status: ${p.status}</p><button ${p.status!=='Available'?'disabled':''} onclick="addToCart(${idx})">${p.status!=='Available'?'Out of Stock':'Add to Cart'}</button></div>`).join('');
}
renderProductsUser();

/* --- Cart for homepage --- */
let cart = JSON.parse(localStorage.getItem('userCart')||'[]');
function addToCart(idx){
  products = JSON.parse(localStorage.getItem('products')||'[]');
  const p = products[idx];
  cart.push(p);
  localStorage.setItem('userCart', JSON.stringify(cart));
  updateCartCount();
  show('Added to cart');
}
function updateCartCount(){ const el=document.getElementById('cart-count'); if(el) el.textContent = JSON.parse(localStorage.getItem('userCart')||'[]').length; }
updateCartCount();

/* Cart popup handlers */
document.getElementById('openCart')?.addEventListener('click', ()=>{
  document.getElementById('cartPopup').style.display='flex';
  const items = document.getElementById('cartItems'); items.innerHTML=''; let total=0;
  cart = JSON.parse(localStorage.getItem('userCart')||'[]');
  cart.forEach((c,idx)=>{ total+=c.price; const d=document.createElement('div'); d.innerHTML = `<p>${c.name} - $${c.price.toFixed(2)} <button onclick="removeFromCart(${idx})">Remove</button></p>`; items.appendChild(d); });
  document.getElementById('cartTotal').textContent = total.toFixed(2);
});
document.getElementById('closeCart')?.addEventListener('click', ()=>document.getElementById('cartPopup').style.display='none');
document.getElementById('checkoutBtn')?.addEventListener('click', ()=>{ if(cart.length===0) return alert('Cart empty'); alert('Order placed!'); cart=[]; localStorage.setItem('userCart', JSON.stringify(cart)); updateCartCount(); document.getElementById('cartPopup').style.display='none'; });
