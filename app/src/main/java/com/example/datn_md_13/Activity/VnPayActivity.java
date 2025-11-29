package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.R;

public class VnPayActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar loading;

    private String ticketId;
    private String paymentUrl;

    private boolean callbackHandled = false;
    private boolean exitedUnexpectedly = true;   // ⭐ QUAN TRỌNG

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vn_pay);

        webView  = findViewById(R.id.webView);
        loading  = findViewById(R.id.progress);

        ticketId   = getIntent().getStringExtra("ticket_id");
        paymentUrl = getIntent().getStringExtra("payment_url");

        if (paymentUrl == null || paymentUrl.trim().isEmpty()) {
            Toast.makeText(this, "Link thanh toán lỗi!", Toast.LENGTH_SHORT).show();
            setResult(RESULT_CANCELED);
            finish();
            return;
        }

        setupBackHandler();   // CHẶN BACK
        setupWebView();       // LẮNG NGHE CALLBACK

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);

        webView.loadUrl(paymentUrl);
    }

    /* ============================================================
       CHẶN NÚT BACK → TRẢ GHẾ
    ============================================================ */
    private void setupBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {

                // USER BACK → FAIL
                exitedUnexpectedly = true;
                setResult(RESULT_CANCELED);
                finish();
            }
        });
    }

    /* ============================================================
       SETUP WEBVIEW
    ============================================================ */
    private void setupWebView() {
        webView.setWebChromeClient(new WebChromeClient());

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                loading.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loading.setVisibility(View.GONE);
                handleReturnUrl(url);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode,
                                        String description, String failingUrl) {
                // LỖI MẠNG → FAIL → TRẢ GHẾ
                exitedUnexpectedly = true;
                setResult(RESULT_CANCELED);
                Toast.makeText(VnPayActivity.this,
                        "Mạng lỗi, vui lòng thử lại!", Toast.LENGTH_SHORT).show();
                finish();
            }
        });
    }

    /* ============================================================
       KIỂM TRA URL CALLBACK TỪ VNPAY
    ============================================================ */
    private void handleReturnUrl(String url) {

        if (callbackHandled) return;

        if (url.contains("vnp_ResponseCode=")) {
            callbackHandled = true;

            if (url.contains("vnp_ResponseCode=00")) {
                onSuccess();
            } else {
                onFailed();
            }
        }
    }

    /* ============================================================
       THANH TOÁN THÀNH CÔNG
    ============================================================ */
    private void onSuccess() {

        exitedUnexpectedly = false; // 👍 Quan trọng, không release ghế

        setResult(RESULT_OK);

        Intent i = new Intent(this, TicketDetailActivity.class);
        i.putExtra("ticket_id", ticketId);
        startActivity(i);

        finish();
    }

    /* ============================================================
       THANH TOÁN THẤT BẠI
    ============================================================ */
    private void onFailed() {

        exitedUnexpectedly = true;

        Toast.makeText(this, "Thanh toán thất bại!", Toast.LENGTH_SHORT).show();
        setResult(RESULT_CANCELED);

        finish();
    }

    /* ============================================================
       NẾU USER VUỐT RA NGOÀI (GESTURE SWIPE) → ON_STOP → ON_DESTROY
       CHÚNG TA CẦN TRẢ GHẾ
    ============================================================ */
    @Override
    protected void onStop() {
        super.onStop();

        // Nếu user vuốt sang trái → Activity DESTROY nhưng KHÔNG CALLBACK
        if (isFinishing()) return; // user SUCCESS thì không xử lý

        if (!callbackHandled && exitedUnexpectedly) {
            // BÁO VỀ CHECKOUT → TRẢ GHẾ
            setResult(RESULT_CANCELED);
            finish();
        }
    }
}
