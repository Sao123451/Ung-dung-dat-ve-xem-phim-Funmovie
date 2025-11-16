package com.example.datn_md_13;

import android.content.Context;
import android.content.SharedPreferences;

import com.example.datn_md_13.Model.User;
import com.google.gson.Gson;

public final class AuthManager {
    private static final String PREF = "auth_pref";
    private static final String KEY_FLAG  = "is_logged_in";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USER  = "user";

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    /** Lưu thông tin khi login thành công */
    public static void setLoggedIn(Context c, String token, User user) {
        sp(c).edit()
                .putBoolean(KEY_FLAG, true)
                .putString(KEY_TOKEN, token)
                .putString(KEY_USER, new Gson().toJson(user))
                .apply();
    }

    /** Kiểm tra đã đăng nhập chưa */
    public static boolean isLoggedIn(Context c) {
        return sp(c).getBoolean(KEY_FLAG, false);
    }

    /** Lấy user hiện tại */
    public static User getUser(Context c) {
        String js = sp(c).getString(KEY_USER, null);
        return js == null ? null : new Gson().fromJson(js, User.class);
    }

    /** Lấy token hiện tại */
    public static String getToken(Context c) {
        return sp(c).getString(KEY_TOKEN, null);
    }

    /** Lưu user mới (khi update avatar, đổi thông tin, v.v.) */
    public static void saveUser(Context context, User user) {
        sp(context).edit()
                .putString(KEY_USER, new Gson().toJson(user))
                .apply();
    }

    /** Đăng xuất (xoá toàn bộ thông tin) */
    public static void logout(Context c) {
        sp(c).edit().clear().apply();
    }
}
