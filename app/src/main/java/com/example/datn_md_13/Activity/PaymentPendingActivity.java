package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.BookingCreateResponse;
import com.example.datn_md_13.R;
import com.example.datn_md_13.auth.AuthManager;

import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PaymentPendingActivity extends AppCompatActivity {

    private ApiService api;
    private String ticketId;
    private int holdMinutes;

    private TextView tvCountdown, tvStatus;

    private CountDownTimer timer;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_payment_pending);

        api = ApiClient.get().create(ApiService.class);
        ticketId = getIntent().getStringExtra("ticket_id");
        holdMinutes = getIntent().getIntExtra("hold_minutes", 15);

        tvCountdown = findViewById(R.id.tvCountdown);
        tvStatus    = findViewById(R.id.tvStatus);

        startCountDown();
        pollNow(); // gọi ngay lần đầu
    }

    private void startCountDown() {
        long total = holdMinutes * 60_000L;
        timer = new CountDownTimer(total, 1000) {
            @Override public void onTick(long ms) {
                long sec = ms / 1000;
                long m = sec / 60;
                long s = sec % 60;
                tvCountdown.setText(String.format(Locale.getDefault(), "%02d:%02d", m, s));
                // poll nhẹ mỗi 3s
                if (sec % 3 == 0) pollNow();
            }
            @Override public void onFinish() {
                tvCountdown.setText("00:00");
                tvStatus.setText("Hết thời gian giữ ghế");
                Toast.makeText(PaymentPendingActivity.this, "Hết thời gian giữ ghế", Toast.LENGTH_LONG).show();
                finish();
            }
        }.start();
    }

    private void pollNow() {
        String token = AuthManager.getToken(this);
        if (token == null) return;

        api.getBookingById("Bearer " + token, ticketId).enqueue(new Callback<BookingCreateResponse.Ticket>() {
            @Override public void onResponse(Call<BookingCreateResponse.Ticket> call, Response<BookingCreateResponse.Ticket> res) {
                if (!res.isSuccessful() || res.body() == null) return;
                BookingCreateResponse.Ticket t = res.body();
                tvStatus.setText("Trạng thái: " + t.status + " / " + t.payment_status);

                if ("paid".equalsIgnoreCase(t.status)) {
                    if (timer != null) timer.cancel();
                    // mở màn vé
                    Intent i = new Intent(PaymentPendingActivity.this, TicketDetailActivity.class);
                    i.putExtra("ticket_id", ticketId);
                    startActivity(i);
                    finish();
                }
            }
            @Override public void onFailure(Call<BookingCreateResponse.Ticket> call, Throwable t) {
                // bỏ qua lần lỗi
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (timer != null) timer.cancel();
    }
}
