async function fetchBooks() {
  const res = await fetch('books.json');
  const data = await res.json();
  return data;
}

function matchesQuery(book, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  return (
    book.title.toLowerCase().includes(s) ||
    book.author.toLowerCase().includes(s)
  );
}

function matchesFilter(book, level, subject, format) {
  const okLevel = level ? book.level === level : true;
  const okSubject = subject ? book.subject === subject : true;
  const okFormat = format ? book.format === format : true;
  return okLevel && okSubject && okFormat;
}

function bookCard(book) {
  return `
    <article class="card">
      <h3>${book.title}</h3>
      <div class="meta">المؤلف: ${book.author} • المرحلة: ${book.level} • التخصص: ${book.subject}</div>
      <div class="badges">
        <span class="badge">${book.format}</span>
        <span class="badge">السنة: ${book.year}</span>
        <span class="badge">الصف: ${book.grade}</span>
      </div>
      <p class="meta">${book.note}</p>
      <div class="actions">
        <a class="btn" href="${book.url}" target="_blank" rel="noopener">فتح/تحميل</a>
        <button class="btn secondary" onclick="alert('هذه نسخة تعليمية تجريبية ببيانات وهمية')">تنبيه</button>
      </div>
    </article>
  `;
}

async function render() {
  const books = await fetchBooks();

  const qEl = document.getElementById('q');
  const levelEl = document.getElementById('level');
  const subjectEl = document.getElementById('subject');
  const formatEl = document.getElementById('format');
  const clearBtn = document.getElementById('clear');
  const resultsEl = document.getElementById('results');

  function update() {
    const q = qEl.value;
    const level = levelEl.value;
    const subject = subjectEl.value;
    const format = formatEl.value;

    const filtered = books
      .filter((b) => matchesQuery(b, q))
      .filter((b) => matchesFilter(b, level, subject, format));

    resultsEl.innerHTML = filtered.map(bookCard).join('') || `
      <div class="card">
        <h3>لا توجد نتائج</h3>
        <p class="meta">جرّب تعديل البحث أو الفلاتر.</p>
      </div>
    `;
  }

  qEl.addEventListener('input', update);
  levelEl.addEventListener('change', update);
  subjectEl.addEventListener('change', update);
  formatEl.addEventListener('change', update);
  clearBtn.addEventListener('click', () => {
    qEl.value = '';
    levelEl.value = '';
    subjectEl.value = '';
    formatEl.value = '';
    update();
  });

  update();
}

render();
