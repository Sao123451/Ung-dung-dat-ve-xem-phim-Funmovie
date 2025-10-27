package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.MainActivity;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Login extends AppCompatActivity {

    private TextInputLayout tilEmail, tilPassword;
    private TextInputEditText edtEmail, edtPassword;
    private Button btnLogin;
    private TextView tvRegister;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Nếu đã đăng nhập thì bỏ qua màn Login
        if (AuthManager.isLoggedIn(this)) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }

        tilEmail = findViewById(R.id.tilEmail);
        edtEmail = findViewById(R.id.edtEmail);
        tilPassword = findViewById(R.id.tilPassword);
        edtPassword = findViewById(R.id.edtPassword);
        btnLogin = findViewById(R.id.btnSignUp);
        tvRegister = findViewById(R.id.tvLogin);

        apiService = ApiClient.get().create(ApiService.class);

        btnLogin.setText("Đăng nhập");
        btnLogin.setOnClickListener(v -> handleLogin());
        tvRegister.setOnClickListener(v -> startActivity(new Intent(Login.this, Register.class)));
    }

    private void handleLogin() {
        String emailOrUsername = edtEmail.getText() != null ? edtEmail.getText().toString().trim() : "";
        String password = edtPassword.getText() != null ? edtPassword.getText().toString().trim() : "";

        tilEmail.setError(null);
        tilPassword.setError(null);

        if (TextUtils.isEmpty(emailOrUsername)) {
            tilEmail.setError("Vui lòng nhập email hoặc username");
            return;
        }
        if (TextUtils.isEmpty(password)) {
            tilPassword.setError("Vui lòng nhập mật khẩu");
            return;
        }

        // Tạo payload login
        User loginUser = new User();
        loginUser.setUsernameOrEmail(emailOrUsername);
        loginUser.setPassword(password);

        // API hiện tại trả về User
        Call<User> call = apiService.login(loginUser);
        call.enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call, @NonNull Response<User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    User user = response.body();

                    // ---- Fallback tên hiển thị (rất quan trọng cho header) ----
                    boolean hasUsername = user.getUsername() != null && !user.getUsername().trim().isEmpty();
                    boolean hasFullName = user.getFull_name() != null && !user.getFull_name().trim().isEmpty();

                    if (!hasUsername && !hasFullName) {
                        // nếu input là email -> lấy phần trước @; nếu là username thì dùng trực tiếp
                        String fallback = emailOrUsername;
                        int at = fallback.indexOf('@');
                        if (at > 0) fallback = fallback.substring(0, at);
                        user.setUsername(fallback);
                    }

                    // Bật cờ + lưu user (token tạm null nếu backend chưa trả)
                    AuthManager.setLoggedIn(Login.this, null, user);

                    Toast.makeText(Login.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                    startActivity(new Intent(Login.this, MainActivity.class));
                    finish();
                } else {
                    String errorMessage = "Sai thông tin đăng nhập.";
                    try {
                        if (response.errorBody() != null) {
                            JSONObject errorObj = new JSONObject(response.errorBody().string());
                            errorMessage = errorObj.optString("message", errorMessage);
                        }
                    } catch (Exception e) {
                        Log.e("LoginError", "Parse error: " + e.getMessage());
                    }
                    Toast.makeText(Login.this, errorMessage, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<User> call, @NonNull Throwable t) {
                Toast.makeText(Login.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
