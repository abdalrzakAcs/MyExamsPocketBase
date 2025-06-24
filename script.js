// My Exams – سكربت كامل معدل
// =========================================================
// تضمين مكتبة PocketBase:
// <script src="https://unpkg.com/@pocketbase/js@0.18.4/dist/pocketbase.umd.js"></script>

const pb = new PocketBase('http://127.0.0.1:8090');
const collectionId = 'tasks';

const $ = id => document.getElementById(id);
const adminPass    = $('adminPass');
const addBtn       = $('addBtn');
const refreshBtn   = $('refreshBtn');
const loginBox     = $('loginBox');
const taskForm     = $('taskForm');
const summaryBox   = $('summaryBox');
const tableBodyEl  = $('tableBody');
const totalCostEl  = $('totalCost');
const offlineBadge = $('offlineBadge');
const priorityFlag = $('priorityFlag');
const sessionNumber= $('sessionNumber');
const teacherName  = $('teacherName');
const recordDateTime = $('recordDateTime');
const recordRoom   = $('recordRoom');

const PASSWORDS = {
  admin: '1',
  accountant: 'account123',
  coordinator: 'design123',
  entry: 'entry123',
  cameraman: 'photo123',
  montage: 'edit123',
  media: 'social123',
  marketing: 'market123'
};
let currentRole = 'guest';

const roleCols = {
  admin: 'all',
  accountant: 'all',
  coordinator: [0,1,2,3,4,7,25],
  entry: [0,1,2,7,8,11,12,18,19],
  cameraman: [0,1,2,13,14],
  montage: [0,1,2,13,16,17],
  media: [0,1,2,7,11,18],
  marketing: [22]
};
const editableByRole = {
  coordinator: [3,4,7],
  entry: [7,8,11,12,18,19],
  montage: [16,17],
  media: [7,11,18],
  marketing: [22]
};

let isTyping = false;
let typingTimer;
function startTypingWatch() {
  isTyping = true;
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => isTyping = false, 3000);
}

function checkLogin() {
  const pass = adminPass.value.trim();
  for (const [role, pwd] of Object.entries(PASSWORDS)) {
    if (pass === pwd) { currentRole = role; break; }
  }
  if (currentRole === 'guest') return alert('كلمة المرور غير صحيحة');

  loginBox.style.display   = 'none';
  taskForm.style.display   = currentRole === 'admin' ? 'grid' : 'none';
  addBtn.style.display     = currentRole === 'admin' ? 'inline-block' : 'none';
  summaryBox.style.display = 'flex';
  refreshBtn.style.display = 'inline-block';

  loadFromPocketbase();
  setInterval(() => {
    if (!isTyping) loadFromPocketbase();
  }, 10000);
}

addBtn.addEventListener('click', async () => {
  const priority = priorityFlag.checked ? '✅' : '❌';
  const lecture  = sessionNumber.value.trim();
  const teacher  = teacherName.value.trim();
  const dateTime = recordDateTime.value;
  if (!lecture || !teacher || !dateTime) return alert('الرجاء ملء جميع الحقول');

  const payload = {
    priority,
    lectureNumber: lecture,
    teacherName : teacher,
    recordDate  : new Date(dateTime).toISOString(),
    recordRoom  : recordRoom.value,
    mainCells   : Array(23).fill(''),
    cellColors  : Array(23).fill(''),
    costs       : Array(10).fill(''),
    totalCost   : ''
  };

  try {
    const doc = await pb.collection(collectionId).create(payload);
    addLectureRow(priority, lecture, teacher, dateTime, recordRoom.value, true, doc.id);
    taskForm.reset();
    sortTable();
  } catch (e) {
    console.error(e);
    alert('حصل خطأ أثناء الحفظ!');
  }
});

refreshBtn.addEventListener('click', loadFromPocketbase);

function loadFromPocketbase() {
  pb.collection(collectionId).getFullList()
    .then(data => {
      tableBodyEl.innerHTML = '';
      data.forEach(doc => addLectureRow(
        doc.priority, doc.lectureNumber, doc.teacherName,
        doc.recordDate, doc.recordRoom, true, doc.id,
        doc.mainCells, doc.cellColors, doc.costs, doc.totalCost
      ));
      calculateSummary();
      sortTable();
      applyPermissions();
    })
    .catch(console.error);
}


