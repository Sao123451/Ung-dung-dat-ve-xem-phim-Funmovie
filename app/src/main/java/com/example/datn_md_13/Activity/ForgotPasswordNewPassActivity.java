package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.R;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ForgotPasswordNewPassActivity extends AppCompatActivity {

    TextInputLayout tilPass1, tilPass2;
    TextInputEditText edtPass1, edtPass2;
    Button btnChange;
    ProgressBar progress;
    TextView tvError;

    String email, otp;

    // Mật khẩu: tối thiểu 8 ký tự, có:
    // 1 chữ thường, 1 chữ hoa, 1 số, 1 ký tự đặc biệt
    private static final String PASSWORD_REGEX =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password_new_pass);

        // Nhận email & otp từ Intent
        email = getIntent().getStringExtra("email");
        otp = getIntent().getStringExtra("otp");

        // Nếu thiếu dữ liệu quan trọng -> đóng màn, tránh crash
        if (email == null || otp == null) {
            finish();
            return;
        }

        // ===== TOOLBAR =====
        Toolbar toolbar = findViewById(R.id.toolbarNewPass);
        if (toolbar != null) {
            setSupportActionBar(toolbar);
            toolbar.setNavigationOnClickListener(v -> finish());
        }

        tilPass1 = findViewById(R.id.tilPass1);
        tilPass2 = findViewById(R.id.tilPass2);
        edtPass1 = findViewById(R.id.edtPass);
        edtPass2 = findViewById(R.id.edtPass2);

        btnChange = findViewById(R.id.btnChange);
        progress = findViewById(R.id.progress);
        tvError = findViewById(R.id.tvError);

        setupTextWatchers();

        btnChange.setOnClickListener(v -> changePassword());
    }

    // Xóa lỗi khi người dùng nhập lại
    private void setupTextWatchers() {
        TextWatcher clearErrorWatcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            @Override public void onTextChanged(CharSequence s, int st, int b, int c) {}
            @Override public void afterTextChanged(Editable s) {
                tilPass1.setError(null);
                tilPass2.setError(null);
                tvError.setVisibility(View.GONE);
            }
        };

        edtPass1.addTextChangedListener(clearErrorWatcher);
        edtPass2.addTextChangedListener(clearErrorWatcher);
    }

    private void changePassword() {
        // Validate trước khi call API
        if (!validateInputs()) {
            return;
        }

        String p1 = edtPass1.getText().toString().trim();

        showLoading(true);

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("otp_code", otp);
        body.put("new_password", p1);

        ApiClient.get()
                .create(ApiService.class)
                .forgotResetPassword(body)
                .enqueue(new Callback<ApiService.BasicResponse>() {
                    @Override
                    public void onResponse(Call<ApiService.BasicResponse> call,
                                           Response<ApiService.BasicResponse> res) {

                        showLoading(false);

                        if (res.isSuccessful()) {
                            // Đổi mật khẩu OK → quay về màn Login, clear back stack
                            Intent i = new Intent(ForgotPasswordNewPassActivity.this, Login.class);
                            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                            startActivity(i);
                        } else {
                            // Backend trả lỗi (OTP sai / hết hạn …)
                            showError("OTP đã hết hạn hoặc không hợp lệ!");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiService.BasicResponse> call, Throwable t) {
                        showLoading(false);
                        showError("Lỗi kết nối, vui lòng thử lại");
                    }
                });
    }

    private boolean validateInputs() {
        // Reset lỗi
        tilPass1.setError(null);
        tilPass2.setError(null);
        tvError.setVisibility(View.GONE);

        String p1 = edtPass1.getText().toString().trim();
        String p2 = edtPass2.getText().toString().trim();

        boolean isValid = true;

        // Ô mật khẩu
        if (p1.isEmpty()) {
            tilPass1.setError("Vui lòng nhập mật khẩu");
            tilPass1.setErrorIconDrawable(null);
            isValid = false;
        } else if (p1.length() < 8) {
            tilPass1.setError("Mật khẩu tối thiểu 8 ký tự");
            tilPass1.setErrorIconDrawable(null);
            isValid = false;
        } else if (!p1.matches(PASSWORD_REGEX)) {
            tilPass1.setError("Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt");
            tilPass1.setErrorIconDrawable(null);
            isValid = false;
        }

        // Ô nhập lại mật khẩu
        if (p2.isEmpty()) {
            tilPass2.setError("Vui lòng nhập lại mật khẩu");
            tilPass2.setErrorIconDrawable(null);
            isValid = false;
        } else if (!p2.equals(p1)) {
            tilPass2.setError("Mật khẩu không khớp");
            tilPass2.setErrorIconDrawable(null);
            isValid = false;
        }

        return isValid;
    }

    private void showLoading(boolean loading) {
        if (loading) {
            progress.setVisibility(View.VISIBLE);
            btnChange.setEnabled(false);
        } else {
            progress.setVisibility(View.GONE);
            btnChange.setEnabled(true);
        }
    }

    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setVisibility(View.VISIBLE);
    }
}
