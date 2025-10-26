package com.example.datn_md_13.ApiService;

import com.example.datn_md_13.Model.BannerDto;
import com.example.datn_md_13.Model.Movie;
import java.util.List;
import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {
    // Movies
    @GET("movies/coming")      Call<List<Movie>> getComing();
    @GET("movies/now-showing") Call<List<Movie>> getNowShowing();
    @GET("movies/archived")    Call<List<Movie>> getArchived();
    @GET("movies/{id}")        Call<Movie> getMovieById(@Path("id") String id);

    // Banners
    @GET("banners/public/all")
    Call<List<BannerDto>> getAllBanners();

    @GET("banners/{id}/public")
    Call<BannerPublicDetail> getBannerById(@Path("id") String bannerId,
                                           @Query("withLink") boolean withLink);

    class BannerPublicDetail {
        public String link_url;
        public List<String> images;
    }
}
