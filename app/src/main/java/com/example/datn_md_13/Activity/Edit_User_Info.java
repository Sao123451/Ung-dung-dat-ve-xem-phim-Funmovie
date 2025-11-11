package com.example.datn_md_13.Activity;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.textfield.TextInputEditText;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Calendar;

import de.hdodenhof.circleimageview.CircleImageView;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Edit_User_Info extends AppCompatActivity {

    private static final int REQ_PICK_IMAGE = 1001;

    private TextInputEditText etFullName, etPhone, etBirthDate;
    private Button btnSave;
    private Toolbar toolbar;
    private CircleImageView ivAvatar;

    private ApiService apiService;
    private Uri selectedAvatarUri = null; // ảnh mới nếu user chọn

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_user_info);

        anhXa();
        setupToolbar();

        // Dùng authed client: Interceptor tự chèn Authorization: Bearer <token>
        apiService = ApiClient.authed(this).create(ApiService.class);

        etBirthDate.setOnClickListener(v -> showDatePicker());
        ivAvatar.setOnClickListener(v -> pickImage());   // chọn avatar mới
        btnSave.setOnClickListener(v -> updateUserInfo());

        // Load thông tin + avatar hiện tại
        getUserInfo();
    }

    private void anhXa() {
        toolbar    = findViewById(R.id.toolbar);
        etFullName = findViewById(R.id.etFullName);
        etPhone    = findViewById(R.id.etPhone);
        etBirthDate= findViewById(R.id.etBirthDate);
        btnSave    = findViewById(R.id.btnSave);
        ivAvatar   = findViewById(R.id.ivAvatar);
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }

    /** Lấy thông tin user + avatar hiện tại để hiển thị trên form */
    private void getUserInfo() {
        apiService.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call,
                                   @NonNull Response<User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    User user = response.body();

                    etFullName.setText(user.getFull_name() != null ? user.getFull_name() : "");
                    etPhone.setText(user.getPhone() != null ? user.getPhone() : "");
                    etBirthDate.setText(user.getBirthDate() != null ? user.getBirthDate() : "");

                    loadAvatar(user.getAvatar());
                } else {
                    Toast.makeText(Edit_User_Info.this,
                            "Không thể tải thông tin!", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<User> call,
                                  @NonNull Throwable t) {
                Toast.makeText(Edit_User_Info.this,
                        "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** Mở gallery chọn ảnh */
    private void pickImage() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(
                Intent.createChooser(intent, "Chọn ảnh đại diện"),
                REQ_PICK_IMAGE
        );
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode,
                                    @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PICK_IMAGE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                selectedAvatarUri = uri;
                ivAvatar.setImageURI(uri); // preview ảnh mới
            }
        }
    }

    /** Cập nhật thông tin + (nếu có) avatar mới */
    private void updateUserInfo() {
        String fullName = safeText(etFullName);
        String phone = safeText(etPhone);
        String birthDate = safeText(etBirthDate);

        // Không chọn avatar mới → cập nhật JSON thường
        if (selectedAvatarUri == null) {
            User body = new User();
            body.setFull_name(fullName);
            body.setPhone(phone);
            body.setBirthDate(birthDate);

            apiService.updateMe(body).enqueue(new Callback<ApiService.UpdateUserResponse>() {
                @Override
                public void onResponse(@NonNull Call<ApiService.UpdateUserResponse> call,
                                       @NonNull Response<ApiService.UpdateUserResponse> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        Toast.makeText(Edit_User_Info.this,
                                "Cập nhật thành công!", Toast.LENGTH_SHORT).show();
                        finish();
                    } else {
                        Toast.makeText(Edit_User_Info.this,
                                "Cập nhật thất bại!", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<ApiService.UpdateUserResponse> call,
                                      @NonNull Throwable t) {
                    Toast.makeText(Edit_User_Info.this,
                            "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
                }
            });
            return;
        }

        // Có chọn avatar mới → gửi multipart
        try {
            MultipartBody.Part avatarPart = createAvatarPart(selectedAvatarUri);

            RequestBody fullNamePart  = RequestBody.create(fullName,
                    MediaType.parse("text/plain"));
            RequestBody phonePart     = RequestBody.create(phone,
                    MediaType.parse("text/plain"));
            RequestBody birthDatePart = RequestBody.create(birthDate,
                    MediaType.parse("text/plain"));

            apiService.updateMeWithAvatar(
                    avatarPart, fullNamePart, phonePart, birthDatePart
            ).enqueue(new Callback<ApiService.UpdateUserResponse>() {
                @Override
                public void onResponse(@NonNull Call<ApiService.UpdateUserResponse> call,
                                       @NonNull Response<ApiService.UpdateUserResponse> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        Toast.makeText(Edit_User_Info.this,
                                "Cập nhật thành công!", Toast.LENGTH_SHORT).show();
                        finish();
                    } else {
                        Toast.makeText(Edit_User_Info.this,
                                "Cập nhật thất bại!", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<ApiService.UpdateUserResponse> call,
                                      @NonNull Throwable t) {
                    Toast.makeText(Edit_User_Info.this,
                            "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this,
                    "Không thể đọc file ảnh!", Toast.LENGTH_SHORT).show();
        }
    }

    /** Tạo MultipartBody.Part từ Uri ảnh đã chọn */
    private MultipartBody.Part createAvatarPart(Uri uri) throws Exception {
        String mime = getContentResolver().getType(uri);
        if (mime == null) mime = "image/*";

        InputStream is = getContentResolver().openInputStream(uri);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[4096];
        int n;
        while ((n = is.read(data)) != -1) {
            buffer.write(data, 0, n);
        }
        is.close();

        RequestBody reqFile =
                RequestBody.create(buffer.toByteArray(), MediaType.parse(mime));
        // Tên field "avatar" phải trùng upload.single('avatar')
        return MultipartBody.Part.createFormData("avatar",
                "avatar.jpg", reqFile);
    }

    /** Giống User_Information */
    private void loadAvatar(String avatarUrl) {
        if (avatarUrl != null && !avatarUrl.isEmpty()) {
            if (!avatarUrl.startsWith("http")) {
                avatarUrl = ApiClient.absolutePublicUrl(avatarUrl);
            }
            Glide.with(this)
                    .load(avatarUrl)
                    .placeholder(R.drawable.bg_avatar_circle)
                    .error(R.drawable.bg_avatar_circle)
                    .into(ivAvatar);
        } else {
            ivAvatar.setImageResource(R.drawable.bg_avatar_circle);
        }
    }

    private String safeText(TextInputEditText edt) {
        return edt.getText() != null
                ? edt.getText().toString().trim()
                : "";
    }

    private void showDatePicker() {
        final Calendar calendar = Calendar.getInstance();
        int year  = calendar.get(Calendar.YEAR);
        int month = calendar.get(Calendar.MONTH);
        int day   = calendar.get(Calendar.DAY_OF_MONTH);

        new DatePickerDialog(this, (view, y, m, d) -> {
            String date = String.format("%04d-%02d-%02d", y, (m + 1), d);
            etBirthDate.setText(date);
        }, year, month, day).show();
    }
}
