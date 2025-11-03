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
import com.example.datn_md_13.Model.LoginRequest;
import com.example.datn_md_13.Model.LoginResponse;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.google.gson.Gson;

import org.json.JSONObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Login extends AppCompatActivity {

    private TextInputLayout tilEmail, tilPassword;
    private TextInputEditText edtEmail, edtPassword;
    private Button btnLogin;
    private TextView tvRegister;
    private ApiService api;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        if (AuthManager.isLoggedIn(this)) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }

        tilEmail = findViewById(R.id.tilEmail);
        edtEmail = findViewById(R.id.edtEmail);
        tilPassword = findViewById(R.id.tilPassword);
        edtPassword = findViewById(R.id.edtPassword);
        btnLogin = findViewById(R.id.btnSignUp);   // dùng lại ID cũ
        tvRegister = findViewById(R.id.tvLogin);   // dùng lại ID cũ

        btnLogin.setText("Đăng nhập");
        api = ApiClient.get().create(ApiService.class);

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

        // ✅ Dùng LoginRequest thay cho JsonObject
        LoginRequest body = new LoginRequest();
        body.setUsernameOrEmail(emailOrUsername);
        body.setPassword(password);

        Call<LoginResponse> call = api.login(body);
        call.enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(@NonNull Call<LoginResponse> call, @NonNull Response<LoginResponse> resp) {
                try {
                    if (resp.isSuccessful() && resp.body() != null) {
                        // Chuẩn: { message, token, user }
                        LoginResponse lr = resp.body();
                        String token = lr.getToken();          // có thể null nếu backend chưa cấp
                        User user = lr.getUser();

                        ensureDisplayName(user, emailOrUsername);
                        AuthManager.setLoggedIn(Login.this, token, user);

                        Toast.makeText(Login.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                        startActivity(new Intent(Login.this, MainActivity.class));
                        finish();
                        return;
                    }

                    // ---- Fallback: nếu server trả thẳng User (legacy) qua errorBody ----
                    String raw = resp.errorBody() != null ? resp.errorBody().string() : null;
                    if (raw != null && raw.startsWith("{")) {
                        try {
                            User maybeUser = new Gson().fromJson(raw, User.class);
                            if (maybeUser != null && (notEmpty(maybeUser.getUsername()) || notEmpty(maybeUser.getEmail()))) {
                                ensureDisplayName(maybeUser, emailOrUsername);
                                AuthManager.setLoggedIn(Login.this, null, maybeUser); // chưa có token
                                Toast.makeText(Login.this, "Đăng nhập (legacy) thành công!", Toast.LENGTH_SHORT).show();
                                startActivity(new Intent(Login.this, MainActivity.class));
                                finish();
                                return;
                            }
                        } catch (Exception ignore) {}
                    }

                    // Thông điệp lỗi
                    String msg = "Sai thông tin đăng nhập.";
                    try {
                        if (resp.errorBody() != null) {
                            JSONObject obj = new JSONObject(resp.errorBody().string());
                            msg = obj.optString("message", msg);
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(Login.this, msg, Toast.LENGTH_LONG).show();

                } catch (Exception e) {
                    Log.e("Login", "Parse error: " + e.getMessage());
                    Toast.makeText(Login.this, "Lỗi xử lý phản hồi", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<LoginResponse> call, @NonNull Throwable t) {
                Toast.makeText(Login.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void ensureDisplayName(User user, String input) {
        if (user == null) return;
        boolean hasUsername = notEmpty(user.getUsername());
        boolean hasFullName = notEmpty(user.getFull_name());
        if (!hasUsername && !hasFullName) {
            String fallback = input;
            int at = fallback.indexOf('@');
            if (at > 0) fallback = fallback.substring(0, at);
            user.setUsername(fallback);
        }
    }

    private boolean notEmpty(String s) { return s != null && !s.trim().isEmpty(); }
}
