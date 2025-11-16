package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.progressindicator.CircularProgressIndicator;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Register extends AppCompatActivity {

    private TextInputLayout tilFullname, tilEmail, tilPassword, tilConfirmPassword;
    private TextInputEditText edtFullname, edtEmail, edtPassword, edtConfirmPassword;
    private TextView tvPasswordStrength;
    private Button btnRegister;
    private CircularProgressIndicator progress;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        tilFullname = findViewById(R.id.tilFullname);
        tilEmail = findViewById(R.id.tilEmail);
        tilPassword = findViewById(R.id.tilPassword);
        tilConfirmPassword = findViewById(R.id.tilConfirmPassword);
        edtFullname = findViewById(R.id.edtFullname);
        edtEmail = findViewById(R.id.edtEmail);
        edtPassword = findViewById(R.id.edtPassword);
        edtConfirmPassword = findViewById(R.id.edtConfirmPassword);
        tvPasswordStrength = findViewById(R.id.tvPasswordStrength);
        btnRegister = findViewById(R.id.btnSignUp);
        progress = findViewById(R.id.progress); // 🔸 Thêm trong XML
        apiService = ApiClient.get().create(ApiService.class);

        tvPasswordStrength.setVisibility(View.GONE);
        addTextWatchers();

        edtPassword.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                checkPasswordStrength(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnRegister.setOnClickListener(v -> {
            if (validateInputs()) handleRegister();
        });
    }

    private void checkPasswordStrength(String password) {
        if (TextUtils.isEmpty(password)) {
            tvPasswordStrength.setVisibility(View.GONE);
            return;
        }
        tvPasswordStrength.setVisibility(View.VISIBLE);

        int score = 0;
        if (password.length() >= 8) score++;
        if (password.matches(".*[a-z].*")) score++;
        if (password.matches(".*[A-Z].*")) score++;
        if (password.matches(".*[0-9].*")) score++;
        if (password.matches(".*[!@#$%^&*()_+=\\-{}\\[\\]:;\"'<>,.?/].*")) score++;

        if (score <= 2) {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Yếu");
            tvPasswordStrength.setTextColor(Color.RED);
        } else if (score <= 4) {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Trung bình");
            tvPasswordStrength.setTextColor(Color.parseColor("#FFA500"));
        } else {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Mạnh");
            tvPasswordStrength.setTextColor(Color.parseColor("#4CAF50"));
        }
    }

    private boolean validateInputs() {
        String fullname = edtFullname.getText().toString().trim();
        String email = edtEmail.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();
        String confirmPassword = edtConfirmPassword.getText().toString().trim();

        tilFullname.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirmPassword.setError(null);

        if (fullname.isEmpty()) {
            tilFullname.setError("Vui lòng nhập họ tên");
            return false;
        }
        if (!fullname.matches("^[\\p{L} .'-]+$")) {
            tilFullname.setError("Tên không hợp lệ (chỉ bao gồm chữ)");
            return false;
        }
        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            tilEmail.setError("Email không hợp lệ");
            return false;
        }

        String strongPattern = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+=\\-{}\\[\\]:;\"'<>,.?/]).{8,}$";
        if (!password.matches(strongPattern)) {
            tilPassword.setError("Mật khẩu yếu! Hãy thêm chữ hoa, số và ký tự đặc biệt (tối thiểu 8 ký tự)");
            return false;
        }
        if (!password.equals(confirmPassword)) {
            tilConfirmPassword.setError("Mật khẩu xác nhận không khớp");
            return false;
        }

        return true;
    }

    private void handleRegister() {
        String fullname = edtFullname.getText().toString().trim();
        String email = edtEmail.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();

        User newUser = new User();
        newUser.setUsername(fullname);
        newUser.setFull_name(fullname);
        newUser.setEmail(email);
        newUser.setPassword(password);

        showLoading(true);

        apiService.register(newUser).enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call, @NonNull Response<User> response) {
                showLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(Register.this, "Đăng ký thành công!", Toast.LENGTH_SHORT).show();
                    startActivity(new Intent(Register.this, Login.class));
                    finish();
                } else {
                    String msg = "Đăng ký thất bại";
                    try {
                        if (response.errorBody() != null) {
                            JSONObject obj = new JSONObject(response.errorBody().string());
                            msg = obj.optString("message", msg);
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(Register.this, msg, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<User> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(Register.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showLoading(boolean show) {
        progress.setVisibility(show ? View.VISIBLE : View.GONE);
        btnRegister.setEnabled(!show);
        edtFullname.setEnabled(!show);
        edtEmail.setEnabled(!show);
        edtPassword.setEnabled(!show);
        edtConfirmPassword.setEnabled(!show);
    }

    private void addTextWatchers() {
        edtFullname.addTextChangedListener(new SimpleWatcher(() -> tilFullname.setError(null)));
        edtEmail.addTextChangedListener(new SimpleWatcher(() -> tilEmail.setError(null)));
        edtPassword.addTextChangedListener(new SimpleWatcher(() -> tilPassword.setError(null)));
        edtConfirmPassword.addTextChangedListener(new SimpleWatcher(() -> tilConfirmPassword.setError(null)));
    }

    private static class SimpleWatcher implements TextWatcher {
        private final Runnable after;
        SimpleWatcher(Runnable after) { this.after = after; }
        @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
        @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
        @Override public void afterTextChanged(Editable s) { after.run(); }
    }
}
