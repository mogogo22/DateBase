
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
const productionDate = document.getElementById("productionDate");
const expiryDate = document.getElementById("expiryDate");
const preTime = document.getElementById("preTime"); // سيُحسب تلقائياً
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


function getRemainingTime(toStr) {
  if (!toStr) return "غير محدد";
  
  const from = new Date(); // تاريخ النهاردة
  const to = new Date(toStr); // تاريخ الانتهاء
  
  if (to < from) return "منتهية بالفعل";

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  let parts = [];
  if (years > 0) parts.push(`${years} سنة`);
  if (months > 0) parts.push(`${months} شهر`);
  if (days > 0) parts.push(`${days} يوم`);
  
  return parts.length > 0 ? parts.join(" و ") : "تنتهي اليوم";
}

/* =======================
   TOAST MESSAGE + SOUND
======================= */
function showMessage(text, withSound = true) {
  messageBox.textContent = text;
  messageBox.style.opacity = "1";
  
  if (withSound) {
    // محاولة استئناف الصوت لو المتصفح وقفه
    const playPromise = notifySound.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // الصوت اشتغل تمام
      }).catch(error => {
        console.log("المتصفح حظر الصوت التلقائي، سيتم المحاولة عند أول حركة ماوس");
        // حل بديل: تشغيل الصوت فور أول ضغطة للمستخدم على الصفحة
        window.addEventListener('click', () => {
          notifySound.play();
        }, { once: true });
      });
    }
  }

  setTimeout(() => {
    messageBox.style.opacity = "0";
  }, 5000);
}

/* =======================
   SAVE DATABASE
======================= */
function saveDatabase() {
  localStorage.setItem("certificates", JSON.stringify(certificates));
}

/* =======================
   IMAGE PREVIEW
======================= */
imageInput.onchange = () => {
  const f = imageInput.files[0];
  if (f && f.type.startsWith("image")) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(f);
  } else {
    preview.style.display = "none";
  }
};

/* =======================
   FILE NAME
======================= */
fileInput.onchange = () => {
  const f = fileInput.files[0];
  fileNameDisplay.textContent = f ? f.name : "";
};

/* =======================
   VALIDATION
======================= */
function validateInputs() {
  if (
    !brandName.value ||
    !brandNumber.value ||
    !companyName.value ||
    !productionDate.value ||
    !expiryDate.value ||
    !certificateStatus.value
  ) {
    showMessage("من فضلك املأ جميع الحقول الأساسية", false);
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
    return false;
  }

  // اسم العلامة: حروف + أرقام + مسافات فقط
  const allowedBrandName = /^[A-Za-z\u0621-\u064A]/;
  if (!allowedBrandName.test(brandName.value)) {
    showMessage("اسم العلامة يجب أن يحتوي على حروف وأرقام فقط", false);
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
    return false;
  }

  // رقم العلامة، الملف، الدرج: أرقام فقط
  const numbersOnly = /^[0-9]+$/;
  if (!numbersOnly.test(brandNumber.value)) {
    showMessage("رقم العلامة يجب أن يحتوي على أرقام فقط", false);
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
    return false;
  }
  if (!numbersOnly.test(fileNumber.value)) {
    showMessage("رقم الملف يجب أن يحتوي على أرقام فقط", false);
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
    return false;
  }
  if (!numbersOnly.test(companyNumber.value)) {
    showMessage("رقم الدرج يجب أن يحتوي على أرقام فقط", false);
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
    return false;
  }

  return true;
}



/* =======================
   CLEAR FORM
======================= */
function clearForm() {
  document.querySelectorAll(".form-grid input").forEach(i => i.value = "");
  certificateStatus.value = "";
  preview.style.display = "none";
  imageInput.value = "";
  fileInput.value = "";
  fileNameDisplay.textContent = "";
  editIndex = null;
  submitBtn.textContent = "إضافة";
}

