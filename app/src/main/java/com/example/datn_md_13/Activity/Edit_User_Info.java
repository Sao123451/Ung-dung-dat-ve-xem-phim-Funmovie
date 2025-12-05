package com.example.datn_md_13.Activity;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
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
import com.google.android.material.textfield.TextInputLayout;

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

    // TextInputLayout cha (lấy từ editText) để setError
    private TextInputLayout tilFullName, tilPhone, tilBirthDate;

    private ApiService apiService;
    private Uri selectedAvatarUri = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_user_info);

        anhXa();
        setupToolbar();

        apiService = ApiClient.authed(this).create(ApiService.class);

        // ====== FIX "KHÔNG BỊ ĐẨY LAYOUT" ======
        // Luôn chừa sẵn 1 dòng trống cho error (helperText),
        // Khi setError thì chỉ thay nội dung, chiều cao không đổi => UI không nhảy.
        reserveErrorSpace(tilFullName);
        reserveErrorSpace(tilPhone);
        reserveErrorSpace(tilBirthDate);

        // Disable keyboard – dùng DatePicker
        etBirthDate.setFocusable(false);
        etBirthDate.setFocusableInTouchMode(false);
        etBirthDate.setOnClickListener(v -> showDatePicker());

        ivAvatar.setOnClickListener(v -> pickImage());
        btnSave.setOnClickListener(v -> updateUserInfo());

        getUserInfo();
    }

    private void anhXa() {
        toolbar    = findViewById(R.id.toolbar);
        etFullName = findViewById(R.id.etFullName);
        etPhone    = findViewById(R.id.etPhone);
        etBirthDate= findViewById(R.id.etBirthDate);
        btnSave    = findViewById(R.id.btnSave);
        ivAvatar   = findViewById(R.id.ivAvatar);

        // Lấy TextInputLayout cha của từng EditText
        tilFullName  = (TextInputLayout) etFullName.getParent().getParent();
        tilPhone     = (TextInputLayout) etPhone.getParent().getParent();
        tilBirthDate = (TextInputLayout) etBirthDate.getParent().getParent();
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }

    private void getUserInfo() {
        apiService.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(@NonNull Call<User> call,
                                   @NonNull Response<User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    User u = response.body();
                    etFullName.setText(u.getFull_name() != null ? u.getFull_name() : "");
                    etPhone.setText(u.getPhone() != null ? u.getPhone() : "");
                    etBirthDate.setText(u.getBirthDate() != null ? u.getBirthDate() : "");
                    loadAvatar(u.getAvatar(), u.getFull_name());
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

    private void pickImage() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(Intent.createChooser(intent, "Chọn ảnh đại diện"), REQ_PICK_IMAGE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PICK_IMAGE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            selectedAvatarUri = uri;
            ivAvatar.setImageURI(uri);
        }
    }

    // ======================================================
    // FIX KHÔNG ĐẨY LAYOUT: chừa sẵn 1 dòng error space
    // ======================================================
    private void reserveErrorSpace(TextInputLayout til) {
        if (til == null) return;
        til.setHelperTextEnabled(true);
        til.setHelperText(" "); // 1 space -> không nhìn thấy nhưng giữ chiều cao cố định
        til.setErrorIconDrawable(null);
    }

    private void showFieldError(TextInputLayout til, String msg) {
        if (til == null) return;
        til.setErrorEnabled(true);
        til.setError(msg);
        til.setErrorIconDrawable(null);
    }

    private void clearFieldError(TextInputLayout til) {
        if (til == null) return;
        til.setError(null);
        til.setErrorEnabled(false);
        // giữ helperText " " để không đổi chiều cao
        til.setHelperTextEnabled(true);
        til.setHelperText(" ");
    }

    // ======================================================
    //                   UPDATE + VALIDATE
    // ======================================================
    private void updateUserInfo() {

        String fullName = safeText(etFullName);
        String phone = safeText(etPhone);
        String birthDate = safeText(etBirthDate);

        clearFieldError(tilFullName);
        clearFieldError(tilPhone);
        clearFieldError(tilBirthDate);

        boolean hasError = false;

        // FULL NAME
        if (fullName.isEmpty()) {
            showFieldError(tilFullName, "Họ tên không được để trống");
            hasError = true;
        } else if (fullName.length() < 3) {
            showFieldError(tilFullName, "Họ tên tối thiểu 3 ký tự");
            hasError = true;
        }

        // PHONE
        if (phone.isEmpty()) {
            showFieldError(tilPhone, "Vui lòng nhập số điện thoại");
            hasError = true;
        } else if (!phone.matches("^0[3|5|7|8|9][0-9]{8}$")) {
            showFieldError(tilPhone, "Số điện thoại không hợp lệ");
            hasError = true;
        }

        // BIRTHDAY
        // BIRTHDAY
        if (!birthDate.isEmpty()) {
            try {
                String[] parts = birthDate.split("-");
                int y = Integer.parseInt(parts[0]);
                int m = Integer.parseInt(parts[1]) - 1;
                int d = Integer.parseInt(parts[2]);

                Calendar selected = Calendar.getInstance();
                selected.set(y, m, d);

                Calendar today = Calendar.getInstance();
                Calendar min = Calendar.getInstance();
                min.add(Calendar.YEAR, -10);

                if (selected.after(today)) {
                    showFieldError(tilBirthDate, "Ngày sinh không thể ở tương lai");
                    hasError = true;
                } else if (selected.after(min)) {
                    showFieldError(tilBirthDate, "Bạn phải từ 10 tuổi trở lên");
                    hasError = true;
                }

            } catch (Exception e) {
                showFieldError(tilBirthDate, "Định dạng ngày sai (yyyy-MM-dd)");
                hasError = true;
            }
        }


        if (hasError) return;

        // ================================================
        // UPDATE WITHOUT AVATAR
        // ================================================
        if (selectedAvatarUri == null) {
            User body = new User();
            body.setFull_name(fullName);
            body.setPhone(phone);
            body.setBirthDate(birthDate);

            apiService.updateMe(body).enqueue(new Callback<ApiService.UpdateUserResponse>() {
                @Override
                public void onResponse(@NonNull Call<ApiService.UpdateUserResponse> call,
                                       @NonNull Response<ApiService.UpdateUserResponse> res) {
                    if (res.isSuccessful()) {
                        //Toast.makeText(Edit_User_Info.this,"Cập nhật thành công", Toast.LENGTH_SHORT).show();
                        finish();
                    } else {
                        //Toast.makeText(Edit_User_Info.this, "Cập nhật thất bại", Toast.LENGTH_SHORT).show();
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

        // ================================================
        // UPDATE WITH AVATAR
        // ================================================
        try {
            MultipartBody.Part avatarPart = createAvatarPart(selectedAvatarUri);
            RequestBody fullNamePart  = RequestBody.create(fullName, MediaType.parse("text/plain"));
            RequestBody phonePart     = RequestBody.create(phone, MediaType.parse("text/plain"));
            RequestBody birthDatePart = RequestBody.create(birthDate, MediaType.parse("text/plain"));

            apiService.updateMeWithAvatar(
                    avatarPart, fullNamePart, phonePart, birthDatePart
            ).enqueue(new Callback<ApiService.UpdateUserResponse>() {
                @Override
                public void onResponse(@NonNull Call<ApiService.UpdateUserResponse> call,
                                       @NonNull Response<ApiService.UpdateUserResponse> res) {
                    if (res.isSuccessful()) {
                        //Toast.makeText(Edit_User_Info.this,
                                //"Cập nhật thành công", Toast.LENGTH_SHORT).show();
                        finish();
                    } else {
                       // Toast.makeText(Edit_User_Info.this,
                               // "Cập nhật thất bại", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(@NonNull Call<ApiService.UpdateUserResponse> call,
                                      @NonNull Throwable t) {
                   // Toast.makeText(Edit_User_Info.this,
                           // "Lỗi kết nối!", Toast.LENGTH_SHORT).show();
                }
            });

        } catch (Exception e) {
            //Toast.makeText(this,
                   // "Không thể đọc ảnh!", Toast.LENGTH_SHORT).show();
        }
    }

    private void showDatePicker() {
        final Calendar calendar = Calendar.getInstance();
        int year  = calendar.get(Calendar.YEAR);
        int month = calendar.get(Calendar.MONTH);
        int day   = calendar.get(Calendar.DAY_OF_MONTH);

        DatePickerDialog dialog = new DatePickerDialog(this, (view, y, m, d) -> {
            Calendar sel = Calendar.getInstance();
            sel.set(y, m, d);

            Calendar today = Calendar.getInstance();
            Calendar min = Calendar.getInstance();
            min.add(Calendar.YEAR, -10);

            if (sel.after(today)) {
                showFieldError(tilBirthDate, "Ngày sinh không hợp lệ");
                return;
            }
            if (sel.after(min)) {
                showFieldError(tilBirthDate, "Phải từ 10 tuổi trở lên");
                return;
            }

            clearFieldError(tilBirthDate);

            String date = String.format("%04d-%02d-%02d", y, (m + 1), d);
            etBirthDate.setText(date);

        }, year, month, day);

        dialog.getDatePicker().setMaxDate(System.currentTimeMillis());
        dialog.show();
    }

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

        RequestBody reqFile = RequestBody.create(buffer.toByteArray(), MediaType.parse(mime));
        return MultipartBody.Part.createFormData("avatar", "avatar.jpg", reqFile);
    }

    private void loadAvatar(String avatarUrl, String fullName) {

        if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {

            if (!avatarUrl.startsWith("http")) {
                avatarUrl = ApiClient.absolutePublicUrl(avatarUrl);
            }

            Glide.with(this)
                    .load(avatarUrl)
                    .placeholder(R.drawable.bg_avatar_circle)
                    .error(R.drawable.bg_avatar_circle)
                    .into(ivAvatar);

            return;
        }

        // ======= Avatar CHỮ =======
        String initial = getInitial(fullName);
        Bitmap bmp = createInitialAvatar(initial, 72); // 72dp cho avatar to
        ivAvatar.setImageBitmap(bmp);
    }

    private String getInitial(String name) {
        if (name == null || name.trim().isEmpty()) return "U";
        return String.valueOf(Character.toUpperCase(name.trim().charAt(0)));
    }

    private Bitmap createInitialAvatar(String text, int sizeDp) {
        int sizePx = Math.round(
                TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP,
                        sizeDp,
                        getResources().getDisplayMetrics()
                )
        );

        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        float radius = sizePx / 2f;

        // Background nền xám nhạt (#ECECEC)
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(Color.parseColor("#ECECEC"));
        canvas.drawCircle(radius, radius, radius, bg);

        // Viền mỏng màu xám (#CDCDCD)
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(sizePx * 0.04f);
        stroke.setColor(Color.parseColor("#CDCDCD"));
        canvas.drawCircle(radius, radius, radius - stroke.getStrokeWidth(), stroke);

        // Text màu xanh (#2979FF)
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.parseColor("#2979FF"));
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(sizePx * 0.55f);

        Rect bounds = new Rect();
        textPaint.getTextBounds(text, 0, text.length(), bounds);

        canvas.drawText(
                text,
                radius,
                radius - bounds.exactCenterY(),
                textPaint
        );

        return bmp;
    }


    private String safeText(TextInputEditText edt) {
        return edt.getText() != null ? edt.getText().toString().trim() : "";
    }
}
