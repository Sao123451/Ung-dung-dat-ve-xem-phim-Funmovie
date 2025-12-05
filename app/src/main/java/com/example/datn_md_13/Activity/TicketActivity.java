package com.example.datn_md_13.Activity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.TicketAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Ticket;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class TicketActivity extends AppCompatActivity {

    private RecyclerView rvHistory;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ticket);

        // ===== Toolbar =====
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> onBackPressed());

        // ===== RecyclerView =====
        rvHistory = findViewById(R.id.rvHistory);
        rvHistory.setLayoutManager(new LinearLayoutManager(this));

        // ===== API =====
        apiService = ApiClient.authed(this).create(ApiService.class);

        loadHistory();
    }

    private void loadHistory() {
        apiService.getMyTickets().enqueue(new Callback<List<Ticket>>() {
            @Override
            public void onResponse(Call<List<Ticket>> call, Response<List<Ticket>> res) {
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(TicketActivity.this, "Lỗi tải lịch sử vé", Toast.LENGTH_SHORT).show();
                    return;
                }

                List<Ticket> list = res.body();
                List<Ticket> paidList = new ArrayList<>();

                // Lọc vé đã thanh toán
                for (Ticket t : list) {
                    if ("paid".equalsIgnoreCase(t.payment_status)) {
                        paidList.add(t);
                    }
                }

                // Adapter
                TicketAdapter adapter = new TicketAdapter(
                        TicketActivity.this,
                        paidList,
                        ticket -> {
                            Intent i = new Intent(TicketActivity.this, TicketDetailActivity2.class);
                            i.putExtra("ticket_id", ticket._id);
                            startActivity(i);
                        }
                );

                rvHistory.setAdapter(adapter);
            }

            @Override
            public void onFailure(Call<List<Ticket>> call, Throwable t) {
                Toast.makeText(TicketActivity.this, "Lỗi kết nối server", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