function addLectureRow(priority, num, teacher, dateTime, room, skipSave = false, docId = null, mainCells = [], cellColors = [], costs = [], totalCost = '') {
  const main = document.createElement('tr');
  const cost = document.createElement('tr');
  cost.classList.add('accounting-row');

  if (docId) main.dataset.docId = cost.dataset.docId = docId;
  if (dateTime) main.dataset.dateIso = new Date(dateTime).toISOString();

  [priority, num, teacher].forEach(v => {
    const td = document.createElement('td');
    td.textContent = v;
    main.appendChild(td);
  });

  const columnOrder = [
    "تنسيق", "منسق", "رفع", "رافع", "إدخال ملف", "مدخل", "رفع أسئلة", "رافع",
    "إدخال أسئلة", "مدخل", "التصوير", "القاعة", "المصور", "مونتاج", "ممنتج",
    "إدخال فيديو", "مدخل", "تصميم/كتابة", "الكاتب", "تسويق", "تاريخ التصوير"
  ];

  for (let i = 0; i < columnOrder.length; i++) {
    const td = document.createElement('td');
    td.contentEditable = true;
    td.style.direction = 'rtl';
    td.innerText = mainCells[i] || '';
    td.style.backgroundColor = cellColors[i] || '';
    main.appendChild(td);
  }

  const tdDelete = document.createElement('td');
  tdDelete.innerHTML = '✖';
  tdDelete.style = `cursor:pointer;color:var(--danger);font-weight:bold;user-select:none`;
  tdDelete.classList.add('delete-cell');
  tdDelete.onclick = e => { e.stopPropagation(); e.preventDefault(); deleteRow(main, cost); };
  main.appendChild(tdDelete);

  const colCount = main.children.length;
  for (let i = 0; i < colCount - 1; i++) {
    const td = document.createElement('td');
    if (i >= 3 && i <= 22) {
      td.contentEditable = true;
      td.classList.add('cost-input');
      td.innerText = costs[i - 3] || '';
    }
    cost.appendChild(td);
  }

  const totalCell = document.createElement('td');
  totalCell.classList.add('total-cell');
  totalCell.innerText = totalCost || '';
  cost.appendChild(totalCell);

  const dummyDelete = document.createElement('td');
  dummyDelete.innerHTML = '🗑️';
  dummyDelete.style.opacity = 0.2;
  dummyDelete.style.pointerEvents = 'none';
  cost.appendChild(dummyDelete);

  tableBodyEl.append(main, cost);

  [...main.querySelectorAll('[contenteditable]'), ...cost.querySelectorAll('[contenteditable]')].forEach(td => {
    td.addEventListener('blur', () => syncRowUpdate(main, cost));
    td.addEventListener('input', () => { startTypingWatch(); syncRowUpdate(main, cost); });
    td.addEventListener('contextmenu', e => {
      e.preventDefault();
      const i = [...td.parentElement.children].indexOf(td);
      const nameIndexes = [4,6,8,10,12,14,17,19];
      if (nameIndexes.includes(i)) showNameOptions(td, e);
      else showColorOptions(td, e);
    });
  });

  if (!skipSave) saveRowToPocketbase(main, cost, dateTime, room);
  applyPermissionsToRow(main);
}



function showNameOptions(td, e) {
  const names = ['علي', 'نور', 'سارة', 'أحمد', 'محمود'];
  const menu = document.createElement('div');
  menu.style = 'position:absolute;background:#fff;border:1px solid #ccc;z-index:9999';
  names.forEach(name => {
    const option = document.createElement('div');
    option.innerText = name;
    option.style = 'padding:8px;cursor:pointer';
    option.onclick = () => {
      td.innerText = name;
      syncRowUpdate(td.parentElement, td.parentElement.nextSibling);
      document.body.removeChild(menu);
    };
    menu.appendChild(option);
  });
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  document.body.appendChild(menu);
  document.addEventListener('click', () => document.body.removeChild(menu), { once: true });
}

function showColorOptions(td, e) {
  const colorMap = [
    { label: 'لم يتم التدخل', color: 'transparent' },
    { label: 'يتم العمل', color: '#fff9c4' },           // أصفر فاتح
    { label: 'تم العمل ولم يتم التسليم', color: '#ffeb3b' }, // أصفر غامق
    { label: 'جاهز', color: '#c8e6c9' },                // أخضر
    { label: 'هناك مشكلة', color: '#000000' },          // أسود
    { label: 'غير موجود', color: '#ef9a9a' }            // أحمر
  ];

  const menu = document.createElement('div');
  menu.style = 'position:absolute;background:#fff;border:1px solid #ccc;z-index:9999;font-size:14px;min-width:160px';

  colorMap.forEach(({ label, color }) => {
    const option = document.createElement('div');
    option.innerText = label;
    option.style = `padding:8px;cursor:pointer;background:${color};color:${color === '#000000' ? '#fff' : '#000'}`;
    option.onclick = () => {
      td.style.backgroundColor = color;
      const tds = [...td.parentElement.children];
      const updatedColors = tds.slice(3, 26).map(c => c.style.backgroundColor || '');
      pb.collection(collectionId).update(td.parentElement.dataset.docId, { cellColors: updatedColors });
      document.body.removeChild(menu);
    };
    menu.appendChild(option);
  });

  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  document.body.appendChild(menu);
  document.addEventListener('click', () => document.body.removeChild(menu), { once: true });
}

