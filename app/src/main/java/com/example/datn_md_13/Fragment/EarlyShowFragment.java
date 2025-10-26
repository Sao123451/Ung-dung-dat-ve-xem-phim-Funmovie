package com.example.datn_md_13.Fragment;

import android.content.Intent;
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

import com.example.datn_md_13.BookingByMovieActivity;
import com.example.datn_md_13.R;
import com.example.datn_md_13.Adapter.MovieListAdapter;
import com.example.datn_md_13.Model.Movie;
import com.example.datn_md_13.ApiService.ApiClient;
import com.example.datn_md_13.ApiService.ApiService;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EarlyShowFragment extends Fragment {
    private MovieListAdapter adapter;
    private ProgressBar progress;
    private TextView tvEmpty;

    @Nullable
    @Override public View onCreateView(@NonNull LayoutInflater inflater,
                                       @Nullable ViewGroup container,
                                       @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_early_show, container, false);

        RecyclerView rv = v.findViewById(R.id.rvEarly); // <— id trong XML
        progress = v.findViewById(R.id.progress);
        tvEmpty  = v.findViewById(R.id.tvEmpty);

        rv.setLayoutManager(new GridLayoutManager(getContext(), 2));
        // tạm dùng cùng layout với "đang chiếu"
        adapter = new MovieListAdapter(R.layout.item_movie2, "early");
        rv.setAdapter(adapter);

//        // ⬇️ Click item → mở màn đặt vé theo phim
//        adapter.setOnItemClickListener(movie -> {
//            if (getContext() == null || movie == null) return;
//            Intent i = new Intent(getContext(), BookingByMovieActivity.class);
//            i.putExtra("movie_id", movie.id); // truyền id phim
//            startActivity(i);
//        });
//test
        load();
        return v;
    }

    private void load() {
        progress.setVisibility(View.VISIBLE);
        tvEmpty.setVisibility(View.GONE);

        ApiService api = ApiClient.get().create(ApiService.class);
        api.getArchived().enqueue(new Callback<List<Movie>>() {
            @Override public void onResponse(Call<List<Movie>> c, Response<List<Movie>> r) {
                progress.setVisibility(View.GONE);
                if (r.isSuccessful() && r.body()!=null && !r.body().isEmpty()) {
                    adapter.submit(r.body());
                } else { tvEmpty.setText("Không có suất chiếu sớm"); tvEmpty.setVisibility(View.VISIBLE); }
            }
            @Override public void onFailure(Call<List<Movie>> c, Throwable t) {
                progress.setVisibility(View.GONE);
                tvEmpty.setText("Lỗi tải dữ liệu: " + t.getMessage());
                tvEmpty.setVisibility(View.VISIBLE);
            }
        });
    }
}