/* =======================
   ADD / EDIT (نسخة معدلة وآمنة)
======================= */
submitBtn.onclick = () => {
  if (!validateInputs()) return;

  const old = editIndex !== null ? certificates[editIndex] : {};

  const readImage = imageInput.files[0]
    ? new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(imageInput.files[0]);
      })
    : Promise.resolve(old.image || "");

  const readFile = fileInput.files[0]
    ? new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(fileInput.files[0]);
      })
    : Promise.resolve(old.file || "");

  Promise.all([readImage, readFile]).then(([imgData, fileData]) => {
    
    // حساب الوقت المتبقي من تاريخ الانتهاء مقارنة بالنهاردة
    let remaining = "";
    if (expiryDate.value) {
        remaining = getRemainingTime(expiryDate.value);
    }

    const cert = {
      brandName: brandName.value,
      brandNumber: brandNumber.value,
      companyName: companyName.value,
      productionDate: productionDate.value,
      expiryDate: expiryDate.value,
      preTime: remaining, // هنا بنخزن القيمة المحسوبة
      status: certificateStatus.value,
      fileNumber: fileNumber.value,
      companyNumber: companyNumber.value,
      notes: notesInput ? notesInput.value : "",
      image: imgData,
      file: fileData,
      fileName: fileInput.files[0]?.name || old.fileName || ""
    };

    if (editIndex !== null) {
      certificates[editIndex] = cert;
      showMessage("تم التعديل بنجاح");
    } else {
      certificates.push(cert);
      showMessage("تمت الإضافة بنجاح");
    }

    saveDatabase();
    clearForm();
    renderCertificates();
  }).catch(err => {
      console.error("Error saving:", err);
      showMessage("حدث خطأ أثناء الحفظ");
  });
};

/* =======================
   RENDER
======================= */
function renderCertificates(list = certificates) {
  container.innerHTML = "";
  deleteAllBtn.textContent =
    certificates.length > 0 ? `حذف الكل (${certificates.length})` : "حذف الكل";

  list.forEach((cert, index) => {
    const box = document.createElement("div");
    box.className = "cert-box";
    box.innerHTML = `
      <div class="cert-number">${index + 1}</div>
      <div class="cert-name">${cert.brandName}</div>
      ${cert.image ? `<img src="${cert.image}">` : ""}
    `;
    box.onclick = () => openDetails(cert, index);
    container.appendChild(box);
  });
}

/* =======================
   DETAILS
======================= */
function openDetails(cert, index) {
  detailsContent.innerHTML = `
    <p><b>اسم العلامة:</b> ${cert.brandName}</p>
    <p><b>رقم العلامة:</b> ${cert.brandNumber}</p>
    <p><b>الشركة:</b> ${cert.companyName}</p>
    <p>تاريخ الإنتاج: ${formatArabicDate(cert.productionDate)}</p>
    <p>تاريخ الانتهاء: ${formatArabicDate(cert.expiryDate)}</p>
    <p><b>الوقت المتبقي على الإنتهاء:</b> ${getRemainingTime(cert.expiryDate)}</p>
    <p><b>الحالة:</b> <span class="${getStatusClass(cert.status)}">${cert.status}</span></p>
    <p><b>رقم الملف:</b> ${cert.fileNumber}</p>
    <p><b>رقم الدرج:</b> ${cert.companyNumber}</p>
    ${cert.notes ? `<p><b>ملاحظات:</b> ${cert.notes}</p>` : ""}
    ${cert.image ? `<img src="${cert.image}" style="width:100px;margin-top:10px;">` : ""}
    ${cert.file ? `<button class="view-btn">مشاهدة الملف</button><div class="file-name">${cert.fileName || ""}</div>` : ""}
  `;

  if (cert.file) {
    document.querySelector(".view-btn").onclick = () => {
      window.open(cert.file, "_blank");
    };
  }

  editBtn.onclick = () => editCert(cert, index);
  deleteBtn.onclick = () => {
    certificates.splice(index, 1);
    saveDatabase();
    renderCertificates();
    modal.style.display = "none";
  };

  modal.style.display = "flex";
}

/* =======================
   EDIT
======================= */
function editCert(cert, index) {
  modal.style.display = "none";
  brandName.value = cert.brandName;
  brandNumber.value = cert.brandNumber;
  companyName.value = cert.companyName;
  productionDate.value = cert.productionDate;
  expiryDate.value = cert.expiryDate;
  certificateStatus.value = cert.status;
  fileNumber.value = cert.fileNumber;
  companyNumber.value = cert.companyNumber;
  if (notesInput) notesInput.value = cert.notes || "";
  if (cert.image) {
    preview.src = cert.image;
    preview.style.display = "block";
  }
  editIndex = index;
  submitBtn.textContent = "تعديل";
}

/* =======================
   CLOSE MODAL
======================= */
closeBtn.onclick = () => modal.style.display = "none";

