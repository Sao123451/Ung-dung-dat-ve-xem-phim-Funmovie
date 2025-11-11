package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.AuthManager;
import com.example.datn_md_13.MainActivity;
import com.example.datn_md_13.Model.LoginRequest;
import com.example.datn_md_13.Model.LoginResponse;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.progressindicator.CircularProgressIndicator;
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
    private CircularProgressIndicator progress;
    private ApiService api;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Nếu đã đăng nhập thì vào thẳng MainActivity
        if (AuthManager.isLoggedIn(this)) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }

        // Ánh xạ view
        tilEmail = findViewById(R.id.tilEmail);
        edtEmail = findViewById(R.id.edtEmail);
        tilPassword = findViewById(R.id.tilPassword);
        edtPassword = findViewById(R.id.edtPassword);
        btnLogin = findViewById(R.id.btnSignUp);
        tvRegister = findViewById(R.id.tvLogin);
        progress = findViewById(R.id.progress); // 🔹 thêm ProgressIndicator trong layout

        btnLogin.setText("Đăng nhập");
        api = ApiClient.get().create(ApiService.class);

        // Xóa lỗi khi người dùng nhập lại
        addTextWatchers();

        btnLogin.setOnClickListener(v -> {
            if (validateInputs()) handleLogin();
        });

        tvRegister.setOnClickListener(v ->
                startActivity(new Intent(Login.this, Register.class)));
    }

    private boolean validateInputs() {
        String emailOrUsername = getText(edtEmail);
        String password = getText(edtPassword);

        boolean valid = true;

        if (TextUtils.isEmpty(emailOrUsername)) {
            tilEmail.setError("Vui lòng nhập email hoặc tên đăng nhập");
            valid = false;
        } else if (emailOrUsername.length() < 3) {
            tilEmail.setError("Tài khoản không hợp lệ");
            valid = false;
        } else tilEmail.setError(null);

        if (TextUtils.isEmpty(password)) {
            tilPassword.setError("Vui lòng nhập mật khẩu");
            valid = false;
        } else if (password.length() < 6) {
            tilPassword.setError("Mật khẩu tối thiểu 6 ký tự");
            valid = false;
        } else tilPassword.setError(null);

        return valid;
    }

    private void handleLogin() {
        String emailOrUsername = getText(edtEmail);
        String password = getText(edtPassword);

        LoginRequest body = new LoginRequest();
        body.setUsernameOrEmail(emailOrUsername);
        body.setPassword(password);

        showLoading(true);

        api.login(body).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(@NonNull Call<LoginResponse> call, @NonNull Response<LoginResponse> resp) {
                showLoading(false);
                try {
                    if (resp.isSuccessful() && resp.body() != null) {
                        LoginResponse lr = resp.body();
                        String token = lr.getToken();
                        User user = lr.getUser();

                        ensureDisplayName(user, emailOrUsername);
                        AuthManager.setLoggedIn(Login.this, token, user);

                        Toast.makeText(Login.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                        startActivity(new Intent(Login.this, MainActivity.class));
                        finish();
                        return;
                    }

                    String msg = "Sai thông tin đăng nhập.";
                    if (resp.errorBody() != null) {
                        JSONObject obj = new JSONObject(resp.errorBody().string());
                        msg = obj.optString("message", msg);
                    }
                    Toast.makeText(Login.this, msg, Toast.LENGTH_LONG).show();

                } catch (Exception e) {
                    Log.e("Login", "Parse error: " + e.getMessage());
                    Toast.makeText(Login.this, "Lỗi xử lý phản hồi", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<LoginResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(Login.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
     // Hiển thị hoặc ẩn vòng loading
    private void showLoading(boolean show) {
        progress.setVisibility(show ? View.VISIBLE : View.GONE);
        btnLogin.setEnabled(!show);
        edtEmail.setEnabled(!show);
        edtPassword.setEnabled(!show);
    }

    private void addTextWatchers() {
        edtEmail.addTextChangedListener(new SimpleTextWatcher(() -> tilEmail.setError(null)));
        edtPassword.addTextChangedListener(new SimpleTextWatcher(() -> tilPassword.setError(null)));
    }

    private String getText(TextInputEditText edit) {
        return edit.getText() != null ? edit.getText().toString().trim() : "";
    }

    private void ensureDisplayName(User user, String input) {
        if (user == null) return;
        if ((user.getUsername() == null || user.getUsername().isEmpty())
                && (user.getFull_name() == null || user.getFull_name().isEmpty())) {
            String fallback = input;
            int at = fallback.indexOf('@');
            if (at > 0) fallback = fallback.substring(0, at);
            user.setUsername(fallback);
        }
    }

    private static class SimpleTextWatcher implements TextWatcher {
        private final Runnable after;

        SimpleTextWatcher(Runnable after) {
            this.after = after;
        }

        @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
        @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
        @Override public void afterTextChanged(Editable s) { after.run(); }
    }
}
