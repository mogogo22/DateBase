
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

/* =======================
   TOAST MESSAGE + SOUND
======================= */
function showMessage(text, withSound = true) {
  messageBox.textContent = text;
  messageBox.style.opacity = "1";
  messageBox.style.position = "fixed";
  messageBox.style.top = "20px";
  messageBox.style.left = "50%";
  messageBox.style.transform = "translateX(-50%)";
  messageBox.style.zIndex = "9999";

  if (withSound) {
    try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
  }

  setTimeout(() => {
    messageBox.style.opacity = "0";
  }, 2500);
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
    return false;
  }

  if (!isNaN(brandName.value)) {
    showMessage("اسم العلامة يجب أن يكون نص وليس أرقام فقط", false);
    return false;
  }

  return true;
}

/* =======================
   TIME CALCULATION
======================= */
function getRemainingTime(fromStr, toStr) {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) { months--; days += 30; }
  if (months < 0) { years--; months += 12; }
  return `${years} سنة - ${months} شهر - ${days} يوم`;
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
   ADD / EDIT
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
    const remaining = getRemainingTime(new Date().toISOString(), expiryDate.value);

    const cert = {
      brandName: brandName.value,
      brandNumber: brandNumber.value,
      companyName: companyName.value,
      productionDate: productionDate.value,
      expiryDate: expiryDate.value,
      preTime: remaining, // محسوب تلقائياً
      status: certificateStatus.value,
      fileNumber: fileNumber.value,
      companyNumber: companyNumber.value, // رقم الدرج
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
    <p><b>الوقت المتبقي:</b> ${cert.preTime}</p>
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
  preTime.value = cert.preTime;
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
  const pass = prompt("اكتب باسورد حذف الكل");
  if (pass !== LOGIN_PASSWORD) {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
    return;
  }
  certificates = [];
  saveDatabase();
  renderCertificates();
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
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) names.push(cert.brandName);
  });
  if (names.length) {
    showMessage("❌ شهادات على وشك الانتهاء/منتهية: " + names.join(" ، "), true);
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
