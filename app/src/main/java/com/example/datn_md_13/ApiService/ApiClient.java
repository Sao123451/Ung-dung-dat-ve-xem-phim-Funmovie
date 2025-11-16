package com.example.datn_md_13.ApiService;

import android.content.Context;

import com.example.datn_md_13.AuthManager;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.util.concurrent.TimeUnit;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {

    private static Retrofit retrofit;        // không cần token
    private static Retrofit retrofitAuthed;  // tự chèn token

    private static final String BASE_URL = "http://10.0.2.2:3000/api/";

    public static final String PUBLIC_BASE = "http://10.0.2.2:3000/";

    /** Retrofit thường (public APIs) */
    public static Retrofit get() {
        if (retrofit == null) {
            Gson gson = new GsonBuilder()
                    .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                    .create();

            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build();
        }
        return retrofit;
    }

    /** Retrofit tự động chèn Bearer <token> */
    public static Retrofit authed(Context ctx) {
        if (retrofitAuthed == null) {

            Interceptor auth = chain -> {
                Request req = chain.request();
                String token = AuthManager.getToken(ctx);
                if (token != null && !token.isEmpty()) {
                    req = req.newBuilder()
                            .addHeader("Authorization", "Bearer " + token)
                            .build();
                }
                return chain.proceed(req);
            };

            OkHttpClient ok = new OkHttpClient.Builder()
                    .addInterceptor(auth)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .build();

            Gson gson = new GsonBuilder()
                    .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                    .create();

            retrofitAuthed = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .client(ok)
                    .build();
        }
        return retrofitAuthed;
    }

    // ✅ BỔ SUNG: tạo sẵn ApiService (tùy chọn, không bắt buộc dùng)
    public static ApiService api() {
        return get().create(ApiService.class);
    }

    // ✅ BỔ SUNG: helper chuyển relative path -> absolute URL
    public static String absolutePublicUrl(String path) {
        if (path == null || path.isEmpty()) return null;
        if (path.startsWith("http")) return path;
        String p = path.startsWith("/") ? path.substring(1) : path;
        return PUBLIC_BASE + p;
    }


}
