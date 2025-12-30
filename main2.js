/* =======================
    DATABASE (LocalStorage)
======================= */
let certificates = JSON.parse(localStorage.getItem("certificates")) || [];
let editIndex = null;

/* =======================
    ELEMENTS
======================= */
const brandName = document.getElementById("brandName");
const brandNumber = document.getElementById("brandNumber");
const companyName = document.getElementById("companyName");
const brandCategory = document.getElementById("brandCategory"); //
const productionDate = document.getElementById("productionDate");
const expiryDate = document.getElementById("expiryDate");
const noticeDate = document.getElementById("noticeDate"); //
const registrationDate = document.getElementById("registrationDate"); //
const certificateStatus = document.getElementById("certificateStatus");
const fileNumber = document.getElementById("fileNumber");
const companyNumber = document.getElementById("companyNumber");
const notesInput = document.getElementById("notes");
const imageInput = document.getElementById("certificateImage");
const fileInput = document.getElementById("certificateFile");
const preview = document.getElementById("imagePreview");
const fileNameDisplay = document.getElementById("fileNameDisplay");

const submitBtn = document.getElementById("submitBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const container = document.getElementById("certificatesContainer");

const modal = document.getElementById("detailsModal");
const detailsContent = document.getElementById("detailsContent");
const editBtn = document.getElementById("editBtn");
const closeBtn = document.getElementById("closeBtn");
const deleteBtn = document.getElementById("deleteBtn");

const messageBox = document.getElementById("messageBox");
const logoutBtn = document.getElementById("logoutBtn");

/* =======================
    CONSTANTS
======================= */
const LOGIN_PASSWORD = "amer@689090";
const notifySound = new Audio("das.mp3");

/* =======================
    UTILITIES
======================= */
function getRemainingTime(toStr) {
  if (!toStr) return "غير محدد";
  const from = new Date();
  const to = new Date(toStr);
  if (to < from) return "منتهية بالفعل";
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months--;
    const lastMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) { years--; months += 12; }
  let parts = [];
  if (years > 0) parts.push(`${years} سنة`);
  if (months > 0) parts.push(`${months} شهر`);
  if (days > 0) parts.push(`${days} يوم`);
  return parts.length > 0 ? parts.join(" و ") : "تنتهي اليوم";
}

function showMessage(text, withSound = true) {
  messageBox.textContent = text;
  messageBox.style.opacity = "1";
  if (withSound) {
    notifySound.play().catch(() => {
      window.addEventListener('click', () => notifySound.play(), { once: true });
    });
  }
  setTimeout(() => { messageBox.style.opacity = "0"; }, 5000);
}

function saveDatabase() {
  localStorage.setItem("certificates", JSON.stringify(certificates));
}

function formatArabicDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

function getStatusClass(status) {
  if (status === "سارية") return "status-green";
  if (status === "قيد الإجراء") return "status-orange";
  if (status === "منتهية") return "status-red";
  return "";
}

/* =======================
    EXCEL IMPORT LOGIC
======================= */
/* =======================
    تعديل سحب الإكسيل النهائي (الفنش)
======================= */
function importFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // تحويل الشيت لمصفوفة (الأعمدة الفاضية هتتحسب عشان الترتيب ميبوظش)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    let addedCount = 0;

    jsonData.forEach((row, index) => {
      if (index === 0) return; // تخطي صف العناوين

      // التحقق إن السطر مش فاضي تماماً (على الأقل فيه اسم علامة أو رقم)
      if (row[0] || row[1]) {
        const cert = {
          brandName: String(row[0] || "").trim(),        // عمود A
          brandNumber: String(row[1] || "").trim(),      // عمود B
          companyName: String(row[2] || "").trim(),      // عمود C
          brandCategory: String(row[3] || "").trim(),    // عمود D
          productionDate: formatExcelDate(row[4]),       // عمود E
          expiryDate: formatExcelDate(row[5]),           // عمود F
          noticeDate: formatExcelDate(row[6]),           // عمود G
          registrationDate: formatExcelDate(row[7]),     // عمود H
          status: String(row[8] || "قيد الإجراء").trim(), // عمود I
          fileNumber: String(row[9] || "").trim(),       // عمود J
          companyNumber: String(row[10] || "").trim(),   // عمود K
          notes: "مستورد من إكسيل",
          image: "",
          files: []
        };
        certificates.push(cert);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      saveDatabase();
      renderCertificates();
      showMessage(`✅ تم بنجاح إضافة ${addedCount} سطر من الإكسيل بالترتيب الصحيح`);
    } else {
      showMessage("⚠️ لم يتم العثور على بيانات صالحة في الملف", false);
    }
    event.target.value = ""; 
  };
  reader.readAsArrayBuffer(file);
}

