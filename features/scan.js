// ❗ KHÔNG import jsQR ở đây nữa

import { api } from "../core/api.js";
import { switchView } from "../core/routes.js";
import { loadPrintTicket } from "./print.js";
import { S } from "../core/state.js";

export function openOnlineScanner() {
    const wrap = document.getElementById("onlineScanWrap");
    wrap.innerHTML = `
      <video id="qrVideo" style="width:300px;border-radius:10px;"></video>
      <div class="mt-2 small text-muted">Đưa mã QR vào camera...</div>
    `;

    const video = document.getElementById("qrVideo");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            scanLoop(video, stream);
        })
        .catch(err => {
            console.error(err);
            window.showMidAlert("Không mở được camera!");
        });
}

function scanLoop(video, stream) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, canvas.width, canvas.height); // ← dùng global jsQR

            if (code) {
                stream.getTracks().forEach(t => t.stop());
                onQRFound(code.data);
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    tick();
}

async function onQRFound(qrData) {
    try {
        const t = await api(`/tickets/find/by-qr/${qrData}`);

        if (!t || !t._id) {
            window.showMidAlert("❌ Không tìm thấy vé!");
            return;
        }

        S.lastTicketId = t._id;
        S.lastTicketDetail = t;

        await loadPrintTicket(t._id);
        switchView("print");

    } catch (e) {
        console.error(e);
        window.showMidAlert("Lỗi khi tìm vé!");
    }
}
