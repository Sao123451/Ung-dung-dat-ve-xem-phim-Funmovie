package com.example.datn_md_13.Fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Activity.activity_add_voucher;
import com.example.datn_md_13.Adapter.VoucherAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.UserVoucherItem;
import com.example.datn_md_13.Model.VoucherListRes;
import com.example.datn_md_13.R;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class VoucherFragment extends Fragment {

    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private LinearLayout emptyLayout;

    private VoucherAdapter adapter;
    private final List<UserVoucherItem> voucherList = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {

        View view = inflater.inflate(R.layout.fragment_voucher, container, false);

        recyclerView = view.findViewById(R.id.rvVouchers);
        progressBar = view.findViewById(R.id.progressVoucher);
        emptyLayout = view.findViewById(R.id.emptyLayout);

        ImageView btnAdd = view.findViewById(R.id.btnAddVoucher);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new VoucherAdapter(getContext(), voucherList);
        recyclerView.setAdapter(adapter);

        btnAdd.setOnClickListener(v ->
                startActivity(new Intent(getContext(), activity_add_voucher.class))
        );

        loadMyVouchers();
        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        loadMyVouchers();
    }

    private void loadMyVouchers() {
        progressBar.setVisibility(View.VISIBLE);

        ApiService api = ApiClient.authed(getContext()).create(ApiService.class);

        api.getMyVouchers()
                .enqueue(new Callback<VoucherListRes>() {
                    @Override
                    public void onResponse(Call<VoucherListRes> call, Response<VoucherListRes> response) {
                        progressBar.setVisibility(View.GONE);

                        if (!response.isSuccessful() || response.body() == null) {
                           // Toast.makeText(getContext(), "Lỗi tải voucher!", Toast.LENGTH_SHORT).show();
                            return;
                        }

                        voucherList.clear();
                        voucherList.addAll(response.body().items);
                        adapter.notifyDataSetChanged();

                        emptyLayout.setVisibility(
                                voucherList.isEmpty() ? View.VISIBLE : View.GONE
                        );
                    }

                    @Override
                    public void onFailure(Call<VoucherListRes> call, Throwable t) {
                        progressBar.setVisibility(View.GONE);
                        Toast.makeText(getContext(), "Lỗi kết nối server!", Toast.LENGTH_SHORT).show();
                    }
                });
    }
}
