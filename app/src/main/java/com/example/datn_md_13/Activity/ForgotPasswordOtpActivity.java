package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.R;
import com.google.android.material.button.MaterialButton;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ForgotPasswordOtpActivity extends AppCompatActivity {

    EditText otp1, otp2, otp3, otp4, otp5, otp6;
    TextView tvResend, tvEmail, tvError;
    MaterialButton btnVerify;
    CountDownTimer timer;

    String email;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password_otp);

        // ===== TOOLBAR BACK (nếu layout có) =====
        Toolbar toolbar = findViewById(R.id.toolbarOtp);
        if (toolbar != null) {
            setSupportActionBar(toolbar);
            toolbar.setNavigationOnClickListener(v -> finish());
        }

        otp1 = findViewById(R.id.otp1);
        otp2 = findViewById(R.id.otp2);
        otp3 = findViewById(R.id.otp3);
        otp4 = findViewById(R.id.otp4);
        otp5 = findViewById(R.id.otp5);
        otp6 = findViewById(R.id.otp6);

        tvResend = findViewById(R.id.tvResend);
        tvError = findViewById(R.id.tvError);
        btnVerify = findViewById(R.id.btnVerify);
        tvEmail = findViewById(R.id.tvEmail);

        email = getIntent().getStringExtra("email");
        tvEmail.setText("OTP đã gửi tới:\n" + email);

        setupOtpInputs();
        startCountdown();

        btnVerify.setOnClickListener(v -> verifyOtp());
        tvResend.setOnClickListener(v -> resendOtp());
    }

    private void setupOtpInputs() {
        EditText[] arr = {otp1, otp2, otp3, otp4, otp5, otp6};

        for (int i = 0; i < arr.length; i++) {
            final int idx = i;

            arr[i].addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
                @Override public void onTextChanged(CharSequence s, int st, int b, int c) {}
                @Override public void afterTextChanged(Editable s) {
                    hideError();

                    if (s.length() == 1 && idx < 5)
                        arr[idx + 1].requestFocus();
                    else if (s.length() == 0 && idx > 0)
                        arr[idx - 1].requestFocus();
                }
            });

            arr[i].setOnKeyListener((v, keyCode, event) -> {
                if (keyCode == KeyEvent.KEYCODE_DEL &&
                        event.getAction() == KeyEvent.ACTION_DOWN &&
                        arr[idx].getText().toString().isEmpty() &&
                        idx > 0) {

                    arr[idx - 1].requestFocus();
                    return true;
                }
                return false;
            });
        }
    }

    private void startCountdown() {
        tvResend.setEnabled(false);

        if (timer != null) timer.cancel();

        timer = new CountDownTimer(60000, 1000) {
            @Override public void onTick(long ms) {
                tvResend.setText("Gửi lại mã (" + ms / 1000 + "s)");
            }

            @Override public void onFinish() {
                tvResend.setText("Gửi lại mã");
                tvResend.setEnabled(true);
            }
        }.start();
    }

    private void resendOtp() {
        tvResend.setEnabled(false);
        hideError();

        Map<String, String> body = new HashMap<>();
        body.put("email", email);

        ApiClient.get().create(ApiService.class)
                .forgotSendOtp(body)
                .enqueue(new Callback<ApiService.BasicResponse>() {
                    @Override
                    public void onResponse(Call<ApiService.BasicResponse> call,
                                           Response<ApiService.BasicResponse> res) {

                        if (res.isSuccessful()) {
                            startCountdown();
                        } else {
                            tvResend.setEnabled(true);
                            showError("Không thể gửi lại OTP");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiService.BasicResponse> call, Throwable t) {
                        tvResend.setEnabled(true);
                        showError("Lỗi kết nối");
                    }
                });
    }

    private void verifyOtp() {
        hideError();

        String otp = otp1.getText().toString() +
                otp2.getText().toString() +
                otp3.getText().toString() +
                otp4.getText().toString() +
                otp5.getText().toString() +
                otp6.getText().toString();

        if (otp.length() != 6) {
            showError("Vui lòng nhập đủ 6 số OTP");
            return;
        }

        btnVerify.setEnabled(false);

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("otp_code", otp);

        ApiClient.get().create(ApiService.class)
                .forgotVerifyOtp(body)
                .enqueue(new Callback<ApiService.BasicResponse>() {

                    @Override
                    public void onResponse(Call<ApiService.BasicResponse> call,
                                           Response<ApiService.BasicResponse> res) {

                        btnVerify.setEnabled(true);

                        if (res.isSuccessful() && res.body() != null &&
                                "set_new_password".equals(res.body().step)) {

                            Intent i = new Intent(ForgotPasswordOtpActivity.this,
                                    ForgotPasswordNewPassActivity.class);

                            i.putExtra("email", email);
                            i.putExtra("otp", otp);

                            startActivity(i);
                            finish();
                            return;
                        }

                        // OTP sai → hiệu ứng rung + đổi màu + xóa
                        showOtpErrorEffect("Mã OTP sai hoặc đã hết hạn");
                    }

                    @Override
                    public void onFailure(Call<ApiService.BasicResponse> call, Throwable t) {
                        btnVerify.setEnabled(true);
                        showOtpErrorEffect("Lỗi kết nối");
                    }
                });
    }

    // KHÔNG ĐẨY LAYOUT – chỉ fade lỗi
    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setVisibility(View.VISIBLE);
        tvError.setAlpha(1f);
    }

    private void hideError() {
        tvError.setAlpha(0f);
    }

    // HIỆU ỨNG SAI OTP: RUNG + ĐỎ VIỀN + XÓA OTP
    private void showOtpErrorEffect(String msg) {

        showError(msg);

        android.view.animation.Animation shake =
                android.view.animation.AnimationUtils.loadAnimation(this, R.anim.shake);

        EditText[] arr = {otp1, otp2, otp3, otp4, otp5, otp6};

        // RUNG + VIỀN ĐỎ
        for (EditText e : arr) {
            e.setBackgroundResource(R.drawable.otp_box_bg_error);
            e.startAnimation(shake);
            e.setText(""); // Xóa luôn nội dung
        }

        otp1.requestFocus();

        // Sau 1 giây trả về màu bình thường
        new android.os.Handler().postDelayed(() -> {
            for (EditText e : arr) {
                e.setBackgroundResource(R.drawable.otp_box_bg);
            }
        }, 1000);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (timer != null) timer.cancel();
    }
}
