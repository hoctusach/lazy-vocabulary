package com.lazy.vocabulary;

import java.util.List;

/** Test driver: prints "kind|text" per line for args (category, meaning, example, translation). */
public class NotificationBodyCheck {
    public static void main(String[] a) {
        List<NotificationBody.Line> l = NotificationBody.lines(a[0], a[1], a[2], a[3]);
        for (NotificationBody.Line x : l) System.out.println(x.kind + "|" + x.text);
    }
}
