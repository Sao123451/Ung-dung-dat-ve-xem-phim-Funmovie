package com.example.datn_md_13.Activity;

import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.R;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ChangePassword extends AppCompatActivity {

    private TextInputEditText etOldPassword, etNewPassword, etConfirmPassword;
    private TextInputLayout layoutOldPass, layoutNewPass, layoutConfirmPass;
    private MaterialButton btnChange;
    private ApiService apiAuthed;
    private final String STRONG_PATTERN =
            "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_change_password);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

        etOldPassword      = findViewById(R.id.etOldPassword);
        etNewPassword      = findViewById(R.id.etNewPassword);
        etConfirmPassword  = findViewById(R.id.etConfirmPassword);

        layoutOldPass      = findViewById(R.id.layoutOldPass);
        layoutNewPass      = findViewById(R.id.layoutNewPass);
        layoutConfirmPass  = findViewById(R.id.layoutConfirmPass);

        btnChange          = findViewById(R.id.btnChangePassword);

        apiAuthed = ApiClient.authed(this).create(ApiService.class);

        btnChange.setOnClickListener(v -> handleChangePassword());

        etNewPassword.addTextChangedListener(passwordWatcher);
    }

    private final TextWatcher passwordWatcher = new TextWatcher() {
        @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
        @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}

        @Override
        public void afterTextChanged(Editable editable) {
            showPasswordStrength(editable.toString().trim());
        }
    };

    private void showPasswordStrength(String pass) {
        int score = 0;

        if (pass.length() >= 8) score++;
        if (pass.matches(".*[A-Z].*")) score++;
        if (pass.matches(".*[a-z].*")) score++;
        if (pass.matches(".*[0-9].*")) score++;
        if (pass.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) score++;

        if (pass.isEmpty()) {
            layoutNewPass.setHelperText("Nhập mật khẩu mới");
            layoutNewPass.setHelperTextColor(ColorStateList.valueOf(Color.GRAY));
            return;
        }

        switch (score) {
            case 0:
            case 1:
            case 2:
                layoutNewPass.setHelperText("Độ mạnh: YẾU");
                layoutNewPass.setHelperTextColor(ColorStateList.valueOf(Color.RED));
                break;

            case 3:
            case 4:
                layoutNewPass.setHelperText("Độ mạnh: TRUNG BÌNH");
                layoutNewPass.setHelperTextColor(ColorStateList.valueOf(Color.parseColor("#FFA500")));
                break;

            case 5:
                layoutNewPass.setHelperText("Độ mạnh: MẠNH");
                layoutNewPass.setHelperTextColor(ColorStateList.valueOf(Color.parseColor("#008000")));
                break;
        }
    }

    private void handleChangePassword() {

        layoutOldPass.setError(null);
        layoutNewPass.setError(null);
        layoutConfirmPass.setError(null);

        String oldPass = getText(etOldPassword);
        String newPass = getText(etNewPassword);
        String confirm = getText(etConfirmPassword);

        boolean valid = true;

        if (oldPass.isEmpty()) {
            layoutOldPass.setError("Bạn chưa nhập mật khẩu cũ");
            layoutOldPass.setErrorIconDrawable(null);
            valid = false;
        }

        if (newPass.isEmpty()) {
            layoutNewPass.setError("Bạn chưa nhập mật khẩu mới");
            layoutNewPass.setErrorIconDrawable(null);
            valid = false;

        } else if (newPass.length() < 8) {  // 👈 BƯỚC 1: kiểm tra độ dài
            layoutNewPass.setError("Mật khẩu phải dài ít nhất 8 ký tự");
            layoutNewPass.setErrorIconDrawable(null);
            valid = false;

        } else if (!newPass.matches(STRONG_PATTERN)) {  // 👈 BƯỚC 2: kiểm tra mạnh
            layoutNewPass.setError("Mật khẩu phải gồm chữ hoa – chữ thường – số – ký tự đặc biệt");
            layoutNewPass.setErrorIconDrawable(null);
            valid = false;
        }

        if (!confirm.equals(newPass)) {
            layoutConfirmPass.setError("Mật khẩu nhập lại không khớp");
            layoutConfirmPass.setErrorIconDrawable(null);
            valid = false;
        } else if (confirm.isEmpty()) {
            layoutOldPass.setError("Bạn chưa nhập mật khẩu mới");
            layoutOldPass.setErrorIconDrawable(null);
            valid = false;
        }

        if (!valid) return;

        ApiService.ChangePasswordRequest body =
                new ApiService.ChangePasswordRequest(oldPass, newPass);

        apiAuthed.changeMyPassword(body).enqueue(new Callback<ApiService.ChangePasswordResponse>() {
            @Override
            public void onResponse(@NonNull Call<ApiService.ChangePasswordResponse> call,
                                   @NonNull Response<ApiService.ChangePasswordResponse> response) {

                if (response.isSuccessful()) {
                  //  toast("Đổi mật khẩu thành công");
                    finish();
                } else {
                    layoutOldPass.setError("Mật khẩu cũ không đúng!");
                }
            }

            @Override
            public void onFailure(@NonNull Call<ApiService.ChangePasswordResponse> call,
                                  @NonNull Throwable t) {
                //toast("Lỗi mạng: " + t.getMessage());
            }
        });
    }

    private String getText(TextInputEditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }

    private void toast(String m) {
        Toast.makeText(this, m, Toast.LENGTH_SHORT).show();
    }
}
