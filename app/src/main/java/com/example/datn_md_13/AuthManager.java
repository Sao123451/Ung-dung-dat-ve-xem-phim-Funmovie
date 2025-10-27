package com.example.datn_md_13.auth;

import android.content.Context;
import android.content.SharedPreferences;

import com.example.datn_md_13.Model.User;
import com.google.gson.Gson;

public final class AuthManager {
    private static final String PREF = "auth_pref";
    private static final String KEY_FLAG  = "is_logged_in";
    private static final String KEY_TOKEN = "token";  // để trống nếu login chưa trả token
    private static final String KEY_USER  = "user";

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static void setLoggedIn(Context c, String token, User user) {
        sp(c).edit()
                .putBoolean(KEY_FLAG, true)
                .putString(KEY_TOKEN, token)                  // có thể là null
                .putString(KEY_USER, new Gson().toJson(user)) // lưu user
                .apply();
    }

    public static boolean isLoggedIn(Context c) {
        return sp(c).getBoolean(KEY_FLAG, false);
    }

    public static User getUser(Context c) {
        String js = sp(c).getString(KEY_USER, null);
        return js == null ? null : new Gson().fromJson(js, User.class);
    }

    public static void logout(Context c) {
        sp(c).edit().clear().apply(); // xóa cờ + token + user
    }
}
