// Lấy code của VNPay
const url = new URL(window.location.href);
const code = url.searchParams.get("vnp_TxnRef");

console.log("⭐ VNPay Return Code =", code);

if (!code) {
    alert("Không lấy được mã giao dịch!");
} else {
    // ⭐⭐ REDIRECT THẲNG VỀ STAFF LOCALHOST ⭐⭐
    window.location.href = `http://localhost:5173/?vnp_return_code=${code}`;
}
