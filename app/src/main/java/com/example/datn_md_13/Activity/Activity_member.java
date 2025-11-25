package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.AuthManager;
import com.example.datn_md_13.MainActivity;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.R;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.progressindicator.LinearProgressIndicator;
import com.journeyapps.barcodescanner.BarcodeEncoder;
import com.google.zxing.BarcodeFormat;

import java.text.NumberFormat;
import java.util.Locale;

import de.hdodenhof.circleimageview.CircleImageView;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Activity_member extends AppCompatActivity {

    private TextView tvInitial, tvMemberName, tvLevel,
            tvTotalSpent, tvRewardPoints, tvVipHint,
            tvSpentLabel, tvVipTargetLabel,
            tvMembershipCardLabel, tvMembershipCard;

    private LinearProgressIndicator progressVip;
    private LinearLayout rowAccountInfor, rowChangePassword, rowMembership;
    private MaterialButton btnLogout;
    private CircleImageView ivAvatar;
    private ImageView imgBarcode;

    private ApiService apiService;

    private static final int VIP_TARGET = 3_000_000; // 3 triệu

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_member);

        // Toolbar
        MaterialToolbar topAppBar = findViewById(R.id.topAppBar);
        topAppBar.setNavigationOnClickListener(v -> finish());

        // Bind views
        tvInitial                = findViewById(R.id.tvInitial);
        tvMemberName             = findViewById(R.id.tvMemberName);
        tvLevel                  = findViewById(R.id.tvLevel);
        tvTotalSpent             = findViewById(R.id.tvTotalSpent);
        tvRewardPoints           = findViewById(R.id.tvRewardPoints);
        tvVipHint                = findViewById(R.id.tvVipHint);
        tvSpentLabel             = findViewById(R.id.tvSpentLabel);
        tvVipTargetLabel         = findViewById(R.id.tvVipTargetLabel);
        tvMembershipCardLabel    = findViewById(R.id.tvMembershipCardLabel);
        tvMembershipCard         = findViewById(R.id.tvMembershipCard);
        progressVip              = findViewById(R.id.progressVip);
        btnLogout                = findViewById(R.id.btnLogout);
        rowAccountInfor          = findViewById(R.id.row_account_info);
        rowChangePassword        = findViewById(R.id.row_change_password);
        ivAvatar                 = findViewById(R.id.ivAvatar);
        imgBarcode               = findViewById(R.id.imgBarcode);
        rowMembership            = findViewById(R.id.row_thanhVien);

        apiService = ApiClient.authed(this).create(ApiService.class);

        // Logout
        btnLogout.setOnClickListener(v -> {
            AuthManager.logout(this);
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            finishAffinity();
        });

        // Đi tới màn thông tin tài khoản
        rowAccountInfor.setOnClickListener(v ->
                startActivity(new Intent(this, User_Information.class))
        );

        // Đi tới màn đổi mật khẩu
        rowChangePassword.setOnClickListener(v ->
                startActivity(new Intent(this, ChangePassword.class))
        );

        rowMembership.setOnClickListener(v ->
                startActivity(new Intent(this, MemberCardActivity.class))
        );



        tvLevel.setText("MEMBER");

        // Chỉ demo VIP progress (có thể thay bằng dữ liệu thật)
        setupVipDemo();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadMemberProfile();
    }

    /** Lấy thông tin thành viên từ API /users/me */
    private void loadMemberProfile() {
        apiService.getUserProfile().enqueue(new Callback<User>() {
            @Override
            public void onResponse(Call<User> call, Response<User> res) {
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(Activity_member.this,
                            "Không thể tải thông tin thành viên", Toast.LENGTH_SHORT).show();
                    return;
                }

                User user = res.body();

                // ====== HIỂN THỊ TÊN ======
                String displayName = getDisplayName(user);
                tvMemberName.setText(displayName);
                tvInitial.setText(getInitial(displayName));

                // ====== ẢNH ĐẠI DIỆN ======
                String avatar = user.getAvatar();
                if (avatar != null && !avatar.trim().isEmpty()) {
                    if (!avatar.startsWith("http")) {
                        avatar = ApiClient.absolutePublicUrl(avatar);
                    }
                    ivAvatar.setVisibility(View.VISIBLE);
                    tvInitial.setVisibility(View.GONE);

                    Glide.with(Activity_member.this)
                            .load(avatar)
                            .placeholder(R.drawable.bg_avatar_circle)
                            .error(R.drawable.bg_avatar_circle)
                            .into(ivAvatar);
                } else {
                    ivAvatar.setVisibility(View.GONE);
                    tvInitial.setVisibility(View.VISIBLE);
                }

                // ====== THẺ THÀNH VIÊN ======
                String card = user.getMembership_card();
                if (card != null && !card.isEmpty()) {
                    tvMembershipCard.setText(card);
                    generateBarcode(card);
                } else {
                    tvMembershipCard.setText("Chưa cấp");
                }

            }

            @Override
            public void onFailure(Call<User> call, Throwable t) {
                Toast.makeText(Activity_member.this,
                        "Lỗi kết nối server", Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** Tạo barcode CODE_128 */
    private void generateBarcode(String data) {
        try {
            BarcodeEncoder barcodeEncoder = new BarcodeEncoder();
            android.graphics.Bitmap bitmap = barcodeEncoder.encodeBitmap(
                    data,
                    BarcodeFormat.CODE_128,
                    800,
                    180
            );
            imgBarcode.setImageBitmap(bitmap);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /** Demo tiến độ VIP — sau này thay bằng dữ liệu thật từ API */
    private void setupVipDemo() {
        int totalSpent = 1_839_000;
        int rewardPts  = 0;
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi","VN"));

        tvTotalSpent.setText(nf.format(totalSpent) + " đ");
        tvRewardPoints.setText(nf.format(rewardPts));

        int percent = Math.max(0, Math.min(100, (int)(totalSpent * 100f / VIP_TARGET)));
        progressVip.setProgressCompat(percent, true);

        tvVipHint.setText("Bạn cần tích lũy thêm " +
                nf.format(Math.max(VIP_TARGET - totalSpent, 0)) +
                " đ để thăng hạng VIP");

        tvSpentLabel.setText(nf.format(totalSpent) + " đ");
        tvVipTargetLabel.setText(nf.format(VIP_TARGET) + " đ");
    }

    /** Lấy tên hiển thị: full_name → username → email */
    private String getDisplayName(User u) {
        if (u == null) return "Bạn";

        String name = null;
        if (u.getFull_name() != null && !u.getFull_name().trim().isEmpty()) {
            name = u.getFull_name().trim();
        } else if (u.getUsername() != null && !u.getUsername().trim().isEmpty()) {
            name = u.getUsername().trim();
        } else if (u.getEmail() != null && !u.getEmail().trim().isEmpty()) {
            String e = u.getEmail();
            int at = e.indexOf('@');
            name = at > 0 ? e.substring(0, at) : e;
        }

        if (name == null || name.isEmpty()) return "Bạn";

        String[] parts = name.toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) {
                sb.append(Character.toUpperCase(p.charAt(0)))
                        .append(p.substring(1))
                        .append(" ");
            }
        }
        return sb.toString().trim();
    }

    private String getInitial(String name) {
        if (name == null || name.isEmpty()) return "N";
        return String.valueOf(Character.toUpperCase(name.charAt(0)));
    }
}
