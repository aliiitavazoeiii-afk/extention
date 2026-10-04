# Darma New Tab Extension

یک افزونه‌ی Chrome مبتنی بر Manifest V3 برای جایگزینی صفحه‌ی New Tab با یک داشبورد مینیمال فارسی.

## هدف نسخه‌ی اول

- دو بخش اصلی: **سایت‌های پرکاربرد** و **VPN**
- آیکون‌های بزرگ و باکیفیت
- رابط RTL با تایپوگرافی فارسی
- افزودن، ویرایش، حذف و جابه‌جایی سایت‌ها
- ذخیره‌سازی تنظیمات با `chrome.storage.sync`
- بک‌گراند تیره‌ی graphite / teal بدون پنل‌های آب‌وهوا، تقویم یا کارهای روزانه

## اجرا در حالت توسعه

1. این repository را clone کنید.
2. در Chrome به `chrome://extensions` بروید.
3. Developer mode را روشن کنید.
4. روی **Load unpacked** بزنید و پوشه‌ی repository را انتخاب کنید.
5. یک New Tab باز کنید.

## آپدیت خودکار

ساختار پروژه برای انتشار در Chrome Web Store آماده می‌شود. بعد از انتشار Unlisted در Store، Chrome نسخه‌های جدید را بدون نصب مجدد دریافت می‌کند.

> نام repository فعلی در GitHub: `extention`
