package com.example.datn_md_13.Activity;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.BookingCreateResponse;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.journeyapps.barcodescanner.BarcodeEncoder;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class TicketDetailActivity extends AppCompatActivity {

    private ApiService api;
    private String ticketId;

    private TextView tvInfo, tvStatus;
    private ImageView imgQR;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_ticket_detail);

        api = ApiClient.get().create(ApiService.class);
        ticketId = getIntent().getStringExtra("ticket_id");

        tvInfo  = findViewById(R.id.tvInfo);
        tvStatus= findViewById(R.id.tvStatus);
        imgQR   = findViewById(R.id.imgQR);

        loadTicket();
    }

    private void loadTicket() {
        String token = AuthManager.getToken(this);
        if (token == null) {
            Toast.makeText(this, "Chưa đăng nhập", Toast.LENGTH_SHORT).show();
            finish(); return;
        }

        api.getBookingById("Bearer " + token, ticketId)
                .enqueue(new Callback<BookingCreateResponse.Ticket>() {
                    @Override public void onResponse(Call<BookingCreateResponse.Ticket> call, Response<BookingCreateResponse.Ticket> res) {
                        if (!res.isSuccessful() || res.body() == null) {
                            Toast.makeText(TicketDetailActivity.this, "Không tải được vé", Toast.LENGTH_SHORT).show();
                            finish(); return;
                        }
                        BookingCreateResponse.Ticket t = res.body();
                        tvInfo.setText("Mã vé: " + t.id + "\nTổng tiền: " + t.total_after + " đ");
                        tvStatus.setText("Trạng thái: " + t.status + " / " + t.payment_status);
                        renderQR("FM|" + t.id); // payload QR
                    }
                    @Override public void onFailure(Call<BookingCreateResponse.Ticket> call, Throwable t) {
                        Toast.makeText(TicketDetailActivity.this, "Lỗi mạng", Toast.LENGTH_SHORT).show();
                        finish();
                    }
                });
    }

    private void renderQR(String payload) {
        try {
            MultiFormatWriter writer = new MultiFormatWriter();
            BarcodeEncoder encoder = new BarcodeEncoder();
            Bitmap bmp = encoder.createBitmap(writer.encode(payload, BarcodeFormat.QR_CODE, 512, 512));
            imgQR.setImageBitmap(bmp);
        } catch (WriterException e) {
            Toast.makeText(this, "Không tạo được QR", Toast.LENGTH_SHORT).show();
        }
    }
}
