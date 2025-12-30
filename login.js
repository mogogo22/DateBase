function login(){
    const e = document.getElementById("email").value.trim();
    const p = document.getElementById("password").value.trim();

    if(e === "amer" && p === "amer@689090"){
        sessionStorage.setItem("auth", "yes");

        // تحويل مباشر بدون أي لف
        window.location.href = "index.html";
    } else {
        try { notifySound.currentTime = 0; notifySound.play(); } catch(e){}
        document.getElementById("loginErr").innerText =
            "الإيميل أو كلمة المرور غير صحيحة"; 
    }
}
// حفظ حالة الدخول
localStorage.setItem("isLoggedIn", "true");

// مسح البيانات من المدخلات
emailInput.value = "";
passwordInput.value = "";

// الانتقال للصفحة الرئيسية
window.location.href = "index.html";

emailInput = document.getElementById("email");
passwordInput = document.getElementById("password");

window.onload = () => {
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
  };
  