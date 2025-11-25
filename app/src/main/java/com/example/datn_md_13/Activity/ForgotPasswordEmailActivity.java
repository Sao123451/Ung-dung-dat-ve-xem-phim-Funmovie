package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Patterns;
import android.view.View;
import android.widget.EditText;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.R;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ForgotPasswordEmailActivity extends AppCompatActivity {

    EditText edtEmail;
    Button btnSendOtp;
    ProgressBar progress;
    TextView tvError;
    CountDownTimer timer;

    public static final String OTP_PREF = "otp_pref";

    String lastEmailLocked = ""; // Email đang bị khóa OTP

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password_email);

        // Toolbar
        Toolbar toolbar = findViewById(R.id.toolbarOtp);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        edtEmail = findViewById(R.id.edtEmail);
        btnSendOtp = findViewById(R.id.btnSendOtp);
        progress = findViewById(R.id.progress);
        tvError = findViewById(R.id.tvError);

        btnSendOtp.setOnClickListener(v -> {

            String email = edtEmail.getText().toString().trim();

            // KIỂM TRA EMAIL ĐANG BỊ KHÓA VÀ OTP CHƯA HẾT HẠN
            long expiresAt = getSharedPreferences(OTP_PREF, MODE_PRIVATE)
                    .getLong("otp_expires_at_" + email, 0);

            long now = System.currentTimeMillis();

            if (expiresAt > now) {

                long remain = (expiresAt - now) / 1000;

                // CHỈ HIỆN POPUP THÔNG BÁO, KHÔNG LÀM GÌ KHÁC
                new android.app.AlertDialog.Builder(ForgotPasswordEmailActivity.this)
                        .setTitle("OTP chưa hết hiệu lực")
                        .setMessage("Bạn đã yêu cầu OTP trước đó cho email:\n\n"
                                + email +
                                "\n\nVui lòng chờ " + remain + " giây để gửi lại OTP.")
                        .setPositiveButton("OK", null)
                        .show();

                return;
            }

            // Không bị khóa → gửi OTP bình thường
            sendOtp();
        });

        setupEmailWatcher();
        restoreOtpState();
    }

    // =====================================================================
    // RESET TRẠNG THÁI NÚT KHI EMAIL THAY ĐỔI
    // =====================================================================
    private void setupEmailWatcher() {
        edtEmail.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {

                String currentEmail = s.toString().trim();

                // Nếu email TRÙNG email đang bị khóa → KHÔNG mở nút
                if (currentEmail.equals(lastEmailLocked)) {
                    return;
                }

                // Nếu email KHÁC email bị khóa → kiểm tra xem email mới có OTP còn hạn không
                long expiresAt = getSharedPreferences(OTP_PREF, MODE_PRIVATE)
                        .getLong("otp_expires_at_" + currentEmail, 0);

                long now = System.currentTimeMillis();

                if (expiresAt > now) {
                    // Email mới nhưng OTP còn hạn → KHÔNG mở nút, chỉ giữ countdown đang chạy
                    btnSendOtp.setEnabled(false);

                    long remain = expiresAt - now;
                    startCountdown(remain);
                    return;
                }

                // Nếu không có OTP đang hoạt động → mở khóa SEND OTP
                btnSendOtp.setEnabled(true);
                btnSendOtp.setText("Gửi OTP");
                hideError();

                if (timer != null) timer.cancel();
            }

            @Override public void afterTextChanged(Editable s) {}
        });
    }

    // =====================================================================
    // KHÔI PHỤC COUNTDOWN NẾU OTP CHƯA HẾT HẠN
    // =====================================================================
    private void restoreOtpState() {
        String email = edtEmail.getText().toString().trim();
        if (email.isEmpty()) return;

        long expiresAt = getSharedPreferences(OTP_PREF, MODE_PRIVATE)
                .getLong("otp_expires_at_" + email, 0);

        long now = System.currentTimeMillis();

        if (expiresAt > now) {
            lastEmailLocked = email;
            long remaining = expiresAt - now;
            startCountdown(remaining);
        }
    }

    // =====================================================================
    // GỬI OTP + LƯU THỜI GIAN HẾT HẠN
    // =====================================================================
    private void sendOtp() {

        hideError();

        String email = edtEmail.getText().toString().trim();

        // Validate rỗng
        if (email.isEmpty()) {
            showError("Vui lòng nhập email");
            return;
        }
        // Email phải có dạng chuẩn
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showError("Email không hợp lệ");
            return;
        }
        // BẮT BUỘC phải là @gmail.com
        if (!email.toLowerCase().endsWith("@gmail.com")) {
            showError("Email phải có đuôi @gmail.com");
            return;
        }

        btnSendOtp.setEnabled(false);
        progress.setVisibility(View.VISIBLE);

        Map<String, String> body = new HashMap<>();
        body.put("email", email);

        ApiClient.get().create(ApiService.class)
                .forgotSendOtp(body)
                .enqueue(new Callback<ApiService.BasicResponse>() {
                    @Override
                    public void onResponse(Call<ApiService.BasicResponse> call,
                                           Response<ApiService.BasicResponse> res) {

                        progress.setVisibility(View.GONE);

                        if (!res.isSuccessful() || res.body() == null) {
                            btnSendOtp.setEnabled(true);
                            showError("Email không tồn tại");
                            return;
                        }

                        int expiresIn = res.body().expires_in;
                        long expiresAt = System.currentTimeMillis() + expiresIn * 1000L;

                        // LƯU thời gian hết hạn
                        getSharedPreferences(OTP_PREF, MODE_PRIVATE)
                                .edit()
                                .putLong("otp_expires_at_" + email, expiresAt)
                                .apply();

                        // Ghi nhớ email bị khóa
                        lastEmailLocked = email;

                        // Countdown chính xác theo TTL API
                        startCountdown(expiresIn * 1000L);

                        // Chuyển màn
                        Intent i = new Intent(ForgotPasswordEmailActivity.this,
                                ForgotPasswordOtpActivity.class);
                        i.putExtra("email", email);
                        startActivity(i);
                    }

                    @Override
                    public void onFailure(Call<ApiService.BasicResponse> call, Throwable t) {
                        progress.setVisibility(View.GONE);
                        btnSendOtp.setEnabled(true);
                        showError("Lỗi kết nối");
                    }
                });
    }

    // =====================================================================
    // COUNTDOWN THEO TTL
    // =====================================================================
    private void startCountdown(long durationMs) {

        btnSendOtp.setEnabled(false);

        if (timer != null) timer.cancel();

        timer = new CountDownTimer(durationMs, 1000) {
            @Override public void onTick(long ms) {
                long sec = ms / 1000;
                btnSendOtp.setText("Gửi lại OTP (" + sec + "s)");
            }

            @Override public void onFinish() {
                btnSendOtp.setText("Gửi OTP");
                btnSendOtp.setEnabled(true);
            }
        }.start();
    }

    // =====================================================================
    // HIỂN THỊ LỖI KHÔNG LÀM NHẢY LAYOUT
    // =====================================================================
    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setAlpha(1f);  // hiện lỗi nhưng giữ chiều cao cố định
    }

    private void hideError() {
        tvError.setAlpha(0f);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (timer != null) timer.cancel();
    }
}
