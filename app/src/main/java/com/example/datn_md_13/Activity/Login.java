package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
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
        String emailOrUsername = edtEmail.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();

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

        // Sửa ở đây: Tạo User request một cách tường minh
        User loginUser = new User();
        loginUser.setUsernameOrEmail(emailOrUsername);
        loginUser.setPassword(password);

        Call<User> call = apiService.login(loginUser);

        call.enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call, @NonNull Response<User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(Login.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();

                    // TODO: Lưu thông tin người dùng vào SharedPreferences

                    startActivity(new Intent(Login.this, MainActivity.class));
                    finish();
                } else {
                    // Sửa ở đây: Đọc lỗi chi tiết từ server
                    String errorMessage = "Sai thông tin đăng nhập.";
                    try {
                        if (response.errorBody() != null) {
                            JSONObject errorObj = new JSONObject(response.errorBody().string());
                            errorMessage = errorObj.getString("message");
                        }
                    } catch (Exception e) {
                        Log.e("LoginError", "Lỗi phân tích phản hồi lỗi: " + e.getMessage());
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
