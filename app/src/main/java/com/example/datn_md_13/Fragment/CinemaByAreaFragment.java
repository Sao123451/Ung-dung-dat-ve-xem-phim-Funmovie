package com.example.datn_md_13.Fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.datn_md_13.Adapter.CityCinemaAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.Cinema;
import com.example.datn_md_13.Model.PublicCinemaResponse;
import com.example.datn_md_13.R;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.progressindicator.CircularProgressIndicator;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CinemaByAreaFragment extends Fragment {

    private RecyclerView rvCities;
    private CircularProgressIndicator progress;
    private CityCinemaAdapter adapter;
    private ApiService api;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_cinema_by_area, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View v, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(v, savedInstanceState);

        MaterialToolbar bar = v.findViewById(R.id.topAppBar);
        if (bar != null) bar.setTitle("Rạp phim Funmovie");

        rvCities = v.findViewById(R.id.rvCities);
        progress = v.findViewById(R.id.progress);

        rvCities.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvCities.addItemDecoration(new DividerItemDecoration(requireContext(), DividerItemDecoration.VERTICAL));
        rvCities.setHasFixedSize(true);

        adapter = new CityCinemaAdapter(cinema ->
                Toast.makeText(requireContext(), cinema.getName(), Toast.LENGTH_SHORT).show()
        );
        rvCities.setAdapter(adapter);

        api = ApiClient.get().create(ApiService.class);
        loadCinemas();
    }

    private void loadCinemas() {
        progress.setVisibility(View.VISIBLE);
        api.getCinemasPublic(1, 1000, null, null).enqueue(new Callback<PublicCinemaResponse>() {
            @Override public void onResponse(Call<PublicCinemaResponse> call, Response<PublicCinemaResponse> res) {
                progress.setVisibility(View.GONE);
                if (!res.isSuccessful() || res.body() == null) {
                    Toast.makeText(requireContext(), "Lỗi tải dữ liệu", Toast.LENGTH_SHORT).show();
                    return;
                }
                List<Cinema> items = res.body().items == null ? new ArrayList<>() : res.body().items;

                // Gom nhóm theo city
                Map<String, List<Cinema>> grouped = new LinkedHashMap<>();
                for (Cinema c : items) {
                    String key = (c.getCity() == null || c.getCity().isEmpty()) ? "Khác" : c.getCity();
                    grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(c);
                }
                adapter.submit(grouped);
            }

            @Override public void onFailure(Call<PublicCinemaResponse> call, Throwable t) {
                progress.setVisibility(View.GONE);
                Toast.makeText(requireContext(), "Không thể kết nối server", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
