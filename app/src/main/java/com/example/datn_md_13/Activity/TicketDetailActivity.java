package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.MainActivity;
import com.example.datn_md_13.Model.QRResponse;
import com.example.datn_md_13.Model.TicketDetailResponse;
import com.example.datn_md_13.R;

import java.text.NumberFormat;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class TicketDetailActivity extends AppCompatActivity {

    private ImageView imgPoster, imgQr;
    private TextView tvCode, tvMovieName, tvShowInfo, tvSeats, tvCombos, tvPayment, tvTotal;
    private Button btnConfirm;

    private ApiService api;
    private final NumberFormat nf = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

    private String ticketId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ticket_detail);

        // Chặn BACK
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Không làm gì => chặn back
            }
        });
        // Dùng client có token
        api = ApiClient.authed(this).create(ApiService.class);

        initUI();

        ticketId = getIntent().getStringExtra("ticket_id");
        if (ticketId == null || ticketId.isEmpty()) {
            Toast.makeText(this, "Không tìm thấy mã vé!", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        loadTicket(ticketId);

        // Nút xác nhận → về trang chủ
        btnConfirm.setOnClickListener(v -> {
            Intent i = new Intent(TicketDetailActivity.this, MainActivity.class);
            // TODO: nếu Activity trang chủ của bạn tên khác thì đổi MainActivity.class
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            finish();
        });
    }

    private void initUI() {
        imgPoster   = findViewById(R.id.imgPoster);
        imgQr       = findViewById(R.id.imgQr);
        tvCode      = findViewById(R.id.tvCode);       // "Mã vé: xxxx"
        tvMovieName = findViewById(R.id.tvMovieName);
        tvShowInfo  = findViewById(R.id.tvShowInfo);
        tvSeats     = findViewById(R.id.tvSeats);
        tvCombos    = findViewById(R.id.tvCombos);
        tvPayment   = findViewById(R.id.tvPayment);
        tvTotal     = findViewById(R.id.tvTotal);
        btnConfirm  = findViewById(R.id.btnConfirm);

        imgQr.setVisibility(View.GONE);
    }

    private void loadTicket(String id) {
        api.getTicketDetail(id).enqueue(new Callback<TicketDetailResponse>() {
            @Override
            public void onResponse(Call<TicketDetailResponse> call, Response<TicketDetailResponse> res) {
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(TicketDetailActivity.this, "Không tải được thông tin vé!", Toast.LENGTH_SHORT).show();
                    return;
                }

                TicketDetailResponse t = res.body();

                // CHỈ CHO HIỆN NẾU ĐÃ THANH TOÁN
                if (!"paid".equalsIgnoreCase(t.payment_status)) {
                    Toast.makeText(TicketDetailActivity.this,
                            "Vé chưa thanh toán hoặc đã hủy!", Toast.LENGTH_LONG).show();
                    finish();
                    return;
                }

                // MÃ VÉ
                tvCode.setText("Mã vé: " + t.reservation_code);

                // Poster
                if (t.showtime != null && t.showtime.movie != null) {
                    Glide.with(TicketDetailActivity.this)
                            .load(t.showtime.movie.poster)
                            .into(imgPoster);

                    tvMovieName.setText(t.showtime.movie.title);
                }

                // Thông tin suất chiếu
                if (t.showtime != null) {
                    String cinemaName = t.showtime.cinema != null ? t.showtime.cinema.name : "";
                    String roomName   = t.showtime.room != null ? t.showtime.room.name : "";
                    String startTime  = t.showtime.start_time != null ? formatDate(t.showtime.start_time) : "";

                    tvShowInfo.setText(
                            cinemaName + " • " + roomName + "\n" + startTime
                    );
                }

                // Ghế
                StringBuilder s = new StringBuilder();
                if (t.seats != null && !t.seats.isEmpty()) {
                    for (int i = 0; i < t.seats.size(); i++) {
                        TicketDetailResponse.SeatItem seat = t.seats.get(i);
                        s.append(seat.row).append(seat.number);
                        if (i < t.seats.size() - 1) s.append(", ");
                    }
                }
                tvSeats.setText("Ghế: " + s);

                // Combo
                if (t.combos == null || t.combos.isEmpty()) {
                    tvCombos.setText("Combo: Không có");
                } else {
                    StringBuilder c = new StringBuilder("Combo:\n");
                    for (TicketDetailResponse.ComboItem cb : t.combos) {
                        c.append("- ")
                                .append(cb.name)
                                .append(" x")
                                .append(cb.qty)
                                .append("\n");
                    }
                    tvCombos.setText(c.toString());
                }

                // Map phương thức thanh toán
                String methodLabel;
                if ("vnpay".equalsIgnoreCase(t.payment_method)) {
                    methodLabel = "VNPay";
                } else if ("cash".equalsIgnoreCase(t.payment_method)) {
                    methodLabel = "Thanh toán tại quầy";
                } else {
                    methodLabel = "unknown";
                }

                // Map trạng thái thanh toán
                String statusLabel;
                if ("paid".equalsIgnoreCase(t.payment_status)) {
                    statusLabel = "Đã thanh toán";
                } else if ("pending".equalsIgnoreCase(t.payment_status)) {
                    statusLabel = "Đang chờ thanh toán";
                } else {
                    statusLabel = t.payment_status;
                }

                tvPayment.setText("Phương thức: " + methodLabel +
                        "\nTrạng thái: " + statusLabel);

                // Tổng tiền
                tvTotal.setText("Tổng tiền: " + nf.format(t.total_after) + " đ");

                // Load QR nếu đã thanh toán
                loadQr(id);
            }

            @Override
            public void onFailure(Call<TicketDetailResponse> call, Throwable t) {
                Toast.makeText(TicketDetailActivity.this,
                        "Lỗi mạng khi tải vé!", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadQr(String id) {
        api.getTicketQR(id).enqueue(new Callback<QRResponse>() {
            @Override
            public void onResponse(Call<QRResponse> call, Response<QRResponse> res) {
                if (!res.isSuccessful() || res.body() == null || res.body().qr_data == null) return;

                String base64 = res.body().qr_data.replace("data:image/png;base64,", "");
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);

                imgQr.setImageBitmap(bmp);
                imgQr.setVisibility(View.VISIBLE);
            }

            @Override
            public void onFailure(Call<QRResponse> call, Throwable t) { }
        });
    }

    private String formatDate(String iso) {
        // "2025-11-22T17:00:00.000Z" -> "2025-11-22 17:00"
        try {
            return iso.replace("T", " ").substring(0, 16);
        } catch (Exception e) {
            return iso;
        }
    }




}
