package com.example.datn_md_13.Activity;

import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.R;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ChangePassword extends AppCompatActivity {

    private TextInputEditText etOldPassword, etNewPassword, etConfirmPassword;
    private MaterialButton btnChange;
    private ApiService apiAuthed;

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
        btnChange          = findViewById(R.id.btnChangePassword);

        apiAuthed = ApiClient.authed(this).create(ApiService.class);

        btnChange.setOnClickListener(v -> handleChangePassword());
    }

    private void handleChangePassword() {
        String oldPass = getText(etOldPassword);
        String newPass = getText(etNewPassword);
        String confirm = getText(etConfirmPassword);

        if (oldPass.isEmpty() || newPass.isEmpty() || confirm.isEmpty()) {
            toast("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (!newPass.equals(confirm)) {
            toast("Mật khẩu nhập lại không khớp");
            return;
        }

        if (newPass.length() < 6) {
            toast("Mật khẩu mới phải ít nhất 6 ký tự");
            return;
        }

        ApiService.ChangePasswordRequest body =
                new ApiService.ChangePasswordRequest(oldPass, newPass);

        apiAuthed.changeMyPassword(body).enqueue(new Callback<ApiService.ChangePasswordResponse>() {
            @Override
            public void onResponse(@NonNull Call<ApiService.ChangePasswordResponse> call,
                                   @NonNull Response<ApiService.ChangePasswordResponse> response) {
                if (response.isSuccessful()) {
                    toast("Đổi mật khẩu thành công");
                    finish();
                } else {
                    toast("Đổi mật khẩu thất bại (kiểm tra mật khẩu cũ)");
                }
            }

            @Override
            public void onFailure(@NonNull Call<ApiService.ChangePasswordResponse> call,
                                  @NonNull Throwable t) {
                toast("Lỗi mạng: " + t.getMessage());
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
