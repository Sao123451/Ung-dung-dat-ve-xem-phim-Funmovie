package com.example.datn_md_13.Fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.example.datn_md_13.Activity.NewsDetailActivity;
import com.example.datn_md_13.Adapter.NewsAdapter;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import com.example.datn_md_13.Model.NewsListResponse;
import com.example.datn_md_13.R;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NewsFragment extends Fragment {
    private NewsAdapter adapter;
    private View progress;
    private SwipeRefreshLayout swipe;
    private RecyclerView rv;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {

        View v = inflater.inflate(R.layout.fragment_news, container, false);

        // Find views
        rv = v.findViewById(R.id.rvNews);
        progress = v.findViewById(R.id.progress);
        swipe = v.findViewById(R.id.swipe); // có thể null nếu layout chưa thêm

        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new NewsAdapter();
        rv.setAdapter(adapter);

        adapter.registerAdapterDataObserver(new RecyclerView.AdapterDataObserver() {});

        if (swipe != null) {
            swipe.setOnRefreshListener(this::loadNews);
        }

        loadNews();
        return v;
    }

    private void loadNews() {
        if (progress != null) progress.setVisibility(View.VISIBLE);

        ApiService api = ApiClient.api();
        api.getNews(1, 20, null, null).enqueue(new Callback<NewsListResponse>() {
            @Override
            public void onResponse(@NonNull Call<NewsListResponse> call,
                                   @NonNull Response<NewsListResponse> res) {
                if (!isAdded()) return;
                if (progress != null) progress.setVisibility(View.GONE);
                if (swipe != null) swipe.setRefreshing(false);

                if (res.isSuccessful() && res.body() != null) {
                    adapter.submit(res.body().items);
                }
            }

            @Override
            public void onFailure(@NonNull Call<NewsListResponse> call, @NonNull Throwable t) {
                if (!isAdded()) return;
                if (progress != null) progress.setVisibility(View.GONE);
                if (swipe != null) swipe.setRefreshing(false);
            }
        });
    }
}
