package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.RegisterResponse;
import com.example.datn_md_13.R;
import com.google.android.material.progressindicator.CircularProgressIndicator;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Register extends AppCompatActivity {

    TextInputLayout tilFullname, tilUsername, tilEmail, tilPassword, tilConfirmPassword;
    TextInputEditText edtFullname, edtUsername, edtEmail, edtPassword, edtConfirmPassword;
    TextView tvLogin;
    Button btnRegister;
    CircularProgressIndicator progress;
    ApiService api;

    private Handler otpHandler = new Handler();

    // REGEX mật khẩu mạnh
    private static final String PASSWORD_REGEX =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        api = ApiClient.get().create(ApiService.class);

        initViews();
        attachClearErrorListeners();
        checkOtpLock();
        startOtpWatcher();

        btnRegister.setOnClickListener(v -> onRegisterClick());
    }

    private void attachClearErrorListeners() {

        TextWatcher clearError = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                tilFullname.setError(null);
                tilUsername.setError(null);
                tilEmail.setError(null);
                tilPassword.setError(null);
                tilConfirmPassword.setError(null);
            }
        };

        edtFullname.addTextChangedListener(clearError);
        edtUsername.addTextChangedListener(clearError);
        edtEmail.addTextChangedListener(clearError);
        edtPassword.addTextChangedListener(clearError);
        edtConfirmPassword.addTextChangedListener(clearError);
    }

    private void onRegisterClick() {

        String currentEmail = edtEmail.getText().toString().trim();

        long expireAt = getSharedPreferences("otp", MODE_PRIVATE)
                .getLong("otp_expire", 0);

        String lockedEmail = getSharedPreferences("otp", MODE_PRIVATE)
                .getString("otp_email", null);

        long now = System.currentTimeMillis();

        if (lockedEmail != null &&
                lockedEmail.equalsIgnoreCase(currentEmail) &&
                expireAt > now) {

            new AlertDialog.Builder(this)
                    .setTitle("OTP chưa hết hiệu lực")
                    .setMessage("Mã OTP trước đó vẫn còn hiệu lực cho email "
                            + lockedEmail + ". Vui lòng chờ hết thời gian để đăng ký lại.")
                    .setPositiveButton("OK", null)
                    .show();
            return;
        }

        if (!validateInputs()) return;
        attemptRegister();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkOtpLock();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        otpHandler.removeCallbacksAndMessages(null);
    }

    private void initViews() {
        tilFullname = findViewById(R.id.tilFullname);
        tilUsername = findViewById(R.id.tilUsername);
        tilEmail = findViewById(R.id.tilEmail);
        tilPassword = findViewById(R.id.tilPassword);
        tilConfirmPassword = findViewById(R.id.tilConfirmPassword);

        edtFullname = findViewById(R.id.edtFullname);
        edtUsername = findViewById(R.id.edtUsername);
        edtEmail = findViewById(R.id.edtEmail);
        edtPassword = findViewById(R.id.edtPassword);
        edtConfirmPassword = findViewById(R.id.edtConfirmPassword);

        tvLogin = findViewById(R.id.tvLogin);
        btnRegister = findViewById(R.id.btnSignUp);
        progress = findViewById(R.id.progress);

        tvLogin.setOnClickListener(v -> {
            startActivity(new Intent(Register.this, Login.class));
            finish();
        });
    }

    private void startOtpWatcher() {
        otpHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                checkOtpLock();
                otpHandler.postDelayed(this, 1000);
            }
        }, 1000);
    }

    private void checkOtpLock() {
        long expireAt = getSharedPreferences("otp", MODE_PRIVATE)
                .getLong("otp_expire", 0);

        String lockedEmail = getSharedPreferences("otp", MODE_PRIVATE)
                .getString("otp_email", null);

        String currentEmail = edtEmail.getText().toString().trim();
        long now = System.currentTimeMillis();

        if (lockedEmail != null && !lockedEmail.equalsIgnoreCase(currentEmail)) {
            btnRegister.setEnabled(true);
            btnRegister.setText("Đăng ký");
            return;
        }

        if (expireAt > now) {
            long remain = (expireAt - now) / 1000;
            btnRegister.setEnabled(true);
            btnRegister.setText("Đăng ký (" + remain + "s)");
        } else {
            btnRegister.setEnabled(true);
            btnRegister.setText("Đăng ký");
        }
    }

    private boolean validateInputs() {
        boolean isValid = true;

        tilFullname.setError(null);
        tilUsername.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirmPassword.setError(null);

        String fullname = edtFullname.getText().toString().trim();
        String username = edtUsername.getText().toString().trim();
        String email = edtEmail.getText().toString().trim();
        String pw = edtPassword.getText().toString().trim();
        String cpw = edtConfirmPassword.getText().toString().trim();


        // FULLNAME
        if (fullname.isEmpty()) {
            tilFullname.setError("Vui lòng nhập họ tên");
            tilFullname.setErrorIconDrawable(null);
            isValid = false;
        } else if (fullname.length() < 3) {
            tilFullname.setError("Họ tên quá ngắn");
            tilFullname.setErrorIconDrawable(null);
            isValid = false;
        }


        // USERNAME
        if (username.isEmpty()) {
            tilUsername.setError("Vui lòng nhập tên đăng nhập");
            tilUsername.setErrorIconDrawable(null);
            isValid = false;

        } else if (username.contains(" ")) {
            tilUsername.setError("Không được chứa khoảng trắng");
            tilUsername.setErrorIconDrawable(null);
            isValid = false;

        } else if (username.length() < 4) {
            tilUsername.setError("Tên đăng nhập tối thiểu 4 ký tự");
            tilUsername.setErrorIconDrawable(null);
            isValid = false;
        }


        // EMAIL (có yêu cầu @gmail.com)
        if (email.isEmpty()) {
            tilEmail.setError("Vui lòng nhập email");
            tilEmail.setErrorIconDrawable(null);
            isValid = false;

        } else if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            tilEmail.setError("Email không hợp lệ");
            tilEmail.setErrorIconDrawable(null);
            isValid = false;

        } else if (!email.toLowerCase().endsWith("@gmail.com")) {
            tilEmail.setError("Email không đúng định dạng");
            tilEmail.setErrorIconDrawable(null);
            isValid = false;
        }


        // PASSWORD mạnh
        if (pw.isEmpty()) {
            tilPassword.setError("Vui lòng nhập mật khẩu");
            tilPassword.setErrorIconDrawable(null);
            isValid = false;

        } else if (pw.length() < 8) {
            tilPassword.setError("Mật khẩu phải có ít nhất 8 ký tự");
            tilPassword.setErrorIconDrawable(null);
            isValid = false;

        } else if (
                !pw.matches(".*[A-Z].*") ||     // thiếu chữ hoa
                        !pw.matches(".*[a-z].*") ||     // thiếu chữ thường
                        !pw.matches(".*\\d.*") ||       // thiếu số
                        !pw.matches(".*[@$!%*?&].*")    // thiếu ký tự đặc biệt
        ) {
            tilPassword.setError("Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
            tilPassword.setErrorIconDrawable(null);
            isValid = false;
        }


        // CONFIRM PASSWORD
        if (cpw.isEmpty()) {
            tilConfirmPassword.setError("Vui lòng nhập lại mật khẩu");
            tilConfirmPassword.setErrorIconDrawable(null);
            isValid = false;

        } else if (!cpw.equals(pw)) {
            tilConfirmPassword.setError("Mật khẩu không khớp");
            tilConfirmPassword.setErrorIconDrawable(null);
            isValid = false;
        }

        return isValid;
    }


    private void attemptRegister() {

        tilFullname.setError(null);
        tilUsername.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirmPassword.setError(null);

        String email = edtEmail.getText().toString().trim();
        String username = edtUsername.getText().toString().trim();
        String fullname = edtFullname.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("username", username);
        body.put("full_name", fullname);
        body.put("password", password);

        showLoading(true);

        api.register(body).enqueue(new Callback<RegisterResponse>() {
            @Override
            public void onResponse(Call<RegisterResponse> call, Response<RegisterResponse> res) {
                showLoading(false);

                if (!res.isSuccessful()) {

                    try {
                        String err = res.errorBody().string();

                        if (err.contains("Email đã được sử dụng") || err.contains("email")) {
                            tilEmail.setError("Email đã được sử dụng");
                            tilEmail.setErrorIconDrawable(null);
                        }

                        if (err.contains("Username đã được sử dụng") || err.contains("username")) {
                            tilUsername.setError("Tên đăng nhập đã tồn tại");
                            tilUsername.setErrorIconDrawable(null);
                        }

                    } catch (Exception e) {}

                    return;
                }

                RegisterResponse data = res.body();

                if ("verify_otp".equals(data.getStep())) {

                    long expireAt = System.currentTimeMillis() + 60_000;
                    getSharedPreferences("otp", MODE_PRIVATE)
                            .edit()
                            .putLong("otp_expire", expireAt)
                            .putString("otp_email", email)
                            .apply();

                    Intent i = new Intent(Register.this, OtpVerifyActivity.class);
                    i.putExtra("email", email);
                    i.putExtra("username", username);
                    i.putExtra("fullname", fullname);
                    i.putExtra("password", password);
                    startActivity(i);

                } else {
                    //Toast.makeText(Register.this, data.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<RegisterResponse> call, Throwable t) {
                showLoading(false);
                //Toast.makeText(Register.this, "Không thể kết nối server", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showLoading(boolean show) {
        progress.setVisibility(show ? View.VISIBLE : View.GONE);
        btnRegister.setEnabled(!show);
    }
}