/* =======================
   DELETE ALL (PASSWORD)
======================= */
deleteAllBtn.onclick = () => {
  if (!certificates.length) return;

  // إنشاء البوب أب كامل بالـ JS
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.top = "0";
  popup.style.left = "0";
  popup.style.width = "100%";
  popup.style.height = "100%";
  popup.style.background = "rgba(0,0,0,0.5)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "999";

  const box = document.createElement("div");
  box.style.background = "#fff";
  box.style.padding = "20px";
  box.style.borderRadius = "8px";
  box.style.width = "300px";
  box.style.textAlign = "center";
  box.style.position = "relative";

  // زر الاغلاق
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "10px";
  closeBtn.style.background = "red";
  closeBtn.style.color = "#fff";
  closeBtn.style.border = "none";
  closeBtn.style.padding = "5px 10px";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => popup.remove();

  // عنوان
  const title = document.createElement("h3");
  title.textContent = "ادخل الباسورد";

  // مدخل الباسورد
  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "••••••";
  input.style.width = "90%";
  input.style.padding = "8px";
  input.style.margin = "10px 0";
  input.style.border = "1px solid #ccc";
  input.style.borderRadius = "4px";

  // زر حذف الكل
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "حذف الكل";
  deleteBtn.style.background = "#8B0000";
  deleteBtn.style.color = "#fff";
  deleteBtn.style.border = "none";
  deleteBtn.style.padding = "10px 20px";
  deleteBtn.style.borderRadius = "5px";
  deleteBtn.style.cursor = "pointer";
  box.style.background = "#222"; // لون هادي بدل الأبيض
  box.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)"; // ظل خفيف يعطي إحساس أفضل
  input.style.borderRadius = "6px";
  input.style.border = "1px solid #555";
  input.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.1)";
  input.style.background = "#555";

  deleteBtn.onclick = () => {
    const pass = input.value;
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}

    if(pass !== LOGIN_PASSWORD) {
      localStorage.removeItem("isLoggedIn");
      window.location.href = "login.html";
      return;
    }

    certificates = [];
    saveDatabase();
    renderCertificates();
    popup.remove();
  };

  // إضافة كل العناصر
  box.appendChild(closeBtn);
  box.appendChild(title);
  box.appendChild(input);
  box.appendChild(deleteBtn);
  popup.appendChild(box);
  document.body.appendChild(popup);
};


/* =======================
   SEARCH
======================= */
document.getElementById("searchInput").oninput = function () {
  const val = this.value.trim();
  if (!val) return renderCertificates();
  renderCertificates(certificates.filter(c => c.brandName.includes(val)));
};

/* =======================
   STATUS CLASS
======================= */
function getStatusClass(status) {
  if (status === "سارية") return "status-green";
  if (status === "قيد الإجراء") return "status-orange";
  if (status === "منتهية") return "status-red";
  return "";
}

/* =======================
   EXPIRY ALERT (7 DAYS) - AGGREGATED
======================= */
function checkAllExpiryAlerts() {
  const today = new Date();
  const names = [];
  
  certificates.forEach(cert => {
    const expiry = new Date(cert.expiryDate);
    // حساب الفرق بالأيام
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    // التنبيه لو الشهادة منتهية فعلاً أو باقي عليها أقل من 7 أيام
    if (diffDays <= 7) {
      names.push(cert.brandName);
    }
  });

  if (names.length > 0) {
    // استدعاء الرسالة مع التأكيد على تشغيل الصوت (true)
    showMessage("❌ شهادات منتهية أو قاربت على الانتهاء: " + names.join(" ، "), true);
  }
}

/* =======================
   FORMAT DATE
======================= */
function formatArabicDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* =======================
   LOGOUT
======================= */
logoutBtn.onclick = () => {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "login.html";
};

/* =======================
   INIT
======================= */
renderCertificates();
checkAllExpiryAlerts();

/* =======================
   BACKUP & RESTORE (Export/Import)
======================= */

// 1. دالة التصدير: لتحميل البيانات كملف JSON
function exportData() {
  const data = localStorage.getItem("certificates");
  if (!data || data === "[]") {
      showMessage("لا توجد بيانات لتصديرها!", false);
      return;
  }
  
  // إنشاء ملف وهمي للتحميل
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  
  // تسمية الملف بتاريخ اليوم لسهولة التنظيم
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_certificates_${date}.json`;
  a.click();
  
  showMessage("تم تصدير النسخة الاحتياطية بنجاح");
}

// 2. دالة الاستيراد: لرفع الملف وقراءته
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
      try {
          const content = e.target.result;
          // التأكد أن الملف يحتوي على بيانات صحيحة قبل الحفظ
          const parsed = JSON.parse(content);
          
          if (Array.isArray(parsed)) {
              if (confirm("هل أنت متأكد؟ سيتم استبدال البيانات الحالية بالبيانات المستوردة.")) {
                  localStorage.setItem("certificates", content);
                  showMessage("تم استيراد البيانات بنجاح!");
                  // إعادة تحميل الصفحة لتظهر البيانات الجديدة
                  setTimeout(() => location.reload(), 1500);
              }
          } else {
              alert("الملف غير صحيح!");
          }
      } catch (err) {
          alert("حدث خطأ أثناء قراءة الملف!");
      }
  };
  reader.readAsText(file);
}