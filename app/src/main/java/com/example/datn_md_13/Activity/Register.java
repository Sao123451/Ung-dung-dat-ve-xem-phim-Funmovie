package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.util.Patterns;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

public class Register extends AppCompatActivity {

    private TextInputLayout tilFullname, tilEmail, tilPassword, tilConfirmPassword;
    private TextInputEditText edtFullname, edtEmail, edtPassword, edtConfirmPassword;
    private TextView tvPasswordStrength;
    private Button btnRegister;
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

        apiService = ApiClient.get().create(ApiService.class);

        // 🔹 Ẩn TextView khi mới vào màn hình
        tvPasswordStrength.setVisibility(View.GONE);

        // 🔹 Theo dõi mật khẩu để hiển thị độ mạnh
        edtPassword.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                checkPasswordStrength(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnRegister.setOnClickListener(v -> handleRegister());
    }

    /** Hiển thị độ mạnh mật khẩu */
    private void checkPasswordStrength(String password) {
        if (password.isEmpty()) {
            // Ẩn khi chưa nhập gì
            tvPasswordStrength.setVisibility(View.GONE);
            return;
        } else {
            // Hiện lại khi có nhập
            tvPasswordStrength.setVisibility(View.VISIBLE);
        }

        int strengthScore = 0;

        // dài >= 8 ký tự
        if (password.length() >= 8) strengthScore++;
        // có chữ thường
        if (password.matches(".*[a-z].*")) strengthScore++;
        // có chữ hoa
        if (password.matches(".*[A-Z].*")) strengthScore++;
        // có số
        if (password.matches(".*[0-9].*")) strengthScore++;
        // có ký tự đặc biệt
        if (password.matches(".*[!@#$%^&*()_+=\\-{}\\[\\]:;\"'<>,.?/].*")) strengthScore++;

        // Đánh giá
        if (strengthScore <= 2) {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Yếu");
            tvPasswordStrength.setTextColor(Color.RED);
        } else if (strengthScore == 3 || strengthScore == 4) {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Trung bình");
            tvPasswordStrength.setTextColor(Color.parseColor("#FFA500")); // cam
        } else {
            tvPasswordStrength.setText("Độ mạnh mật khẩu: Mạnh");
            tvPasswordStrength.setTextColor(Color.parseColor("#4CAF50")); // xanh lá
        }
    }

    /** Xử lý validate & gọi API đăng ký */
    private void handleRegister() {
        String fullname = edtFullname.getText().toString().trim();
        String email = edtEmail.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();
        String confirmPassword = edtConfirmPassword.getText().toString().trim();

        tilFullname.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirmPassword.setError(null);

        if (fullname.isEmpty()) {
            tilFullname.setError("Vui lòng nhập tên tài khoản");
            return;
        }
        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches() || !email.endsWith("@gmail.com")) {
            tilEmail.setError("Email phải hợp lệ và kết thúc bằng @gmail.com");
            return;
        }

        String strongPattern = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+=\\-{}\\[\\]:;\"'<>,.?/]).{8,}$";
        if (!password.matches(strongPattern)) {
            tilPassword.setError("Mật khẩu yếu! Hãy thêm chữ hoa, số và ký tự đặc biệt.");
            return;
        }
        if (!password.equals(confirmPassword)) {
            tilConfirmPassword.setError("Mật khẩu không khớp");
            return;
        }

        // Gửi API đăng ký
        User newUser = new User();
        newUser.setUsername(fullname);
        newUser.setFull_name(fullname);
        newUser.setEmail(email);
        newUser.setPassword(password);

        apiService.register(newUser).enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call, @NonNull Response<User> response) {
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
                Toast.makeText(Register.this, "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
