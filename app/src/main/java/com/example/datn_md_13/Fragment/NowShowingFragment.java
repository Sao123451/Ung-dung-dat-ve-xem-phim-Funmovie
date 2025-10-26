package com.example.datn_md_13.Fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.example.datn_md_13.R;
import com.example.datn_md_13.Adapter.MovieListAdapter;
import com.example.datn_md_13.Model.Movie;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NowShowingFragment extends Fragment {
    private MovieListAdapter adapter;
    private ProgressBar progress;
    private TextView tvEmpty;

    @Nullable
    @Override public View onCreateView(@NonNull LayoutInflater inflater,
                                       @Nullable ViewGroup container,
                                       @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_now_showing, container, false);

        RecyclerView rv = v.findViewById(R.id.rvNow);   // <— đảm bảo id này trùng trong XML
        progress = v.findViewById(R.id.progress);
        tvEmpty  = v.findViewById(R.id.tvEmpty);

        rv.setLayoutManager(new GridLayoutManager(getContext(), 2));
        adapter = new MovieListAdapter(R.layout.item_movie2, "now");
        rv.setAdapter(adapter);

        load();
        return v;
    }

    private void load() {
        progress.setVisibility(View.VISIBLE);
        tvEmpty.setVisibility(View.GONE);

        ApiService api = ApiClient.get().create(ApiService.class);
        api.getNowShowing().enqueue(new Callback<List<Movie>>() {
            @Override
            public void onResponse(@NonNull Call<List<Movie>> call,
                                   @NonNull Response<List<Movie>> response) {
                progress.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    adapter.submit(response.body());
                    tvEmpty.setVisibility(View.GONE);
                } else {

                    tvEmpty.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Movie>> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);

                tvEmpty.setVisibility(View.VISIBLE);
            }
        });
    }
}
