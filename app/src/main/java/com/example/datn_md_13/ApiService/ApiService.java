package com.example.datn_md_13.ApiService;

import com.example.datn_md_13.Model.BannerDto;
import com.example.datn_md_13.Model.Movie;
import com.example.datn_md_13.Model.PublicCinemaResponse;
import com.example.datn_md_13.Model.SeatRowGroup;
import com.example.datn_md_13.Model.ShowtimeDetail;
import com.example.datn_md_13.Model.ShowtimeSeatResponse;
import com.example.datn_md_13.Model.ShowtimesByCinemaResponse;
import com.example.datn_md_13.Model.User;

import java.util.List;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {
    // Movies
    @GET("movies/coming")      Call<List<Movie>> getComing();
    @GET("movies/now-showing") Call<List<Movie>> getNowShowing();
    @GET("movies/archived")    Call<List<Movie>> getArchived();
    @GET("movies/{id}")        Call<Movie> getMovieById(@Path("id") String id);
    @POST("auth/register")     Call<User> register(@Body User user);
    @POST("auth/login")        Call<User> login(@Body User loginRequest);


    @GET("banners/public/all")
    Call<List<BannerDto>> getAllBanners();

    @GET("banners/{id}/public")
    Call<BannerPublicDetail> getBannerById(@Path("id") String bannerId,
                                           @Query("withLink") boolean withLink);

    class BannerPublicDetail {
        public String link_url;
        public List<String> images;
    }
    @GET("cinemas/public")
    Call<PublicCinemaResponse> getCinemasPublic(
            @Query("page") Integer page,
            @Query("limit") Integer limit,
            @Query("q") String q,
            @Query("city") String city
    );
    @GET("/api/showtimes/public/by-cinema")
    Call<ShowtimesByCinemaResponse> getShowtimesByCinema(
            @Query("cinema") String cinemaId,
            @Query("date")   String yyyyMMdd,
            @Query("type")   String type
    );


    @GET("showtimes/{id}")
    Call<ShowtimeDetail> getShowtimeById(@Path("id") String showtimeId);

    @GET("seats/public")
    Call<List<SeatRowGroup>> getSeatsByRoom(
            @Query("room") String roomId,
            @Query("mode") String mode // "grid"
    );



    @GET("showtimes/{id}/seats")
    Call<ShowtimeSeatResponse> getSeatsByShowtime(@Path("id") String showtimeId);










}
