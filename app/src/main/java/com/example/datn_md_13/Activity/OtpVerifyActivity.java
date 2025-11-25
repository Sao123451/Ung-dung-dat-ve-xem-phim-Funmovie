package com.example.datn_md_13.Activity;

import android.animation.ObjectAnimator;
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
import com.example.datn_md_13.Model.RegisterResponse;
import com.example.datn_md_13.R;
import com.google.android.material.button.MaterialButton;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class OtpVerifyActivity extends AppCompatActivity {

    EditText[] otp = new EditText[6];
    MaterialButton btnVerify;
    TextView tvResend, tvError;

    String email, username, fullname, password;
    ApiService api;

    CountDownTimer timer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_otp_verify);

        otp[0] = findViewById(R.id.otp1);
        otp[1] = findViewById(R.id.otp2);
        otp[2] = findViewById(R.id.otp3);
        otp[3] = findViewById(R.id.otp4);
        otp[4] = findViewById(R.id.otp5);
        otp[5] = findViewById(R.id.otp6);

        tvResend = findViewById(R.id.tvResend);
        tvError = findViewById(R.id.tvError);
        btnVerify = findViewById(R.id.btnVerify);

        email = getIntent().getStringExtra("email");
        username = getIntent().getStringExtra("username");
        fullname = getIntent().getStringExtra("fullname");
        password = getIntent().getStringExtra("password");

        api = ApiClient.get().create(ApiService.class);

        setupOtpInputs();
        startCountdown();

        btnVerify.setOnClickListener(v -> verifyOtp());

        tvResend.setOnClickListener(v -> {
            if (tvResend.isEnabled()) resendOTP();
        });

        Toolbar toolbar = findViewById(R.id.toolbarOtp);
        toolbar.setNavigationOnClickListener(v -> showBackDialog());
    }

    @Override
    public void onBackPressed() {
        showBackDialog();
    }

    private void showBackDialog() {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Thoát xác thực?")
                .setMessage("Nếu bạn quay lại, quá trình đăng ký sẽ bị hủy. Bạn có chắc muốn thoát không?")
                .setPositiveButton("Thoát", (dialog, which) -> {
                    if (timer != null) timer.cancel();
                    finish();
                })
                .setNegativeButton("Ở lại", null)
                .show();
    }

    private void startCountdown() {
        tvResend.setEnabled(false);

        timer = new CountDownTimer(60000, 1000) {
            @Override
            public void onTick(long ms) {
                tvResend.setText("Gửi lại mã (" + (ms / 1000) + "s)");
            }

            @Override
            public void onFinish() {
                tvResend.setEnabled(true);
                tvResend.setText("Gửi lại mã");
            }
        }.start();
    }

    private void resendOTP() {
        tvError.setVisibility(View.GONE);

        Map<String, String> body = new HashMap<>();
        body.put("email", email);

        api.registerStep1(body).enqueue(new Callback<RegisterResponse>() {
            @Override
            public void onResponse(Call<RegisterResponse> call, Response<RegisterResponse> response) {
                if (response.isSuccessful()) {
                    tvError.setVisibility(View.GONE);
                    startCountdown();
                } else {
                    showError("Không thể gửi lại OTP");
                }
            }

            @Override
            public void onFailure(Call<RegisterResponse> call, Throwable t) {
                showError("Lỗi mạng, vui lòng thử lại");
            }
        });
    }

    private void setupOtpInputs() {
        for (int i = 0; i < 6; i++) {
            int index = i;

            otp[i].addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    if (!s.toString().isEmpty() && index < 5) {
                        otp[index + 1].requestFocus();
                    }
                }

                @Override public void afterTextChanged(Editable s) {}
            });

            otp[i].setOnKeyListener((v, keyCode, event) -> {
                if (event.getAction() == KeyEvent.ACTION_DOWN &&
                        keyCode == KeyEvent.KEYCODE_DEL &&
                        otp[index].getText().length() == 0 &&
                        index > 0) {

                    otp[index - 1].requestFocus();
                }
                return false;
            });
        }
    }

    private void verifyOtp() {
        tvError.setVisibility(View.GONE);

        String code = "";
        for (EditText e : otp) {
            if (e.getText().toString().trim().isEmpty()) {
                showError("Vui lòng nhập đủ 6 số OTP");
                return;
            }
            code += e.getText().toString().trim();
        }

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("otp_code", code);
        body.put("username", username);
        body.put("full_name", fullname);
        body.put("password", password);

        api.registerStep2(body).enqueue(new Callback<RegisterResponse>() {
            @Override
            public void onResponse(Call<RegisterResponse> call, Response<RegisterResponse> response) {

                if (response.isSuccessful()) {
                    Intent i = new Intent(OtpVerifyActivity.this, Login.class);
                    i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                    finish();
                } else {
                    showOtpErrorEffect();
                }
            }

            @Override
            public void onFailure(Call<RegisterResponse> call, Throwable t) {
                showError("Lỗi kết nối, thử lại");
            }
        });
    }

    // ===============================
    // 🔥 KHÔNG ĐẨY LAYOUT + RUNG + XÓA OTP
    // ===============================
    private void showOtpErrorEffect() {

        showError("Mã OTP sai hoặc đã hết hạn!");

        for (EditText e : otp) {
            e.setBackgroundResource(R.drawable.otp_box_bg_error);

            // ⭐ RUNG KHÔNG ĐẨY LAYOUT (ObjectAnimator)
            ObjectAnimator shake = ObjectAnimator.ofFloat(e, "translationX",
                    0, 20, -20, 15, -15, 10, -10, 5, -5, 0);
            shake.setDuration(400);
            shake.start();
        }

        // Xóa toàn bộ OTP
        for (EditText e : otp) e.setText("");

        otp[0].requestFocus();

        // Reset viền sau 1 giây
        new android.os.Handler().postDelayed(() -> {
            for (EditText e : otp) e.setBackgroundResource(R.drawable.otp_box_bg);
        }, 1000);
    }

    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setVisibility(View.VISIBLE);
    }
}
