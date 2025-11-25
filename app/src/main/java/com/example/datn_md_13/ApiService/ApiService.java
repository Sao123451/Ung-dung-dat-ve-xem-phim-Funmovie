package com.example.datn_md_13.ApiService;

import com.example.datn_md_13.Model.BannerDto;
import com.example.datn_md_13.Model.BookingCreateResponse;
import com.example.datn_md_13.Model.BookingQuoteResponse;
import com.example.datn_md_13.Model.BookingRequest;
import com.example.datn_md_13.Model.ConfirmReq;
import com.example.datn_md_13.Model.LoginRequest;
import com.example.datn_md_13.Model.LoginResponse;
import com.example.datn_md_13.Model.Movie;
import com.example.datn_md_13.Model.News;
import com.example.datn_md_13.Model.NewsListResponse;
import com.example.datn_md_13.Model.PaymentInit;
import com.example.datn_md_13.Model.ProductDto;
import com.example.datn_md_13.Model.ProductListRes;
import com.example.datn_md_13.Model.PublicCinemaResponse;
import com.example.datn_md_13.Model.RegisterResponse;
import com.example.datn_md_13.Model.SeatRowGroup;
import com.example.datn_md_13.Model.ShowtimeDetail;
import com.example.datn_md_13.Model.ShowtimeSeatResponse;
import com.example.datn_md_13.Model.ShowtimesByCinemaResponse;
import com.example.datn_md_13.Model.User;
import com.example.datn_md_13.Model.VoucherDto;
import com.example.datn_md_13.Model.VoucherListRes;

import java.util.List;
import java.util.Map;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Part;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    /* ========== Auth ========== */
    @POST("auth/register")
    Call<RegisterResponse> register(@Body Map<String, String> body);
    @POST("auth/register")
    Call<RegisterResponse> registerStep1(@Body Map<String, String> emailOnly);

    @POST("auth/register")
    Call<RegisterResponse> registerStep2(@Body Map<String, String> data);


    // Backend trả { message, token, user }
    @POST("auth/login")
    Call<LoginResponse> login(@Body LoginRequest body);

    @PUT("users/me/change-password")
    Call<ChangePasswordResponse> changeMyPassword(@Body ChangePasswordRequest body);

    class ChangePasswordRequest {
        public String old_password;
        public String new_password;

        public ChangePasswordRequest(String old_password, String new_password) {
            this.old_password = old_password;
            this.new_password = new_password;
        }
    }
    class ChangePasswordResponse {
        public String message;
    }
    class BasicResponse {
        public String message;
        public String step;
        public int expires_in;
    }

    @POST("auth/password/forgot")
    Call<BasicResponse> forgotSendOtp(@Body Map<String, String> body);

    @POST("auth/password/forgot")
    Call<BasicResponse> forgotVerifyOtp(@Body Map<String, String> body);

    @POST("auth/password/forgot")
    Call<BasicResponse> forgotResetPassword(@Body Map<String, String> body);



    /* ========== User profile ========== */

    @GET("users/me")
    Call<User> getUserProfile();

    @PUT("users/me")
    Call<UpdateUserResponse> updateMe(@Body User body);

    @Multipart
    @PUT("users/me")
    Call<UpdateUserResponse> updateMeWithAvatar(
            @Part MultipartBody.Part avatar,
            @Part("full_name") RequestBody fullName,
            @Part("phone") RequestBody phone,
            @Part("birth_date") RequestBody birthDate
    );

    class UpdateUserResponse {
        private String message;
        private User user;

        public String getMessage() {
            return message;
        }

        public User getUser() {
            return user;
        }
    }

    /* ========== News ========== */
    @GET("news/public")
    Call<NewsListResponse> getNews(
            @Query("page") Integer page,
            @Query("limit") Integer limit,
            @Query("q") String searchTerm,
            @Query("tag") String tag
    );

    @GET("news/public/{idOrSlug}")
    Call<News> getNewsDetail(@Path("idOrSlug") String idOrSlug);

    @GET("news/public")
    Call<NewsListResponse> getNewsByCategory(
            @Query("page") Integer page,
            @Query("limit") Integer limit,
            @Query("category") String category
    );


    /* ========== Movies ========== */
    @GET("movies/coming")
    Call<List<Movie>> getComing();

    @GET("movies/now-showing")
    Call<List<Movie>> getNowShowing();

    @GET("movies/archived")
    Call<List<Movie>> getArchived();

    @GET("movies/{id}")
    Call<Movie> getMovieById(@Path("id") String id);

    /* ========== Banners ========== */
    @GET("banners/public/all")
    Call<List<BannerDto>> getAllBanners();

    @GET("banners/{id}/public")
    Call<BannerPublicDetail> getBannerById(@Path("id") String bannerId,
                                           @Query("withLink") boolean withLink);

    class BannerPublicDetail {
        public String link_url;
        public List<String> images;
    }

    /* ========== Cinemas & Showtimes ========== */
    @GET("cinemas/public")
    Call<PublicCinemaResponse> getCinemasPublic(
            @Query("page") Integer page,
            @Query("limit") Integer limit,
            @Query("q") String q,
            @Query("city") String city
    );

    @GET("showtimes/public/by-cinema")
    Call<ShowtimesByCinemaResponse> getShowtimesByCinema(
            @Query("cinema") String cinemaId,
            @Query("date") String yyyyMMdd,
            @Query("type") String type
    );

    @GET("showtimes/{id}")
    Call<ShowtimeDetail> getShowtimeById(@Path("id") String showtimeId);

    /* ========== Seats ========== */
    @GET("seats/public")
    Call<List<SeatRowGroup>> getSeatsByRoom(
            @Query("room") String roomId,
            @Query("mode") String mode // "grid"
    );

    @GET("showtimes/{id}/seats")
    Call<ShowtimeSeatResponse> getSeatsByShowtime(@Path("id") String showtimeId);

    /* ========== Booking (không header: dùng ApiClient.authed(ctx)) ========== */
    @POST("bookings/quote")
    Call<BookingQuoteResponse> quote(@Body BookingRequest req);

    @POST("bookings")
    Call<BookingCreateResponse> createBooking(@Body BookingRequest req);

    @GET("bookings/{id}")
    Call<BookingCreateResponse.Ticket> getBookingById(@Path("id") String id);

    @POST("bookings/{id}/confirm")
    Call<BookingCreateResponse> confirmBooking(@Path("id") String id,
                                               @Body ConfirmReq body);

    /* ========== Booking (bản có header cho tương thích cũ) ========== */
    @POST("bookings")
    Call<BookingCreateResponse> createBooking(@Header("Authorization") String token,
                                              @Body BookingRequest req);

    @GET("bookings/{id}")
    Call<BookingCreateResponse.Ticket> getBookingById(@Header("Authorization") String token,
                                                      @Path("id") String id);

    @POST("bookings/{id}/confirm")
    Call<BookingCreateResponse> confirmBooking(@Header("Authorization") String token,
                                               @Path("id") String id,
                                               @Body ConfirmReq body);

    /* ========== Payments ========== */
    @POST("payments/init")
    Call<PaymentInit.Res> paymentInit(@Body PaymentInit.Req req);

    @POST("payments/init")
    Call<PaymentInit.Res> paymentInit(@Header("Authorization") String token,
                                      @Body PaymentInit.Req req);

    /* ========== Products & Vouchers ========== */
    @GET("products/public")
    Call<ProductListRes> getProducts();

    @GET("vouchers/public")
    Call<VoucherListRes> getVouchers();
}
