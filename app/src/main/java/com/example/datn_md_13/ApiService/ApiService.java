package com.example.datn_md_13.ApiService;

import com.example.datn_md_13.Model.Movie;
import java.util.List;
import retrofit2.Call;
import retrofit2.http.GET;

public interface ApiService {
    @GET("movies/coming")      Call<List<Movie>> getComing();
    @GET("movies/now-showing") Call<List<Movie>> getNowShowing();
    @GET("movies/archived")    Call<List<Movie>> getArchived();
}