function formatExcelDate(excelDate) {
  if (!excelDate) return "";
  if (!isNaN(excelDate)) {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return excelDate;
}

/* =======================
    IMAGE & FILE HANDLERS
======================= */
imageInput.onchange = () => {
  const f = imageInput.files[0];
  if (f && f.type.startsWith("image")) {
    const reader = new FileReader();
    reader.onload = () => { preview.src = reader.result; preview.style.display = "block"; };
    reader.readAsDataURL(f);
  } else { preview.style.display = "none"; }
};

fileInput.onchange = () => {
  const files = fileInput.files;
  fileNameDisplay.innerHTML = "";
  if (files.length > 0) {
    Array.from(files).forEach(f => {
      const item = document.createElement("div");
      item.textContent = `📄 ${f.name}`;
      item.style.fontSize = "12px";
      item.style.marginBottom = "2px";
      fileNameDisplay.appendChild(item);
    });
  }
};

/* =======================
    VALIDATION & FORM
======================= */
function validateInputs() {
  if (!brandName.value || !brandNumber.value || !companyName.value || !productionDate.value || !expiryDate.value || !certificateStatus.value || !registrationDate.value) {
    showMessage("من فضلك املأ جميع الحقول الأساسية (تاريخ الإشهار اختياري)", false); //
    return false;
  }
  return true;
}

function clearForm() {
  document.querySelectorAll(".form-grid input").forEach(i => i.value = "");
  certificateStatus.value = "قيد الإجراء";
  preview.style.display = "none";
  imageInput.value = "";
  fileInput.value = "";
  fileNameDisplay.textContent = "";
  editIndex = null;
  submitBtn.textContent = "إضافة";
}

/* =======================
    ADD / EDIT
======================= */
submitBtn.onclick = async () => {
  if (!brandName.value || !brandNumber.value || !expiryDate.value || !registrationDate.value) { // التسجيل إجباري
    showMessage("املأ البيانات الأساسية!", false);
    return;
  }

  const validateDataIntelligence = () => {
    const nameVal = brandName.value.trim();
    const numberVal = brandNumber.value.trim();
    if (!isNaN(nameVal) && nameVal !== "") {
        showMessage("خطأ: اسم العلامة لا يمكن أن يكون أرقاماً فقط!", false);
        return false;
    }
    if (/[a-zA-Z]/.test(numberVal)) {
        showMessage("خطأ: رقم العلامة يجب أن يحتوي على أرقام فقط!", false);
        return false;
    }
    return true;
  };

  if (!validateDataIntelligence()) return;

  const old = editIndex !== null ? certificates[editIndex] : {};

  const getBase64 = (file) => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });

  let imgData = old.image || "";
  if (imageInput.files[0]) imgData = await getBase64(imageInput.files[0]);

  let finalFiles = old.files || [];
  if (fileInput.files.length > 0) {
    finalFiles = await Promise.all(Array.from(fileInput.files).map(async f => ({
      name: f.name, 
      data: await getBase64(f)
    })));
  }

  const cert = {
    brandName: brandName.value,
    brandNumber: brandNumber.value,
    companyName: companyName.value,
    brandCategory: brandCategory.value, // حفظ الفئة
    productionDate: productionDate.value,
    expiryDate: expiryDate.value,
    noticeDate: noticeDate.value, // حفظ الإشهار
    registrationDate: registrationDate.value, // حفظ التسجيل
    status: certificateStatus.value,
    fileNumber: fileNumber.value,
    companyNumber: companyNumber.value,
    notes: notesInput.value,
    image: imgData,
    files: finalFiles 
  };

  if (editIndex !== null) certificates[editIndex] = cert;
  else certificates.push(cert);

  saveDatabase();
  renderCertificates();
  
  document.querySelectorAll(".form-grid input, textarea").forEach(i => i.value = "");
  preview.style.display = "none";
  fileNameDisplay.innerHTML = "";
  editIndex = null;
  submitBtn.textContent = "إضافة";
  showMessage("تم الحفظ بنجاح ✅");
};

