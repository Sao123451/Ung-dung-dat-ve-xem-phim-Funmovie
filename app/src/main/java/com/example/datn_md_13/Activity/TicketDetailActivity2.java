package com.example.datn_md_13.Activity;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Base64;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.QRResponse;
import com.example.datn_md_13.Model.TicketDetailResponse;
import com.example.datn_md_13.R;
import com.google.android.material.appbar.MaterialToolbar;

import java.text.NumberFormat;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class TicketDetailActivity2 extends AppCompatActivity {

    private ImageView imgPoster, imgQr;
    private TextView tvCode, tvMovieName, tvShowInfo, tvSeats, tvCombos, tvPayment, tvTotal;

    private ApiService api;
    private final NumberFormat nf = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
    private String ticketId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ticket_detail2);

        // Toolbar
        MaterialToolbar toolbar = findViewById(R.id.topAppBar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Chi tiết vé");
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        api = ApiClient.authed(this).create(ApiService.class);
        initUI();

        ticketId = getIntent().getStringExtra("ticket_id");

        // Đồng bộ tên phim + rạp từ Intent
        String movieTitle = getIntent().getStringExtra("movie_title");
        String cinemaName = getIntent().getStringExtra("cinema_name");

        if (movieTitle != null && !movieTitle.isEmpty()) tvMovieName.setText(movieTitle);
        if (cinemaName != null && !cinemaName.isEmpty()) tvShowInfo.setText(cinemaName);

        if (ticketId == null || ticketId.isEmpty()) {
            Toast.makeText(this, "Không tìm thấy mã vé!", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        loadTicket(ticketId);
    }

    private void initUI() {
        imgPoster = findViewById(R.id.imgPoster);
        imgQr = findViewById(R.id.imgQr);
        tvCode = findViewById(R.id.tvCode);
        tvMovieName = findViewById(R.id.tvMovieName);
        tvShowInfo = findViewById(R.id.tvShowInfo);
        tvSeats = findViewById(R.id.tvSeats);
        tvCombos = findViewById(R.id.tvCombos);
        tvPayment = findViewById(R.id.tvPayment);
        tvTotal = findViewById(R.id.tvTotal);
        imgQr.setVisibility(ImageView.GONE);
    }

    private void loadTicket(String id) {
        api.getTicketDetail(id).enqueue(new Callback<TicketDetailResponse>() {
            @Override
            public void onResponse(Call<TicketDetailResponse> call, Response<TicketDetailResponse> res) {
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(TicketDetailActivity2.this, "Không tải được thông tin vé!", Toast.LENGTH_SHORT).show();
                    return;
                }

                TicketDetailResponse t = res.body();

                if (!"paid".equalsIgnoreCase(t.payment_status)) {
                    Toast.makeText(TicketDetailActivity2.this,
                            "Vé chưa thanh toán hoặc đã hủy!", Toast.LENGTH_LONG).show();
                    finish();
                    return;
                }

                tvCode.setText("Mã vé: " + t.reservation_code);

                if (t.showtime != null && t.showtime.movie != null) {
                    Glide.with(TicketDetailActivity2.this)
                            .load(t.showtime.movie.poster)
                            .into(imgPoster);

                    // Nếu Intent chưa truyền movieTitle thì cập nhật
                    if (tvMovieName.getText().toString().isEmpty())
                        tvMovieName.setText(t.showtime.movie.title);
                }

                if (t.showtime != null) {
                    String cinemaName = t.showtime.cinema != null ? t.showtime.cinema.name : "";
                    String roomName = t.showtime.room != null ? t.showtime.room.name : "";
                    String startTime = t.showtime.start_time != null ? t.showtime.start_time.replace("T", " ").substring(0, 16) : "";

                    if (tvShowInfo.getText().toString().isEmpty())
                        tvShowInfo.setText(cinemaName + " • " + roomName + "\n" + startTime);
                }

                StringBuilder s = new StringBuilder();
                if (t.seats != null && !t.seats.isEmpty()) {
                    for (int i = 0; i < t.seats.size(); i++) {
                        TicketDetailResponse.SeatItem seat = t.seats.get(i);
                        s.append(seat.row).append(seat.number);
                        if (i < t.seats.size() - 1) s.append(", ");
                    }
                }
                tvSeats.setText("Ghế: " + s);

                if (t.combos == null || t.combos.isEmpty()) {
                    tvCombos.setText("Combo: Không có");
                } else {
                    StringBuilder c = new StringBuilder("Combo:\n");
                    for (TicketDetailResponse.ComboItem cb : t.combos) {
                        c.append("- ").append(cb.name).append(" x").append(cb.qty).append("\n");
                    }
                    tvCombos.setText(c.toString());
                }

                String methodLabel = "unknown";
                if ("vnpay".equalsIgnoreCase(t.payment_method)) methodLabel = "VNPay";
                else if ("cash".equalsIgnoreCase(t.payment_method)) methodLabel = "Thanh toán tại quầy";

                String statusLabel = t.payment_status.equalsIgnoreCase("paid") ? "Đã thanh toán" :
                        t.payment_status.equalsIgnoreCase("pending") ? "Đang chờ thanh toán" : t.payment_status;

                tvPayment.setText("Phương thức: " + methodLabel + "\nTrạng thái: " + statusLabel);
                tvTotal.setText("Tổng tiền: " + nf.format(t.total_after) + " đ");

                loadQr(id);
            }

            @Override
            public void onFailure(Call<TicketDetailResponse> call, Throwable t) {
                Toast.makeText(TicketDetailActivity2.this, "Lỗi mạng khi tải vé!", Toast.LENGTH_SHORT).show();
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
                imgQr.setVisibility(ImageView.VISIBLE);
            }

            @Override
            public void onFailure(Call<QRResponse> call, Throwable t) { }
        });
    }
}