function collectRowData(main, cost) {
  const m = main.querySelectorAll('td');
  const c = cost.querySelectorAll('.cost-input');
  const dateIso = main.dataset.dateIso || new Date().toISOString();
  const mainCellsCount = 23;
  return {
    priority     : m[0].textContent,
    lectureNumber: m[1].textContent,
    teacherName  : m[2].textContent,
    recordDate   : dateIso,
    recordRoom   : m[14].textContent,
    mainCells    : [...m].slice(3, 26).map(td => td.textContent),
    cellColors   : [...m].slice(3, 26).map(td => td.style.backgroundColor || ''),
    costs        : [...c].map(td => td.textContent),
    totalCost    : cost.querySelector('.total-cell').textContent
  };
}

let saveTimers = {};
function syncRowUpdate(main, cost) {
  if (!navigator.onLine) return alert('أنت حالياً أوفلاين، لن يُحفظ أي تعديل حتى تعود للاتصال.');
  updateRowTotal(cost);
  if (currentRole === 'accountant') return;
  const docId = main.dataset.docId;
  clearTimeout(saveTimers[docId]);
  saveTimers[docId] = setTimeout(() => {
    const updated = collectRowData(main, cost);
    pb.collection(collectionId).update(docId, updated)
      .then(() => sortTable())
      .catch(err => alert('تعذّر الحفظ في PocketBase'));
  }, 1000);
}

function saveRowToPocketbase(main, cost, dateTime, room) {
  const m = main.querySelectorAll('td');
  const c = cost.querySelectorAll('.cost-input');
  const data = {
    priority     : m[0].textContent,
    lectureNumber: m[1].textContent,
    teacherName  : m[2].textContent,
    recordDate   : new Date(dateTime).toISOString(),
    recordRoom   : room,
    mainCells    : [...m].slice(3, 26).map(td => td.textContent),
    cellColors   : [...m].slice(3, 26).map(td => td.style.backgroundColor || ''),
    costs        : [...c].map(td => td.textContent),
    totalCost    : cost.querySelector('.total-cell').textContent
  };
  pb.collection(collectionId).create(data).then(doc => {
    main.dataset.docId = cost.dataset.docId = doc.id;
  }).catch(console.error);
}

function updateRowTotal(costRow) {
  let sum = 0;
  costRow.querySelectorAll('.cost-input').forEach(c => {
    const v = parseFloat(c.textContent.replace(/,/g, ''));
    if (!isNaN(v)) sum += v;
  });
  costRow.querySelector('.total-cell').textContent = sum ? sum.toLocaleString() : '';
  calculateSummary();
}

function calculateSummary() {
  let total = 0;
  document.querySelectorAll('.total-cell').forEach(c => {
    const v = parseFloat(c.textContent.replace(/,/g, ''));
    if (!isNaN(v)) total += v;
  });
  totalCostEl.textContent = total.toLocaleString();
}

function sortTable() {
  const pairs = [];
  for (let i = 0; i < tableBodyEl.children.length; i += 2) {
    const main = tableBodyEl.children[i];
    const cost = tableBodyEl.children[i + 1];
    const prio = main.children[0].textContent === '✅' ? 0 : 1;
    const t = main.dataset.dateIso || '2100-01-01T00:00:00Z';
    pairs.push({ main, cost, prio, time: new Date(t).getTime() });
  }
  pairs.sort((a, b) => a.prio - b.prio || a.time - b.time)
       .forEach(p => tableBodyEl.append(p.main, p.cost));
}

function deleteRow(main, cost) {
  const docId = main.dataset.docId;
  if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
  pb.collection(collectionId).delete(docId)
    .then(() => {
      main.remove();
      cost.remove();
      calculateSummary();
    })
    .catch(err => alert('تعذّر الحذف من PocketBase.'));
}

function applyPermissions() {
  const rows = document.querySelectorAll('#tableBody tr');
  rows.forEach(row => applyPermissionsToRow(row));
}

function applyPermissionsToRow(row) {
  const tds = row.querySelectorAll('td');
  if (!roleCols[currentRole] || currentRole === 'admin') return;
  tds.forEach((td, i) => {
    if (!roleCols[currentRole].includes(i)) td.classList.add('hidden');
    else td.classList.remove('hidden');
    if (editableByRole[currentRole] && editableByRole[currentRole].includes(i)) {
      td.contentEditable = 'true';
    } else {
      td.contentEditable = 'false';
    }
  });
}