/* =======================
    RENDER & DETAILS
======================= */
function renderCertificates(list = certificates) {
  container.innerHTML = "";
  deleteAllBtn.textContent = certificates.length > 0 ? `حذف الكل (${certificates.length})` : "حذف الكل";
  list.forEach((cert, index) => {
    const box = document.createElement("div");
    box.className = "cert-box";
    box.innerHTML = `<div class="cert-number">${index + 1}</div><div class="cert-name">${cert.brandName}</div>${cert.image ? `<img src="${cert.image}">` : ""}`;
    box.onclick = () => openDetails(cert, index);
    container.appendChild(box);
  });
}

function openDetails(cert, index) {
  detailsContent.innerHTML = `
    <div style="text-align: right; line-height: 1.4; font-size: 14px;">
        <p><b>🔍 اسم العلامة:</b> ${cert.brandName}</p>
        <p><b>🔢 رقم العلامة:</b> ${cert.brandNumber}</p>
        <p><b>🏢 اسم الشركة:</b> ${cert.companyName} | <b>🏷️ الفئة:</b> ${cert.brandCategory || "غير محددة"}</p> <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
             <p>📅 إنتاج: ${formatArabicDate(cert.productionDate)}</p>
             <p>📅 انتهاء: ${formatArabicDate(cert.expiryDate)}</p>
             <p>📅 إشهار: ${cert.noticeDate ? formatArabicDate(cert.noticeDate) : "غير محدد"}</p> <p>📅 تسجيل: ${formatArabicDate(cert.registrationDate)}</p> </div>
        <p><b>⏳ المتبقي:</b> <span style="color: #d35400;">${getRemainingTime(cert.expiryDate)}</span></p>
        <p><b>💡 الحالة:</b> <span class="${getStatusClass(cert.status)}">${cert.status}</span></p>
        <p><b>📁 رقم الملف:</b> ${cert.fileNumber} | <b>📥 رقم الدرج:</b> ${cert.companyNumber}</p>
        ${cert.notes ? `<p><b>📝 ملاحظات:</b> ${cert.notes}</p>` : ""}
        ${cert.image ? `
            <img src="${cert.image}" 
                 style="width:150px; border-radius:8px; margin-top:10px; cursor:zoom-in; transition: 0.3s;" 
                 onclick="zoomImage('${cert.image}')" 
                 title="اضغط للتكبير">
        ` : ""}
        <hr style="margin: 10px 0; border:0; border-top:1px solid #eee;">
        <p><b>📄 الملفات المرفقة:</b></p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
          ${cert.files && cert.files.length > 0 
            ? cert.files.map((f) => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; padding: 8px; border-radius: 8px; border: 1px solid #e0e0e0;">
                  <span style="font-size: 12px; color: #333;">📄 ${f.name}</span>
                  <button onclick="const w=window.open(); w.document.write('<iframe src=\\'${f.data}\\' frameborder=\\'0\\' style=\\'border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;\\' allowfullscreen></iframe>');" style="background: #27ae60; color: white; border: none; padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 11px;">عرض</button>
                </div>`).join('')
            : '<span style="color:gray; font-size:12px;">لا توجد ملفات</span>'
          }
        </div>
    </div>
  `;
  editBtn.onclick = () => editCert(cert, index);
  deleteBtn.onclick = () => {
    if(confirm("هل أنت متأكد من الحذف؟")) {
        certificates.splice(index, 1);
        saveDatabase(); renderCertificates(); modal.style.display = "none";
    }
  };
  modal.style.display = "flex";
}

function editCert(cert, index) {
  modal.style.display = "none";
  brandName.value = cert.brandName;
  brandNumber.value = cert.brandNumber;
  companyName.value = cert.companyName;
  brandCategory.value = cert.brandCategory || ""; //
  productionDate.value = cert.productionDate;
  expiryDate.value = cert.expiryDate;
  noticeDate.value = cert.noticeDate || ""; //
  registrationDate.value = cert.registrationDate || ""; //
  certificateStatus.value = cert.status;
  fileNumber.value = cert.fileNumber;
  companyNumber.value = cert.companyNumber;
  notesInput.value = cert.notes || "";
  if (cert.image) { preview.src = cert.image; preview.style.display = "block"; }
  fileNameDisplay.innerHTML = "";
  if (cert.files) cert.files.forEach(f => {
    const div = document.createElement("div");
    div.textContent = `📄 ${f.name}`; div.style.color="#27ae60"; div.style.fontSize="12px";
    fileNameDisplay.appendChild(div);
  });
  editIndex = index;
  submitBtn.textContent = "تعديل";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

closeBtn.onclick = () => modal.style.display = "none";

/* =======================
    DELETE ALL
======================= */
deleteAllBtn.onclick = () => {
  if (!certificates.length) return;
  const popup = document.createElement("div");
  Object.assign(popup.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "9999" });
  const box = document.createElement("div");
  Object.assign(box.style, { background: "#222", padding: "30px", borderRadius: "12px", width: "320px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", position: "relative" });
  const closeX = document.createElement("button");
  closeX.textContent = "X";
  Object.assign(closeX.style, { position: "absolute", top: "10px", right: "10px", background: "#ca0f1e", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", padding: "2px 8px" });
  closeX.onclick = () => popup.remove();
  const title = document.createElement("h3");
  title.textContent = "تأكيد حذف الكل";
  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "ادخل كلمة السر لـ حذف الكل";
  Object.assign(input.style, { width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #444", background: "#333", color: "#fff", textAlign: "center" });
  const delBtn = document.createElement("button");
  delBtn.textContent = "حذف نهائي";
  Object.assign(delBtn.style, { width: "100%", padding: "12px", background: "#ca0f1e", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" });
  delBtn.onclick = () => {
    if (input.value === LOGIN_PASSWORD) {
        certificates = []; saveDatabase(); renderCertificates(); popup.remove();
        showMessage("تم مسح جميع البيانات");
    } else {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "../login.html";
    }
  };
  box.append(closeX, title, input, delBtn);
  popup.append(box);
  document.body.append(popup);
};

/* =======================
    INIT & OTHER FUNCTIONS
======================= */
document.getElementById("searchInput").oninput = function() {
  const val = this.value.trim();
  renderCertificates(certificates.filter(c => c.brandName.includes(val)));
};

function exportData() {
  const blob = new Blob([localStorage.getItem("certificates")], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    localStorage.setItem("certificates", e.target.result);
    location.reload();
  };
  reader.readAsText(file);
}

function checkAllExpiryAlerts() {
  const today = new Date();
  const names = certificates.filter(c => Math.ceil((new Date(c.expiryDate) - today) / (1000*60*60*24)) <= 7).map(c => c.brandName);
  if (names.length > 0) showMessage("⚠️ تنبيه انتهاء: " + names.join(" ، "));
}

logoutBtn.onclick = () => { localStorage.removeItem("isLoggedIn"); window.location.href = "../login.html"; };

function zoomImage(src) {
  let zoomDiv = document.querySelector('.full-screen-image');
  if (!zoomDiv) {
      zoomDiv = document.createElement('div');
      zoomDiv.className = 'full-screen-image';
      zoomDiv.innerHTML = `<img src="" id="zoomedImg">`;
      document.body.appendChild(zoomDiv);
      zoomDiv.onclick = () => zoomDiv.style.display = 'none';
  }
  document.getElementById('zoomedImg').src = src;
  zoomDiv.style.display = 'flex';
}

brandNumber.oninput = function() {
  this.value = this.value.replace(/[^0-9]/g, '');
};
companyNumber.oninput = function() {
  this.value = this.value.replace(/[^0-9]/g, '');
};
fileNumber.oninput = function() {
  this.value = this.value.replace(/[^0-9]/g, '');
};
brandCategory.oninput = function() {
  this.value = this.value.replace(/[^0-9]/g, '');
};


const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;

const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
} else {
    body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
}

themeToggle.onclick = () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeIcon.textContent = '☀️';
        showMessage("تم تفعيل الوضع الليلي", false);
    } else {
        localStorage.setItem('theme', 'light');
        themeIcon.textContent = '🌙';
        showMessage("تم تفعيل الوضع النهاري", false);
    }
};

renderCertificates();
checkAllExpiryAlerts();

