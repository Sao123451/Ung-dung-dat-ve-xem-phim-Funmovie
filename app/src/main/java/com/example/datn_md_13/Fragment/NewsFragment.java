package com.example.datn_md_13.Fragment;

import android.graphics.Color;
import android.os.Bundle;
import android.view.*;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.*;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.example.datn_md_13.Adapter.NewsAdapter;
import com.example.datn_md_13.ApiService.*;
import com.example.datn_md_13.Model.NewsListResponse;
import com.example.datn_md_13.R;

import retrofit2.*;

public class NewsFragment extends Fragment {

    private NewsAdapter adapter;
    private View progress;
    private SwipeRefreshLayout swipe;
    private RecyclerView rv;

    private TextView tabPromo, tabNews;
    private String currentCategory = "promotion";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {

        View v = inflater.inflate(R.layout.fragment_news, container, false);

        rv = v.findViewById(R.id.rvNews);
        progress = v.findViewById(R.id.progress);
        swipe = v.findViewById(R.id.swipe);

        tabPromo = v.findViewById(R.id.tvTabPromo);
        tabNews = v.findViewById(R.id.tvTabNews);

        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new NewsAdapter();
        rv.setAdapter(adapter);

        tabPromo.setOnClickListener(view -> {
            currentCategory = "promotion";
            highlightTabs(tabPromo, tabNews);
            loadNews();
        });

        tabNews.setOnClickListener(view -> {
            currentCategory = "news";
            highlightTabs(tabNews, tabPromo);
            loadNews();
        });

        highlightTabs(tabPromo, tabNews);

        swipe.setOnRefreshListener(this::loadNews);

        loadNews();
        return v;
    }

    private void highlightTabs(TextView active, TextView inactive) {
        active.setTextColor(Color.parseColor("#FF6F00"));
        inactive.setTextColor(Color.parseColor("#9E9E9E"));
    }

    private void loadNews() {
        progress.setVisibility(View.VISIBLE);

        ApiService api = ApiClient.api();
        api.getNewsByCategory(1, 20, currentCategory)
                .enqueue(new Callback<NewsListResponse>() {
                    @Override
                    public void onResponse(@NonNull Call<NewsListResponse> call,
                                           @NonNull Response<NewsListResponse> res) {
                        if (!isAdded()) return;

                        progress.setVisibility(View.GONE);
                        swipe.setRefreshing(false);

                        if (res.isSuccessful() && res.body() != null) {
                            adapter.submit(res.body().items);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<NewsListResponse> call,
                                          @NonNull Throwable t) {
                        if (!isAdded()) return;
                        progress.setVisibility(View.GONE);
                        swipe.setRefreshing(false);
                    }
                });
    }
}
