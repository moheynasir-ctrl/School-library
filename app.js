// app.js — تكامل مع Firestore و Storage ومزايا الإدارة والرفع
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// DOM helpers
const $ = id => document.getElementById(id);

// Tab navigation
['ann','classes','teachers','attend','homework','admin'].forEach(k=>{
  $('tab-'+k).addEventListener('click', ()=> showTab(k === 'ann' ? 'announcements' : k === 'attend' ? 'attendance' : k === 'homework' ? 'homework' : k === 'admin' ? 'admin' : k+'s'));
});
function showTab(id){
  document.querySelectorAll('.tab').forEach(s=>s.hidden=true);
  document.getElementById(id).hidden=false;
}

// Escape
function esc(s){ return String(s||'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Renderers
function renderAnnouncements(docs){
  const ul = $('ann-list'); ul.innerHTML = '';
  docs.forEach(doc=>{
    const d = doc.data();
    const li = document.createElement('li');
    li.innerHTML = `<strong>${esc(d.title)}</strong><div>${esc(d.body)}</div><small class="muted">${esc(d.date||'')}</small>`;
    ul.appendChild(li);
  });
}
function renderClasses(docs){
  const ul = $('class-list'); ul.innerHTML = '';
  docs.forEach(doc=>{
    const c = doc.data();
    const li = document.createElement('li');
    li.innerHTML = `<strong>${esc(c.name)}</strong> — <small>${esc(c.teacher)}</small>`;
    ul.appendChild(li);
  });
}
function renderTeachers(docs){
  const ul = $('teacher-list'); ul.innerHTML = '';
  docs.forEach(doc=>{
    const t = doc.data();
    const li = document.createElement('li');
    li.innerHTML = `<strong>${esc(t.name)}</strong> — <small>${esc(t.email||'')}</small>`;
    ul.appendChild(li);
  });
}
function renderAttendance(docs){
  const ul = $('att-log'); ul.innerHTML = '';
  docs.forEach(doc=>{
    const a = doc.data();
    const ts = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
    const li = document.createElement('li'); li.textContent = `${ts} — ${a.name} — ${a.status}`;
    ul.appendChild(li);
  });
}
function renderHomework(docs){
  const ul = $('hw-list'); ul.innerHTML = '';
  docs.forEach(doc=>{
    const h = doc.data();
    const li = document.createElement('li');
    const link = h.fileUrl ? ` <a href="${h.fileUrl}" target="_blank">تحميل الملف</a>` : '';
    li.innerHTML = `<strong>${esc(h.title)}</strong> — ${esc(h.student)}${link} <small>${h.createdAt && h.createdAt.toDate ? h.createdAt.toDate().toLocaleString() : ''}</small>`;
    ul.appendChild(li);
  });
}

// Auth: admin login (email/password) or anonymous for normal users
auth.onAuthStateChanged(user=>{
  if(user){
    // show admin if custom claim or if email verified — for simplicity, we check a field in users collection
    db.collection('users').doc(user.uid).get().then(snap=>{
      const isAdmin = snap.exists && snap.data().role === 'admin';
      $('admin-logout').hidden = false;
      if(isAdmin){
        $('admin-actions').hidden = false;
      } else {
        $('admin-actions').hidden = true;
      }
    }).catch(()=>{ $('admin-actions').hidden = true; });
    setupRealtime();
  }else{
    // sign in anonymously for regular usage
    auth.signInAnonymously().catch(()=>{ /* ignore */ });
  }
});

// Admin login buttons
$('admin-login').addEventListener('click', async ()=>{
  const email = $('admin-email').value.trim();
  const pass = $('admin-pass').value;
  if(!email || !pass) return alert('أدخل بيانات الدخول');
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    // after login, back-end (you) can set users/{uid}.role = 'admin' in Firestore
    $('admin-actions').hidden = false;
    alert('تم تسجيل الدخول كمسؤول');
  }catch(e){ alert('فشل تسجيل الدخول: '+e.message); }
});
$('admin-logout').addEventListener('click', ()=>auth.signOut());

// Add announcement (admin)
$('add-ann-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const title = $('ann-title').value.trim();
  const body = $('ann-body').value.trim();
  if(!title || !body) return;
  await db.collection('announcements').add({title, body, date: new Date().toISOString()});
  $('ann-title').value=''; $('ann-body').value='';
});

// Add class (admin)
$('add-class-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('class-name').value.trim();
  const teacher = $('class-teacher').value.trim();
  if(!name) return;
  await db.collection('classes').add({name, teacher});
  $('class-name').value=''; $('class-teacher').value='';
});

// Attendance form
$('att-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('att-name').value.trim();
  const status = $('att-status').value;
  if(!name) return;
  await db.collection('attendance').add({name, status, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
  $('att-name').value='';
});

// Homework upload
$('hw-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const title = $('hw-title').value.trim();
  const student = $('hw-student').value.trim();
  const file = $('hw-file').files[0];
  if(!title||!student||!file) return alert('املأ الحقول واختر ملف');
  const path = `homework/${Date.now()}_${file.name}`;
  const ref = storage.ref(path);
  const snap = await ref.put(file);
  const url = await snap.ref.getDownloadURL();
  await db.collection('homework').add({title, student, fileUrl: url, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
  $('hw-title').value=''; $('hw-student').value=''; $('hw-file').value='';
  alert('تم إرسال الواجب');
});

// Real-time listeners
function setupRealtime(){
  db.collection('announcements').orderBy('date','desc').onSnapshot(snap => renderAnnouncements(snap.docs));
  db.collection('classes').orderBy('name').onSnapshot(snap => renderClasses(snap.docs));
  db.collection('teachers').orderBy('name').onSnapshot(snap => renderTeachers(snap.docs));
  db.collection('attendance').orderBy('createdAt','desc').limit(50).onSnapshot(snap => renderAttendance(snap.docs));
  db.collection('homework').orderBy('createdAt','desc').onSnapshot(snap => renderHomework(snap.docs));
}

// Search (simple client-side)
$('search').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  // filter announcements client-side (simple)
  db.collection('announcements').orderBy('date','desc').get().then(snap=>{
    const docs = snap.docs.filter(d=>{
      const t = (d.data().title||'') + ' ' + (d.data().body||'');
      return t.toLowerCase().includes(q);
    });
    renderAnnouncements(docs);
  });
});

// initial tab
showTab('announcements');
